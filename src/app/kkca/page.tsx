import Image from "next/image";
import logo from "../../../public/kkca/logo.png";
import admissionsPoster from "../../../public/kkca/admissions-2026.jpg";
import { Badge, BookStack, CornerSwoosh, Ribbon } from "@/components/kkca/cover-art";

const WHY_CHOOSE = [
  { icon: "🏆", color: "#dc2626", title: "Proven Results in AISSEE", body: "Our students have cleared the All India Sainik Schools Entrance Exam." },
  { icon: "🎓", color: "#f97316", title: "Experienced & Successful Mentors", body: "Guided by mentors who know the exam inside out." },
  { icon: "📐", color: "#16a34a", title: "Strong Foundation in Maths & English", body: "Concept-first teaching with formula and visual revision." },
  { icon: "🧑‍🏫", color: "#1d4ed8", title: "Individual Attention", body: "Every child is tracked, corrected and encouraged personally." },
  { icon: "🎖️", color: "#6d28d9", title: "Disciplined Approach", body: "Routine, regularity and the discipline a Sainik School expects." },
];

const MANTRA_PILLARS = [
  { icon: "✏️", color: "#1d4ed8", title: "Practice", body: "Daily, with purpose" },
  { icon: "🎯", color: "#16a34a", title: "Focus", body: "Stay on the goal" },
  { icon: "🏅", color: "#f97316", title: "Achieve", body: "Step by step" },
  { icon: "⭐", color: "#dc2626", title: "Excel", body: "Be your best" },
];

const STUDY_BOOKS = [
  {
    title: "KKCA SSLC Mathematics",
    subtitle: "Formula & Visual — Quick Revision Book",
    body: "Every key formula with a visual explanation — algebra, geometry, graphs, mensuration and statistics — built for fast, confident revision.",
    accent: "#1d4ed8",
  },
  {
    title: "KKCA Success Mantra",
    subtitle: "Learn • Practice • Excel",
    body: "Motivation pages, study routines and exam-day habits that help students learn daily, revise regularly and stay positive.",
    accent: "#dc2626",
  },
];

