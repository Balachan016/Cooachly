import "server-only";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { ParsedQuestionDraft, TemplateParseResult } from "./test-template";

// ---------------------------------------------------------------------------
// A third supported upload format, alongside the Word table template and the
// PDF question paper: a free-text Word (.docx) question paper — a title
// block, an "Instructions" section, a "Formula Sheet" table, one or more
// "Section …" headings grouping numbered essay/calculation questions (each
// "N. Title (N points)" on its own line, followed by the prompt text), and
// a trailing "… Answer Key …" heading whose "N. …" entries become each
// question's model answer. A "Suggested time: N minutes" line on the title
// block sets the test's duration; a trailing "Grading Guidance" section (if
// present) is ignored. Every question imports as Long Answer, since this
// format has no multiple-choice options.
//
// Unlike the table template (parseQuestionTemplateDocx), headings and
// paragraph order matter here, so this walks the document in its actual
// order via fast-xml-parser's preserveOrder mode rather than grouping nodes
// by tag name.
// ---------------------------------------------------------------------------

export type DocxQuestionPaperResult = TemplateParseResult & {
  suggestedDurationMinutes?: number;
  instructions?: string | null;
  formulaSheet?: string | null;
};

type OrderedNode = Record<string, unknown>;

function tagOf(node: OrderedNode): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ":@") return key;
  }
  return null;
}

function childrenOf(node: OrderedNode, tag: string): OrderedNode[] {
  const value = node[tag];
  return Array.isArray(value) ? (value as OrderedNode[]) : [];
}

function attrOf(node: OrderedNode, name: string): string | undefined {
  const attrs = node[":@"] as Record<string, string> | undefined;
  return attrs?.[`@_${name}`];
}

function textOfTextNode(tNode: OrderedNode): string {
  let text = "";
  for (const child of childrenOf(tNode, "t")) {
    if (typeof child === "object" && child !== null && "#text" in child) {
      text += String((child as Record<string, unknown>)["#text"] ?? "");
    }
  }
  return text;
}

/** Collects the visible text of a run (<w:r>) — its <w:t>, plus tabs/line breaks as whitespace. */
function textOfRun(rNode: OrderedNode): string {
  let text = "";
  for (const child of childrenOf(rNode, "r")) {
    const tag = tagOf(child);
    if (tag === "t") text += textOfTextNode(child);
    else if (tag === "tab") text += "\t";
    else if (tag === "br") text += "\n";
  }
  return text;
}

/** Collects the visible text of a paragraph (<w:p>) across all its runs, including inside hyperlinks. */
function paragraphText(pChildren: OrderedNode[]): string {
  let text = "";
  for (const child of pChildren) {
    const tag = tagOf(child);
    if (tag === "r") text += textOfRun(child);
    else if (tag === "hyperlink") text += paragraphText(childrenOf(child, "hyperlink"));
  }
  return text;
}

/** The paragraph style name (e.g. "Heading1"), if <w:pPr><w:pStyle> is set. */
function paragraphStyle(pChildren: OrderedNode[]): string | null {
  for (const child of pChildren) {
    if (tagOf(child) !== "pPr") continue;
    for (const pPrChild of childrenOf(child, "pPr")) {
      if (tagOf(pPrChild) === "pStyle") return attrOf(pPrChild, "val") ?? null;
    }
  }
  return null;
}

/** Each row's cell text, for a simple (no merged-cell) table. */
function tableRowsText(tblChildren: OrderedNode[]): string[][] {
  const rows: string[][] = [];
  for (const trNode of tblChildren) {
    if (tagOf(trNode) !== "tr") continue;
    const cells: string[] = [];
    for (const tcNode of childrenOf(trNode, "tr")) {
      if (tagOf(tcNode) !== "tc") continue;
      const paragraphs: string[] = [];
      for (const tcChild of childrenOf(tcNode, "tc")) {
        if (tagOf(tcChild) === "p") paragraphs.push(paragraphText(childrenOf(tcChild, "p")).trim());
      }
      cells.push(paragraphs.filter(Boolean).join("\n"));
    }
    rows.push(cells);
  }
  return rows;
}

type Phase = "preamble" | "instructions" | "formula" | "questions" | "answers" | "grading";

type QuestionBlock = { number: number; title: string; maxMarks: number; promptLines: string[] };
type AnswerBlock = { number: number; lines: string[] };

const QUESTION_TITLE_RE = /^(\d{1,3})\.\s*(.+?)\s*\(\s*(\d+)\s*points?\)\s*$/i;
const ANSWER_START_RE = /^(\d{1,3})\.\s*(.*)$/;
const BLANK_LINE_RE = /^_{4,}$/;
const SUGGESTED_TIME_RE = /(?:suggested|recommended)\s*time:?\s*(\d+)\s*minutes?/i;

