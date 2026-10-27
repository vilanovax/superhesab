<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SuperHesab agent notes

- Product scope: `docs/PRODUCT_VISION.md`, `docs/PRD.md`, `docs/architecture.md`
- Coding rules: `.cursorrules`
- Mutations: Server Actions only; currency: integers only
- Templates extend UI/policy via `Space.type` — do not fork core money tables
- After each product code change-set: bump `lib/app-version.ts` `APP_VERSION` by `0.01`
- **push git** = push to both `origin` (GitHub) and `hamgit` (`git@hamgit.ir:ramtinica/superhesab.git`)

## Cursor Cloud specific instructions

Single Next.js 16 (App Router, Turbopack) PWA backed by PostgreSQL via Prisma 7. `npm` is the package manager (`package-lock.json`). Standard commands live in `README.md` / `package.json` scripts; notes below cover only non-obvious cloud gotchas. The dependency-refresh update script already runs `npm install` + `npx prisma generate` on startup, so don't repeat those.

- **Database is native Postgres, not Docker.** Docker is not installed here, so the `db:up`/`docker:up` scripts don't apply. A local PostgreSQL 16 cluster (`16/main`) is installed and configured to listen on **port 15432** (matching `.env.example`), with role/db `superhesab`/`superhesab` and seeded data on disk.
- **Start Postgres if it's down** (it does not always auto-start on VM boot): `sudo pg_ctlcluster 16 main start` (check with `sudo pg_lsclusters`). The dev server will fail to reach the DB until this is running.
- **`.env` and `lib/generated/prisma` are gitignored.** If `.env` is missing, `cp .env.example .env`. The Prisma client must be generated (`npx prisma generate`); `npm run build` also does this, but `npm run dev` does not.
- **After pulling new migrations:** `npx prisma migrate deploy` (needs Postgres up). Re-seed with `npm run db:seed` — this is **destructive** (wipes all tables first).
- **Run dev:** `npm run dev` → http://localhost:3003 (port is pinned to 3003; never 3000).
- **Auth is mock OTP:** log in with any seeded phone (`09120000001` Ali / `09120000002` Sara / `09120000003` Reza) and OTP code `123456`.
- **Lint** (`npm run lint`) currently surfaces ~12 pre-existing `react-hooks/set-state-in-effect` errors (e.g. `components/ui/jalali-date-picker.tsx`) that are unrelated to environment setup.
- **Smoke test** (`npm run smoke`, via `tsx`) needs a server on `:3003` (or set `SMOKE_BASE_URL`) plus seeded DB. It reports 61/65 passing; the 4 failures are redirect/RBAC status-code assertions that fail identically in dev and production builds (pre-existing, not a setup issue). Note it mutates DB state (unit-claim E2E).
