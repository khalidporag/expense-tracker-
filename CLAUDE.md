# Expense Tracker — project guide for Claude

Single-user personal expense tracker. Installable PWA used on one phone. **No backend, no accounts, no network calls.**
Read `REQUIREMENTS.md` for scope and `docs/UI.md` for screens before changing behaviour.

## Commands
- `npm run dev` — dev server
- `npm test` — unit tests for `src/lib` (vitest)
- `npm run check` — tests + production build. **Run before every push.**
- `npm run build && npx vite preview --port 4173`, then `node e2e/smoke.cjs` — browser smoke test at phone size
  (needs Playwright + Chromium; set `PW_MODULE` to the playwright path if `require('playwright')` fails)

## Stack
React 18 · Vite 5 · Dexie (IndexedDB) + dexie-react-hooks · vite-plugin-pwa · vitest. Plain JS + CSS (no TypeScript, no UI/CSS framework).

## Folder structure
```
src/
  main.jsx            entry
  App.jsx             shell: tab state, selected month, add/edit sheet, runs recurring on open
  screens/            one file per tab: Home, History, Budgets, More (+ Categories/Recurring/Backup sub-views)
  forms/              bottom-sheet forms: Transaction, Category, Budget, Recurring
  components/         shared UI: Sheet, BottomNav, MonthNav, Bits (Empty, Progress, TxRow, Segmented, CategoryChips)
  hooks/              live-query hooks (useCategories, useMonthTransactions)
  db/
    index.js          Dexie schema + versioned migrations
    seed.js           default categories
    actions.js        ALL writes live here (components never touch db tables to write, except read-only counts)
    backup.js         JSON export/import
  lib/                PURE logic, no React, no DB, fully unit-tested: money, dates, recurring, summary
  styles/             tokens.css (colors/sizes) · base.css · components.css
e2e/smoke.cjs        browser smoke test
docs/UI.md           screen specs and design rules
.claude/             settings, session-start hook, slash commands
```
Rule of thumb: logic that can be pure goes in `lib/` with a test; DB writes go in `db/actions.js`; screens only compose.

## Data model (Dexie, DB name `expense-tracker`, schema v3)
- `transactions`: `{id, type:'expense'|'income', amount, categoryId, date, note, recurringId?}`
- `categories`: `{id, name, kind:'expense'|'income', icon, system?}` — `system` = the "Other" of each kind
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
10. **Deploy base path is `/expense-tracker-/`** (`vite.config.js`). Reference public assets with `%BASE_URL%` in `index.html`, never bare `/`.

## Testing expectations
- New logic in `lib/` → add cases to `src/lib/lib.test.js`.
- New user-facing flow → extend `e2e/smoke.cjs` and run it. Don't report a UI change as working from the build alone.
- Fix the cause of failures; don't loosen assertions.

## Git / deploy
- Develop on the branch assigned for the session; push there. Don't open PRs unless asked.
- `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`.
