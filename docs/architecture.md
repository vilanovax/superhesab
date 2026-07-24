# SuperHesab — Technical Architecture

**Stack:** Next.js (App Router) · TypeScript (strict) · PostgreSQL 15 · Prisma 7 · Tailwind · shadcn/ui · Zustand  
**See also:** [PRODUCT_VISION.md](./PRODUCT_VISION.md) · [PRD.md](./PRD.md)

## 1. High-level

```
┌──────────────┐     Server Actions / RSC      ┌─────────────┐
│  Next.js PWA │ ────────────────────────────► │  PostgreSQL │
│  App Router  │     Prisma Client + adapter   │  (Docker)   │
└──────┬───────┘                               └─────────────┘
       │
       │ Zustand (client UI state only)
       ▼
┌──────────────┐
│ Template UI  │  Trip / Partner shells over shared core
└──────────────┘
```

## 2. Layering

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes / UI | `app/`, `components/` | RSC pages, client islands |
| Mutations | `app/actions/` | Server Actions only for writes |
| Domain | `lib/` | balances, splits, debt simplification |
| Persistence | `lib/db`, Prisma | single PrismaClient singleton |
| Client state | `lib/stores` | ephemeral UI (modals, draft forms) — not source of truth |

## 3. Template-driven design (extensibility)

**Rule:** Core money models are template-agnostic. `Space.type` selects presentation and default RBAC policies.

```
templates/
  trip/     → copy, default invite role EDITOR, checklist enabled
  partner/  → copy, two-person UX hints
  personal/ → single-player income/expense + monthly budget (no settlements)
  building/ → v2: units, ChargePlan, ChargePayment (additive; not Expense)
```

Future template-specific data goes in **additive** tables or JSON metadata keyed by `spaceId`, never by cloning Expense/Settlement.

## 4. Data model (core)

- `User` — identity
- `Space` — ledger container (`TRIP` | `PARTNER` | `PERSONAL` | `FAMILY` | `BUILDING`)
- `Expense` / `ExpenseSplit` / `Settlement` — shared money core
- `Debt` / `DebtPayment` — optional lend/borrow for PERSONAL + FAMILY (additive; not Expense)
- `CategoryBudget` / `RecurringRule` / `RecurringOccurrence` — PERSONAL depth (additive)
- `Unit` / `ChargePlan` / `ChargePayment` — BUILDING charges (additive; not Expense)
- `SpaceMember` — RBAC (`OWNER` | `EDITOR`)
- `Expense` + `ExpenseSplit` — spend + who owes what
- `Settlement` — proposed/confirmed transfers (`PENDING` | `COMPLETED`)

All money fields are `Int` (smallest currency unit).

## 5. Money & debt engine

1. **Equal split:** divide `totalAmount` in integers; remainder cents assigned deterministically (e.g. first N members by stable userId order).
2. **Exact split:** client/server validate `sum(owedAmount) === totalAmount`.
3. **Net balance:** for each user in a Space:  
   `paid − owed_on_splits − settlements_paid + settlements_received` (completed only, or include pending — decide in implementation and keep consistent).
4. **Debt simplification:** greedily match largest creditors with largest debtors until balances clear → create `Settlement` rows.

## 6. Auth & tenancy

- Auth provider TBD (Auth.js / Clerk / custom Magic Link) — attach `userId` to session.
- Every query/mutation must authorize via `SpaceMember` for the target `spaceId`.
- Owner can manage members; Editors can mutate expenses/checklist.

## 7. Infra (local)

```bash
docker compose up -d          # Postgres 15
npx prisma migrate dev        # apply schema
npm run dev                   # Next.js
```

`DATABASE_URL` → `postgresql://superhesab:superhesab@localhost:15432/superhesab`  
(Host port **15432** maps to container 5432 to avoid clashes with other local Postgres instances.)

## 8. Conventions

- Prefer Server Components; add `"use client"` only when needed
- Mutations: Server Actions in `app/actions/`
- No `number` floats for currency — use `Int` / branded types in `lib/money`
- shadcn/ui under `components/ui` when UI work begins
- Follow `.cursorrules` and `docs/PRODUCT_VISION.md`
