# Requirements

Personal expense tracker for one user, installed on a phone as a PWA.

## Decisions
- Platform: PWA (React + Vite), hosted on GitHub Pages
- Currency: BDT (৳)
- Data: stored on the phone (IndexedDB), manual JSON export/import for backup
  - Open: cloud sync (Supabase) deferred; revisit later if wanted

## Functional requirements
1. **Expenses**: add, edit, delete (amount, category, date, note)
2. **Income**: add, edit, delete; monthly balance = income - expenses
3. **Categories**: user can add, rename, delete (default set provided)
   - Deleting a category in use must not lose its expenses (reassign to "Other")
4. **Budgets**: monthly limit per category; show spent / limit / remaining and flag when over
5. **Recurring**: define recurring items (e.g. rent, subscriptions) with a frequency
   (monthly, weekly); entries are generated automatically when due
6. **Search and filters**: by text (note), category, date range
7. **Monthly summary**: total spent, income, balance, per-category breakdown
8. **Backup**: export and import JSON

## Non-functional requirements
- Mobile-first, usable one-handed; fast add flow (amount first)
- Works offline; installable to home screen
- Dark mode follows system setting
- No accounts, no tracking, no third-party services

## Out of scope (for now)
- Multi-currency, multi-user, cloud sync, receipt photos, bank import
