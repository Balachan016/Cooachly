import "server-only";
import type { ParsedQuestionDraft, TemplateParseResult } from "./test-template";

// ---------------------------------------------------------------------------
// A second supported upload format, alongside the Word table template:
// a free-text "question paper" PDF — numbered essay/calculation questions
// each ending in a "[N points]" mark, followed by a numbered
// "ANSWER KEY & SOLUTION GUIDE" section whose entries become each
// question's model answer. Every question imports as Long Answer, since
// this format has no multiple-choice options.
// ---------------------------------------------------------------------------

export type PdfParseResult = TemplateParseResult & { suggestedDurationMinutes?: number };

function splitNumberedBlocks(text: string): { number: number; text: string }[] {
  const blocks: { number: number; lines: string[] }[] = [];
  let current: { number: number; lines: string[] } | null = null;

  for (const rawLine of text.split("\n")) {
    const match = rawLine.match(/^(\d{1,3})\.\s+(.*)$/);
    if (match) {
      if (current) blocks.push(current);
      current = { number: Number(match[1]), lines: [match[2]] };
    } else if (current) {
      const trimmed = rawLine.trim();
      if (trimmed) current.lines.push(trimmed);
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b) => ({ number: b.number, text: b.lines.join(" ").trim() }));
}

export async function parseQuestionPaperPdf(buffer: Buffer): Promise<PdfParseResult> {
  let rawText: string;
  try {
    // Loaded lazily, only when a PDF is actually being parsed — not at
    // module load time. This file is imported from actions/tests.ts
    // alongside plain, unrelated actions like createTest, so a static
    // top-level import here would pull pdf-parse (and pdf.js) into every
    // one of those too, and any failure to initialize it in a serverless
    // environment would take all of them down together.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    rawText = result.text;
  } catch (err) {
    console.error("Failed to parse PDF question paper", err);
    return { questions: [], errors: ["Couldn't read this PDF file."] };
  }

  // Drop page-footer lines ("-- 1 of 5 --") and "Part N — ..." section
  // headers — both would otherwise get swallowed into the preceding
  // question's text (there's no blank line separating them from it), pushing
  // its "[N points]" marker out from the end of the block.
  const cleaned = rawText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^--\s*\d+\s*of\s*\d+\s*--$/.test(trimmed) && !/^Part\s+\S+\s*[—–-]/.test(trimmed);
    })
    .join("\n");

  const answerKeyMatch = cleaned.match(/\n\s*ANSWER KEY(?:\s*&\s*SOLUTION GUIDE)?\s*\n/i);
  const questionsText = answerKeyMatch ? cleaned.slice(0, answerKeyMatch.index) : cleaned;
  let answersText = answerKeyMatch ? cleaned.slice(answerKeyMatch.index! + answerKeyMatch[0].length) : "";
  const gradingNotesMatch = answersText.match(/\n\s*Suggested Grading Notes\s*\n/i);
  if (gradingNotesMatch) answersText = answersText.slice(0, gradingNotesMatch.index);

  const questionBlocks = splitNumberedBlocks(questionsText);
  const answersByNumber = new Map(splitNumberedBlocks(answersText).map((b) => [b.number, b.text]));

  if (questionBlocks.length === 0) {
    return {
      questions: [],
      errors: ['No numbered questions found — expected lines starting "1.", "2.", etc., each ending in "[N points]".'],
    };
  }

  const questions: ParsedQuestionDraft[] = [];
  const errors: string[] = [];
  for (const block of questionBlocks) {
    // Matches the first "[N points]" in the block rather than anchoring to
    // the very end, so stray trailing content (e.g. a section header that
    // immediately follows with no blank line) doesn't break the match —
    // only the text up to and including that marker is the real question.
    const pointsMatch = block.text.match(/\[(\d+)\s*points?\]/i);
    if (!pointsMatch || pointsMatch.index === undefined) {
      errors.push(`Question ${block.number}: couldn't find a "[N points]" value at the end of the question.`);
      continue;
    }
    const maxMarks = Number(pointsMatch[1]);
    const prompt = block.text.slice(0, pointsMatch.index).trim();
    if (!prompt) {
      errors.push(`Question ${block.number}: question text is empty.`);
      continue;
    }
    questions.push({
      prompt,
      type: "LONG_ANSWER",
      maxMarks,
      modelAnswer: answersByNumber.get(block.number)?.trim() || null,
      options: [],
    });
  }

  const durationMatch = cleaned.match(/Recommended Time\s+(\d+)\s*minutes?/i);
  const suggestedDurationMinutes = durationMatch ? Number(durationMatch[1]) : undefined;

  return { questions, errors, suggestedDurationMinutes };
}
