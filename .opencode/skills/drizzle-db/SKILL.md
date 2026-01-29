---
name: drizzle-db
description: Drizzle ORM patterns for PostgreSQL
---

## Schema Definition

```typescript
import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type inference
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

## Relations

```typescript
export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));
```

## Queries

### Find One
```typescript
const chat = await db.query.chats.findFirst({
  where: eq(chats.id, chatId),
});
```

### Find with Relations
```typescript
const chatWithMessages = await db.query.chats.findFirst({
  where: eq(chats.id, chatId),
  with: {
    messages: {
      orderBy: asc(messages.createdAt),
    },
  },
});
```

### Find Many with Filters
```typescript
const userChats = await db.query.chats.findMany({
  where: and(
    eq(chats.userId, userId),
    isNull(chats.deletedAt)
  ),
  orderBy: desc(chats.updatedAt),
  limit: 20,
});
```

### Complex Filters
```typescript
import { eq, and, or, gt, lt, like, inArray, isNull, isNotNull } from 'drizzle-orm';

// Multiple conditions
where: and(
  eq(chats.userId, userId),
  gt(chats.createdAt, startDate),
  lt(chats.createdAt, endDate)
)

// OR conditions
where: or(
  eq(chats.status, 'active'),
  eq(chats.status, 'pending')
)

// Search
where: like(chats.title, `%${search}%`)

// In array
where: inArray(chats.id, chatIds)
```

## Mutations

### Insert
```typescript
const [chat] = await db.insert(chats)
  .values({
    userId,
    title,
    encryptedKey,
  })
  .returning();
```

### Insert Many
```typescript
await db.insert(messages).values([
  { chatId, content: 'Hello', role: 'user' },
  { chatId, content: 'Hi there!', role: 'assistant' },
]);
```

### Update
```typescript
await db.update(chats)
  .set({ 
    title: newTitle,
    updatedAt: new Date(),
  })
  .where(eq(chats.id, chatId));
```

### Delete
```typescript
await db.delete(chats)
  .where(eq(chats.id, chatId));
```

### Soft Delete
```typescript
await db.update(chats)
  .set({ deletedAt: new Date() })
  .where(eq(chats.id, chatId));
```

## Transactions

```typescript
await db.transaction(async (tx) => {
  const [chat] = await tx.insert(chats)
    .values(chatData)
    .returning();
  
  await tx.insert(messages).values({
    chatId: chat.id,
    content: initialMessage,
    role: 'user',
  });
  
  return chat;
});
```

## Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio

# Push schema directly (dev only)
bun run db:push
```

## Indexes

```typescript
import { index } from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
  // columns...
}, (table) => ({
  userIdIdx: index('chats_user_id_idx').on(table.userId),
  createdAtIdx: index('chats_created_at_idx').on(table.createdAt),
}));
```
