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
  screens/            Home, History, Insights, Plan (= Budgets + Savings, segmented), More (+ Categories/Recurring/Backup sub-views)
  forms/              bottom sheets: Transaction (keypad + budget impact), Category (icon picker + subcategories), Budget, Recurring, CategoryDetail (usage by subcategory), PlanForm / PlanDetail / SavingsTargetForm / MonthReport (savings)
  components/         Sheet, BottomNav (centre + button), MonthNav, Bits (Progress, Pill, TxRow, Segmented, CategoryChips, Stat, Empty),
                      Icon/CategoryIcon + iconPaths.js (drawn icons), LineChart (forecast chart), SubcategoryPicker, SubcategoryEditor,
                      TopBar (search + gear), SearchPalette (smart search), Splash (welcome), ExitDialog, InstallBanner, InstallGuide
  hooks/              useSavings, useInstall (InstallProvider: "use it as an app" prompt), useBackHandler + useExitGuard (phone Back button), useCategories, useSubcategories, useMonthTransactions, useMonthData (everything a month screen derives, budget-scoped)
  db/
    index.js          Dexie schema + versioned migrations (v1..v6)
    seed.js           default categories, icon keys, emoji -> icon normalisation
    actions.js        ALL writes live here (incl. moveBudget, runRecurring)
    backup.js         JSON export/import
  lib/                PURE logic, no React, no DB, unit-tested: money, dates, recurring, summary, insights, subcategories, search, backStack, splash, install, savings, theme
  styles/             tokens.css (light; dark under :root[data-theme='dark']) · base.css · components.css
