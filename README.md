# Cooachly

A coaching platform with three roles — **admin**, **professor**, and **student** — built with
Next.js (App Router), TypeScript, Prisma/PostgreSQL, and Stripe.

## Features

- **Role-based accounts** — admin, professor, and student, each with their own dashboard and
  protected routes (enforced both in `src/proxy.ts` and in every server component via
  `src/lib/dal.ts`).
- **Timezone-aware scheduling** — professors set recurring weekly availability once (in their own
  timezone, choosing a session length of 45/60/75/90 minutes per window); students always see open
  slots converted to their own local timezone, priced proportionally to the slot's length.
- **Booking & payments** — students book sessions and pay via Stripe Checkout (one-off per
  session), or subscribe monthly to a professor for unlimited sessions. If Stripe isn't
  configured, bookings are auto-confirmed so you can develop without a Stripe account.
- **Messaging** — simple in-app messaging between students and professors.
- **Video calls** — every confirmed booking gets its own Daily.co video room automatically. If
  `DAILY_API_KEY` isn't set, professors can paste a manual meeting link (Zoom, Google Meet, etc.)
  instead.
- **Optional live transcription + AI session summaries** — set `DAILY_ENABLE_TRANSCRIPTION="true"`
  to transcribe sessions live (Daily + Deepgram, billed per participant-minute — no audio/video is
  stored, just text) and get them summarized (OpenAI GPT) automatically after each class, then
  emailed to both student and professor. Off by default to keep video calls free.
- **Monthly student summaries** — admins can generate a consolidated monthly progress recap per
  student/subject from that month's session summaries, from the Class Logs page.
- **Admin class log** — admins can browse every past session with its transcript and AI summary.
- **Test files & answers** — professors and admins can share a test file on a booking; students
  upload their answer back, both stored via Vercel Blob.
- **Reminders** — automatic email (Resend) and WhatsApp (Twilio) reminders 1 day, 1 hour, and
  5 minutes before each session, sent by a scheduled job hitting `/api/cron/reminders`.
- **Admin panel** — manage user roles/access, extend or join any booking's video call, and see all
  bookings and revenue.
