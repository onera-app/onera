# Onera - Web & Backend

End-to-end encrypted AI chat application with multi-provider LLM support.

## Project Overview

Onera is a privacy-focused AI chat application featuring:
- End-to-end encryption for all chat data
- Multiple LLM provider support (OpenAI, Anthropic, Google, etc.)
- Real-time streaming responses
- WebAuthn/Passkey authentication
- Cross-platform sync

## Repository Structure

```
apps/
├── web/          # React 19 web client
├── server/       # Hono/tRPC backend
└── docs/         # Documentation site (Fumadocs)

packages/
├── crypto/       # E2EE implementation (libsodium)
└── types/        # Shared TypeScript types
```

## Technology Stack

### Web Client (`apps/web`)
- **Framework**: React 19 with TypeScript
- **Routing**: Tanstack Router
- **State**: Zustand (client) + Tanstack Query (server)
- **Styling**: Tailwind CSS 4 + Radix UI
- **API**: tRPC client
- **AI**: Vercel AI SDK with streaming
- **Auth**: Clerk + WebAuthn

### Backend (`apps/server`)
- **Framework**: Hono
- **API**: tRPC
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk
- **Realtime**: Socket.io
- **Validation**: Zod

### Shared Packages
- **@onera/crypto**: libsodium-based E2EE
- **@onera/types**: Shared TypeScript types

## Architecture Patterns

### Web
- Feature-based folder structure
- Zustand stores for global state
- Custom hooks for reusable logic
- Radix primitives for accessibility

### Backend
- tRPC routers organized by domain
- Middleware for auth and validation
- Repository pattern for data access
- Type-safe end-to-end with tRPC

## Development Guidelines

### Code Style
- TypeScript strict mode required
- Explicit return types on exported functions
- Zod schemas for all runtime validation
- Prefer `const` over `let`

### API Development
- All endpoints must be authenticated (unless public)
- Input validation with Zod at router level
- Consistent error handling with TRPCError
- Rate limiting on sensitive endpoints

### Security Requirements
- All chat content MUST be E2EE
- Never log decrypted content
- Validate all user inputs
- Use parameterized queries (Drizzle handles this)

### Testing
- Unit tests for business logic
- Integration tests for tRPC routers
- E2E tests with Playwright

## File Patterns

When creating new features:

### Web Component
```
src/features/{feature}/
├── components/
├── hooks/
├── stores/
└── index.ts
```

### tRPC Router
```
src/trpc/routers/{domain}.ts
```

### Database Schema
```
src/db/schema/{entity}.ts
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `CLERK_*` - Clerk authentication
- `VITE_CLERK_*` - Clerk frontend keys

## Commands

```bash
# Development
bun run dev           # Start all apps
bun run dev --filter web    # Start web only
bun run dev --filter server # Start server only

# Database
bun run db:generate   # Generate migrations
bun run db:migrate    # Run migrations
bun run db:studio     # Open Drizzle Studio

# Build
bun run build         # Build all
bun run type-check    # TypeScript check
```
