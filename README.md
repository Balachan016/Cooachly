# Cooachly

A coaching platform with three roles — **admin**, **professor**, and **student** — built with
Next.js (App Router), TypeScript, Prisma/PostgreSQL, and Stripe.

## Features

- **Role-based accounts** — admin, professor, and student, each with their own dashboard and
  protected routes (enforced both in `src/proxy.ts` and in every server component via
  `src/lib/dal.ts`).
- **Timezone-aware scheduling** — professors set recurring weekly availability once (in their own
  timezone); students always see open 1-hour slots converted to their own local timezone.
- **Booking & payments** — students book sessions and pay via Stripe Checkout (one-off per
  session), or subscribe monthly to a professor for unlimited sessions. If Stripe isn't
  configured, bookings are auto-confirmed so you can develop without a Stripe account.
- **Messaging** — simple in-app messaging between students and professors.
- **Video calls with cloud recording** — every confirmed booking gets its own Daily.co video
  room automatically. If `DAILY_API_KEY` isn't set, professors can paste a manual meeting link
  (Zoom, Google Meet, etc.) instead.
- **AI session summaries** — recordings are transcribed (OpenAI Whisper) and summarized
  (OpenAI GPT) automatically after each session, then emailed to both student and professor.
- **Reminders** — automatic email (Resend), SMS, and WhatsApp (Twilio) reminders 1 day, 1 hour,
  and 5 minutes before each session, sent by a scheduled job hitting `/api/cron/reminders`.
- **Admin panel** — manage user roles/access and see all bookings and revenue.
- **About page** at `/about`.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS
- [Prisma](https://www.prisma.io) + PostgreSQL
- Auth: custom email/password auth using signed, httpOnly JWT session cookies ([`jose`](https://github.com/panva/jose) + `bcryptjs`) — no third-party auth provider required
- [Stripe](https://stripe.com) for payments and subscriptions
- [Daily.co](https://daily.co) for video rooms + cloud recording
- [OpenAI](https://platform.openai.com) (Whisper + GPT) for transcription and AI summaries
- [Resend](https://resend.com) for email, [Twilio](https://twilio.com) for SMS/WhatsApp reminders

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

## Setting up reminders (email, SMS, WhatsApp)

1. **Email — Resend**: sign up at [resend.com](https://resend.com), verify a sending domain (or
   use their `onboarding@resend.dev` test address to start), create an API key at
   [resend.com/api-keys](https://resend.com/api-keys), and set `RESEND_API_KEY` +
   `RESEND_FROM_EMAIL`.
2. **SMS + WhatsApp — Twilio**: sign up at [twilio.com](https://twilio.com), buy a phone number
   (for SMS) from the console, and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_SMS_FROM`. For WhatsApp, join Twilio's WhatsApp sandbox (or apply for a production
   WhatsApp sender) and set `TWILIO_WHATSAPP_FROM` to the number Twilio gives you, e.g.
   `whatsapp:+14155238886`.
3. **Scheduling the reminder job**: set `CRON_SECRET` to a random string, then either:
   - Rely on the `vercel.json` in this repo, which asks Vercel to hit `/api/cron/reminders`
     every 5 minutes (Vercel automatically sends the right `Authorization` header when
     `CRON_SECRET` is set as an env var) — check your Vercel plan supports this frequency, or
   - Use a free external scheduler like [cron-job.org](https://cron-job.org) to call
     `https://your-domain.com/api/cron/reminders?secret=<CRON_SECRET>` every 5 minutes instead.

Reminders only go out for **confirmed** bookings, and only once per threshold (tracked via
`reminder24hSentAt` / `reminder1hSentAt` / `reminder5mSentAt` on each booking), so re-running the
job frequently is safe. SMS/WhatsApp are skipped for anyone without a phone number on file.

## Setting up video calls & AI summaries (Daily.co + OpenAI)

1. Sign up at [daily.co](https://daily.co) and create an API key at
   [dashboard.daily.co/developers](https://dashboard.daily.co/developers). Set `DAILY_API_KEY`.
   Once set, every confirmed booking automatically gets a recorded video room — no code changes
   needed. Without it, professors fall back to pasting a manual meeting link.
2. In the Daily.co dashboard, add a webhook subscribed to the `recording.ready-to-download`
   event, pointing at `https://your-domain.com/api/daily/webhook`. (Optional: enable webhook
   signing and set `DAILY_WEBHOOK_SECRET` to verify requests.)
3. Sign up at [platform.openai.com](https://platform.openai.com), create an API key, and set
   `OPENAI_API_KEY`. This powers both the Whisper transcription and the GPT-generated summary
   that gets emailed to both parties after each session.

Note: Whisper's API caps uploads at 25MB, which covers roughly an hour of compressed audio —
fine for a single coaching session, but very long sessions may need to be trimmed.

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
prisma/schema.prisma        Database schema (User, ProfessorProfile, Availability, Booking, Message, Subscription)
prisma/seed.ts              Seed script for sample admin/professor/student accounts
src/proxy.ts                Route protection (Next.js 16's replacement for middleware.ts)
src/lib/                    Session/auth, Prisma client, scheduling, Stripe, Daily.co, AI summary, DAL helpers
src/lib/notifications/      Email (Resend) + SMS/WhatsApp (Twilio) senders
src/actions/                Server Actions (auth, bookings, availability, messages, billing, admin, profile)
src/app/(admin|professor|student)/   Role-specific dashboards
src/app/about               Public "About Cooachly" page
src/app/api/stripe/webhook  Stripe webhook handler
src/app/api/daily/webhook   Daily.co recording-ready webhook → transcribe + summarize + email
src/app/api/cron/reminders  Scheduled job: sends 24h/1h/5m reminders for upcoming sessions
```
