# Cooachly & Cooachly Arts — Brand Voice Guidelines

## Generation Metadata
- Created: 2026-11-06
- Version: 1
- Sources (all from this repository — no transcripts or external brand docs were available):
  - `src/lib/site.ts` (brand names, taglines, descriptions, contact details)
  - `src/app/page.tsx`, `about/`, `pricing/`, `faq/`, `become-a-coach/`, `demo/` (Cooachly website copy)
  - `src/app/arts/page.tsx`, `arts/about/`, `arts/pricing/`, `arts/faq/` (Cooachly Arts website copy)
  - `src/lib/support-bot.ts` (support-bot ground rules), `README.md` (feature truth)
  - `public/icons/*` (logos), `src/app/globals.css` (brand colours)
- Documents processed: 14 · Conversations analyzed: 0 · Discovery report used: No
- Overall confidence: **Medium** — voice is consistent across pages, but it's inferred from website copy only. No sales calls, social posts or customer feedback were analyzed.

This file covers **two brands that share one voice core but have different personalities**:
- **Part 1** — shared rules (apply to both)
- **Part 2** — Cooachly (academic coaching)
- **Part 3** — Cooachly Arts (Carnatic vocals)
- **Part 4** — open questions

---

# Part 1 — Shared Voice Core

## What both brands sound like
Both brands talk like **a trusted teacher who is also well-organized**: warm, clear, and practical. The website copy is short and plain ("no separate app or link to hunt for", "no manual conversion needed"), explains how things work instead of hyping them, and keeps returning to the same reassurance: *personal attention from a real, vetted teacher, at a time that works for you.*

## Shared rules (apply to every channel)
1. **Lead with the free demo.** Every call to action points to "Book your free demo" / "Book a free 30-min demo". It's the single most repeated CTA across both sites.
2. **Say "in your own timezone."** Timezone-aware scheduling is the most repeated feature on both sites. Use the exact phrase.
3. **Be concrete, not superlative.** Name the actual thing ("reminders 1 day, 1 hour, and 5 minutes before", "8 sessions a month") instead of "best", "world-class", "#1".
4. **One teacher, one student.** Always say "1:1" or "your own dedicated coach/guru". Never imply group classes.
5. **Never invent facts.** No made-up statistics, results, testimonials, student counts, rankings or score guarantees. If a number isn't on the website, don't publish it (same rule as the support bot in `src/lib/support-bot.ts`).
6. **Talk to parents and students as separate readers** when it matters. Parents care about trust, vetting, reminders and progress visibility; students care about clarity, confidence and flexibility.
7. **Contact line:** "For enquiries: +91 80151 51896 · support@cooachly.com" — use it word-for-word.

## Words to avoid across both brands
| Avoid | Why | Use instead |
|---|---|---|
| "guaranteed results", "guaranteed score", "top 1%" | Unprovable; risky with parents and ad platforms | "personal attention", "clear concepts", "steady progress" |
| "tutor" (Cooachly) / "teacher" (Arts) as the main noun | The brands consistently say **coach / professor** and **guru** | coach, professor · guru |
| "recorded" / "we record your classes" | Conflicts with the README (only text is stored, never audio/video) — see Open Question 1 | "AI session summaries emailed after every class" |
| "cheap", "discount tutoring" | Cheapens a vetted-teacher brand | "economical", "no platform fees" (Arts) |
| "AI tutor" / "learn with AI" | AI only writes the recaps; the teaching is human | "taught live by a real coach/guru; AI writes the recap" |
| Urgency tricks ("only 2 seats left!", countdowns) | Not supported by the product; erodes trust with parents | "Book a free demo whenever you're ready" |

---

# Part 2 — Cooachly (academic coaching)

## Executive Summary
Cooachly sounds like **a friendly, well-organized academic guide**. The logo literally says *"Your friendly guide"*, and the tagline is *"Coaching, scheduled simply."* The copy pairs aspiration (*"Expert guidance. Better learning. Brighter future."*, *"Learn online, excel everywhere."*) with very practical, logistics-first reassurance: vetted professors, automatic reminders, timezone conversion, one-click video rooms, AI recaps, transparent pricing.

The core promise is **expert 1:1 attention without the scheduling headache**. Content should feel encouraging and competent, the way a good school counsellor writes: optimistic about the student, precise about the details.

## We Are / We Are Not

