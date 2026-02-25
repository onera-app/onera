import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db, apiTokens } from "../../db/client";
import { generateApiToken } from "../../auth/apiTokens";

export const apiTokensRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        lastUsedAt: apiTokens.lastUsedAt,
        createdAt: apiTokens.createdAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, ctx.user.id))
      .orderBy(desc(apiTokens.createdAt));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tokenPrefix: row.tokenPrefix,
      lastUsedAt: row.lastUsedAt?.getTime() ?? null,
      createdAt: row.createdAt.getTime(),
      revokedAt: row.revokedAt?.getTime() ?? null,
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(64).default("Default"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generated = generateApiToken();

      const [row] = await db
        .insert(apiTokens)
        .values({
          userId: ctx.user.id,
          name: input.name,
          tokenHash: generated.hash,
          tokenPrefix: generated.prefix,
        })
        .returning({
          id: apiTokens.id,
          name: apiTokens.name,
          tokenPrefix: apiTokens.tokenPrefix,
          createdAt: apiTokens.createdAt,
        });

      return {
        id: row.id,
        name: row.name,
        tokenPrefix: row.tokenPrefix,
        createdAt: row.createdAt.getTime(),
        token: generated.token,
      };
    }),

  revoke: protectedProcedure
    .input(
      z.object({
        tokenId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(apiTokens)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiTokens.id, input.tokenId),
            eq(apiTokens.userId, ctx.user.id),
            isNull(apiTokens.revokedAt)
          )
        );

      return { success: true };
    }),
});
