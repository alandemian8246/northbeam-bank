# Ledgerline: Business Banking Dashboard

A business banking dashboard for a fictional Series A startup (**Northbeam Labs**). It takes cues from Mercury and Slash but uses its own design, data model and interactions.

**Live demo:** https://northbeam-bank.web.app · **Source:** https://github.com/alandemian8246/northbeam-bank

Everything runs in the browser. Twelve months of realistic banking activity are generated locally and saved to `localStorage`, so every action (payments, transfers, card controls, notes) persists between visits. You can reset it under **Settings → Reset demo data**.

---

## What's inside

| Area | Highlights |
| --- | --- |
| **Overview** | Total cash, 30-day money in/out compared with the prior 30 days, **runway** (from 3-month average net burn), a balance trend (total or stacked by account, 30D/90D/1Y), monthly cash flow (click a month to open its transactions), spending by category, recent activity and upcoming payments. |
| **Accounts** | Operating, Payroll, Treasury (4.12% APY) and Tax Reserve. Detail pages show a 90-day balance trend, interest earned YTD, and routing/account numbers with reveal and copy. |
| **Transactions** | Search across name, amount, reference and notes (press `/` to focus). Filter by account, date range (including custom dates), direction, category, status and amount range; removable filter chips; sortable columns; running totals; pagination; **CSV export**. Filters live in the URL, so every view can be linked and survives a reload. |
| **Transaction details** | A slide-over drawer with status, method, card, reference (copy), the other leg of internal transfers, re-categorization, notes and receipt upload. |
| **Payments** | A send-payment flow (form → review → confirmation) with balance checks, new-recipient entry, ACH or wire, future dates and weekly/monthly repeats. Payments go out as **pending** and **settle by themselves** (about 30s for ACH and 10s for wire in the demo), announced with a notification. Includes instant internal transfers, scheduled payments with cancel confirmation, and saved recipients. |
| **Cards** | Virtual and physical cards with live spend against the monthly limit (warns near the limit), **freeze/unfreeze**, limit editing, issuing new cards, and a link to each card's transactions. |
| **Insights** | 12-month cash flow (switchable to a table), a stacked monthly spending trend by category, category breakdown and top vendors, all over 30d, 90d or 12m. |
| **Everywhere** | A `Ctrl/⌘ K` command palette that searches pages, actions and transactions; light and dark themes; a responsive layout with a mobile bottom nav; toasts; keyboard-accessible dialogs with focus trapping; skip link. |

## Tech stack

- **React 18 + TypeScript (strict)**, built with **Vite 6**
- **Tailwind CSS** with design tokens as CSS variables, so light and dark mode come from one set of utility classes
- **Zustand** (with `persist`) for banking state; a separate small store for UI state
- **Recharts** for charts; **date-fns** for dates; **lucide-react** for icons
- **React Router 6** with lazy-loaded pages (the chart library is split into its own chunk)
- **Vitest** for unit tests

## Architecture

```
src/
  lib/            Pure domain logic, no React
    types.ts        Domain model (money is always integer cents)
    analytics.ts    Balances, cash flow, runway, category/vendor spend, balance history
    filters.ts      Transaction filtering/sorting, URL (de)serialisation, CSV export
    format.ts       Currency formatting and parsing
  data/generate.ts  Seeded, deterministic generator for 12 months of activity
  store/
    bank.ts         All banking operations (transfer, sendPayment, settleDue, cards…), with validation
    ui.ts           Theme, dialogs, drawer, toasts, command palette
  components/
    ui/             Primitives: Button, Card, Modal/Drawer, Segmented, Badge, StatTile…
    charts/         BalanceChart, CashFlowChart, SpendingTrendChart, CategoryBreakdown
    transactions/   Responsive table and details drawer
    payments/       Payment, transfer and new-card flows
    layout/         App shell, sidebar, top bar, command palette
  pages/            One file per route
```

Key decisions:

- **Balances are derived, not stored.** Each account has an opening balance, and its current and available balances are computed from the transactions. A payment or transfer can't leave the books inconsistent, and "available" correctly subtracts pending outflows.
- **Money is integer cents**, which avoids floating-point rounding errors.
- **Business logic is kept out of components.** `lib/` and `store/` have no React dependencies and are unit-tested directly.
- **Chart colors were checked for accessibility.** The palette follows a fixed category order that remains distinguishable with color-vision deficiency, with separate light and dark values. Charts with two or more series have legends, status is never shown by color alone (icon + label), and the cash-flow chart has a table view.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build
```

Deploying: this is a static SPA hosted on Firebase Hosting (`firebase.json` rewrites all routes to `index.html`). Run `npm run deploy` to build and publish. `vercel.json` (Vercel) and `public/_redirects` (Netlify) are included for those hosts too.

## Quality checks

- **21 unit tests** cover money parsing/formatting, data integrity (no account ever goes negative; every transfer's two legs net to zero), cash-flow rules (internal transfers and failed items excluded), filter combinations, URL round-tripping, and store operations (overdraft protection, pending → settled lifecycle, scheduling, card limits).
- **End-to-end smoke run** in a real Chrome against the production build: send payment → pending → settled, overdraft blocked, transfer keeps total cash unchanged, filters sync to the URL, notes persist across reloads, command palette, freeze card and edit limit, issue card, cancel scheduled payment, every route renders, dark mode persists. All passed with no console errors.
- Visually reviewed at desktop and phone (390px) widths in light and dark mode.

## AI tools used

Built with **Claude Code** (Anthropic's agentic coding CLI) as the main development tool. It was used to:

- plan the architecture and domain model from the brief;
- generate the sample-data model, analytics, store and UI;
- write the unit tests and a Playwright smoke script, run them, and fix what they found;
- review its own output from production screenshots. This caught and fixed a mobile overflow from implicit grid columns, a CSS class conflict that shrank an icon, cramped table columns, a vendor shown under the wrong category, and noisy 30-day comparisons in the sample data.

Throughout, AI output was treated as a draft: each change was type-checked, tested and visually checked before it was kept.