| We Are | We Are Not |
|--------|------------|
| **Encouraging** — optimistic about every student's potential | **Pushy or pressuring** — no fear-based "your child will fall behind" messaging |
| **Clear** — short sentences, concrete details, plain English | **Jargon-heavy or vague** — no "synergistic learning ecosystem" |
| **Organized** — we sweat the logistics so families don't have to | **Bureaucratic** — no walls of policy text in marketing |
| **Expert** — qualified, vetted educators | **Elitist or intimidating** — never talk down to struggling students |
| **Personal** — 1:1, "your own dedicated coach" | **Generic or mass-market** — never sound like a content library or app |
| **Honest** — transparent pricing and policies | **Hype-driven** — no guarantees, rankings or invented stats |

### Voice Attributes Detail

#### 1. Encouraging
- **What it means:** We believe every student can improve with the right guidance.
- **How it shows up:** Future-facing words: "brighter future", "excel", "future ready", "better results".
- **What to avoid:** Anxiety marketing, comparing kids, shaming poor grades.
- **Evidence:** Hero "Expert guidance. Better learning. Brighter future." (`src/app/page.tsx`); pillars "Concept Clarity · Personal Attention · Better Results · Future Ready".
- **Confidence:** High

#### 2. Clear
- **What it means:** Readers understand the offer in one pass.
- **How it shows up:** Numbered "How it works" steps; one-line feature descriptions; exact numbers.
- **What to avoid:** Abstract benefit-speak with no specifics.
- **Evidence:** About page "1. Find your coach. 2. Book a session. 3. Join & learn. 4. Review afterward."; FAQ "The standard plan is $120/month and includes 8 sessions (2 per week)…".
- **Confidence:** High

#### 3. Organized
- **What it means:** Our differentiator is that the hassle disappears.
- **How it shows up:** "no separate app or link to hunt for", "no manual conversion needed", "reminders 1 day, 1 hour, and 5 minutes before".
- **What to avoid:** Over-explaining technology (Stripe, Daily, Deepgram) to families.
- **Evidence:** Homepage feature cards; FAQ timezone answer.
- **Confidence:** High

#### 4. Expert (but approachable)
- **What it means:** Real, qualified, vetted educators.
- **How it shows up:** "Guided by qualified educators", "Every professor on Cooachly is vetted before they can list sessions", mutual ratings after every session.
- **What to avoid:** Credential-dropping we can't verify ("ex-Ivy League faculty").
- **Evidence:** Home, About, FAQ "Every coach on Cooachly is reviewed before they're able to list sessions".
- **Confidence:** High

#### 5. Honest
- **What it means:** Prices and policies are stated plainly, even the less-fun ones.
- **How it shows up:** FAQ spells out the 24-hour reschedule rule and 50% late-cancel fee; weekday premium is disclosed up front ("your coach will always let you know before you book").
- **What to avoid:** Hiding conditions in fine print.
- **Evidence:** `src/app/faq/page.tsx`.
- **Confidence:** Medium (inferred from policy tone)

## Brand Personality
- **Archetype:** *The Friendly Guide* — knowledgeable, upbeat, organized; walks beside the student.
- **If Cooachly were a person:** A favourite teacher who also happens to run a tight calendar. Remembers your goals, replies on time, never makes you feel slow.
- **Core values in voice:** clarity, personal attention, reliability, optimism.

## Messaging Framework

### Primary Value Proposition
> **Live 1:1 coaching with qualified educators, at a time that fits your schedule, in your own timezone.**

Variations on the site:
- "Live online classes, mentored by qualified educators — book 1:1 coaching sessions that fit your schedule, in your own timezone." (Home)
- "Cooachly connects students with professors for scheduled 1:1 coaching sessions, messaging, and payments — across any timezone." (`site.ts`)
- "Learn online, excel everywhere." (mission line)

### Message Pillars
1. **Personal attention.** One coach, one student, real-time and interactive.
   *"Real-time, interactive 1:1 sessions with your own dedicated coach."*
2. **Qualified, vetted coaches.** Every professor is reviewed before listing, and both sides rate each other after every session.
   *"Guided by qualified educators."*
3. **Scheduling that just works.** Timezone conversion, auto-reminders by email and WhatsApp, a video room for every booking.
   *"No separate app or link to hunt for."*
4. **Never lose track.** AI summaries of every session, emailed afterward, plus messaging between sessions.
   *"So you never lose track of what was covered."*
5. **Simple, transparent pricing.** $120/month for 8 sessions; first class free; referral rewards.
   *"Your very first class is always a free, no-obligation demo."*

