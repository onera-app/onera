# Contributing to Onera

Thank you for your interest in contributing to Onera, an end-to-end encrypted AI chat application. Contributions of all kinds are welcome: bug fixes, new features, documentation improvements, and more.

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.2+
- [Node.js](https://nodejs.org/) v20+
- PostgreSQL 16+ (or [Docker](https://www.docker.com/) to run it in a container)
- A [Clerk](https://clerk.com/) account for authentication

### Setup

1. Fork the repository and clone your fork:

```bash
git clone https://github.com/<your-username>/onera.git
cd onera
```

2. Install dependencies:

```bash
bun install
```

3. Copy the environment files and fill in the required values:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
```

4. Set up the database:

```bash
bun run db:generate
bun run db:migrate
```

5. Start the development server:

```bash
bun run dev
```

## Project Structure

Onera is a monorepo managed with Bun workspaces and Turborepo.

| Path | Description |
| --- | --- |
| `apps/web` | React 19 + TypeScript + Vite web client |
| `apps/server` | Hono + tRPC + Drizzle + PostgreSQL backend |
| `apps/docs` | Documentation site |
| `packages/crypto` | E2EE implementation (libsodium) |
| `packages/types` | Shared TypeScript types |
| `infra/enclave` | Rust private inference enclave |

## Development Commands

```
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

- TypeScript strict mode is enabled across all packages. Do not weaken it.
- Use explicit return types on all exported functions.
- Use [Zod](https://zod.dev/) schemas for runtime validation of external data (API inputs, environment variables, etc.).
- Prefer `const` over `let`. Avoid `var`.
- Follow feature-based folder structure in the web app (group files by feature, not by type).

## Security Requirements

Onera is an E2EE application. Security is not optional.

- **All chat content MUST be end-to-end encrypted.** Never store or log plaintext message content on the server.
- **Never log decrypted content on the server.** Encryption and decryption happen exclusively on the client.
- **Validate all user inputs.** Use Zod schemas on the server for every tRPC procedure.
- **Use parameterized queries.** Drizzle handles this by default -- do not bypass it with raw SQL unless absolutely necessary, and never interpolate user input into queries.

If you are unsure whether a change has security implications, ask in the pull request.

## Pull Requests

1. Create a feature branch from `main`:

```bash
git checkout -b feat/your-feature main
```

2. Write clear, descriptive commit messages.
3. Make sure `bun run type-check` passes before submitting.
4. In the PR description, explain **what** the change does and **why** it is needed.
5. Keep PRs focused. One feature or fix per pull request. Large changes should be broken into smaller, reviewable PRs.

## Reporting Issues

### Bug Reports

Include the following:

- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Browser/OS/environment details if relevant

### Feature Requests

Describe the use case you are trying to solve. Explain why existing functionality does not cover it.

## Security Vulnerabilities

**Do not open a public issue for security vulnerabilities.**

Please refer to [SECURITY.md](SECURITY.md) for instructions on how to responsibly disclose security problems.
