# SuperHesab

Template-driven shared finance PWA (Next.js + Postgres + Prisma).

## Docs

- [Product Vision](./docs/PRODUCT_VISION.md)
- [PRD (MVP)](./docs/PRD.md)
- [Architecture](./docs/architecture.md)

## Quick start

```bash
# 1. Start Postgres (host port 15432 → container 5432)
docker compose up -d

# 2. Env (already scaffolded; or copy example)
cp .env.example .env

# 3. Migrate + generate client
npm run db:migrate

# 4. Dev server
npm run dev
```

> If migrate fails with `P1010`, another Postgres is likely on `5432`. This project uses host port **15432**.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:generate` | Prisma generate |
| `npm run db:studio` | Prisma Studio |

## Stack

Next.js App Router · TypeScript · PostgreSQL 15 · Prisma 7 · Tailwind · Zustand · (shadcn/ui when UI begins)