export async function parseQuestionPaperDocx(buffer: Buffer): Promise<DocxQuestionPaperResult> {
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file("word/document.xml");
    if (!file) return { questions: [], errors: ["This doesn't look like a Word (.docx) file."] };
    xml = await file.async("string");
  } catch {
    return { questions: [], errors: ["Couldn't open this file — please upload the .docx file as downloaded, without converting or re-saving it."] };
  }

  // parseTagValue defaults to true, which coerces a numeric-looking text
  // node (e.g. the "1. " that leads an answer-key entry) into the JS number
  // 1 — silently dropping everything after the digits. Must stay off.
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    preserveOrder: true,
    textNodeName: "#text",
    parseTagValue: false,
  });
  let body: OrderedNode[];
  try {
    const parsed = parser.parse(xml) as OrderedNode[];
    const docNode = parsed.find((n) => tagOf(n) === "document");
    const docChildren = docNode ? childrenOf(docNode, "document") : [];
    const bodyNode = docChildren.find((n) => tagOf(n) === "body");
    if (!bodyNode) throw new Error("no body");
    body = childrenOf(bodyNode, "body");
  } catch {
    return { questions: [], errors: ["Couldn't read this document's contents."] };
  }

  let phase: Phase = "preamble";
  const instructionsLines: string[] = [];
  const formulaLines: string[] = [];
  let suggestedDurationMinutes: number | undefined;

  const questionBlocks: QuestionBlock[] = [];
  let currentQuestion: QuestionBlock | null = null;
  const answerBlocks: AnswerBlock[] = [];
  let currentAnswer: AnswerBlock | null = null;

  for (const node of body) {
    const tag = tagOf(node);

    if (tag === "tbl") {
      if (phase === "formula") {
        for (const [term, formula] of tableRowsText(childrenOf(node, "tbl"))) {
          if (term || formula) formulaLines.push(formula ? `${term}: ${formula}` : term);
        }
      }
      continue;
    }
    if (tag !== "p") continue;

    const pChildren = childrenOf(node, "p");
    const style = paragraphStyle(pChildren);
    const text = paragraphText(pChildren).trim();

    if (style === "Heading1" || style === "Heading2") {
      if (currentQuestion) {
        questionBlocks.push(currentQuestion);
        currentQuestion = null;
      }
      if (currentAnswer) {
        answerBlocks.push(currentAnswer);
        currentAnswer = null;
      }
      if (/instructions?/i.test(text)) phase = "instructions";
      else if (/formula\s*sheet/i.test(text)) phase = "formula";
      else if (/answer\s*key/i.test(text)) phase = "answers";
      else if (/grading/i.test(text)) phase = "grading";
      // Any other heading (e.g. "Section I — …") just continues (or starts)
      // the question-collecting phase, unless we've already moved past it.
      else if (phase !== "answers" && phase !== "grading") phase = "questions";
      continue;
    }

    if (!text) continue;

    if (phase === "preamble") {
      const match = text.match(SUGGESTED_TIME_RE);
      if (match) suggestedDurationMinutes = Number(match[1]);
      continue;
    }

    if (phase === "instructions") {
      instructionsLines.push(text);
      continue;
    }

    if (phase === "formula") {
      // Formula Sheet content is normally all inside the table handled
      // above — a stray paragraph here is rare, but keep it rather than
      // silently dropping it.
      formulaLines.push(text);
      continue;
    }

    if (phase === "questions") {
      const match = text.match(QUESTION_TITLE_RE);
      if (match) {
        if (currentQuestion) questionBlocks.push(currentQuestion);
        currentQuestion = { number: Number(match[1]), title: match[2].trim(), maxMarks: Number(match[3]), promptLines: [] };
      } else if (!BLANK_LINE_RE.test(text) && currentQuestion) {
        currentQuestion.promptLines.push(text);
      }
      continue;
    }

    if (phase === "answers") {
      const match = text.match(ANSWER_START_RE);
      if (match) {
        if (currentAnswer) answerBlocks.push(currentAnswer);
        currentAnswer = { number: Number(match[1]), lines: [match[2].trim()].filter(Boolean) };
      } else if (currentAnswer) {
        currentAnswer.lines.push(text);
      }
      continue;
    }
    // phase === "grading": internal notes for the grader, not imported.
  }
  if (currentQuestion) questionBlocks.push(currentQuestion);
  if (currentAnswer) answerBlocks.push(currentAnswer);

  if (questionBlocks.length === 0) {
    return {
      questions: [],
      errors: ['No numbered questions found — expected lines like "1. Title (10 points)" followed by the question text.'],
    };
  }

  const answersByNumber = new Map(answerBlocks.map((a) => [a.number, a.lines.join(" ").trim()]));

  const questions: ParsedQuestionDraft[] = questionBlocks.map((b) => ({
    prompt: b.promptLines.length > 0 ? `${b.title}. ${b.promptLines.join(" ")}` : b.title,
    type: "LONG_ANSWER",
    maxMarks: b.maxMarks,
    modelAnswer: answersByNumber.get(b.number)?.trim() || null,
    options: [],
  }));

  return {
    questions,
    errors: [],
    suggestedDurationMinutes,
    instructions: instructionsLines.length > 0 ? instructionsLines.join("\n") : null,
    formulaSheet: formulaLines.length > 0 ? formulaLines.join("\n") : null,
  };
}
