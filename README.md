# Onera

End-to-End Encrypted AI Chat Application

## Overview

Onera is a privacy-focused AI chat application that provides true end-to-end encryption for all conversations. Your messages, prompts, and responses are encrypted before leaving your browser - the server never sees your plaintext data.

## Features

- **End-to-End Encryption**: All chat data is encrypted client-side using libsodium
- **Direct LLM Connections**: Connect directly to OpenAI, Anthropic, or Ollama from your browser
- **Recovery Keys**: BIP39 mnemonic phrases for account recovery
- **Multi-Provider Support**: Use multiple LLM providers with encrypted credential storage
- **Modern Stack**: Built with Svelte 5, SvelteKit 2, and TanStack Query

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Svelte UI  │  │  TanStack   │  │  E2EE Crypto Layer  │  │
│  │             │──│   Query     │──│   (libsodium)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                    │             │
│                           ▼                    ▼             │
│                   ┌─────────────┐      ┌──────────────┐     │
│                   │ Encrypted   │      │ Direct LLM   │     │
│                   │   Storage   │      │ Connections  │     │
│                   └─────────────┘      └──────────────┘     │
└───────────────────────────┼────────────────────┼────────────┘
                            │                    │
                            ▼                    ▼
                    ┌───────────────┐    ┌──────────────┐
                    │ Onera Server  │    │ LLM Provider │
                    │ (encrypted    │    │ (OpenAI,     │
                    │  blob store)  │    │  Anthropic,  │
                    └───────────────┘    │  Ollama)     │
                                         └──────────────┘
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)
- Docker & Docker Compose (for containerized deployment)

### Development Setup

```bash
# Navigate to project
cd onera

# Install dependencies
bun install

# Start all services (web + server)
bun run dev

# Or start individually
bun run dev:web     # Frontend only
bun run dev:server  # Backend only
```

### Database Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate
```

### Docker Setup

```bash
# Build and run all containers
bun run docker:up

# Stop containers
bun run docker:down
```

## Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Database (SQLite)
DATABASE_URL=file:./data/onera.db

# Authentication
BETTER_AUTH_SECRET=your-32-character-or-longer-secret-key
BETTER_AUTH_URL=http://localhost:3000

# URLs
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

## Security Model

### Encryption

- **Master Key**: 256-bit random key, encrypted with a key derived from your passphrase using Argon2id
- **Chat Keys**: Each chat has a unique 256-bit key encrypted with your master key
- **Credentials**: LLM API keys are encrypted with your master key
- **Key Exchange**: X25519 sealed boxes for sharing chats (future feature)

### What the Server Sees

- Encrypted blobs only
- Public keys for sharing
- No plaintext content, titles, or credentials

### What the Server Cannot Do

- Read your messages
- Access your LLM API keys
- Decrypt your data without your passphrase or recovery phrase

## Technology Stack

### Frontend
- Svelte 5 with SvelteKit 2
- TanStack Query for state management
- Tailwind CSS 4
- libsodium-wrappers-sumo for encryption
- BIP39 for recovery phrases

### Backend
- Hono server with tRPC
- SQLite with Drizzle ORM
- Better Auth for authentication
- Bun runtime

## Development

```bash
# Run frontend tests
bun test

# Type checking
bun run check

# Build for production
bun run build
```

## License

MIT

## Acknowledgments

- Ported E2EE implementation from [Open WebUI](https://github.com/open-webui/open-webui)
- Encryption patterns inspired by [Ente](https://ente.io)