### Proof points you may use (all from the website)
- Free 30-minute demo, no payment required
- Standard plan: **$120/month · 8 sessions (2 per week) · ~45 min each, extendable to 1 hour**
- Subjects: Mathematics, Physics, Chemistry, Biology, Economics, Psychology, Legal Studies, PSAT, SAT, ACT, "…and more"
- Reminders by email and WhatsApp 1 day, 1 hour and 5 minutes before
- Free reschedule with 24 hours' notice (one per session)
- Referral rewards: refer 3 active students → 15% off; refer 5 → 25% off
- Weekend sessions are the standard, most economical option; weekday slots may carry a small premium
- Secure payment via Stripe, per session or monthly

### Competitive positioning
- **vs. local in-person tuition:** same personal attention, no commute, any timezone, automatic recaps.
- **vs. big tutoring marketplaces:** every coach vetted, simple flat plan, a free demo before paying.
- **vs. self-study apps/videos:** a real person who adapts to *your* gaps, live.

## Tone-by-Context Matrix

| Context | Formality | Energy | Depth | Key principle |
|---|---|---|---|---|
| Instagram / Facebook post | Low-Med | High | Low | One idea per post; end with the free demo |
| Flyer / poster | Medium | High | Low | Headline + 3 proof points + 1 CTA + contact |
| LinkedIn (coach recruiting) | Medium-High | Medium | Medium | Respect the educator; talk flexibility, earnings tracking, global students |
| WhatsApp broadcast | Low-Med | Medium | Low | ≤ 60 words; personal; one link; opt-in audiences only |
| Email newsletter | Medium | Medium | Medium | Helpful tip first, offer second |
| Replies to comments/DMs | Low-Med | Warm | Low | Answer the actual question in 1–2 sentences, then the next step |
| Complaints / issues | Medium | Calm | Medium | Acknowledge, move to DM/email, never debate publicly |

### Context-specific guidance

**Social media**
- Do: open with a student/parent problem ("Calculus clicking in class but not at home?"); use 1–2 emojis max; 3–6 relevant hashtags.
- Don't: use stock "exam panic" fear hooks; mention competitors by name; promise grades.
- Example: *"Stuck on the same physics concept every week? A 1:1 coach finds the gap and fixes it — live, in your own timezone. First class is free. 🎓"*

**Flyers**
- Do: one headline, one sub-line, 3–4 bullets, one CTA ("Book your free 30-min demo"), contact line, QR to `/demo`.
- Don't: list every subject and feature; use more than two type sizes for body copy.

**Replies to questions**
- Do: answer from the FAQ only; link to `/faq`, `/pricing` or `/demo`; move account questions to support@cooachly.com.
- Don't: discuss a specific booking, payment or student in public.
- Example: *"Great question! The standard plan is $120/month for 8 sessions (2 a week). Your first class is a free demo, so you can try it first 👉 [link]"*

**Coach recruiting**
- Do: speak peer-to-peer with educators: "set your own availability once", "students from any timezone", "track earnings from your dashboard".
- Don't: promise specific income.

## Terminology Guide

### Must-use terms
| Term | Usage | Instead of |
|---|---|---|
| coach / professor | the educator ("coach" in student-facing copy, "professor" fine on site UI) | tutor, teacher, instructor |
| session | a paid or demo class | lesson, slot |
| free demo / free 30-min demo | the first class | trial, free lesson |
| 1:1 | always with "live" or "personal" | one-on-one tutoring package |
| in your own timezone | scheduling claims | local time zone support |
| Cooachly | always capital C, double "oo" | Coachly, CoAchly, COOACHLY in body text |

### Never-use
| Term | Reason |
|---|---|
| guaranteed score / grade | Unprovable claim |
| "recorded sessions" | See Open Question 1 |
| any unverified credential ("IIT/Ivy faculty") | Not stated anywhere |

## Visual identity (for flyers & social graphics)
- **Primary:** forest green `#14532D` (brand-900), `#15803D` (brand-700)
- **Accent:** lime `#BEF264` (accent-300); light tint `#F0FDF4`
- **Logo:** `public/icons/cooachly-512.png` (round badge with mortarboard and "Your friendly guide")
- **Type:** Geist (site font) or any clean geometric sans

---

# Part 3 — Cooachly Arts (Carnatic vocals)

## Executive Summary
Cooachly Arts sounds like **a respectful, warm keeper of tradition who happens to use modern tools**. Its tagline is *"Carnatic vocals, taught live"* and its hero line is poetic: *"Sruti. Laya. Bhava. Passed on, one voice at a time."* The copy uses Carnatic vocabulary without apology (sruti, laya, bhava, raga, sahitya, sarali varisai, varnam, kritis, guru) and roots everything in the guru–shishya relationship.

