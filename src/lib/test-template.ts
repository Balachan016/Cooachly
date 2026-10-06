import "server-only";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from "docx";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { TestQuestionType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Shared format: one 2-column Word table per question. The left-column label
// text is what the parser matches on (case-insensitively, synonyms allowed —
// see LABEL_ALIASES below), not its position, so professors can reorder or
// drop rows that don't apply to a question's type without breaking anything.
// ---------------------------------------------------------------------------

export type ParsedQuestionDraft = {
  prompt: string;
  type: TestQuestionType;
  maxMarks: number;
  modelAnswer: string | null;
  options: { text: string; isCorrect: boolean }[];
};

export type TemplateParseResult = {
  questions: ParsedQuestionDraft[];
  errors: string[];
};

const TYPE_ALIASES: Record<string, TestQuestionType> = {
  "multiple choice": "MULTIPLE_CHOICE",
  "multiple-choice": "MULTIPLE_CHOICE",
  mcq: "MULTIPLE_CHOICE",
  mc: "MULTIPLE_CHOICE",
  "short answer": "SHORT_ANSWER",
  "short-answer": "SHORT_ANSWER",
  short: "SHORT_ANSWER",
  sa: "SHORT_ANSWER",
  "long answer": "LONG_ANSWER",
  "long-answer": "LONG_ANSWER",
  long: "LONG_ANSWER",
  essay: "LONG_ANSWER",
  la: "LONG_ANSWER",
  "file upload": "FILE_UPLOAD",
  file: "FILE_UPLOAD",
  upload: "FILE_UPLOAD",
};

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ").replace(/[:：]$/, "");
}

/** Matches "option a", "option b", … "answer option c", etc. -> the letter. */
function matchOptionLabel(label: string): string | null {
  const m = normalizeLabel(label).match(/^(?:answer )?option\s+([a-z])$/i);
  return m ? m[1].toLowerCase() : null;
}

function isQuestionLabel(label: string) {
  return ["question", "question text", "prompt"].includes(normalizeLabel(label));
}
function isTypeLabel(label: string) {
  return ["type", "question type", "answer type"].includes(normalizeLabel(label));
}
function isPointsLabel(label: string) {
  return ["points", "marks", "max marks", "point value"].includes(normalizeLabel(label));
}
function isCorrectLabel(label: string) {
  return ["correct option", "correct answer", "answer"].includes(normalizeLabel(label));
}
function isModelAnswerLabel(label: string) {
  return ["model answer", "expected answer", "sample answer", "correct answer"].includes(normalizeLabel(label));
}

// ---------------------------------------------------------------------------
// Generate the downloadable blank template
// ---------------------------------------------------------------------------

function labelCell(text: string) {
  return new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  });
}
function valueCell(text: string) {
  return new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ text })],
  });
}
function row(label: string, value: string) {
  return new TableRow({ children: [labelCell(label), valueCell(value)] });
}

function questionTable(rows: { label: string; value: string }[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
    },
    rows: rows.map((r) => row(r.label, r.value)),
  });
}

const MCQ_EXAMPLE = questionTable([
  { label: "Question", value: "What is the capital of France?" },
  { label: "Type", value: "Multiple Choice" },
  { label: "Points", value: "5" },
  { label: "Option A", value: "London" },
  { label: "Option B", value: "Paris" },
  { label: "Option C", value: "Berlin" },
  { label: "Option D", value: "Madrid" },
  { label: "Correct Option", value: "B" },
]);

const SHORT_EXAMPLE = questionTable([
  { label: "Question", value: "Name one noble gas." },
  { label: "Type", value: "Short Answer" },
  { label: "Points", value: "3" },
  { label: "Model Answer", value: "Helium (or Neon, Argon, Krypton, Xenon, Radon)" },
]);

