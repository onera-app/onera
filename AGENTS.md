# Onera

End-to-end encrypted AI chat with private inference via TEE enclaves.

## Repository Structure

```
apps/
├── web/          # React 19 client (Vite, TanStack Router, Zustand)
├── server/       # Hono + tRPC backend (Drizzle ORM, Supabase Postgres)
└── docs/         # Documentation site (Fumadocs + Next.js)

packages/
├── crypto/       # E2EE (libsodium), Noise protocol, attestation verification
└── types/        # Shared TypeScript types

supabase/
└── config.toml   # Supabase local dev config
```

## Tech Stack

### Web (`apps/web`)
- React 19, TypeScript, Vite, TanStack Router/Query
- Zustand (state), Tailwind CSS 4 + Radix UI (styling)
- Supabase Auth, WebAuthn/passkeys
- Vercel AI SDK (streaming), direct browser-to-LLM connections
- Noise protocol WebSocket for private inference

### Server (`apps/server`)
- Hono, tRPC, Drizzle ORM, Supabase Postgres
- Supabase Auth (JWT verification via service_role)
- Socket.io (real-time sync)
- Enclave orchestration (assignment, heartbeat, cleanup)

### Crypto (`packages/crypto`)
- libsodium: E2EE encryption/decryption
- BIP39: recovery phrase generation
- Noise NK: browser-to-enclave encryption
- Attestation: TEE launch digest verification

## Architecture

### Auth Flow
Supabase Auth (email/password + Google/Apple OAuth) → JWT → tRPC middleware verifies via `supabase.auth.getUser(token)` → user ID in context.

### E2EE
3-share key system: auth share (server, Supabase-protected), device share (localStorage), recovery share (BIP39 mnemonic). Master key reconstructed client-side only.

### Private Inference
Browser → Noise WebSocket → TEE enclave (AMD SEV-SNP) → vLLM. Server only assigns enclaves and tracks capacity. Prompts/responses never touch the server.

### Data
All user content (chats, notes, credentials, prompts) stored as encrypted blobs. RLS enabled on all tables. Server uses service_role key (bypasses RLS).

## Key Patterns

- Feature-based folder structure in web app
- tRPC routers organized by domain (`keyShares`, `devices`, `enclaves`, `chats`, etc.)
- Drizzle schema split by domain (`schema/enclaves.ts`, `schema/billing.ts`)
- Supabase migrations tracked in both Supabase and Drizzle journal

## Environment Variables

Required:
- `DATABASE_URL` -- Supabase Postgres pooler
- `SUPABASE_URL` + `SUPABASE_SECRET_KEY` -- server auth
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` -- frontend auth

## Commands

```bash
bun run dev           # Start all apps
bun run db:migrate    # Run migrations
bun run db:studio     # Open Drizzle Studio
bun run build         # Build all
bun run type-check    # TypeScript check
```
