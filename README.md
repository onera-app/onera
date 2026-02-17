<div align="center">
  <img src="onera-logo.svg" alt="Onera" width="80" />
  <h1>Onera</h1>
  <p>End-to-end encrypted AI chat with private inference.</p>

  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" /></a>
</div>

---

## What is Onera?

Onera is an AI chat app where all messages, prompts, and API keys are encrypted client-side before reaching the server. The server never sees plaintext data.

For private inference, Onera routes prompts directly from your browser to TEE (Trusted Execution Environment) enclaves over Noise-encrypted WebSockets. The server never touches inference traffic.

## Features

- **End-to-end encryption** -- all data encrypted client-side with libsodium
- **Private inference** -- browser-to-enclave communication via Noise protocol, verified by remote attestation
- **Multi-provider LLM** -- OpenAI, Anthropic, Google, Groq, Deepseek, Mistral, xAI, OpenRouter, Ollama
- **Direct browser-to-LLM** -- API keys never touch the server
- **3-share key management** -- master key split across auth share (Supabase), device share (browser), recovery share (BIP39 mnemonic)
- **WebAuthn/passkeys** -- biometric unlock for encrypted data
- **Real-time sync** -- Socket.io for cross-device updates

## Architecture

```
Browser
├── React 19 + Vite + TanStack Router
├── E2EE crypto layer (@onera/crypto, libsodium)
├── tRPC client → Hono server → Supabase Postgres
├── Direct LLM connections (BYOK providers)
└── Noise WebSocket → TEE Enclave (private inference)

Server (Hono + tRPC + Drizzle)
├── Auth: Supabase Auth (JWT verification)
├── Data: Supabase Postgres (encrypted blobs only)
├── Realtime: Socket.io (sync notifications)
└── Enclave orchestration (assignment, heartbeat, cleanup)

TEE Enclaves
├── AMD SEV-SNP trusted execution
├── Noise NK protocol (encrypted inference)
├── Remote attestation (launch digest verification)
├── vLLM or router mode (gateway to model servers)
└── Stale assignment cleanup (15min timeout)
```

### Private Inference Flow

```
User sends message
  → Browser encrypts with Noise protocol
    → WebSocket to TEE enclave (direct, bypasses server)
      → Enclave decrypts, runs inference (vLLM)
        → Encrypted response streamed back
          → Browser decrypts and displays
```

The server only handles enclave assignment (which enclave, capacity tracking) -- it never sees prompts or responses.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [Supabase](https://supabase.com) project (or local via `supabase start`)

### Setup

```bash
git clone https://github.com/onera-app/onera.git
cd onera
bun install

cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
# Fill in Supabase credentials (see .env.example for guidance)

bun run db:migrate
bun run dev
```

### Docker

```bash
docker compose up -d
```

Web client: `http://localhost:5173` | API: `http://localhost:3000`

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres pooler connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase service_role key (server only) |
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (frontend) |
| `WEBAUTHN_RP_ID` | Your domain for passkeys |
| `WEBAUTHN_ORIGIN` | Your full origin URL |

## Project Structure

```
onera/
├── apps/
│   ├── web/              # React 19 client
│   ├── server/           # Hono + tRPC backend
│   └── docs/             # Documentation (Fumadocs + Next.js)
├── packages/
│   ├── crypto/           # E2EE + Noise protocol + attestation
│   └── types/            # Shared TypeScript types
└── supabase/
    └── config.toml       # Supabase local dev config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TanStack Router, Zustand, Tailwind CSS 4, Radix UI |
| Backend | Hono, tRPC, Drizzle ORM, Supabase Postgres, Socket.io |
| Auth | Supabase Auth, WebAuthn (SimpleWebAuthn) |
| Encryption | libsodium (E2EE), BIP39, Noise Protocol (enclaves) |
| AI | Vercel AI SDK, 8+ providers, private inference via TEE |
| Enclaves | AMD SEV-SNP, Noise NK, remote attestation, vLLM |

## Security Model

- **E2EE everywhere** -- all user data encrypted client-side with libsodium before storage.
- **3-share key management** -- master key split: auth share (Supabase-protected), device share (localStorage), recovery share (BIP39 mnemonic).
- **Zero-knowledge server** -- stores only encrypted blobs. Cannot decrypt anything.
- **Private inference** -- prompts go directly from browser to TEE enclave over Noise-encrypted WebSocket. Server only assigns enclaves.
- **Remote attestation** -- clients verify enclave launch digest before sending data.
- **RLS defense-in-depth** -- Row Level Security enabled on all tables; server uses service_role.

For the full cryptographic specification, see the [whitepaper](https://docs.onera.chat/docs/whitepaper).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

To report vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

[GNU Affero General Public License v3.0](LICENSE)
