# POS System — Architecture

## 1. Chosen approach

**Modular monolith, web-based (PWA), running in iPad Safari.**

One Node.js/TypeScript backend, one PostgreSQL database, one React/TypeScript
frontend built as an installable PWA. All iPads and back-office screens are
just clients of the same backend over the restaurant's local network.

Two other approaches were considered and rejected for now:

- **Native/hybrid iPad app (Swift or React Native)** — best touch feel and
  hardware integration, but adds App Store distribution, a slower
  edit/deploy loop, and doesn't remove the need for everything below. Revisit
  as a v2 if deeper hardware integration (native card reader SDKs) is needed.
- **Microservices** (separate Menu/Order/Payment/Kitchen services + a message
  broker) — overkill for a single restaurant; only worth it if this software
  is ever sold to many locations as a multi-tenant product.

Rationale: the owner needs to add categories/items/modifiers through buttons,
not code, and wants to iterate fast as a solo/small dev team. A monolith web
app is the fastest path to that, and can be hosted on a local machine in the
restaurant so ordering and kitchen flow keep working even if internet drops
(only card processing needs internet).

## 2. Core domain flows

1. **Login** — employee enters their ID (PIN) → starts a shift/clock-in timer
   in the background → routed to Home.
2. **Home** — buttons: Tables / Bar / Queue / Pay / Cashout (role-gated; e.g.
   only owner/manager sees drawer-balance tools).
3. **Tables** — floor-plan grid (numbered tables, laid out to match the
   physical restaurant) → order entry → kitchen ticket + waiter copy printed
   → order enters the kitchen queue → **table locked** until its bill is
   paid.
4. **Order entry** — category grid → item grid → for build-your-own or
   specialty items, a full ingredient/topping list is shown with the
   specialty's defaults pre-highlighted; tapping any other item toggles it
   on/off. Modifier groups (size, shape, etc.) are picked the same way.
5. **Kitchen Queue** — every employee sees every table's order, its position
   in the queue, and elapsed wait time. Kitchen marks an order "done," which
   updates every connected screen in real time (WebSocket broadcast).
6. **Bar** — same order-entry engine as Tables, but keyed by a customer name
   instead of a table number (no floor plan / no table lock).
7. **Pay** — employee ID → select table → print bill → collect payment
   (cash/card/check/gift card) → tip captured on every order → print
   receipt → table unlocked.
8. **Server Cashout** — see `DB_SCHEMA.md` §Cashout for the exact math.
9. **Drawer Balance** (owner/manager only) — end-of-night reconciliation
   across all servers/orders; see `DB_SCHEMA.md` §Drawer Balance.
10. **Payroll** — weekly report: hours worked (from clock-in/out) × hourly
    rate, plus a tip ledger for tax records.

## 3. Money-handling logic (confirmed)

### Server cashout
- **Baseline** = sum of the **bill portion (no tip)** of every order the
  server closed today, cash and card orders alike.
- Cash orders are fixed — that money is genuinely in the server's hand.
- Checking a **card** order in the "details" list subtracts that order's
  **full total (bill + tip)** from the running total — not the tip alone.
  That money never touched the server's hand (it settled straight to the
  house via the card processor), and on top of that the house now owes the
  server their card tip back.
- Net result: positive → server pays that amount into the drawer; negative
  → the drawer pays the server the difference.
- Worked example: 3 cash tables ($10/$10/$10 = $30) + 3 card tables ($20
  bill + $5 tip = $25 each). Baseline = $30 + $60 = $90. Checking all 3 card
  rows subtracts $75 (3 × $25). Net = $15 owed to the house. (The server
  keeps $15 of their $30 cash-in-hand — exactly their card tips — and hands
  in the rest.)
- If card tips are large enough to exceed the cash the server is holding,
  the net goes negative and the drawer pays the server cash directly.

### Drawer balance (owner/manager only, separate PIN tier)
- Same mechanic at the whole-restaurant level: baseline = bill portion of
  every order for the business day, across all servers.
- Checking off a non-cash tender (card, check, gift card) subtracts that
  order's full total.
- **Misc tickets** (comps, paid-outs, open tabs, restaurant purchases from
  the till) are owner/manager-created only, each requires a reason + amount,
  and are logged permanently for audit. They subtract from the total when
  checked, same as any other line item.
- Target after entering counted cash: **$0.00 variance**. A real variance is
  recorded on the day's report rather than silently forced to zero.
- Closing the drawer session locks the day's orders and forces sign-out for
  anyone still clocked in.

### Tip payout policy
- Card tips are paid out **nightly in cash** at cashout (industry standard
  for table-service; servers depend on same-night cash). This is what's
  implemented by default.
- The payout method is a restaurant-level setting
  (`tip_payout_method: nightly_cash | payroll`), with room for a per-employee
  override later, so this isn't hardcoded if the policy ever needs to change.
- Even though card tips are paid in cash, the amount is still logged as a
  tip declaration tied to the shift, for payroll tax withholding purposes.

## 4. Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + TypeScript (Express or Fastify) |
| Frontend | React + TypeScript, PWA, Tailwind/Mantine for touch-friendly components |
| Realtime | Socket.io (kitchen queue, table status, order updates) |
| Database | PostgreSQL |
| Printing | Network ESC/POS thermal printers, driven from the backend |
| Payments | Stripe Terminal or Square Terminal SDK (card); manual entry (cash) |
| Hosting | Local machine (Mac mini/NUC) in the restaurant; iPads connect over local Wi-Fi |

## 5. Folder structure

```
POS-System/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── menu/        # categories, items, modifiers, specialty presets
│   │       │   ├── orders/
│   │       │   ├── tables/      # floor plan, table lock/unlock
│   │       │   ├── employees/   # employee ID auth, shifts
│   │       │   ├── kitchen/     # queue, wait-time, "done" button
│   │       │   ├── bar/
│   │       │   ├── payments/    # cash/card, tips, receipts, cashout
│   │       │   ├── drawer/      # end-of-night reconciliation, misc tickets
│   │       │   ├── payroll/     # hours, weekly report
│   │       │   └── printing/
│   │       ├── db/ (migrations, seeds)
│   │       ├── websocket/
│   │       └── index.ts
│   └── frontend/
│       └── src/
│           ├── screens/
│           │   ├── Login/
│           │   ├── Home/            # Tables/Bar/Queue/Pay/Cashout
│           │   ├── FloorPlan/
│           │   ├── OrderEntry/      # category → item → modifiers (pre-highlighted)
│           │   ├── KitchenQueue/
│           │   ├── Bar/
│           │   ├── Payment/
│           │   ├── Cashout/
│           │   ├── DrawerBalance/
│           │   └── AdminConfig/     # add categories/items via buttons, no code
│           ├── components/
│           ├── services/ (api + websocket clients)
│           └── store/
├── packages/
│   └── shared-types/     # Order, MenuItem, Table, Employee types shared by both apps
├── docs/
│   ├── ARCHITECTURE.md
│   └── DB_SCHEMA.md
├── docker-compose.yml
└── README.md
```

## 6. Git strategy

- `main` — production-ready, protected. Left untouched during active build-out.
- `backup-main` — snapshot of `main` taken before development started.
- `develop` — integration branch.
- `feature/*` off `develop` — e.g. `feature/menu-admin`, `feature/order-entry`,
  `feature/kitchen-queue`, `feature/payments`, `feature/floor-plan`,
  `feature/bar-orders`, `feature/cashout`, `feature/drawer-balance`.
- `claude/pos-system-ipad-a9s0k4` — current working branch for this build-out.
