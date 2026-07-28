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
