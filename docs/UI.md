# UI specification

Mobile-first (design width 390px), single column, max content width 560px. Bottom tab bar with a raised centre **+** button, bottom-sheet forms.
Light and dark themes follow the system setting (`styles/tokens.css`). Visual direction: warm-neutral ground, near-black hero card, blue = healthy / orange = needs attention, Bricolage Grotesque for figures and headings, Figtree for text.
The original design canvas ("Expense Tracker Redesign") is the visual reference; this file is the behavioural spec.

## Navigation
Tabs: **Home · History · [+] · Insights · Budgets**. **+** opens the New entry sheet from anywhere. Settings (categories, recurring, backup) opens from the sliders button on Home.
The selected month is shared by Home, Insights and Budgets. "See entries" links open History pre-filtered (category + month range).

## Screens
### Home
1. **Hero** (current month, budgets set): *Safe to spend today* = (budget − spent) / days left; progress bar with a "today's pace" marker; one status line (points ahead/under pace, forecast over/under budget) that opens Insights. Without budgets: spent so far + prompt to set budgets. Past months: spent vs budget summary.
2. **Totals**: Income · Spent · Kept.
3. **Do this next** (current month): up to 4 ranked cards — over budget (with the ~daily amount that fits), running low (per-day left + last month's figure), upcoming recurring (next 7 days), or "set budgets". Over-budget cards offer *Move budget* when another category can cover it.
4. **Where it went**: stacked share bar + rows with budget % and ▲/▼ change vs the same days last month.
5. **Recent**: last 5 entries.

### Insights
Forecast card (projection chart vs last month and budget, comparison chips) · **Make it work** what-if slider (daily cap for one category → where the month ends) · KPIs (projected savings rate, daily average vs last month, fixed costs, no-spend days) · What changed since last month (diverging bars) · Costliest weekdays (after 7 days of data) · Biggest entries.

### Budgets
Summary (left of total, pace marker, per-day available, forecast) · cards per budget with status pill (Over by / left / On track), pace marker and per-day left · suggestion to move unused budget onto an overage · categories without a budget as chips.

### History
Search notes · filter chips (All/Expenses/Income, Category, Dates) · totals for the filtered set · entries grouped by day with the day's net · "Load older entries" (60 at a time).

### More
Settings list → Categories (icon picker), Recurring, Backup & restore.

## Add / edit entry (sheet)
Expense/Income toggle → large amount with a **built-in keypad** (no system keyboard; physical digits and Backspace also work) → live **budget impact** line ("Food would be ৳2,950 over budget…") → categories ranked by recent use → *Repeat* chips from recent entries → date (relative label, native picker) and optional note → Save (states the amount). Edit adds Delete. Save is disabled until amount > 0.

## Visual rules
- Money shows as `৳1,234` (poisha only when non-zero); allowances and forecasts are rounded to whole taka.
- Expenses neutral with `−`, income blue with `+`; negative values use `−৳`.
- State is never colour alone: pills and text say "Over by", "left", "On track"; over-budget bars are hatched.
- Colours only via CSS variables in `tokens.css`; both themes keep text contrast ≥ 4.5:1. Tap targets ≥ 44px (chips 40px).
- Empty states: one icon + one helpful sentence.
