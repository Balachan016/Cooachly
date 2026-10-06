import { Badge, Card } from "@/components/ui";

type QuestionResult = {
  id: string;
  type: string;
  prompt: string;
  maxMarks: number;
  options: { id: string; text: string }[];
  answer: {
    selectedOptionId: string | null;
    textAnswer: string | null;
    fileName: string | null;
    fileUrl: string | null;
    marksAwarded: number | null;
    comment: string | null;
  } | null;
};

export function TestResultView({
  questions,
  totalScore,
  totalMarks,
}: {
  questions: QuestionResult[];
  totalScore: number;
  totalMarks: number;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-medium">Total score</p>
        <p className="text-2xl font-semibold">
          {totalScore} / {totalMarks}
        </p>
      </Card>
      {questions.map((q, i) => {
        const selectedOption = q.options.find((o) => o.id === q.answer?.selectedOptionId);
        return (
          <Card key={q.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                Q{i + 1}. {q.prompt}
              </p>
              <Badge>
                {q.answer?.marksAwarded ?? 0} / {q.maxMarks}
              </Badge>
            </div>
            <div className="mt-2 rounded-md bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
              {q.type === "MULTIPLE_CHOICE" ? (
                selectedOption ? <p>{selectedOption.text}</p> : <p className="text-black/40 dark:text-white/40">No answer selected.</p>
              ) : q.type === "FILE_UPLOAD" ? (
                q.answer?.fileUrl ? (
                  <a href={q.answer.fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
                    {q.answer.fileName || "View uploaded file"}
                  </a>
                ) : (
                  <p className="text-black/40 dark:text-white/40">No file uploaded.</p>
                )
              ) : q.answer?.textAnswer ? (
                <p className="whitespace-pre-wrap">{q.answer.textAnswer}</p>
              ) : (
                <p className="text-black/40 dark:text-white/40">No answer given.</p>
              )}
            </div>
            {q.answer?.comment && (
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                <strong>Feedback:</strong> {q.answer.comment}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