e2e/                  smoke.cjs (browser test), fixture-backup.json + make-fixture.cjs (the design's sample month)
scripts/make-icons.py regenerates public/icon-*.png (pure Python)
docs/UI.md            screen specs and design rules
.claude/              settings, session-start hook, slash commands
```
Rule of thumb: logic that can be pure goes in `lib/` with a test; DB writes go in `db/actions.js`; screens only compose.

## Data model (Dexie, DB name `expense-tracker`, schema v6)
- `transactions`: `{id, type:'expense'|'income', amount, categoryId, subcategoryId?, date, note, recurringId?}`
- `categories`: `{id, name, kind:'expense'|'income', icon, system?}` — `icon` is a key in `components/iconPaths.js` (never emoji); `system` = the "Other" of each kind
- `subcategories`: `{id, categoryId, name}` — optional detail under an **expense** category (Utility bills → Electricity, Gas)
- `budgets`: `{id, categoryId (unique), limit}` — monthly limit, expense categories only
- `plans`: `{id, kind:'dps'|'lump'|'goal', name, startDate, termMonths, rateBp, taxBp, active, installment (dps/goal), principal+payout:'monthly'|'quarterly'|'maturity' (lump), target (goal)}` — rates in **basis points** (950 = 9.5%/yr)
- `deposits`: `{id, planId, date, amount, note?}` — money actually put into a plan. **Savings, never expenses.**
- `settings`: `{key, value}` — `savingsTarget`: `{mode:'amount', amount}` or `{mode:'percent', percent}`
- `recurring`: `{id, type, amount, categoryId, subcategoryId?, note, frequency:'monthly'|'weekly', startDate, lastGenerated, active}`

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
13. **Never convey state by colour alone**: over/low/on-track also say it in words and over-budget bars are hatched. Budget/trend states use blue/orange. **Money amounts are green (income) and red (expense) in the font colour — the user's explicit choice — via `--in-ink` / `--out-ink` (`.money-in` / `.money-out`, `.amt`), and always carry a `+` / `−` sign.** Applies to entry amounts, Income/Spent totals, History day nets; budget bars, deltas and the Kept total keep their own colours.
14. **Fonts are bundled** (no CDN); only the Latin subsets are precached for offline use (`vite.config.js`).
15. **Theme is `data-theme` on `<html>`** (`light` | `dark`, resolved from the System/Light/Dark preference in `lib/theme.js`). The preference lives in localStorage (per-device UI setting, not in backups). `index.html` applies it before first paint and has a copy of the logic — keep both in sync. Add new colours as tokens in both blocks of `tokens.css`; never hard-code colours or use `@media (prefers-color-scheme)` in components.
16. **Subcategories are an optional label, not a second category.** A transaction keeps its normal `categoryId` (so every category total, budget, forecast and insight is unchanged) and may carry `subcategoryId`. Budgets stay on the category. A subcategory that no longer exists counts as "Not assigned". Deleting a subcategory only removes the label; deleting a category deletes its subcategories and moves its entries to "Other" without a label. Backups: `subcategories` is optional on import (older files) and dangling labels are dropped.
17. **The phone's Back button never closes the app by surprise.** `useExitGuard` keeps history as `[root, guard]`; Back pops the guard and `lib/backStack` lets the newest open thing handle it first (sheet → Settings sub-page → leave a tab for Home → search panel). Anything that closes on Back must register with `useBackHandler` (`Sheet` already does). Only when nothing handles it does the "Exit Expenses?" dialog appear. Exit tries `window.close()`, then `history.back()`, then shows a hint (browsers may refuse to close a page). Don't add history entries elsewhere.
18. **Search is a registry of items in `SearchPalette.buildItems`.** A new screen, setting or action must be added there with plain-language `keywords` (synonyms are what make it smart). Ranking lives in `lib/search.js` (typo-tolerant, every word must match). Search and the Settings gear live together in `TopBar`, always at the top, same height.
19. **Welcome splash** shows once per browsing session (`lib/splash.js`); automated browsers skip it (`navigator.webdriver`) and `?splash=1` forces it. Don't block data loading on it.
20. **"Use it as an app" prompt** (`hooks/useInstall.jsx`, `lib/install.js`). Android/desktop Chrome: catch `beforeinstallprompt` at load (it fires once, maybe before React mounts), show our banner, call `prompt()` on tap. **iPhone has no web install API** — show the Share → Add to Home Screen how-to; never claim one-tap on iOS. In-app browsers (Facebook, Instagram, WebViews) cannot install: say to open the link in the real browser, with Copy link. The banner waits for the splash, hides once installed, and snoozes 14 days after "Not now"; Settings and search always keep "Install as an app". Automated browsers don't see the banner unless `?install=1`. The manifest must keep valid `any` and `maskable` icons, `id`, and `start_url`/`scope` under the base path, or browsers stop offering install.
21. **Savings are tracked apart from spending.** A deposit into a plan is *not* an expense and never appears in "Spent", budgets or the spending forecast; "Saved" = the month's deposits, "Kept" = income − expenses, "Left in hand" = kept − saved. `lib/savings.js` holds all the maths (DPS = equal installments at the start of each month, interest compounded quarterly; Sanchay Patra / FDR = monthly or quarterly profit paid out, or compounded to maturity; source tax on the interest). **Never ship default interest rates or assume a tax rate**: they change and cannot be verified, so the user types what the bank or National Savings office quotes (tax is only an editable 10% starting point). Everything is labelled an estimate. Rates are integer basis points. Backups: `plans`, `deposits`, `settings` are optional on import (older files); deposits whose plan is missing are dropped.
22. **Plan tab = Budgets + Savings.** The tab id stays `budgets` (label "Plan"); `go('savings')` opens it on Savings, `go('budgets')` on Budgets, and tapping the tab bar keeps the last view. New savings facts for "Do this next" go through `savingsSignals` → `buildActions` (deposit due, goal at risk after mid-month, maturing within 60 days).
23. **Deploy base path is `/expense-tracker-/`** (`vite.config.js`). Reference public assets with `%BASE_URL%` in `index.html`, never bare `/`.

## Testing expectations
- New logic in `lib/` → add cases to `src/lib/lib.test.js`.
- New user-facing flow → extend `e2e/smoke.cjs` and run it. Don't report a UI change as working from the build alone.
- Fix the cause of failures; don't loosen assertions.

## Git / deploy
- Develop on the branch assigned for the session; push there. Don't open PRs unless asked.
- `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`.
