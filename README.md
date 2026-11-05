# XSalute — Samson's Dressage Training Plan 2026

**XSalute** by Virtual Dressage NZ — PLAN · TRAIN · COMPETE · REFLECT. The name refers to the halt and salute at X that starts and finishes every dressage test.

This is Samson's plan: a Level 2 Super 5 season planner for Jura Samson.

## Run
Node.js 22+.
```
npm install
npm run dev
```
Opens on http://localhost:8080

Judge-sheet summaries need `XAI_API_KEY` in the environment.
The freestyle MP3 is not in this repo. Put it at `public/audio/samson-l2-mfs.mp3` if you have it.
Competition videos, sheet photos and freestyle music files stay in the browser that took them.

## Riders, plans and data

* `/join` — beta application (rider grade, horses with level and optional ESNZ number).
* Approved riders get a first-login **setup wizard** (per horse: tests, target shows, goals,
  optional freestyle music) that generates their own season plan — Foundation, Consolidate,
  Prepare, Compete — via `src/lib/plan-builder.ts`, which shares the week engine in `src/lib/season.ts`.
* Samson's hand-written plan is shown only to the owner (admin). On first login the owner can
  import this device's localStorage data into Postgres; after that it stays in sync. localStorage
  is never cleared automatically.
* Per-rider data (riders, horses, plans, results, ride notes, judge-sheet summaries) lives in
  Postgres — see `migrations/0004_rider_workspace.sql`.
* `/admin` — approve riders and import EVO Events results CSVs (see `docs/evo-results-import.md`).
* Admin access requires **Google** sign-in with an address in `BETA_ADMIN_EMAILS`.

## Environment

| Var | Needed for |
|---|---|
| `DATABASE_URL` | Neon Postgres (prod). Migrations run on `npm run build`. |
| `XAI_API_KEY` | Judge-sheet reading. |
| `RESEND_API_KEY` | Password reset emails + new-application alerts. Unset → reset link becomes "Contact us", alerts skipped. |
| `EMAIL_FROM` | Sender, e.g. `XSalute <hello@virtualdressage.co.nz>` (domain verified in Resend). |
| `BETTER_AUTH_URL` | Public app URL (used in reset links and the admin link in alerts). |
| `BETA_NOTIFY_EMAILS` | Optional: who gets new-application alerts (default: admin emails; `off` to disable). |
| `BETA_ADMIN_EMAILS` | Optional: admin addresses (default Susan's two). |
| `BETA_ADMIN_TRUST_PASSWORD` | Local testing only — never set in production. |
