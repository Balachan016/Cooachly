import { NextResponse } from "next/server";
import { requireRole } from "@/lib/dal";
import { generateQuestionTemplateDocx } from "@/lib/test-template";

// Same template for every professor on either site — nothing here varies by
// user, so there's no need to persist a generated file anywhere.
export async function GET() {
  await requireRole("PROFESSOR");

  const buffer = await generateQuestionTemplateDocx();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="test-question-template.docx"',
    },
  });
}
