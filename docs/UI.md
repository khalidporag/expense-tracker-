# UI specification

Mobile-first (design width 390px), single column, max content width 560px. Bottom tab bar with a raised centre **+** button, bottom-sheet forms.
Light and dark themes (`styles/tokens.css`). **Settings → Appearance** chooses System (follows the phone, live), Light or Dark; the choice is saved on the device and applied before first paint. Visual direction: warm-neutral ground, near-black hero card, blue = healthy / orange = needs attention, Bricolage Grotesque for figures and headings, Figtree for text.
The original design canvas ("Expense Tracker Redesign") is the visual reference; this file is the behavioural spec.

## Opening the app
A short **welcome splash** (logo, name, time-of-day greeting) shows when the app is opened, once per session; tap to skip.

## Use it as an app
On first visits in a browser a slim banner above the tab bar offers to install the app (after the splash). **Android / desktop Chrome:** *Install* opens the browser's own one-tap install prompt. **iPhone/iPad:** Apple gives websites no install button, so *Show me how* opens a three-step sheet (Share → Add to Home Screen → Add). **In-app browsers** (Facebook, Messenger, Instagram…) can't install, so the banner explains how to open the page in Chrome/Safari and offers *Copy link*. *Not now* hides the banner for two weeks; **Settings → Install as an app** (and search) always offer it. Nothing shows once the app is installed (Settings then says *Installed as an app*).

## Navigation
**Top bar** on every screen: a search field and the Settings gear on one row, same height. Tapping the field opens the **search panel**: type to find any screen, setting, action, category or subcategory (typo-tolerant, understands synonyms such as *export*, *night*, *subscription*), or search your entries by text; arrow keys + Enter also work. "Dark theme" etc. act immediately.

**Back button:** closes the topmost thing first (sheet, search panel, a Settings sub-page), then returns to Home from other tabs, and only on Home asks *Exit Expenses?* (Stay / Exit).

Tabs: **Home · History · [+] · Insights · Plan**. *Plan* holds two views, **Budgets** and **Savings**, switched with a control at the top (the tab remembers the last one). **+** opens the New entry sheet from anywhere. Settings (categories, recurring, backup) opens from the sliders button on Home.
The selected month is shared by Home, Insights and Budgets. "See entries" links open History pre-filtered (category + month range).

## Screens
### Home
1. **Hero** (current month, budgets set): *Safe to spend today* = (budget − spent) / days left; progress bar with a "today's pace" marker; one status line (points ahead/under pace, forecast over/under budget) that opens Insights. Without budgets: spent so far + prompt to set budgets. Past months: spent vs budget summary.
2. **Totals**: Income · Spent · Kept.
3. **Do this next** (current month): up to 4 ranked cards — over budget (with the ~daily amount that fits), running low (per-day left + last month's figure), upcoming recurring (next 7 days), or "set budgets". Over-budget cards offer *Move budget* when another category can cover it.
4. **Where it went**: stacked share bar + rows with budget % and ▲/▼ change vs the same days last month. Tap a row to open **category detail**.
5. **Recent**: last 5 entries.

### Insights
Forecast card (projection chart vs last month and budget, comparison chips) · **Make it work** what-if slider (daily cap for one category → where the month ends) · KPIs (projected savings rate, daily average vs last month, fixed costs, no-spend days) · What changed since last month (diverging bars) · Costliest weekdays (after 7 days of data) · Biggest entries.

### Budgets
Summary (left of total, pace marker, per-day available, forecast) · cards per budget with status pill (Over by / left / On track), pace marker and per-day left · suggestion to move unused budget onto an overage · categories without a budget as chips.

### History
Search notes · filter chips (All/Expenses/Income, Category, Subcategory once a category with subcategories is chosen, Dates) · totals for the filtered set · entries grouped by day with the day's net · "Load older entries" (60 at a time).

### Category detail (sheet)
Opened from a Home breakdown row. Month total with change vs last month (same days), then the category split by **subcategory** (amount, entries, share bar, ▲/▼ vs last month; entries without one are "Not assigned"), a 6-month trend bar chart for All or one subcategory, **See entries** (History filtered to it) and **Manage**. A category with no subcategories shows a prompt to add some.

### Savings (Plan → Savings)
- **This month**: saved so far (deposits) against the monthly goal with a progress bar and what is left to do, plus Earned / Spent / Kept. *Set / Edit goal* (fixed amount or % of income) and *Month report*.
- **Plans** (*New savings plan*): **DPS** (monthly installment over 1–10 years), **Sanchay Patra / FDR** (one deposit; profit monthly, quarterly or at maturity) and **Savings goal** (a target by a date; works out the monthly amount). Each card shows progress, status (*Paid this month* / *Due 10 Oct* / *Overdue* / *Matured*), the maturity date with year and the expected payout after tax. Tapping a card opens the plan: payout estimate, **Record a deposit** (pre-filled with the installment), deposit history, edit/delete. The new-plan form shows a live estimate; interest rate and tax are typed in, nothing is pre-filled.
- **Plans total**: what plans commit each month (and whether that covers the goal), deposited so far, expected back at maturity.
- **Last 6 months**: saved vs goal per month (*Met* flag, earned/spent/saved %); tap a month for its report.
- **Month report** (sheet; also via search "Monthly report"): one-line summary (earned, spent, saved), goal progress, kept / moved into savings / left in hand, budget summary, spending by category (share of spending and of income, budget %), income by source.
- Home shows a Savings card (saved vs goal) and, in "Do this next", deposit-due, goal-at-risk and maturing-soon cards.

### More
Settings: **Appearance** (System / Light / Dark) → Categories, Recurring, Backup & restore.

**Categories** has **Expense / Income tabs** (with counts) and a full-width *New expense/income category* button at the top, so adding to either list never needs scrolling; a new category opens on the tab you are viewing. Expense categories also manage their subcategories (add, rename, delete) and the icon picker.

## Add / edit entry (sheet)
Expense/Income toggle → large amount with a **built-in keypad** (no system keyboard; physical digits and Backspace also work) → live **budget impact** line ("Food would be ৳2,950 over budget…") → categories ranked by recent use → optional **subcategory** chips for expenses (with inline *New*; tap again to clear) → *Repeat* chips from recent entries → date (relative label, native picker) and optional note → Save (states the amount). Edit adds Delete. Save is disabled until amount > 0.

## Visual rules
- Money shows as `৳1,234` (poisha only when non-zero); allowances and forecasts are rounded to whole taka.
- **Income amounts are green with `+`, expense amounts red with `−`** (font colour; tokens `--in-ink` / `--out-ink`, both themes). Applies to entries, Income/Spent totals and History day nets; budget progress, trend deltas and *Kept* keep their own colours. Negative values use `−৳`.
- State is never colour alone: pills and text say "Over by", "left", "On track"; over-budget bars are hatched; money keeps its `+` / `−` sign.
- Colours only via CSS variables in `tokens.css`; both themes keep text contrast ≥ 4.5:1. Tap targets ≥ 44px (chips 40px).
- Empty states: one icon + one helpful sentence.
