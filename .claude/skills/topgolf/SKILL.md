---
name: topgolf
description: >-
  Work on TOPgolf — a personal golf-practice analytics web app (Next.js 15 App
  Router + Supabase + Tailwind, deployed on Vercel) that imports Garmin Approach
  R10 / Garmin Golf iOS CSV exports and turns them into dashboards (distance
  gapping, shot dispersion, club path/face, carry & consistency & side-bias
  trends) plus a manual/scorecard rounds tracker, all with pure-logic analytics
  (no AI APIs). The app is public (no login); a PIN only guards "Clear all data".
  USE THIS SKILL whenever working in the TOPgolf / "Garmin golf
  clone" repo, OR whenever the task touches: parsing Garmin R10 / launch-monitor
  CSV (carry, total, ball/club speed, smash, launch, spin, club path, club face,
  deviation/offline); the golf_sessions / golf_shots / golf_rounds Supabase
  tables; the Clear-all-data PIN check + Forgot-PIN recovery; hand-rolled
  SVG golf charts; the Distance Gapping monitor; per-club Analyze stats with
  "ideal" comparisons; the Gemini scorecard→CSV rounds import; or deploying this
  app to Vercel. Trigger even if the user only says things like "add a stat to
  analyze", "fix the gapping", "import my range data", "the dashboard is slow",
  or mentions golf / Garmin / R10 / club gapping / smash factor without naming
  the app.
---

# TOPgolf — project guide

A single-user web app that ingests **Garmin Approach R10** launch-monitor CSV
(exported from the Garmin Golf iOS app) and helps the owner improve from **~105
to 85**. Everything analytical is plain math — **no AI/LLM calls** (a deliberate
constraint to keep it free); the app instead *exports* CSV and a ready-made
coaching prompt for the user to paste into an external AI.

Repo lives at `Downloads/Garmin golf clone` (package name `topgolf`, GitHub
`toptap0023/topgolf`, Vercel team `trethitipat-gmailcoms-projects`).

## Stack & conventions

- **Next.js 15 (App Router, RSC)** + **React 19** + **Tailwind 3.4** + **TypeScript**.
- **Supabase** (Postgres) via `@supabase/supabase-js` — **no auth, public app**.
  A single shared anon/publishable key; tables namespaced `golf_*` with permissive
  `anon` policies. The only PIN-protected action is **Clear all data** (verified
  server-side against `APP_PASSCODE` in `clearAllData`); there is no site login.
- **Data flow:** Server Components read via `src/lib/data.ts`; mutations are
  Next **server actions** in `src/app/actions.ts` (+ `revalidatePath`). Data
  pages currently use `export const dynamic = "force-dynamic"` (server-rendered
  on every request). That means each visit re-queries Supabase with no caching —
  combined with a far function region it's the main cause of slowness. A known
  win (NOT yet applied) is switching these pages to ISR (`export const revalidate
  = 60`), which stays fresh via the existing `revalidatePath` calls on writes.
- **Charts are hand-rolled SVG/CSS** (no chart library). Reuse the existing ones
  rather than adding a dependency.
- **Theme:** Apple-style CSS-variable tokens in `globals.css` (dark default +
  `.light`), exposed as Tailwind tokens `bg/bg-soft/bg-panel/bg-panel2`, `line`,
  `ink/ink-muted`, `accent` (fairway green), `good/bad/warn/info`. Use these
  tokens — never hardcode hex in components. Numbers use `tnum` (tabular-nums).
- **Bilingual UI:** user is Thai. Coaching/recommendation copy is shown in
  **English then Thai underneath**. Keep that pattern for any new advice text.
- **Mobile-first PWA**, responsive; bottom nav on mobile, inline nav on desktop.

## Data model (`supabase/schema.sql`)

- `golf_sessions` — one per CSV import: `played_on` (date), `title`, `location`,
  `source_filename`, `distance_unit` ('yds'|'m'), `speed_unit`, `notes`.
