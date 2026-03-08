# Vannette Vu — Functional Neurology Practice

Full-stack website and admin portal for Vannette Vu's Functional Neurology practice. Built with Next.js 16, TypeScript, Tailwind CSS v4, Prisma 7 + PostgreSQL, and NextAuth v5.

**Live site:** https://vannettevoo.onrender.com  
**Admin portal:** https://vannettevoo.onrender.com/admin/login

---

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | Next.js 16.1.6 (App Router, Turbopack)          |
| Language     | TypeScript 5                                    |
| UI           | React 19, Tailwind CSS v4 (`@theme inline`)     |
| Database     | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)  |
| Auth         | NextAuth v5 (beta) — credentials provider, JWT  |
| Password     | bcryptjs (hashed with 12 salt rounds)           |
| Testing      | Vitest 4 + React Testing Library 16             |
| Deployment   | Render (Blueprint in `render.yaml`)             |

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database models (PostgreSQL)
│   └── seed.ts                # Seeds the admin user
├── render.yaml                # Render deployment blueprint
├── prisma.config.ts           # Prisma CLI config (datasource URL)
├── vitest.config.ts           # Test runner config
├── site-content.json          # Source content (conditions, services, copy)
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Homepage
│   │   ├── about/                       # About page
│   │   ├── services/                    # Services page
│   │   ├── conditions/                  # Condition list + dynamic [slug] pages
│   │   ├── book/                        # Booking page (calendar + form)
│   │   ├── contact/                     # Contact form
│   │   ├── new-patient/                 # New patient info page
│   │   ├── survey/
│   │   │   ├── new/                     # Intake survey (multi-step form)
│   │   │   └── progress/               # Progress survey (ratings + feedback)
│   │   ├── admin/
│   │   │   ├── page.tsx                 # Dashboard (stats, recent bookings)
│   │   │   ├── layout.tsx               # Sidebar nav, auth wrapper
│   │   │   ├── login/                   # Login page (bypasses admin layout)
│   │   │   ├── calendar/               # Calendar blocking UI
│   │   │   ├── patients/               # Patient list + [id] detail page
│   │   │   └── messages/               # Contact message inbox
│   │   └── api/
│   │       ├── auth/[...nextauth]/      # NextAuth route handler
│   │       ├── book/                    # POST — create booking + patient
│   │       ├── contact/                 # POST — save contact message
│   │       ├── survey/                  # POST — save survey + upsert patient
│   │       ├── availability/            # GET  — blocked times for a month
│   │       └── admin/
│   │           ├── blocked-time/        # POST/DELETE blocked times
│   │           ├── blocked-time/bulk/   # POST bulk date-range blocks
│   │           ├── bookings/[id]/       # PATCH booking status
│   │           ├── messages/            # GET/PATCH messages
│   │           ├── patients/            # GET patient list (with search)
│   │           └── patients/[id]/       # GET detail, POST notes
│   ├── components/
│   │   ├── Header.tsx                   # Site header + mobile nav
│   │   ├── Footer.tsx                   # Site footer
│   │   ├── Section.tsx                  # Reusable page section wrapper
│   │   └── ButtonLink.tsx               # Styled link button component
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts                      # NextAuth config (credentials)
│   │   ├── content.ts                   # Loads site-content.json
│   │   └── types.ts                     # Shared TypeScript types
│   ├── middleware.ts                    # Protects /admin/* routes (JWT check)
│   └── test/
│       ├── setup.ts                     # Vitest global setup (jest-dom)
│       └── integration.test.ts          # End-to-end integration tests
└── .env                                 # Local env vars (not committed)
```

---

## Getting Started (Local Development)

### Prerequisites

- **Node.js 20+**
- **PostgreSQL** — local instance or remote (e.g. Render, Supabase, Neon)

### 1. Clone & install

```bash
git clone https://github.com/saykeyo-creator/vannettevoo.git
cd vannettevoo
npm install
```

### 2. Configure environment

Copy `.env` and set your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/vannette"
AUTH_SECRET="any-random-string-for-local-dev"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Push schema & seed admin user

```bash
npx prisma db push        # Creates all tables
npx tsx prisma/seed.ts     # Seeds admin user
```

### 4. Run dev server

```bash
npm run dev
```

Site runs at http://localhost:3000. Admin at http://localhost:3000/admin/login.

---

## Admin Portal

**Default credentials:** `admin@vannettevu.com.au` / `changeme123`

| Page       | Path               | Description                                     |
| ---------- | ------------------ | ----------------------------------------------- |
| Login      | `/admin/login`     | Email + password login                          |
| Dashboard  | `/admin`           | Patient count, pending bookings, unread messages |
| Calendar   | `/admin/calendar`  | Block days/time slots, bulk-block date ranges   |
| Patients   | `/admin/patients`  | Searchable patient list with booking counts     |
| Patient    | `/admin/patients/[id]` | Bookings, surveys (formatted), clinical notes |
| Messages   | `/admin/messages`  | Contact form inbox, mark read/unread            |

### Security

- All `/admin/*` routes (except `/admin/login`) are protected by middleware that checks for a valid JWT token
- The middleware uses `getToken` from `next-auth/jwt` (Edge-compatible — no Node.js crypto)
- Booking API enforces **server-side blocked time validation** — blocked days/slots return 409 even if the client-side calendar doesn't prevent selection
- Passwords are hashed with bcryptjs (12 rounds)

---

## Database

### Schema (Prisma models)

| Model             | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `AdminUser`       | Admin login credentials                    |
| `BlockedTime`     | Calendar blocks (full-day or time-range)   |
| `Patient`         | Patient records (name, email, phone, DOB)  |
| `PatientNote`     | Admin clinical notes per patient           |
| `SurveySubmission`| Intake/progress survey JSON blobs          |
| `Booking`         | Appointment bookings (pending/confirmed/cancelled) |
| `ContactMessage`  | Contact form submissions                   |

### Prisma gotchas

- **Prisma 7** requires an adapter — we use `@prisma/adapter-pg`. You cannot do `new PrismaClient()` with zero arguments; it needs `{ adapter }`.
- The `url` field is NOT in `schema.prisma` (Prisma 7 moved it). Connection string lives in `prisma.config.ts` (for CLI commands) and `src/lib/db.ts` (for runtime).
- Generated client output is `src/generated/prisma/` — this folder is `.gitignored` and regenerated via `prisma generate` (runs automatically in `postinstall` and `build`).
- `prisma db push` (not `prisma migrate deploy`) is fine for local development to quickly sync your schema.
- In production (Render), we use `prisma migrate deploy` with proper migration files in `prisma/migrations/` to prevent accidental data loss.

---

## Testing

### Test Suite Overview

- **22 test files**, **183 tests** total
- **166 unit/component tests** — run with mocked Prisma, no database needed
- **17 integration tests** — run against a real PostgreSQL database

### Run unit tests (no database needed)

```bash
npm test
```

### Run integration tests (requires PostgreSQL)

Set `TEST_DATABASE_URL` in your `.env` to a real PostgreSQL database:

```env
TEST_DATABASE_URL="postgresql://user:password@your-host:5432/vannette_test"
```

Then run:

```bash
npm run test:integration
```

Integration tests are **automatically skipped** when `TEST_DATABASE_URL` is not set. They clean up after themselves (all tables truncated between tests).

### What the integration tests cover

1. **Booking flow** — form submission creates patient + booking, admin can view
2. **Returning patients** — second booking reuses existing patient record
3. **Intake survey** — creates patient from nested survey data
4. **Full patient journey** — booking → intake → progress survey → confirm → note → cancel
5. **Existing patients** — booking/survey with same email reuses patient without overwriting
6. **Contact messages** — submit, fetch, mark read/unread round-trip
7. **Calendar blocking** — single slots, full days, bulk ranges, deletion, availability API
8. **Blocked time enforcement** — bookings rejected on blocked days/slots (409)
9. **Block-then-unblock** — booking rejected while blocked, accepted after removal
10. **Data integrity** — missing email rejects booking/survey, invalid status returns 400
11. **Patient search** — filters by firstName, lastName, email
12. **404 handling** — non-existent patient detail, non-existent booking update

### Test architecture

- **Unit tests** mock `@/lib/db` with `vi.mock` — Prisma methods return controlled data
- **Integration tests** create a real `PrismaClient` with `PrismaPg` adapter, mock only auth
- All tests use Vitest + jsdom environment + React Testing Library
- Test config: `vitest.config.ts`, setup: `src/test/setup.ts`

---

## Deployment (Render)

The project includes a `render.yaml` Blueprint that auto-provisions:

- **PostgreSQL database** (`vannettevoo-db`, free tier)
- **Web service** (`vannettevoo`, Node.js, free tier)
- **Environment variables** (`DATABASE_URL` auto-linked, `AUTH_SECRET` auto-generated)

### Deploy from scratch

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**
3. Connect the GitHub repo, select branch `main`, blueprint path `render.yaml`
4. Click **Apply** — database and web service are created automatically

### Build pipeline (on Render)

```
npm install
  → prisma generate                                 (generates Prisma client)
  → prisma migrate resolve --applied 20260309_init  (baselines existing DB, no-op after first run)
  → prisma migrate deploy                           (applies pending migrations safely)
  → next build                                      (builds Next.js app)
  → npx tsx prisma/seed.ts                          (seeds admin user if not exists)
```

### Render gotchas

- **Free tier spins down** after 15 minutes of inactivity. First request after idle takes ~30 seconds.
- **Free PostgreSQL expires after 90 days** — upgrade to the Starter plan ($7/month) before expiry to keep your data. Starter includes automatic daily backups with 7-day retention.
- The `NEXTAUTH_URL` env var in `render.yaml` is set to `https://vannettevoo.onrender.com`. If your Render URL differs, update it in the Render dashboard under Environment.
- Subsequent pushes to `main` trigger auto-deploy.

### Upgrading the database (recommended for production)

The free PostgreSQL plan has a 1GB storage limit and **expires after 90 days**. For real patient data:

1. Go to [Render Dashboard](https://dashboard.render.com) → your database (`vannettevoo-db`)
2. Click **Upgrade** → select **Starter** ($7/month)
3. This enables:
   - **Automatic daily backups** (7-day retention)
   - **No expiry** — database persists indefinitely
   - **Point-in-time recovery** (paid plans)

### Manual database backup

If you need a manual backup at any time, grab the **External Database URL** from Render Dashboard → your database → Connection Info, then run:

```bash
pg_dump "YOUR_EXTERNAL_DATABASE_URL" > backup_$(date +%Y-%m-%d).sql
```

To restore from a backup:

```bash
psql "YOUR_EXTERNAL_DATABASE_URL" < backup_2026-03-09.sql
```

---

## API Routes

### Public

| Method | Route              | Description                          |
| ------ | ------------------ | ------------------------------------ |
| POST   | `/api/book`        | Create booking (+ find/create patient) |
| POST   | `/api/contact`     | Submit contact message               |
| POST   | `/api/survey`      | Submit intake or progress survey     |
| GET    | `/api/availability`| Get blocked times for a month (`?month=2026-03`) |

### Admin (JWT-protected)

| Method | Route                            | Description                  |
| ------ | -------------------------------- | ---------------------------- |
| POST   | `/api/admin/blocked-time`        | Block a day or time slot     |
| DELETE | `/api/admin/blocked-time`        | Remove a block (`?id=...`)   |
| POST   | `/api/admin/blocked-time/bulk`   | Block a date range           |
| PATCH  | `/api/admin/bookings/[id]`       | Update booking status        |
| GET    | `/api/admin/messages`            | List all contact messages    |
| PATCH  | `/api/admin/messages`            | Toggle message read status   |
| GET    | `/api/admin/patients`            | List patients (`?q=search`)  |
| GET    | `/api/admin/patients/[id]`       | Patient detail + relations   |
| POST   | `/api/admin/patients/[id]/notes` | Add clinical note            |

---

## Key Files Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/db.ts` | Prisma client singleton (uses `PrismaPg` adapter + `DATABASE_URL`) |
| `src/lib/auth.ts` | NextAuth v5 config — credentials provider, JWT sessions |
| `src/middleware.ts` | Protects `/admin/*` routes via `getToken` (Edge-compatible) |
| `prisma.config.ts` | Prisma CLI config — tells `prisma migrate deploy` where the DB is |
| `prisma/schema.prisma` | All database models |
| `prisma/migrations/` | SQL migration files (applied by `prisma migrate deploy`) |
| `prisma/seed.ts` | Creates default admin user |
| `site-content.json` | All static content (conditions, services, copy) |
| `render.yaml` | Render Blueprint for one-click deployment |

---

## Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # prisma generate + migrate deploy + next build
npm start            # Start production server
npm test             # Run unit/component tests
npm run test:integration  # Run integration tests (needs TEST_DATABASE_URL)
npm run test:watch   # Watch mode
npm run lint         # ESLint
```
