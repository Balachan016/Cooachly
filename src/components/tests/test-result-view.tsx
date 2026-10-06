import { Badge, Card } from "@/components/ui";

type QuestionResult = {
  id: string;
  type: string;
  prompt: string;
  maxMarks: number;
  modelAnswer: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
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
      {questions.map((q, i) => (
        <Card key={q.id}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              Q{i + 1}. {q.prompt}
            </p>
            <Badge>
              {q.answer?.marksAwarded ?? 0} / {q.maxMarks}
            </Badge>
          </div>

          {q.type === "MULTIPLE_CHOICE" ? (
            <ul className="mt-2 space-y-1 text-sm">
              {q.options.map((o) => {
                const isYourAnswer = o.id === q.answer?.selectedOptionId;
                return (
                  <li
                    key={o.id}
                    className={
                      o.isCorrect
                        ? "font-medium text-emerald-700 dark:text-emerald-400"
                        : isYourAnswer
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-black/70 dark:text-white/70"
                    }
                  >
                    {o.isCorrect ? "✓ " : isYourAnswer ? "✗ " : "– "}
                    {o.text}
                    {isYourAnswer && <span className="ml-1 text-xs font-normal">(your answer)</span>}
                  </li>
                );
              })}
              {!q.answer?.selectedOptionId && (
                <li className="text-black/40 dark:text-white/40">You didn&apos;t select an answer.</li>
              )}
            </ul>
          ) : (
            <>
              <div className="mt-2 rounded-md bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
                {q.type === "FILE_UPLOAD" ? (
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
              {q.modelAnswer && (
                <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-900/20">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Model answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-emerald-900 dark:text-emerald-200">{q.modelAnswer}</p>
                </div>
              )}
            </>
          )}

          {q.answer?.comment && (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              <strong>Feedback:</strong> {q.answer.comment}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
