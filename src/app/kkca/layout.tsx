import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KKCA — Karka Kasadara Coaching Academy",
  description:
    "Karka Kasadara Sainik Coaching Academy (KKSCA): Sainik School entrance (AISSEE, Class 6) coaching. Admissions open for 2026 — classes commence 16th April 2026.",
};

export default function KkcaLayout({ children }: { children: React.ReactNode }) {
  // Standalone page: deliberately not linked from the Cooachly home page, and
  // not wired into the shared auth/site plumbing — it's a public
  // brochure-style page reachable only at /kkca.
  return <div className="flex min-h-full flex-1 flex-col bg-[#f3efe0]">{children}</div>;
}