export default function KkcaHome() {
  return (
    <main className="flex-1 px-3 py-6 text-[#1e293b] sm:px-6 sm:py-10">
      {/* The page is laid out like the front cover of the KKCA revision book. */}
      <article className="relative mx-auto max-w-5xl overflow-hidden rounded-md border-[10px] border-white bg-[#fffdf2] shadow-2xl">
        <CornerSwoosh position="top-left" />
        <CornerSwoosh position="bottom-right" />

        {/* Cover header */}
        <header className="relative flex flex-col items-center gap-2 px-6 pt-10 text-center sm:flex-row sm:justify-end sm:gap-4 sm:px-12 sm:pt-8 sm:text-right">
          <div>
            <p className="text-lg font-extrabold uppercase leading-tight tracking-wide text-[#1e3a8a] sm:text-xl">
              Karka Kasadara
              <br />
              Coaching Academy
            </p>
            <p className="mt-1 text-sm font-semibold text-[#dc2626]">Learn • Practice • Excel</p>
          </div>
        </header>

        {/* Title block */}
        <section className="relative px-6 pb-10 pt-6 sm:px-12">
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto w-44 sm:w-56">
              <div className="rounded-full bg-white p-1 shadow-xl ring-4 ring-[#facc15]">
                <Image src={logo} alt="Karka Kasadara — Learn Flawlessly logo" className="rounded-full" preload />
              </div>
            </div>

            <div className="text-center md:text-left">
              <span className="inline-block rounded-full bg-[#1e3a8a] px-4 py-1 text-xs font-bold tracking-widest text-[#facc15]">
                ★ ADMISSIONS OPEN — 2026 ★
              </span>
              <h1 className="mt-3 text-7xl font-black leading-none tracking-tight text-[#1e3a8a] sm:text-8xl">
                KKCA
              </h1>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.4em] text-[#64748b]">Sainik Coaching</p>
              <p className="mt-3 text-2xl font-black uppercase leading-tight text-[#1d4ed8] sm:text-3xl">
                Karka Kasadara Sainik
                <br className="hidden sm:block" /> Coaching Academy
              </p>
              <div className="mt-5 flex flex-col items-center gap-2 md:items-start">
                <Ribbon color="red">Sainik School Entrance Coaching</Ribbon>
                <Ribbon color="yellow">Class 6 · AISSEE</Ribbon>
                <Ribbon color="green">Classes commence from 16th April 2026</Ribbon>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border-2 border-dashed border-[#facc15] bg-white/70 px-5 py-4 text-center">
            <p className="text-lg font-bold text-[#b91c1c] sm:text-xl">கற்க கசடற — பிழையின்றி கற்றல் வேண்டும்</p>
            <p className="mt-1 text-sm font-extrabold uppercase tracking-wider text-[#1e3a8a]">
              Karka Kasadara — Learn Flawlessly
            </p>
          </div>
        </section>

        {/* Why choose KKCA */}
        <section className="relative px-6 py-10 sm:px-12">
          <h2 className="text-center text-3xl font-black text-[#1e3a8a]">
            🎯 Why Choose <span className="text-[#dc2626]">KKCA</span>?
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE.map((item) => (
              <li key={item.title} className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <Badge color={item.color}>{item.icon}</Badge>
                <div>
                  <p className="font-extrabold text-[#1e3a8a]">✔ {item.title}</p>
                  <p className="mt-1 text-sm text-[#475569]">{item.body}</p>
                </div>
              </li>
            ))}
            <li className="flex items-center justify-center rounded-xl bg-[#1e3a8a] p-5 text-center shadow-sm">
              <p className="text-2xl font-black leading-snug text-[#facc15]">
                Shaping discipline,
                <br />
                <span className="text-white">Building destiny.</span>
              </p>
            </li>
          </ul>
        </section>

        {/* Success mantra */}
        <section className="relative px-6 py-10 sm:px-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-black text-[#1e3a8a]">
                KKCA <span className="font-serif italic text-[#dc2626]">Success Mantra</span>
              </h2>
              <blockquote className="mt-5 rounded-2xl border-l-8 border-[#16a34a] bg-white px-5 py-4 text-lg italic text-[#334155] shadow-sm">
                “Success comes to those who prepare consistently, practise sincerely, and believe in themselves.”
              </blockquote>
            </div>
            <ul className="grid grid-cols-2 gap-4">
              {MANTRA_PILLARS.map((p) => (
                <li key={p.title} className="flex flex-col items-center rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
                  <Badge color={p.color}>{p.icon}</Badge>
                  <p className="mt-3 font-black uppercase tracking-wide text-[#1e3a8a]">{p.title}</p>
                  <p className="text-xs text-[#64748b]">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Study material */}
        <section className="relative px-6 py-10 sm:px-12">
          <h2 className="text-center text-3xl font-black text-[#1e3a8a]">Our Study Material</h2>
          <p className="mt-2 text-center text-sm text-[#64748b]">Printed revision books, prepared in-house for KKCA students.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1fr_auto] md:items-center">
            {STUDY_BOOKS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border-t-8 bg-white p-5 shadow-sm ring-1 ring-black/5"
                style={{ borderTopColor: b.accent }}
              >
                <p className="text-xl font-black text-[#1e3a8a]">{b.title}</p>
                <p className="mt-1 text-sm font-bold uppercase tracking-wide" style={{ color: b.accent }}>
                  {b.subtitle}
                </p>
                <p className="mt-3 text-sm text-[#475569]">{b.body}</p>
              </div>
            ))}
            <BookStack className="mx-auto w-40" />
          </div>
        </section>

        {/* Admissions notice + results */}
        <section className="relative px-6 pb-16 pt-10 sm:px-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-[#1e3a8a]">
                🏆 Proud of our <span className="text-[#dc2626]">AISSEE</span> successes!
              </h2>
              <p className="mt-4 text-[#475569]">
                Our cadets have earned their place in Sainik Schools. Admissions for the 2026 batch of Sainik School
                entrance coaching (Class 6) are now open — classes begin on <strong>16th April 2026</strong>.
              </p>
              <div className="mt-6 flex justify-center md:justify-start">
                <Ribbon color="blue">📣 Admissions Open — 2026</Ribbon>
              </div>
            </div>
            <Image
              src={admissionsPoster}
              alt="KKSCA admissions open 2026 poster — Sainik School entrance coaching, Class 6, classes commence 16th April 2026"
              className="mx-auto w-full max-w-sm rounded-xl shadow-xl ring-4 ring-white"
              sizes="(min-width: 768px) 384px, 90vw"
            />
          </div>
        </section>

        <footer className="relative border-t-4 border-[#facc15] bg-[#1e3a8a] px-6 py-5 text-center text-sm text-white">
          <p className="font-bold">Karka Kasadara Coaching Academy — Learn Flawlessly</p>
          <p className="mt-1 text-white/70">© {new Date().getFullYear()} KKCA. All rights reserved.</p>
        </footer>
      </article>
    </main>
  );
}