const BLANK_EXAMPLE = questionTable([
  { label: "Question", value: "" },
  { label: "Type", value: "" },
  { label: "Points", value: "" },
  { label: "Option A", value: "" },
  { label: "Option B", value: "" },
  { label: "Option C", value: "" },
  { label: "Option D", value: "" },
  { label: "Correct Option", value: "" },
  { label: "Model Answer", value: "" },
]);

export async function generateQuestionTemplateDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Test question template" }),
          new Paragraph({
            children: [
              new TextRun(
                "Fill in one table per question, then upload this file on the test's page to add all of them at once. Don't rename the label cells in the left column — the upload only reads them by that exact label (not case-sensitive)."
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Type: ",
                bold: true,
              }),
              new TextRun(
                "Multiple Choice, Short Answer, Long Answer, or File Upload. Options and Correct Option are only needed for Multiple Choice — delete or leave blank otherwise."
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Model Answer: ", bold: true }),
              new TextRun(
                "optional. For Short/Long Answer questions, this is shown to the student alongside their own answer once you share their score, so they can see what a correct answer looks like."
              ),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "To add more questions: ", bold: true }), new TextRun("copy one of the tables below (including a blank line after it) and paste it at the end, then fill it in.")],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Example — multiple choice" }),
          MCQ_EXAMPLE,
          new Paragraph({ text: "" }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Example — short answer" }),
          SHORT_EXAMPLE,
          new Paragraph({ text: "" }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Blank — fill this in" }),
          BLANK_EXAMPLE,
          new Paragraph({ text: "" }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// Parse an uploaded, filled-in template
// ---------------------------------------------------------------------------

type XmlNode = string | number | { [key: string]: XmlNode | XmlNode[] };

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Collects every <w:t> text node under an element, joining separate paragraphs with newlines. */
function collectText(node: XmlNode | undefined): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);

  const obj = node as Record<string, unknown>;
  const paragraphs = asArray(obj.p as XmlNode | XmlNode[] | undefined);
  if (paragraphs.length > 0) {
    return paragraphs.map((p) => collectRuns(p)).join("\n");
  }
  // Not a <w:tc> with <w:p> children directly (shouldn't normally happen) — fall back to runs.
  return collectRuns(node);
}

function collectRuns(node: XmlNode | undefined): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);

  const obj = node as Record<string, unknown>;
  let text = "";
  for (const run of asArray(obj.r as XmlNode | XmlNode[] | undefined)) {
    const runObj = run as unknown as Record<string, unknown>;
    for (const t of asArray(runObj.t as XmlNode | XmlNode[] | undefined)) {
      if (typeof t === "string") text += t;
      else if (typeof t === "object" && t !== null && "#text" in (t as Record<string, unknown>)) {
        text += String((t as Record<string, unknown>)["#text"] ?? "");
      }
    }
    // Tabs and line breaks inside a run read as a space, close enough for our purposes.
    if ("tab" in runObj) text += "\t";
    if ("br" in runObj) text += "\n";
  }
  return text;
}

function parseTableRows(table: Record<string, unknown>): { label: string; value: string }[] {
  const rows = asArray(table.tr as XmlNode | XmlNode[] | undefined);
  return rows.map((tr) => {
    const trObj = tr as unknown as Record<string, unknown>;
    const cells = asArray(trObj.tc as XmlNode | XmlNode[] | undefined);
    const label = cells[0] ? collectText(cells[0] as XmlNode).trim() : "";
    const value = cells[1] ? collectText(cells[1] as XmlNode).trim() : "";
    return { label, value };
  });
}

