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

- [Bun](https://bun.sh) (v1.0+)
- Python 3.10+ (for backend)
- Node.js 18+ (optional, for npm compatibility)

### Frontend Setup

```bash
# Navigate to project
cd onera

# Install dependencies
bun install

# Start development server
bun run dev
```

### Backend Setup

```bash
# Navigate to backend
cd onera/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Backend (in backend/.env)
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=sqlite+aiosqlite:///./onera.db
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
- FastAPI with async SQLAlchemy
- SQLite with aiosqlite
- JWT authentication
- Pydantic for validation

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
