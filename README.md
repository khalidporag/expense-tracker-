# Expense Tracker

Personal expense tracker, built as an installable PWA (React + Vite + Dexie/IndexedDB). Currency: BDT (৳).
Data lives only on your phone — use **More → Backup & restore** regularly.

Features: expenses & income, a monthly savings goal with DPS / Sanchay Patra / goal plans and a monthly report, editable categories, monthly budgets with a daily allowance and forecast, insights (what changed, costliest days, what-if), ranked next actions, recurring items, search & filters, JSON backup, offline, dark mode.

- Scope: [REQUIREMENTS.md](REQUIREMENTS.md) · Screens: [docs/UI.md](docs/UI.md) · Conventions & structure: [CLAUDE.md](CLAUDE.md)

## Deploy (GitHub Pages)
1. Merge into `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. After the Action finishes, open `https://<your-username>.github.io/expense-tracker-/` on your phone.
4. Android Chrome: menu → *Install app*. iPhone Safari: Share → *Add to Home Screen*.

## Develop
```
npm install
npm run dev      # dev server
npm run check    # tests + build
```
