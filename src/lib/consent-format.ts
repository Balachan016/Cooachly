// Parses the (admin-editable) consent template's lightweight markdown into
// renderable blocks. Deliberately not "server-only" — the consent gate
// (a client component) parses the already-substituted content itself so the
// checkbox-per-clause UI and the "how many clauses are there" count used for
// the server-side submit check both come from the exact same logic.
export type ConsentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "clause"; title: string; body: string };

export function parseConsentContent(content: string): ConsentBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ConsentBlock[] = [];
  let openClause: { title: string; bodyLines: string[] } | null = null;

  function flushClause() {
    if (openClause) {
      blocks.push({ type: "clause", title: openClause.title, body: openClause.bodyLines.join(" ").trim() });
      openClause = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("☐")) {
      flushClause();
      openClause = { title: line.slice(1).trim(), bodyLines: [] };
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushClause();
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
      continue;
    }

    if (line === "") continue;

    if (openClause) {
      openClause.bodyLines.push(line);
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }
  flushClause();

  return blocks;
}

export function countClauses(content: string): number {
  return parseConsentContent(content).filter((b) => b.type === "clause").length;
}

/** Splits "plain **bold** plain" into alternating plain/bold segments for a custom (non-markdown-library) renderer. */
export function splitBoldSegments(text: string): { bold: boolean; text: string }[] {
  const parts = text.split("**");
  return parts.map((part, i) => ({ bold: i % 2 === 1, text: part })).filter((p) => p.text.length > 0);
}
