# Repository Guidelines

## Project Structure & Module Organization

Kepler is a Bun-managed TypeScript monorepo.

- `apps/server/src/`: Hono API, Clerk authentication, Drizzle database access, BullMQ queues/workers, and agent implementations.
- `apps/server/src/agents/definitions/`: agent capabilities and colocated tests (for example, `githubScanner.ts` and `githubScanner.test.ts`).
- `apps/server/src/database/migrations/`: paired `*.up.sql` and `*.down.sql` migrations.
- `apps/web/src/app/`: Next.js App Router pages; dashboard routes live under `(dashboard)`.
- `apps/web/src/components/`: shared Kepler and shadcn-style UI components.
- `data/`: local Docker volumes; never treat generated database or Redis files as source.

## Build, Test, and Development Commands

Use Bun everywhere; do not introduce npm, pnpm, or Yarn lockfiles.

```bash
docker compose up -d        # Start PostgreSQL and Redis
bun install                 # Install workspace dependencies
bun server:migrate:up       # Apply database migrations
bun dev                     # Run all workspace dev servers
bun test                    # Run Bun tests
bun run typecheck           # Type-check server and web
bun run web:build           # Create the production Next.js build
bun run format              # Format TS, TSX, and CSS with Prettier
```

For focused development, use `bun server:dev` or `bun web:dev`.

## Coding Style & Naming Conventions

Prettier is authoritative; use two-space indentation and single quotes. Prefer small typed modules and explicit domain types. Use `PascalCase` for React components/classes, `camelCase` for functions and variables, and kebab-case for agent identifiers such as `github-scanner`. Follow Next.js route conventions (`page.tsx`, `layout.tsx`) and keep server layers separated into routes, controllers, services, and workers.

## Testing Guidelines

Tests use `bun:test` and should be colocated as `*.test.ts`. Cover deterministic transformations, external API normalization, failure classification, and retry behavior. Mock network boundaries; tests must not depend on live GitHub, PostgreSQL, or Redis. Run `bun test` and `bun run typecheck` before submitting changes. No numeric coverage threshold is currently enforced.

## Commit & Pull Request Guidelines

No usable Git history is present, so use concise Conventional Commit subjects such as `feat(web): add report detail route` or `fix(worker): retry rate limits`. Keep commits scoped and avoid generated `data/` files. Pull requests should explain the behavior change, list verification commands, link relevant issues, call out migrations or environment changes, and include screenshots for UI work.

## Security & Configuration

Copy `.env.example` to `.env` and keep secrets local. Never commit Clerk, OpenAI, GitHub, Langfuse, database, or Redis credentials. Authentication bypass settings are development-only and must not be enabled in production.
