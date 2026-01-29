---
name: trpc-patterns
description: tRPC implementation patterns for Onera backend
---

## Router Setup

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
```

## Query Pattern

```typescript
get: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const item = await ctx.db.query.items.findFirst({
      where: and(
        eq(items.id, input.id),
        eq(items.userId, ctx.userId)
      ),
    });
    
    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    
    return item;
  }),
```

## Mutation Pattern

```typescript
create: protectedProcedure
  .input(createItemSchema)
  .mutation(async ({ ctx, input }) => {
    const [item] = await ctx.db
      .insert(items)
      .values({
        ...input,
        userId: ctx.userId,
      })
      .returning();
    
    return item;
  }),
```

## Pagination Pattern

```typescript
list: protectedProcedure
  .input(z.object({
    cursor: z.string().uuid().optional(),
    limit: z.number().min(1).max(100).default(20),
  }))
  .query(async ({ ctx, input }) => {
    const items = await ctx.db.query.items.findMany({
      where: and(
        eq(items.userId, ctx.userId),
        input.cursor ? gt(items.id, input.cursor) : undefined
      ),
      orderBy: asc(items.createdAt),
      limit: input.limit + 1,
    });
    
    const hasMore = items.length > input.limit;
    const data = hasMore ? items.slice(0, -1) : items;
    
    return {
      items: data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }),
```

## Error Handling

```typescript
// Client-side errors
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Validation failed',
  cause: zodError,
});

// Not found
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Resource not found',
});

// Authorization
throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'Access denied',
});

// Rate limiting
throw new TRPCError({
  code: 'TOO_MANY_REQUESTS',
  message: 'Please slow down',
});
```

## Client Usage

```typescript
// Query
const { data, isLoading } = trpc.items.list.useQuery();

// Query with params
const { data } = trpc.items.get.useQuery({ id });

// Infinite query
const { data, fetchNextPage, hasNextPage } = trpc.items.list.useInfiniteQuery(
  { limit: 20 },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);

// Mutation
const mutation = trpc.items.create.useMutation({
  onSuccess: () => utils.items.list.invalidate(),
});

// Optimistic update
const mutation = trpc.items.update.useMutation({
  onMutate: async (newData) => {
    await utils.items.get.cancel({ id: newData.id });
    const previous = utils.items.get.getData({ id: newData.id });
    utils.items.get.setData({ id: newData.id }, (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (err, newData, ctx) => {
    utils.items.get.setData({ id: newData.id }, ctx?.previous);
  },
  onSettled: (data, err, vars) => {
    utils.items.get.invalidate({ id: vars.id });
  },
});
```
