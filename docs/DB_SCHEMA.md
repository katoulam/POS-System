# POS System — Database Schema (PostgreSQL)

This is the table design backing `ARCHITECTURE.md`. Types are indicative
(use `numeric(10,2)` for all money columns, `timestamptz` for all timestamps).

## Employees & time tracking

```
employees
  id                  uuid pk
  name                text
  pin_hash            text            -- employee ID / PIN, hashed
  role                enum(server, bartender, kitchen, manager, owner)
  is_active           boolean

pay_rates
  id                  uuid pk
  employee_id         fk employees
  hourly_rate         numeric
  effective_from      date
  effective_to        date null       -- versioned so a raise doesn't rewrite past weeks

shifts
  id                  uuid pk
  employee_id         fk employees
  clock_in            timestamptz
  clock_out           timestamptz null

tip_declarations
  id                  uuid pk
  shift_id            fk shifts
  employee_id         fk employees
  cash_tips_declared  numeric
  card_tips_paid_out  numeric
  created_at          timestamptz
```

## Menu (categories, items, modifiers, specialty presets)

```
categories
  id                  uuid pk
  name                text            -- "Pizza", "Burgers", "Drinks"
  sort_order          int
  is_active           boolean

menu_items
  id                  uuid pk
  category_id         fk categories
  name                text            -- "Build Your Own Pizza", "Meat Lovers Pizza"
  description         text
  base_price          numeric
  is_build_your_own    boolean
  sort_order          int
  is_active           boolean

modifier_groups
  id                  uuid pk
  name                text            -- "Size", "Shape", "Toppings"
  selection_type      enum(single, multiple)
  is_required         boolean

modifiers
  id                  uuid pk
  modifier_group_id   fk modifier_groups
  name                text            -- "Small", "Round", "Pepperoni"
  price_delta         numeric

menu_item_modifier_groups
  menu_item_id        fk menu_items
  modifier_group_id   fk modifier_groups
  primary key (menu_item_id, modifier_group_id)

menu_item_default_modifiers   -- what's pre-highlighted on a specialty item
  menu_item_id        fk menu_items
  modifier_id         fk modifiers
  primary key (menu_item_id, modifier_id)
```

Admin screen (`AdminConfig`) is just CRUD over these six tables — adding a
category, item, modifier group, modifier, or toggling a default is all
button-driven, no code changes.

## Tables, bar tabs, orders

```
tables
  id                  uuid pk
  table_number         int
  pos_x, pos_y         int             -- floor-plan layout coordinates
  status               enum(available, occupied, needs_cleaning)

bar_tabs
  id                  uuid pk
  customer_name        text
  status               enum(open, closed)
  created_at           timestamptz

orders
  id                  uuid pk
  table_id             fk tables null
  bar_tab_id           fk bar_tabs null
  employee_id          fk employees      -- server who owns this order
  status               enum(open, sent_to_kitchen, in_progress, ready, completed, paid, voided)
  subtotal             numeric           -- bill portion, no tip
  tax                  numeric
  tip                  numeric
  total                numeric           -- subtotal + tax + tip
  payment_method        enum(cash, card, check, gift_card) null
  cashout_id            fk cashouts null -- set once swept into a server cashout
  created_at            timestamptz
  closed_at             timestamptz null

order_items
  id                  uuid pk
  order_id             fk orders
  menu_item_id          fk menu_items
  quantity              int
  base_price             numeric
  notes                  text

order_item_modifiers
  order_item_id        fk order_items
  modifier_id           fk modifiers
  is_added               boolean        -- true = added beyond the specialty default,
                                          -- false = removed from the specialty default

kitchen_queue_events
  id                  uuid pk
  order_id             fk orders
  status                enum(queued, in_progress, done)
  changed_by            fk employees
  changed_at            timestamptz
```

`orders.subtotal` is always the bill portion (no tip) — this is the number
the cashout/drawer math is built on.

## Server cashout

```
cashouts
  id                  uuid pk
  employee_id          fk employees
  shift_id              fk shifts
  opened_at             timestamptz
  closed_at             timestamptz null
  baseline_total        numeric        -- sum of subtotal+tax across all included orders
  cash_entered           numeric null
  net_expected           numeric        -- baseline minus checked card-order totals
  variance                numeric null   -- cash_entered - net_expected
  status                  enum(open, closed)

cashout_line_items
  id                  uuid pk
  cashout_id            fk cashouts
  order_id               fk orders
  bill_amount             numeric       -- subtotal + tax
  tip_amount               numeric
  payment_method            enum(cash, card, check, gift_card)
  is_checked                 boolean     -- cash rows: always true, locked
  checked_at                  timestamptz null
```

Server cashout math (confirmed):
`net_expected = baseline_total - SUM(bill_amount + tip_amount WHERE is_checked AND payment_method != cash)`
Positive → server owes the house that amount in cash. Negative → the drawer
pays the server the absolute value.

## Drawer balance (owner/manager only)

```
drawer_sessions
  id                  uuid pk
  business_date         date
  opened_by_employee_id  fk employees
  opening_float           numeric
  closed_by_employee_id    fk employees null
  closing_cash_counted      numeric null
  expected_total              numeric   -- baseline minus checked non-cash totals minus misc tickets
  variance                     numeric null
  status                        enum(open, closed)

drawer_line_items
  id                  uuid pk
  drawer_session_id     fk drawer_sessions
  order_id               fk orders null
  misc_ticket_id           fk misc_tickets null
  amount                    numeric
  tender_type                enum(cash, card, check, gift_card, misc)
  is_checked                  boolean

misc_tickets
  id                  uuid pk
  drawer_session_id     fk drawer_sessions
  created_by_employee_id fk employees   -- manager/owner only, enforced in the API layer
  reason                  text
  amount                    numeric
  created_at                 timestamptz
```

Same math as server cashout, scaled to the full business day, plus misc
tickets subtracted the same way as any other checked line item. Target on
close: `variance = 0.00`; a nonzero variance is still saved to the report,
never forced to zero.

## Role gates (enforced server-side, not just hidden in the UI)

- `AdminConfig` (menu CRUD): `manager`, `owner`
- `DrawerBalance` screen, editing/unchecking any line after it's been set: `owner` only (their own special PIN)
- `misc_tickets` creation: `manager`, `owner`
- Everything else (login, tables, bar, queue, pay, cashout): any active employee
