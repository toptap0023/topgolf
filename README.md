# TOPgolf — Personal Golf Practice Analytics

Import the CSV your **Garmin Approach R10 / Garmin Golf app** exports from a range
session, and TOPgolf turns it into a clean dashboard: distance gapping, shot
dispersion, contact quality, shot shape, and trends over time — plus a score log
to track your journey from **105 → 85**. All analysis is plain math (no AI, no
paid APIs). When you want coaching, export a CSV or a ready-made prompt and paste
it into Gemini / ChatGPT / Claude.

Built with **Next.js 15** (App Router) + **Supabase** (Postgres) + **Tailwind CSS**,
deployable free on **Vercel**. Mobile-first PWA; dark OLED theme with a light mode.

> **Single-user PIN gate.** No accounts — the whole site sits behind one
> passphrase (`APP_PASSCODE`), checked server-side in `middleware.ts`. Enter it
> once per device (no timeout). "Forgot PIN?" reveals it when you enter
> `APP_RECOVERY_CODE`. Clearing all data also requires the PIN. (The Supabase
> anon key is still public, so this deters casual access rather than being
> hardened auth — fine for a private personal URL.)

---

## Features

- **Import** — drop or paste a Garmin range CSV. The parser auto-detects columns,
  units (yds/m, mph/kph), club names, and the session date, then previews before
  saving. Robust to column-order and naming differences; L/R values are handled.
- **Dashboard** — goal progress (105 → 85), headline stats, distance-gapping bar
  chart, a shot-pattern plot, recent scores, and a full per-club table.
- **Analyze** — pick any club for its dispersion ellipse, carry trend, and
  consistency (carry σ) trend across sessions, with shot-shape and contact verdicts.
- **Sessions** — every import is a session you can open or delete.
- **Rounds** — log 18-hole scores; see your score trend against the 85 target line.
- **Export** — download a clean per-shot CSV, a per-club summary CSV, or copy an
  **AI coach prompt** with your stats baked in.

Charts are hand-rolled SVG — no charting library.

---

## 1. Set up the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com) (or reuse one).
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql),
   and **Run**. This creates the `golf_sessions`, `golf_shots`, and `golf_rounds`
   tables with public (anon) access policies.
3. **Project Settings → API**, copy the **Project URL** and the **publishable**
   (anon) key.

## 2. Run locally

```bash
cp .env.local.example .env.local   # paste your URL + publishable key
npm install
npm run dev                         # http://localhost:3000
```

`.env.local` for this project is already filled in with the connected Supabase
project.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In [Vercel](https://vercel.com) → **Add New → Project**, import it
   (framework auto-detects as **Next.js**).
3. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_PASSCODE` — the PIN that unlocks the site (e.g. `232537`). Leave blank to disable the gate.
   - `APP_RECOVERY_CODE` — shown-on-request code that reveals the PIN via "Forgot PIN?" (e.g. `2310`).
4. **Deploy.** On your phone, open the URL → Share → **Add to Home Screen** for a
   full-screen app. First visit asks for the PIN once per device (no timeout).

---

## Exporting from the Garmin Golf app

Open a **range/practice session** in the Garmin Golf app → the **⋯ / share** menu
→ **Export** or **Share** → choose **CSV**. Save or paste that file into TOPgolf's
**Import** screen. A worked example lives in
[`sample-garmin-data.csv`](sample-garmin-data.csv).

### Columns the parser understands

Club, Date/Time, Ball Speed, Club (Head) Speed, Smash Factor, Launch Angle,
Launch Direction, Spin Rate, Spin Axis, Backspin, Sidespin, Apex Height, Carry
Distance, Total Distance, Carry/Total Deviation Angle & Distance, Attack Angle,
Club Path, Club Face, Face to Path. Unrecognized columns are ignored (and the
original row is kept verbatim for export). If a column from your file isn't being
picked up, add its header spelling to `SYNONYMS` in [`src/lib/garmin.ts`](src/lib/garmin.ts).

---

## Project structure

```
src/
  app/
    layout.tsx  page.tsx (dashboard)  actions.ts (server actions)
    import/  sessions/  sessions/[id]/  analyze/  rounds/  export/  settings/
  components/        AppShell, charts (Dispersion/Trend/Gapping), tables, UI, clients
  lib/
    garmin.ts        CSV → canonical shots (header mapping, units, L/R, clubs)
    stats.ts         per-club aggregation, dispersion, trends, shot shape, contact
    csv.ts           CSV export + AI coach prompt
    chart.ts  clubs.ts  format.ts  data.ts  types.ts  supabase/
supabase/schema.sql  database schema + RLS
```

## Notes

- Distances/speeds follow each imported session's detected units; the dashboard
  labels with the most recent session's units (default yds / mph).
- "Smash factor" ideals: Driver ≈ 1.49, woods ≈ 1.48, hybrids ≈ 1.45,
  irons ≈ 1.38, wedges ≈ 1.25 — used to flag contact quality.
- Shot shape assumes a right-handed golfer (+ lateral = right).
