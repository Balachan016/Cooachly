import "server-only";

const apiKey = process.env.OPENAI_API_KEY;

export const isAiSummaryConfigured = Boolean(apiKey);

export async function summarizeTranscript(opts: {
  transcript: string;
  studentName: string;
  professorName: string;
}): Promise<string | null> {
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You summarize 1:1 coaching/tutoring session transcripts for both the student and professor. " +
            "Write a short, plain-text summary with three sections: 'Topics covered', 'Key takeaways', and " +
            "'Suggested next steps'. Keep it concise and specific to what was actually discussed.",
        },
        {
          role: "user",
          content: `Session between professor ${opts.professorName} and student ${opts.studentName}.\n\nTranscript:\n${opts.transcript}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error("Failed to summarize transcript", await res.text());
    return null;
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? null;
}

export async function summarizeMonth(opts: {
  studentName: string;
  professorName: string;
  subject: string;
  sessionSummaries: string[];
}): Promise<string | null> {
  if (!apiKey) return null;

  const combined = opts.sessionSummaries.map((s, i) => `Session ${i + 1}:\n${s}`).join("\n\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write a monthly progress recap for a parent/guardian, based on that month's individual " +
            "coaching session summaries for one subject. Write plain text with four short sections: " +
            "'Overview', 'Recurring themes', 'Strengths', and 'Recommended focus for next month'. Be specific " +
            "and grounded only in what the session summaries actually mention — don't invent details.",
        },
        {
          role: "user",
          content: `Student: ${opts.studentName}. Professor: ${opts.professorName}. Subject: ${opts.subject}.\n\n${combined}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error("Failed to summarize month", await res.text());
    return null;
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? null;
}
