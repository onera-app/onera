<div align="center">
  <img src="onera-logo.svg" alt="Onera" width="80" />
  <h1>Onera</h1>
  <p>End-to-end encrypted AI chat. Your keys, your data.</p>

  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" /></a>
</div>

---

## What is Onera?

Onera is a privacy-first AI chat application with true end-to-end encryption. Messages, prompts, and API keys are encrypted client-side before reaching the server -- the server never sees plaintext data. Unlike conventional AI chat apps that trust the backend with your conversations, Onera ensures that only you hold the keys to your data.

It supports multiple LLM providers (OpenAI, Anthropic, Google, Groq, Deepseek, Mistral, xAI, OpenRouter, Ollama) and features WebAuthn/passkey authentication, BIP39 recovery phrases, and a 3-share key management system inspired by [Privy](https://www.privy.io/).

Onera also supports private inference through Rust-based enclaves with Noise protocol encryption for running models in trusted execution environments.

## Key Features

- **End-to-end encryption** -- all chat data encrypted client-side with libsodium
- **Multi-provider LLM support** -- 8+ providers including OpenAI, Anthropic, Google, Groq, Deepseek, Mistral, xAI, OpenRouter, and Ollama
- **Direct browser-to-LLM connections** -- API keys never touch the server
- **WebAuthn/passkey authentication** -- passwordless login via Clerk and SimpleWebAuthn
- **BIP39 mnemonic recovery phrases** -- human-readable backup for your encryption keys
- **3-share key management** -- master key split across auth share, device share, and recovery share
- **Private inference enclaves** -- Rust-based TEEs with Noise protocol encryption
- **Real-time streaming** -- WebSocket-based message streaming via Socket.io
- **Rich text editor** -- TipTap-powered message composition
- **Internationalization** -- multi-language support via i18next

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                                │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  React 19  │  │  TanStack    │  │  E2EE Crypto Layer    │ │
│  │  + Vite    │──│  Router/Query│──│  (@onera/crypto)      │ │
│  └────────────┘  └──────────────┘  └───────────────────────┘ │
│         │                │                     │              │
│         ▼                ▼                     ▼              │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Zustand    │  │ tRPC Client  │  │  Direct LLM           │ │
│  │ State      │  │ + Socket.io  │  │  Connections           │ │
│  └────────────┘  └──────────────┘  └───────────────────────┘ │
└──────────────────────────┼─────────────────────┼─────────────┘
                           │                     │
                           ▼                     ▼
                   ┌───────────────┐     ┌──────────────┐
                   │  Hono Server  │     │ LLM Provider │
                   │  + tRPC       │     │ (OpenAI,     │
                   │  + Drizzle    │     │  Anthropic,  │
                   │  (encrypted   │     │  Google, ... │
                   │   blob store) │     │  Ollama)     │
                   └───────────────┘     └──────────────┘
                          │
                          ▼
                   ┌───────────────┐
                   │  PostgreSQL   │
                   └───────────────┘
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [Node.js](https://nodejs.org) v20+ (for production server)
- PostgreSQL 16+ (or use Docker)
- A [Clerk](https://clerk.com) account (for authentication)

### Setup

```bash
git clone https://github.com/onera-app/onera.git
cd onera
bun install

# Configure environment
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
# Edit the .env files with your values (see Environment Variables below)

# Set up database
bun run db:generate
bun run db:migrate

# Start development
bun run dev
```

### Docker

```bash
# Copy and configure .env files first (see above)
docker compose up -d
```

The web client runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## Environment Variables

> See [`.env.example`](.env.example), [`apps/web/.env.example`](apps/web/.env.example), and [`apps/server/.env.example`](apps/server/.env.example) for all configuration options.

| Variable | Location | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Root / Server | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Server | Clerk secret key ([dashboard.clerk.com](https://dashboard.clerk.com)) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web | Clerk publishable key |
| `FRONTEND_URL` | Root / Server | Frontend URL for CORS |
| `VITE_API_URL` | Root / Web | Backend API URL |
| `VITE_WS_URL` | Root / Web | WebSocket URL |

## Project Structure

```
onera/
├── apps/
│   ├── web/              # React 19 web client
│   ├── server/           # Hono + tRPC backend
│   └── docs/             # Documentation site (Fumadocs + Next.js)
├── packages/
│   ├── crypto/           # E2EE implementation (libsodium)
│   └── types/            # Shared TypeScript types
└── infra/
    └── enclave/          # Rust private inference enclave
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TanStack Router, Zustand, Tailwind CSS 4, Radix UI |
| Backend | Hono, tRPC, Drizzle ORM, PostgreSQL, Socket.io, Bun |
| Auth | Clerk, WebAuthn (SimpleWebAuthn) |
| Encryption | libsodium (E2EE), BIP39, Noise Protocol |
| AI | Vercel AI SDK, multi-provider (OpenAI, Anthropic, Google, Groq, etc.) |
| Infra | Docker, Nginx, Rust (Tokio + Axum) for enclaves |

## Security Model

- **All chat data is E2EE** -- encrypted client-side with libsodium before reaching the server.
- **3-share key management** -- master key split across auth share (Clerk), device share (browser), and recovery share (BIP39 mnemonic).
- **Zero-knowledge server** -- the server stores only encrypted blobs and never sees plaintext.
- **LLM API keys** -- encrypted and stored in the browser, sent directly to providers.

For the full cryptographic specification, see the [whitepaper](apps/docs/content/docs/whitepaper/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

## Security

To report security vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

## Acknowledgments

- E2EE architecture inspired by [Ente](https://ente.io) and [Privy](https://www.privy.io/)
- Key sharding patterns from the original [Open WebUI](https://github.com/open-webui/open-webui) E2EE implementation
