# Kepler

Kepler is a personal agent platform for discovering things worth reading and building, validating them, and learning from user feedback.

*Currently WIP. Things may change rapidly.*

## Stack

- Bun workspaces and TypeScript
- Hono API and background workers in one process
- Next.js, Tailwind CSS, and shadcn/ui conventions
- PostgreSQL with Drizzle ORM
- Redis with BullMQ and Bull Board
- Clerk authentication
- Vercel AI SDK and Langfuse/OpenTelemetry

## Local development

```bash
docker compose up -d
bun install
bun server:migrate:up
```

Run the two applications in separate terminals:

```bash
bun server:dev
bun web:dev
```

Open the web app at `http://localhost:3000`. Bull Board is available at `http://localhost:8080/admin/queues` using the development credentials from `.env`.

Development authentication uses `BY_PASS_AUTH_CLERK_USER_ID`. Configure Clerk keys and remove the bypass for production.

## Current vertical slice

The first workflow is deliberately mocked while the platform is established:

```text
profile → workflow → BullMQ run → agent checkpoints → findings → report → feedback
```

`github-scanner` uses GitHub's REST Search API for real repository, issue, and pull-request findings. Add `GITHUB_TOKEN` to `.env` for authenticated rate limits; unauthenticated development scans also work at lower limits. `paper-scanner` uses arXiv's public Atom API for recent papers matching profile interests and goals. The downstream reasoning stages remain mocked.