function resolveQuestion(rows: { label: string; value: string }[], index: number): { question: ParsedQuestionDraft | null; errors: string[] } {
  const errors: string[] = [];
  const tag = `Question ${index + 1}`;

  let prompt = "";
  let typeRaw = "";
  let pointsRaw = "";
  let correctRaw = "";
  let modelAnswer: string | null = null;
  const optionsByLetter = new Map<string, string>();

  for (const { label, value } of rows) {
    if (!label) continue;
    const optionLetter = matchOptionLabel(label);
    if (optionLetter) {
      if (value) optionsByLetter.set(optionLetter, value);
      continue;
    }
    if (isQuestionLabel(label)) prompt = value;
    else if (isTypeLabel(label)) typeRaw = value;
    else if (isPointsLabel(label)) pointsRaw = value;
    else if (isCorrectLabel(label)) correctRaw = value;
    else if (isModelAnswerLabel(label) && !correctRaw) modelAnswer = value || null;
  }

  if (!prompt) {
    errors.push(`${tag}: missing "Question" text.`);
  }

  const type = TYPE_ALIASES[normalizeLabel(typeRaw)];
  if (!type) {
    errors.push(`${tag}: "Type" must be Multiple Choice, Short Answer, Long Answer, or File Upload (got "${typeRaw || "blank"}").`);
  }

  const maxMarks = Number(pointsRaw);
  if (!pointsRaw || !Number.isFinite(maxMarks) || maxMarks < 1 || !Number.isInteger(maxMarks)) {
    errors.push(`${tag}: "Points" must be a whole number of at least 1 (got "${pointsRaw || "blank"}").`);
  }

  let options: { text: string; isCorrect: boolean }[] = [];
  if (type === "MULTIPLE_CHOICE") {
    const letters = [...optionsByLetter.keys()].sort();
    if (letters.length < 2) {
      errors.push(`${tag}: a multiple-choice question needs at least two "Option" rows filled in.`);
    }
    const correctLetter = correctRaw.trim().toLowerCase().replace(/[.)]/g, "");
    if (!correctLetter) {
      errors.push(`${tag}: "Correct Option" is required for multiple-choice questions (e.g. "B").`);
    } else if (!optionsByLetter.has(correctLetter)) {
      errors.push(`${tag}: "Correct Option" is "${correctRaw}", but there's no "Option ${correctRaw.toUpperCase()}" row.`);
    }
    options = letters.map((letter) => ({ text: optionsByLetter.get(letter)!, isCorrect: letter === correctLetter }));
  } else if (type === "SHORT_ANSWER" || type === "LONG_ANSWER") {
    // "Correct Answer" is ambiguous with MCQ's field; for text questions it's
    // treated as the model answer if "Model Answer" itself wasn't also given.
    if (!modelAnswer && correctRaw) modelAnswer = correctRaw;
  }

  if (errors.length > 0 || !type) {
    return { question: null, errors };
  }

  return {
    question: { prompt, type, maxMarks, modelAnswer, options },
    errors: [],
  };
}

export async function parseQuestionTemplateDocx(buffer: Buffer): Promise<TemplateParseResult> {
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file("word/document.xml");
    if (!file) return { questions: [], errors: ["This doesn't look like a Word (.docx) file."] };
    xml = await file.async("string");
  } catch {
    return { questions: [], errors: ["Couldn't open this file — please upload the .docx file as downloaded, without converting or re-saving it."] };
  }

  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, textNodeName: "#text" });
  let body: Record<string, unknown>;
  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const docEl = parsed.document as Record<string, unknown>;
    body = docEl.body as Record<string, unknown>;
  } catch {
    return { questions: [], errors: ["Couldn't read this document's contents."] };
  }

  const allTables = asArray(body.tbl as XmlNode | XmlNode[] | undefined) as unknown as Record<string, unknown>[];
  const questionTables = allTables.filter((t) => {
    const rows = parseTableRows(t);
    return rows.length > 0 && isQuestionLabel(rows[0].label);
  });

  if (questionTables.length === 0) {
    return { questions: [], errors: ["No question tables found. Use the downloaded template and fill in its tables without changing their structure."] };
  }

  const questions: ParsedQuestionDraft[] = [];
  const errors: string[] = [];
  questionTables.forEach((table, i) => {
    const rows = parseTableRows(table);
    const { question, errors: qErrors } = resolveQuestion(rows, i);
    if (question) questions.push(question);
    errors.push(...qErrors);
  });

  return { questions, errors };
}