- `golf_shots` — one row per shot, FK `session_id` (cascade). All metrics are
  **nullable numerics** (a given export/device tier may omit columns): `club`,
  `club_category`, `ball_speed`, `club_speed`, `smash_factor`, `launch_angle`,
  `launch_direction`, `spin_rate`, `spin_axis`, `backspin`, `sidespin`,
  `apex_height`, `carry_distance`, `total_distance`, `carry_deviation_angle`,
  `carry_deviation_distance` (+right / −left), `total_deviation_angle`,
  `total_deviation_distance`, `attack_angle`, `club_path`, `club_face`,
  `face_to_path`, `note`, `raw` (jsonb of the original row).
- `golf_rounds` — manual/scorecard scores: `played_on`, `course`, `score`, `par`,
  `holes`, `putts`, `fairways_hit`, `greens_in_regulation`, `notes`.

Sign conventions: **+ = right, − = left** for lateral/face/path/spin-axis;
club path + = in-to-out, − = out-to-in; club face + = open, − = closed.

## Garmin R10 CSV — the parser (`src/lib/garmin.ts`)

The real export has quirks that already bit us — preserve this handling:

1. **A units row** sits under the header (e.g. `,,,,,[mph],[deg],[Yards]`). It is
   detected (`isUnitsRow`) and skipped, and used to detect units — otherwise it
   imports as a junk "Unknown" shot.
2. **Thai Buddhist-era dates** like `18/5/2569 BE 18:04:36` → AD = BE − 543
   (`parseDate` handles BE + plain D/M/Y). `new Date()` alone can't parse these.
3. **Header mapping** is a synonym table (`SYNONYMS`) keyed on a normalized
   header (lowercased, units/brackets/punctuation stripped). Add new spellings
   there. Header row is auto-found by max-mapped-columns over the first rows.
4. **Numbers** may carry `L`/`R` suffixes or commas; `num()` strips them and
   applies sign (Left negative, Right positive).
5. **Club normalization** (`src/lib/clubs.ts` `normalizeClub`) maps "7 iron",
   "Iron 7", "P. Wedge", "3W", "56°" → a clean label + category, so shots group
   correctly. `clubRank()` gives bag order (Driver first → wedges) used to sort
   the gapping ladder.

Parsing happens **client-side** in the import UI; the parsed canonical shots are
sent to the `importSession` server action. Garmin's date/unit columns vary, so
the importer is tolerant and stores the full original row in `raw`.

## Analytics (`src/lib/stats.ts`) — pure logic, no AI

- `statOf` (n/mean/std/min/max), `aggregateByClub` → `ClubAgg[]` (per-club carry,
  total, smash, launch, spin, lateral bias, club path/face, consistency = carry
  CV%), `dispersionFor` (scatter points + centroid + 1σ), `metricTrend` /
  `consistencyTrend` (per-session series), `slope` (trend direction),
  `shotShape` / `contactQuality` (verdict badges), `SMASH_IDEAL` per category.
- `clubTips(agg)` and `bagTips(aggs)` return short, rule-based recommendations,
  each with **`text` (EN) + `th` (Thai)**. Extend these for new advice.
- Analyze "ideal" comparison labels: a small per-category benchmark table lives
  in `AnalyzeClient.tsx` (`IDEAL`) + `StatCard`'s `ideal` prop renders the pill.

## File map