The commercial promise is unusually generous and must be stated proudly: **the platform charges nothing and takes no cut**, because "you and your guru agree on a rate directly, the same way you would with a private teacher." Content should feel calm, devotional-but-not-religious, inclusive of all ages and levels, and quietly confident.

## We Are / We Are Not

| We Are | We Are Not |
|--------|------------|
| **Reverent of tradition** — the guru–shishya way, authentic Carnatic | **Stuffy or gatekeeping** — beginners and all ages are welcome |
| **Warm and inviting** — "Together, let's sing and grow" | **Salesy** — no hard selling, no urgency tricks |
| **Poetic but clear** — rhythm in the language, meaning in one read | **Flowery or vague** — never sacrifice clarity for ornament |
| **Fair and transparent** — no platform fees, no cut | **Transactional** — we never frame music as a commodity |
| **Modern in convenience** — timezone scheduling, reminders, video rooms | **Tech-first** — tools serve the music, not the other way round |
| **Inclusive** — children to adults, beginners to concert-ready | **Elitist** — never imply you must already be "good" |

### Voice Attributes Detail

#### 1. Reverent of tradition
- **Shows up as:** Sanskrit/Tamil/Telugu musical terms used naturally; "Tradition, kept alive"; "Authentic Carnatic tradition, wherever you are".
- **Avoid:** Fusion/pop framing, trivializing ("fun singing lessons!"), religious claims.
- **Evidence:** Arts home and About pages.
- **Confidence:** High

#### 2. Warm and inviting
- **Shows up as:** "Your musical journey is our…", "Together, let's sing and grow", "Join Cooachly Arts today".
- **Evidence:** Arts home closing banner.
- **Confidence:** High

#### 3. Poetic but clear
- **Shows up as:** Triplets and rhythm ("Sruti. Laya. Bhava."), followed immediately by plain logistics ("fixed 30-minute 1:1 classes").
- **Rule:** One poetic line, then plain facts.
- **Confidence:** Medium-High

#### 4. Fair and transparent
- **Shows up as:** "No payment through the platform, ever", "No booking fee, no subscription, no platform cut".
- **Evidence:** Arts pricing and FAQ.
- **Confidence:** High

#### 5. Inclusive
- **Shows up as:** "All ages & levels", "absolute beginners through concert-ready students", demo assesses your level.
- **Confidence:** High

## Brand Personality
- **Archetype:** *The Gentle Guru* — patient, rooted, generous with knowledge.
- **If Cooachly Arts were a person:** A senior music teacher who welcomes you into their home, asks what you'd like to sing, and makes time for you in your own timezone.
- **Core values in voice:** tradition, devotion to craft, patience, fairness, belonging.

## Messaging Framework

### Primary Value Proposition
> **Live 1:1 Carnatic vocal classes with qualified gurus, in your own timezone, with no platform fees.**

Variations:
- "Live online Carnatic vocal classes, mentored by qualified gurus — book fixed 30-minute 1:1 classes that fit your schedule, in your own timezone." (Arts home)
- "Learn online, sing anywhere." (mission line)
- "Sruti. Laya. Bhava. Passed on, one voice at a time." (About)

### Message Pillars
1. **Authentic tradition.** Real gurus, real Carnatic pedagogy, sarali varisai to concert-ready kritis.
2. **Personal attention.** 1:1 with your own dedicated guru.
3. **No platform fees, ever.** Rate agreed directly with your guru, like a private teacher.
4. **Sing from anywhere.** Timezone-aware scheduling, reminders, built-in video room.
5. **All ages & levels.** Free demo where your guru assesses your level.

### Pillar words (use these four, they're on the site)
**Sruti Shuddham · Personal Attention · Stage-Ready Confidence · Tradition, Kept Alive**

### Proof points you may use
- First class is always a free demo
- Fixed 30-minute 1:1 classes
- No booking fee, no subscription, no platform cut, no payment through the platform
- Every guru vetted before listing; mutual ratings after every class
- Reminders by email and WhatsApp 1 day, 1 hour and 5 minutes before
- Classes cover Raga (melody), Laya (rhythm), Sahitya (lyrics)
- Cancel or reschedule from your bookings page any time before class starts

### Never say
- Any price for classes (gurus set their own rates)
- "Cooachly Arts plans/subscriptions" (there are none)

## Tone-by-Context Matrix

