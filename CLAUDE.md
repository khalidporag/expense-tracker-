# Expense Tracker — project guide for Claude

Single-user personal expense tracker. Installable PWA used on one phone. **No backend, no accounts, no network calls.**
Read `REQUIREMENTS.md` for scope and `docs/UI.md` for screens before changing behaviour.

## Commands
- `npm run dev` — dev server
- `npm test` — unit tests for `src/lib` and seed data (vitest)
- `npm run check` — tests + production build. **Run before every push.**
- `npm run build && npx vite preview --port 4173`, then `node e2e/smoke.cjs` — browser smoke test at phone size
  (needs Playwright + Chromium; set `PW_MODULE` to the playwright path if `require('playwright')` fails).
  It pins the clock to 18 Oct 2026 and imports `e2e/fixture-backup.json` (regenerate with `node e2e/make-fixture.cjs`),
  so exact figures are asserted. **Check the exit code and the ✓ count — a script that crashes prints no ✗.**

## Stack
React 18 · Vite 5 · Dexie (IndexedDB) + dexie-react-hooks · vite-plugin-pwa · vitest. Fonts bundled via `@fontsource-variable` (Figtree body, Bricolage Grotesque display). Plain JS + CSS (no TypeScript, no UI/CSS framework).

## Folder structure
```
src/
  main.jsx            entry (imports bundled fonts + styles)
  App.jsx             shell: tab state, selected month, add/edit sheet, `go(tab, opts)` navigation, runs recurring on open
  screens/            Home, History, Insights, Budgets, More (+ Categories/Recurring/Backup sub-views)
  forms/              bottom sheets: Transaction (keypad + budget impact), Category (icon picker), Budget, Recurring
  components/         Sheet, BottomNav (centre + button), MonthNav, Bits (Progress, Pill, TxRow, Segmented, CategoryChips, Stat, Empty),
                      Icon/CategoryIcon + iconPaths.js (drawn icons), LineChart (forecast chart)
  hooks/              useCategories, useMonthTransactions, useMonthData (everything a month screen derives, budget-scoped)
  db/
    index.js          Dexie schema + versioned migrations (v1..v4)
    seed.js           default categories, icon keys, emoji -> icon normalisation
    actions.js        ALL writes live here (incl. moveBudget, runRecurring)
    backup.js         JSON export/import
  lib/                PURE logic, no React, no DB, unit-tested: money, dates, recurring, summary, insights
  styles/             tokens.css (light; dark under :root[data-theme='dark']) · base.css · components.css
e2e/                  smoke.cjs (browser test), fixture-backup.json + make-fixture.cjs (the design's sample month)
docs/UI.md            screen specs and design rules
.claude/              settings, session-start hook, slash commands
```
Rule of thumb: logic that can be pure goes in `lib/` with a test; DB writes go in `db/actions.js`; screens only compose.

## Data model (Dexie, DB name `expense-tracker`, schema v4)
- `transactions`: `{id, type:'expense'|'income', amount, categoryId, date, note, recurringId?}`
- `categories`: `{id, name, kind:'expense'|'income', icon, system?}` — `icon` is a key in `components/iconPaths.js` (never emoji); `system` = the "Other" of each kind
- `budgets`: `{id, categoryId (unique), limit}` — monthly limit, expense categories only
- `recurring`: `{id, type, amount, categoryId, note, frequency:'monthly'|'weekly', startDate, lastGenerated, active}`

## Conventions that must not be broken
1. **Money is integer minor units** (poisha; ৳1 = 100). Convert only at the edges with `toMinor` / `formatMoney`. Never store floats.
2. **Dates are local `YYYY-MM-DD` strings; months `YYYY-MM`.** Never use `toISOString()` for "today" (UTC shifts the date near midnight in Bangladesh, UTC+6). Use `lib/dates.js`.
3. **Currency is BDT (৳)**, formatted with `en-BD` grouping. Single currency.
4. **Schema changes = new `db.version(n)` with an `upgrade`.** Never edit a shipped version; users' data lives in their browser.
5. **Deleting never loses data:** deleting a category moves its transactions/recurring rules to that kind's "Other"; "Other" cannot be deleted.
6. **Recurring is idempotent:** generation is driven by `lastGenerated`, occurrences computed from `startDate` (no drift on month ends). Runs on app open and right after a rule is saved.
7. **Backup import replaces everything** and must validate fully before touching the DB.
8. **Mobile first.** Test at 390px width. No horizontal overflow on any screen (inputs need `min-width: 0` inside flex rows). Respect safe-area insets. Tap targets ≥ 40px.
9. **No third-party services, analytics, or network requests.** The app must work fully offline.
10. **Budget math is scoped to budgeted categories** when any budget exists (`useMonthData` → `scopeTxs`), so spending, forecast and budget compare like with like; unbudgeted spend is shown separately. Without budgets, everything uses all spending.
11. **Forecasts are linear** (`spent / day * daysInMonth`) and are labelled as "at today's pace". Safe-to-spend = (budget − spent) / days left, rounded to whole taka. The what-if slider is a calculator only; it never changes data.
12. **Category icons are drawn SVG keys, not emoji.** Add a new icon to `iconPaths.js` and `CATEGORY_ICON_KEYS` (a test checks they match).
13. **Never convey state by colour alone**: over/low/on-track also say it in words and over-budget bars are hatched. Blue/orange (not red/green) for good/bad.
14. **Fonts are bundled** (no CDN); only the Latin subsets are precached for offline use (`vite.config.js`).
15. **Theme is `data-theme` on `<html>`** (`light` | `dark`, resolved from the System/Light/Dark preference in `lib/theme.js`). The preference lives in localStorage (per-device UI setting, not in backups). `index.html` applies it before first paint and has a copy of the logic — keep both in sync. Add new colours as tokens in both blocks of `tokens.css`; never hard-code colours or use `@media (prefers-color-scheme)` in components.
16. **Deploy base path is `/expense-tracker-/`** (`vite.config.js`). Reference public assets with `%BASE_URL%` in `index.html`, never bare `/`.

## Testing expectations
- New logic in `lib/` → add cases to `src/lib/lib.test.js`.
- New user-facing flow → extend `e2e/smoke.cjs` and run it. Don't report a UI change as working from the build alone.
- Fix the cause of failures; don't loosen assertions.

## Git / deploy
- Develop on the branch assigned for the session; push there. Don't open PRs unless asked.
- `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`.