```
src/lib/
  garmin.ts     Garmin CSV → canonical shots (units row, BE dates, synonyms, L/R)
  roundsCsv.ts  scorecard CSV parser + buildScorecardPrompt (Gemini)
  clubs.ts      normalizeClub, clubRank, CATEGORY_COLOR, SERIES_COLORS
  stats.ts      aggregation, dispersion, trends, tips, ideals
  csv.ts        shotsToCsv / clubTableCsv / roundsToCsv / buildCoachPrompt (export)
  chart.ts      niceNum / niceTicks / pickIndices (SVG axis scaling)
  format.ts     fmt/fmt1/fmt2, lr (±L/R), pm (±), clubPathLabel, faceLabel, dates
  data.ts       server reads (getAllShots, getSessions, getSessionShots, getRounds)
  types.ts      Shot / GolfSession / GolfRound / ShotMetric
  supabase/     server.ts (anon, no cookies) · client.ts (browser)
src/app/
  page.tsx                   Dashboard: goal, KPIs, swing-delivery, gapping, tips, scores, club table
  actions.ts                 server actions: importSession, deleteSession, addRound, importRounds, deleteRound, clearAllData, revealPin
  analyze/page.tsx + components/AnalyzeClient.tsx   per-club deep dive
  import/ sessions/ sessions/[id]/ rounds/ export/ settings/   (no /unlock — gate removed)
components/
  GapMonitor ClubTable DispersionChart TrendChart GoalProgress   (charts/tables)
  ui.tsx (Card/SectionTitle/StatCard/Badge/EmptyState) icons.tsx AppShell ThemeProvider Providers
  ImportClient AnalyzeClient RoundsClient RoundsImport ExportClient SettingsClient DeleteSessionButton
samples/real-session.csv     a real R10 export (good parser test fixture)
```

## Common tasks (follow existing patterns)

- **New per-shot metric:** add the column in `schema.sql` + a synonym in
  `garmin.ts` SYNONYMS + the field in `types.ts Shot` + `NUMERIC_FIELDS`. Surface
  it via `aggregateByClub` and a `StatCard`/column.
- **New stat card on Analyze:** add a `<StatCard>` in `AnalyzeClient.tsx`; give it
  an `ideal` value (per-category benchmark) so users can compare.
- **New chart:** build a pure SVG/CSS component like `TrendChart`/`DispersionChart`
  using `chart.ts` helpers; theme via tokens; add a table/figcaption for a11y.
- **New trend:** `metricTrend(trendData, "<metric>", club)`; the Analyze trend
  window is filtered to the last 1/3/6/12 months (`range` state + `cutoff`).
- **New recommendation:** add a rule to `clubTips`/`bagTips` with both `text` + `th`.
- **CSV/scorecard import format:** Garmin shots → `garmin.ts`; rounds → `roundsCsv.ts`.

## Deploy & ops

- **Hosting:** GitHub `toptap0023/topgolf` → Vercel (auto-deploy on push). The
  user pushes via **GitHub Desktop** (no `gh` CLI on their Mac); Claude cannot
  push or set Vercel env/region — those are the user's dashboard actions.
- **Vercel env vars (Production):** `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_PASSCODE` (6-digit PIN required to
  Clear-all-data), `APP_RECOVERY_CODE` (4-digit code that reveals the PIN via
  Settings → Danger zone → "Forgot PIN?"). `NEXT_PUBLIC_*` are
  inlined at **build** — set them before deploy or redeploy after adding. Missing
  them → runtime `Error: supabaseUrl is required` (500).
- **Next.js version:** must stay on a **patched** release (≥ 15.1.9). Vercel
  hard-blocks deploys of vulnerable Next (CVE-2025-66478 / React2Shell) and marks
  the deployment ERROR even though `next build` succeeds.
- **Speed:** if the live app is slow, the cause is usually the Vercel function
  **region** (default `iad1`/US-East while user + Supabase are in Asia). Tell the
  user to set Function Region → Singapore (`sin1`) and redeploy. Switching the
  `force-dynamic` pages to ISR (above) would compound the win.
- **Clear-data verify:** the site is public (no redirect/gate). Settings → Danger
  zone → "Clear all data" requires the PIN; the "Forgot PIN?" link there reveals
  it via the recovery code (`revealPin`).

## Dev gotchas

- **Never run `npm run build` while `next dev` is running** — they share `.next`
  and it corrupts the dev server ("Cannot find module './xxx.js'"). Stop the dev
  server, `rm -rf .next`, build, then restart.
- Verify changes with `npm run build` (type-check) + the preview tools. The
  preview screenshot tool sometimes desyncs from navigation — trust DOM
  inspection (`preview_eval`) over a screenshot that looks stale.
- `localStorage` theme key is `topgolf:theme`.
