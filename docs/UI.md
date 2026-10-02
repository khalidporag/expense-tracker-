# UI specification

Mobile-first (design width 390px), single column, max content width 560px. Bottom tab bar, floating **+** button, bottom-sheet forms.
Light and dark themes follow the system setting (`styles/tokens.css`).

## Navigation
Bottom tabs: **Home · History · Budgets · More**. The **+** FAB (bottom-right, above the tab bar) opens the New entry sheet on Home, History and Budgets (hidden on More).
Selected month is shared between Home and Budgets.

## Screens
### Home
```
 ‹   October 2026   ›
┌───────────────────────┐
│ Balance               │
│ ৳48,499.50            │
│ Income        Spent   │
│ ৳50,000.00  ৳1,500.50 │
└───────────────────────┘
┌ Budget alerts ────────┐   only when a budget is ≥80% or over; tap → Budgets
│ 🍽️ Food   Over by ৳200 │
└───────────────────────┘
┌ Where it went ────────┐   expense by category, sorted desc
│ 🍽️ Food  ▓▓▓▓░  ৳1,200 │
└───────────────────────┘
Recent                See all
 🚌 Transport  -৳300.00     last 5 entries; tap to edit
```
### History
Search box (notes) + filter button. Filters: type (All/Expense/Income), category, from/to date. Summary line ("N entries · spent · income"). Entries grouped by day, newest first. Tap to edit.

### Budgets
Month nav. Cards for categories with a limit: name, "৳X left" / "Over by ৳X", progress bar (teal < 80%, amber ≥ 80%, red > 100%), "spent of limit". Categories without a budget appear as chips; tap to set a limit. Tap a card to edit/remove.

### More
List → **Categories** (add/rename/re-icon/delete), **Recurring** (add/edit/pause/delete), **Backup & restore**.

## Sheets
- **New/Edit entry:** Expense/Income toggle → big amount field (numeric keypad) → category chips → date (default today) → note → Save. Edit adds Delete.
- Save is disabled until amount > 0 and a category is chosen.
- Destructive actions use `confirm()` and say what happens to related data.

## Visual rules
- Amounts: expenses neutral with `-`, income green with `+`; negative balance red.
- Money always shown as `৳1,234.50` (2 decimals).
- Empty states: an emoji + one helpful sentence.
- Colors only via CSS variables in `tokens.css`; both themes must keep text contrast ≥ 4.5:1.
- Don't rely on color alone: budget states also say "left" / "Over by".
