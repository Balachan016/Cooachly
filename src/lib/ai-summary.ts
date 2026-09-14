import "server-only";

const apiKey = process.env.OPENAI_API_KEY;

export const isAiSummaryConfigured = Boolean(apiKey);

/**
 * Downloads a recording and transcribes it with OpenAI's Whisper model.
 * Whisper's API caps uploads at 25MB, which covers roughly an hour of
 * compressed audio — long enough for a single coaching session.
 */
export async function transcribeRecording(recordingUrl: string): Promise<string | null> {
  if (!apiKey) return null;

  const audioRes = await fetch(recordingUrl);
  if (!audioRes.ok) {
    console.error("Failed to download recording for transcription", await audioRes.text());
    return null;
  }
  const audioBlob = await audioRes.blob();

  const form = new FormData();
  form.append("file", audioBlob, "session.mp4");
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    console.error("Failed to transcribe recording", await res.text());
    return null;
  }

  const data = (await res.json()) as { text: string };
  return data.text;
}

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
