# SuperHesab

Template-driven shared finance PWA (Next.js + Postgres + Prisma).

## Docs

- [Product Vision](./docs/PRODUCT_VISION.md)
- [PRD (MVP)](./docs/PRD.md)
- [Architecture](./docs/architecture.md)

## Quick start (local npm + Docker Postgres)

```bash
# 1. Start Postgres only (host port 15432 → container 5432)
npm run db:up

# 2. Env
cp .env.example .env

# 3. Migrate + generate client
npm run db:migrate

# 4. Dev server (port 3003)
npm run dev
```

> If migrate fails with `P1010`, another Postgres is likely on `5432`. This project uses host port **15432**.

## Docker (full stack)

App + Postgres, app on **http://localhost:3003**.

```bash
cp .env.example .env   # set SESSION_SECRET for anything beyond local
npm run docker:up      # build + start
# logs: npm run docker:logs
# stop: npm run docker:down
```

On boot the app container waits for Postgres, runs `prisma migrate deploy`, then starts Next standalone.

| Service | Port |
|---------|------|
| App | `3003` |
| Postgres (host) | `15432` |

Optional S3 vars from `.env` are passed into the app container for payment proofs.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (`:3003`) |
| `npm run db:up` | Postgres container only |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run docker:up` | Build & run app + Postgres |
| `npm run docker:down` | Stop compose stack |
| `npm run docker:logs` | Follow app logs |

## Stack

Next.js App Router · TypeScript · PostgreSQL 15 · Prisma 7 · Tailwind · Zustand · PWA
