# Contributing to Onera

Contributions of all kinds are welcome. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.2+
- [Supabase](https://supabase.com) project (or local via `supabase start`)

### Steps

```bash
git clone https://github.com/<your-username>/onera.git
cd onera
bun install

cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
# Fill in Supabase credentials

bun run db:migrate
bun run dev
```

## Project Structure

| Path | Description |
|------|-------------|
| `apps/web` | React 19 + Vite client |
| `apps/server` | Hono + tRPC + Drizzle backend |
| `apps/docs` | Documentation site (Fumadocs) |
| `packages/crypto` | E2EE + Noise protocol + attestation |
| `packages/types` | Shared TypeScript types |
| `supabase/` | Supabase local dev config |

## Commands

```bash
bun run dev              # Start all apps
bun run dev:web          # Frontend only
bun run dev:server       # Backend only
bun run build            # Build all
bun run type-check       # TypeScript check
bun run lint             # Lint
bun run format           # Format with Prettier
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
```

## Code Style

- TypeScript strict mode. Do not weaken it.
- Explicit return types on exported functions.
- Zod schemas for runtime validation of external data.
- Prefer `const` over `let`. No `var`.
- Feature-based folder structure in the web app.

## Security Requirements

- **All chat content must be E2EE.** Never store or log plaintext on the server.
- **Never log decrypted content server-side.** Encryption/decryption is client-only.
- **Validate all inputs.** Zod schemas on every tRPC procedure.
- **Parameterized queries only.** Drizzle handles this -- don't bypass with raw SQL.

## Pull Requests

1. Branch from `main`: `git checkout -b feat/your-feature main`
2. Clear, descriptive commit messages.
3. `bun run type-check` must pass.
4. Explain what and why in the PR description.
5. One feature or fix per PR.

## Reporting Issues

**Bugs:** Steps to reproduce, expected vs actual behavior, environment details.

**Features:** Describe the use case and why existing functionality doesn't cover it.

**Security:** Do not open public issues. See [SECURITY.md](SECURITY.md).