- **About page** at `/about`.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS
- [Prisma](https://www.prisma.io) + PostgreSQL
- Auth: custom email/password auth using signed, httpOnly JWT session cookies ([`jose`](https://github.com/panva/jose) + `bcryptjs`) — no third-party auth provider required
- [Stripe](https://stripe.com) for payments and subscriptions
- [Daily.co](https://daily.co) for video rooms + live transcription
- [OpenAI](https://platform.openai.com) (GPT) for session and monthly AI summaries
- [Resend](https://resend.com) for email, [Twilio](https://twilio.com) for WhatsApp reminders
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for test-file and answer uploads

Every third-party integration above is optional at the code level — if its API key isn't set,
that feature no-ops (logs to the console) instead of crashing, so you can run and demo the app
without signing up for anything, then turn integrations on one at a time.

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random secret used to sign session cookies. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (`http://localhost:3000` locally) |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional in dev — see below) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/stripe/webhook` endpoint |

If you leave the Stripe keys as placeholders, the app runs in **test mode**: bookings are
auto-confirmed without collecting payment, so you can build and demo the whole flow without a
Stripe account.

### 3. Set up the database

You need a PostgreSQL database. Locally you can use Docker:

```bash
docker run --name cooachly-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cooachly -p 5432:5432 -d postgres:16
```

Then point `DATABASE_URL` at it (the default in `.env.example` already matches this setup), and
run the migrations:

```bash
npm run db:migrate
```

### 4. Seed sample data (optional but recommended)

```bash
npm run db:seed
```

This creates three accounts you can log in with immediately:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@cooachly.com` | `ChangeMe123!` |
| Professor | `professor@cooachly.com` | `ChangeMe123!` |
| Student | `student@cooachly.com` | `ChangeMe123!` |

**Change or remove these before going to production.**

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setting up Stripe (optional for local dev, required for real payments)

1. Create a free account at [stripe.com](https://dashboard.stripe.com/register).
2. Copy your **test** publishable and secret keys from
   [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) into `.env`.
3. To receive webhook events locally, install the [Stripe CLI](https://docs.stripe.com/stripe-cli)
   and run:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint in the Stripe dashboard pointing at
   `https://your-domain.com/api/stripe/webhook`, subscribed to at least:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## Setting up reminders (email, WhatsApp)

1. **Email — Resend**: sign up at [resend.com](https://resend.com), verify a sending domain (or
   use their `onboarding@resend.dev` test address to start), create an API key at
   [resend.com/api-keys](https://resend.com/api-keys), and set `RESEND_API_KEY` +
   `RESEND_FROM_EMAIL`.
2. **WhatsApp — Twilio**: sign up at [twilio.com](https://twilio.com), join Twilio's WhatsApp
   sandbox (or apply for a production WhatsApp sender), and set `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` to the number Twilio gives you, e.g.
   `whatsapp:+14155238886`.

   Reminders are sent by WhatsApp only, not SMS — WhatsApp already reaches the same phone number
   at a fraction of the cost, and plain SMS to Indian numbers additionally requires separate DLT
   template pre-registration with Indian telecom regulators before Twilio will even deliver it.

   **Before going live**, submit your reminder message as a WhatsApp message template for Meta's
   approval in the Twilio console (Messaging → Content Editor). Meta requires an approved template
   for any business-initiated message sent outside a 24-hour customer-service window — which
   reminders always are — so free-form messages are rejected once you're off the sandbox, with
   Twilio error **21654 "ContentSid Required"**.

   Submit a template that looks like this (Category: **Utility**, so it doesn't need marketing
   opt-in):

   ```
   Hi {{1}}, this is a reminder that your Cooachly session with {{2}} starts {{3}} ({{4}}).
   Join here: {{5}}
   ```

   Once Meta approves it, copy its **Content SID** (starts with `HX...`) into
   `TWILIO_REMINDER_CONTENT_SID`. Until that's set, reminders send free-form text, which only
   works on the sandbox and will keep failing with 21654 on a real WhatsApp sender.
3. **Scheduling the reminder job**: set `CRON_SECRET` to a random string, then use a free
   external scheduler like [cron-job.org](https://cron-job.org) to call
   `https://your-domain.com/api/cron/reminders?secret=<CRON_SECRET>` every 5 minutes.

   **This step is easy to miss** — without it, `/api/cron/reminders` is never called by anything,
   so no reminder (and no entry in Admin → Bookings' "Reminders" log) will ever appear, even with
   email/WhatsApp fully configured. Check Admin → Bookings after setting this up: you should start
   seeing "Reminders" entries appear within a few minutes of a session's 24h/1h/5m mark.

   (Vercel's own Cron Jobs feature can also call this endpoint via a `vercel.json` `crons` entry,
   but Vercel's **Hobby plan only allows once-a-day cron schedules** — a 5-minute schedule is
   silently rejected and will block every deployment. Stick with an external scheduler like
   cron-job.org unless you're on a Pro plan or above.)

Reminders only go out for **confirmed** bookings, and only once per threshold (tracked via
`reminder24hSentAt` / `reminder1hSentAt` / `reminder5mSentAt` on each booking), so re-running the
job frequently is safe. WhatsApp is skipped for anyone without a phone number on file.

## Setting up video calls & AI summaries (Daily.co + OpenAI)

1. Sign up at [daily.co](https://daily.co) and create an API key at
   [dashboard.daily.co/developers](https://dashboard.daily.co/developers). Set `DAILY_API_KEY`.
   Once set, every confirmed booking automatically gets a video room — no code changes needed.
   Without it, professors fall back to pasting a manual meeting link.
2. **Live transcription + AI summaries are opt-in**, since Daily bills transcription per
   participant-minute. By default (`DAILY_ENABLE_TRANSCRIPTION` unset or `false`), video calls
   work but aren't transcribed, and no summary is generated. To turn transcription + summaries on:
   - In the Daily.co dashboard, go to **Settings → Transcription** and add a Deepgram API key
     (sign up free at [deepgram.com](https://deepgram.com) — this is a separate prerequisite from
     `DAILY_API_KEY` and is required before transcription will work at all).
   - Set `DAILY_ENABLE_TRANSCRIPTION="true"`.
   - In the Daily.co dashboard, add a webhook pointing at `https://your-domain.com/api/daily/webhook`,
     subscribed to both the `meeting.started` event (starts transcription when a call begins) and
     the `transcript.ready-to-download` event (fetches the finished transcript). (Optional: enable
     webhook signing and set `DAILY_WEBHOOK_SECRET` to verify requests.)
   - Sign up at [platform.openai.com](https://platform.openai.com), create an API key, and set
     `OPENAI_API_KEY`. This powers the GPT-generated summary that gets emailed to both parties
     after each session, and the monthly student recaps admins can generate from Class Logs.

No audio or video is ever stored with this approach — only the text transcript, which is both
cheaper and more private than cloud recording.

## Setting up file sharing (Vercel Blob)

Professors/admins can share a test file on a booking, and students can upload their answer back.
This needs blob storage:

1. In your Vercel project, go to **Storage → Create Database → Blob** (free tier available).
2. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` into your production environment once
   connected — no manual copying needed there. For local development, copy the token shown in the
   Blob store's dashboard into your `.env`.

Without this configured, upload attempts show a message asking an admin to set it up, rather than
failing silently.

## Deploying — hosting `cooachly.com`

You already own the domain; the pieces you need are (1) somewhere to run the Next.js app, and
(2) a Postgres database, then (3) pointing the domain at the app. The easiest and cheapest path:

### 1. Push this repo to GitHub

If it isn't already, push this project to a GitHub repository — Vercel deploys straight from Git.

### 2. Create a Postgres database

Any of these work well and have a free tier:

- [Neon](https://neon.tech) (recommended — serverless Postgres, generous free tier)
- [Supabase](https://supabase.com)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (powered by Neon, integrates directly)
- [Railway](https://railway.app)

Create a database and copy its connection string — you'll use it as `DATABASE_URL`.

### 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Vercel auto-detects Next.js — no build settings to change.
3. Add the environment variables from your `.env` (`DATABASE_URL`, `SESSION_SECRET`,
   `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET`) under **Project Settings → Environment Variables**.
   - Set `NEXT_PUBLIC_APP_URL` to `https://cooachly.com` (or the Vercel URL until your domain is
     connected).
4. Deploy. Vercel will run `npm run build`, which runs `prisma generate` automatically
   (see the `postinstall`/`build` scripts in `package.json`).

   > **No deployment showing up?** Vercel only builds on *new* pushes made after the Git
   > connection is created — it won't retroactively build a commit that already existed on
   > `main` before you connected the repo. If Deployments is empty, push any new commit to
   > `main` (or reconnect the repo under Project Settings → Git) to trigger the first build.
5. After the first deploy, run the database migration against your production database once
   (from your machine, with `DATABASE_URL` set to the production connection string):

   ```bash
   npm run db:migrate
   ```

   (Or use `prisma migrate deploy` in a CI step for subsequent deploys.)

### 4. Point cooachly.com at Vercel

1. In your Vercel project, go to **Settings → Domains** and add `cooachly.com` (and `www.cooachly.com`
   if you want both).
2. Vercel will show you DNS records to add. Go to wherever you bought the domain (registrar's DNS
   settings) and add them — typically:
   - **Apex domain (`cooachly.com`)**: an `A` record pointing to `76.76.21.21`
     (Vercel will show the exact current value — use what it gives you).
   - **`www.cooachly.com`**: a `CNAME` record pointing to `cname.vercel-dns.com`.
3. DNS changes can take a few minutes to a few hours to propagate. Vercel automatically issues a
   free SSL certificate once it verifies the domain.
4. Decide whether `cooachly.com` or `www.cooachly.com` is canonical, and set up a redirect for the
   other in Vercel's domain settings (it offers a one-click "redirect to" option).

### 5. Configure the Stripe webhook for production

In the [Stripe dashboard](https://dashboard.stripe.com/webhooks), add an endpoint at
`https://cooachly.com/api/stripe/webhook` and copy its signing secret into Vercel's
`STRIPE_WEBHOOK_SECRET` environment variable. Switch your Stripe API keys from test to live mode
when you're ready to accept real payments.

That's it — `cooachly.com` will serve the app, backed by your Postgres database, with Stripe
handling payments.

## Project structure

```
prisma/schema.prisma        Database schema (User, ProfessorProfile, Availability, Booking, Message, Subscription, Attachment, MonthlySummary)
prisma/seed.ts              Seed script for sample admin/professor/student accounts
src/proxy.ts                Route protection (Next.js 16's replacement for middleware.ts)
src/lib/                    Session/auth, Prisma client, scheduling, Stripe, Daily.co, AI summary, blob storage, DAL helpers
src/lib/notifications/      Email (Resend) + WhatsApp (Twilio) senders
src/actions/                Server Actions (auth, bookings, availability, messages, billing, admin, profile, attachments, monthly-summary)
src/app/(admin|professor|student)/   Role-specific dashboards
src/app/admin/class-logs    Admin view of every past session's transcript/AI summary + monthly recaps
src/app/about               Public "About Cooachly" page
src/app/api/stripe/webhook  Stripe webhook handler
src/app/api/daily/webhook   Daily.co webhook → starts transcription, then summarizes + emails when ready
src/app/api/cron/reminders  Scheduled job: sends 24h/1h/5m reminders for upcoming sessions
```
