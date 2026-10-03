# Requirements

Personal expense tracker for one user, installed on a phone as a PWA.

## Decisions
- Platform: PWA (React + Vite), hosted on GitHub Pages
- Currency: BDT (৳)
- Data: stored on the phone (IndexedDB), manual JSON export/import for backup
  - Decided: phone-only for now; cloud sync (Supabase) deferred and can be added later

## Functional requirements
1. **Expenses**: add, edit, delete (amount, category, date, note)
2. **Income**: add, edit, delete; monthly balance = income - expenses
3. **Categories**: user can add, rename, delete (default set provided)
   - Deleting a category in use must not lose its expenses (reassign to "Other")
   - **Subcategories** (expense only): optional detail under a category, e.g. Utility bills → Electricity, Gas. Entries keep their category; budgets stay on the category. Category detail shows usage per subcategory with a 6-month trend.
4. **Budgets**: monthly limit per category; show spent / limit / remaining and flag when over
5. **Recurring**: define recurring items (e.g. rent, subscriptions) with a frequency
   (monthly, weekly); entries are generated automatically when due (on app open and on save).
   A start date in the past back-fills the missed entries. Month-end dates clamp (31st → 28th/29th/30th) without drifting.
6. **Search and filters**: by text (note), category, date range
7. **Monthly summary**: total spent, income, kept, per-category breakdown with change vs last month
8. **Daily allowance**: safe-to-spend per day from budgets, with pace and month-end forecast
9. **Insights & actions**: ranked "do this next" cards, forecast chart, what-if cap calculator, savings rate, weekday pattern, biggest entries, budget move suggestions
10. **Backup**: export and import JSON

## Non-functional requirements
- Mobile-first, usable one-handed; fast add flow (amount first)
- Works offline; installable to home screen
- Light and dark themes; Settings lets you pick System (default, follows the phone), Light or Dark
- No accounts, no tracking, no third-party services

## Out of scope (for now)
- Multi-currency, multi-user, cloud sync, receipt photos, bank import
