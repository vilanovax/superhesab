# SuperHesab — Product Requirements Document (MVP)

**Status:** Draft · **Phase:** MVP · **Primary template:** Trip & Party  
**See also:** [PRODUCT_VISION.md](./PRODUCT_VISION.md) · [architecture.md](./architecture.md)

## 1. Problem

People run shared money in chat apps and spreadsheets: trips, couples, parties. Balances get messy, who-owes-whom is unclear, and settlements are manual and error-prone.

## 2. Solution (MVP)

A multi-tenant, template-driven PWA with one **shared finance engine**:

- **Spaces** — isolated shared ledgers (`TRIP` | `PARTNER`)
- **Role-based access** — `OWNER` | `EDITOR`
- **Expense logging** — paid-by + equal or exact splits
- **Debt simplification** — minimal settlement suggestions + manual confirm
- **Shared checklist** — lightweight coordination (Trip)

Templates change UX and default policies; they do **not** fork the core schema.

## 3. Goals & Non-goals

### Goals

- Create a Space and invite members via link
- Log expenses in &lt;30s with equal/exact split
- Show per-user **Net Balance** clearly
- Suggest optimized settlements; confirm manually
- Ship Trip template first; Partner reuses the same engine

### Non-goals (MVP)

- Building / monthly charge / unit entities
- Percentage splits, Viewer role
- Invoice photo upload
- Advanced charts / Excel / PDF export
- Full offline sync (PWA shell only if time)

## 4. Personas

| Persona | Need |
|---------|------|
| Trip organizer | Collect costs, see who owes what, settle at end |
| Trip participant (Editor) | Add expenses, tick checklist, see own balance |
| Couple (Partner) | Shared ledger, both can enter; settle when needed |

## 5. Functional requirements

### Auth

- Magic Link and/or Google OAuth
- Session required for Space access

### Spaces & membership

- Create Space with `type` (`TRIP` | `PARTNER`) and name
- Owner is `OWNER`; invitees default to `EDITOR`
- Invite via shareable link

### Expenses

- Fields: title, totalAmount (integer minor units), paidBy, date, splits
- Split modes: **equal** among selected members; **exact** amounts summing to total
- Only members of the Space can be on a split

### Balances & settlements

- Compute net balance per member from expenses − settlements
- Debt simplification produces a minimal set of `PENDING` settlements
- Members can mark settlements `COMPLETED` (manual confirm)

### Checklist (Trip)

- Shared list of items; Editors can add/toggle/delete
- Near-realtime updates acceptable (polling or lightweight realtime)

## 6. Non-functional

- Currency: **integers only** (no floating point)
- Mutations via **Server Actions**
- Mobile-first PWA UX
- Strict TypeScript

## 7. Success metrics (MVP)

- User understands own net balance within 30 seconds of opening a Space
- Settlement path reduces pairwise debts vs naive “everyone pays everyone”
- Two Editors can both add expenses without schema conflicts

## 8. Delivery order

1. DB + auth  
2. Spaces + invites + RBAC  
3. Expenses + splits  
4. Net balance + settlement engine  
5. Checklist  
6. Trip UI → Partner UI  
7. PWA polish  