| Context | Formality | Energy | Depth | Key principle |
|---|---|---|---|---|
| Instagram / Facebook / YouTube Shorts | Medium | Calm-warm | Low-Med | One musical idea or term explained beautifully |
| Flyer (temple/community boards, cultural events) | Medium-High | Calm | Low | Poetic headline, three facts, QR to demo |
| WhatsApp broadcast (community groups, opt-in) | Medium | Warm | Low | Respectful, short, one link |
| Guru recruiting | High | Respectful | Medium | Honour their training; "set your own levels, pricing and availability" |
| Festival posts (Navaratri, Tyagaraja Aradhana, Margazhi season) | Medium-High | Celebratory | Medium | Celebrate the tradition, soft CTA only |
| Replies to comments | Medium | Warm | Low | Gracious, brief; "Namaskaram"/"Thank you" both fine |

### Example lines
- Social: *"Every raga begins with sruti. Find yours with a guru who listens — 1:1, live, in your own timezone. Your first class is free. 🎶"*
- Reply: *"Namaskaram! Absolutely no experience needed. In your free demo, your guru will hear you sing and suggest where to begin."*
- Recruiting: *"Teach Carnatic vocals to students across the world, on your terms. Set your own levels, rate and availability. Cooachly Arts takes no cut."*

## Terminology Guide

| Use | Instead of | Notes |
|---|---|---|
| guru | teacher, tutor, coach | Always for Arts |
| class | session, lesson | Arts site says "class" consistently |
| sruti, laya, bhava, raga, sahitya, varnam, kriti, sarali varisai | — | Use the site's spellings; don't over-explain in every post |
| free demo | trial | |
| no platform fees / no platform cut | free platform | Be precise: classes are paid to the guru directly |
| Cooachly Arts | Cooachly Music, CA | Always full name |

## Visual identity
- **Primary:** deep maroon `#7F1D1D` (brand-900), `#B91C1C` (brand-700)
- **Accent:** temple gold `#FCD34D` (accent-300), cream `#FEF3C7` (accent-100)
- **Logo:** `public/icons/arts-512.png` (gold arch with sound waves on maroon)
- **Imagery:** `public/images/arts/hero.jpg` (temple concert with tanpura)
- **Type:** an elegant serif for headlines (e.g. Cormorant / Playfair) + clean sans for body

---

# Part 4 — Open Questions for Team Discussion

### High priority
1. **"Recorded" vs. "not stored"**
   - Found: Home/About (both brands) say sessions "can be recorded and automatically summarized by AI". The README says live transcription stores **no audio/video, just text**.
   - Recommendation: in marketing, say **"AI session summaries emailed after every class"** and never "recorded". Also fix the website copy to match.
   - Need from you: confirm, and say whether transcription is actually switched on in production (if not, drop the AI-summary claim from ads).
2. **Public domain for QR codes and links**
   - Found: no production URL in the repo (`NEXT_PUBLIC_APP_URL` is localhost). Support email uses `cooachly.com`.
   - Recommendation: the sample flyers use `https://cooachly.com/demo` and `https://cooachly.com/arts/demo` with UTM tags.
   - Need from you: confirm the live domain before printing.

### Medium priority
3. **Primary geography and audience**
   - Found: USD pricing and SAT/ACT/PSAT point to US families; the +91 phone number points to India-based operations; timezone messaging points to a global/diaspora audience.
   - Recommendation: lead with "students in the US, UK, Canada, Singapore & beyond, taught live by qualified educators", aimed at parents.
   - Need from you: confirm target countries and whether ads should be aimed at parents, students or both.
4. **Demo length (Cooachly)**
   - Found: Home says "free 30-min demo"; standard sessions are ~45 min.
   - Recommendation: keep "free 30-min demo" as stated.
5. **Social handles**
   - Found: none in the repo.
   - Recommendation: reserve `@cooachly` and `@cooachlyarts` on Instagram, Facebook, YouTube, LinkedIn and X.
6. **Testimonials and results**
   - Found: none on the site.
   - Recommendation: collect 3–5 consented quotes from parents/students (first name + grade/country only) before running ads. Until then, use no testimonials.

---

## Quality check (self-run)
- [x] We Are / We Are Not tables: 6 rows each (≥ 4)
- [x] ≥ 3 voice attributes with evidence per brand (5 each)
- [x] Tone matrix covers ≥ 3 contexts (7 Cooachly, 6 Arts)
- [x] Confidence per attribute; overall Medium
- [x] Every claim traced to a repo source
- [x] No PII beyond the published business phone/email
- [x] Every open question has a recommendation
