import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db, users } from "../../db/client";
import {
  plans,
  subscriptions,
  invoices,
  usageRecords,
} from "../../db/schema";
import { eq, desc, sql, and, gte, lt, inArray, ilike, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

export const adminRouter = router({
  // Simple admin access check (used by client to show/hide admin UI)
  checkAccess: adminProcedure.query(() => {
    return { isAdmin: true };
  }),

  // List users with subscription info
  listUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.search) {
        conditions.push(
          or(
            ilike(users.email, `%${input.search}%`),
            ilike(users.name, `%${input.search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const userList = await db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where);

      const userIds = userList.map((u) => u.id);

      const subs =
        userIds.length > 0
          ? await db
              .select()
              .from(subscriptions)
              .where(inArray(subscriptions.userId, userIds))
          : [];

      const subMap = new Map(subs.map((s) => [s.userId, s]));

      return {
        users: userList.map((u) => {
          const sub = subMap.get(u.id);
          return {
            id: u.id,
            email: u.email,
            name: u.name || "User",
            imageUrl: u.imageUrl,
            createdAt: u.createdAt.getTime(),
            subscription: sub
              ? {
                  planId: sub.planId,
                  status: sub.status,
                  billingInterval: sub.billingInterval,
                }
              : null,
          };
        }),
        totalCount: Number(countResult.count),
      };
    }),

  // Get detailed user info
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input.userId))
        .limit(1);

      const [plan] = sub
        ? await db
            .select()
            .from(plans)
            .where(eq(plans.id, sub.planId))
            .limit(1)
        : [null];

      const userInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, input.userId))
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      const now = new Date();
      const periodStart =
        sub?.currentPeriodStart ||
        new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd =
        sub?.currentPeriodEnd ||
        new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const usage = await db
        .select({
          type: usageRecords.type,
          total: sql<number>`sum(${usageRecords.quantity})`,
        })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.userId, input.userId),
            gte(usageRecords.periodStart, periodStart),
            lt(usageRecords.periodEnd, periodEnd)
          )
        )
        .groupBy(usageRecords.type);

      const usageMap: Record<string, number> = {};
      for (const row of usage) {
        usageMap[row.type] = Number(row.total) || 0;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "User",
          imageUrl: user.imageUrl,
          createdAt: user.createdAt.getTime(),
          role: user.role,
        },
        subscription: sub
          ? {
              ...sub,
              createdAt: sub.createdAt.getTime(),
              updatedAt: sub.updatedAt.getTime(),
              currentPeriodStart: sub.currentPeriodStart?.getTime() ?? null,
              currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
            }
          : null,
        plan,
        invoices: userInvoices.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.getTime(),
          paidAt: inv.paidAt?.getTime() ?? null,
        })),
        usage: {
          inferenceRequests: usageMap["inference_request"] || 0,
          storageMb: usageMap["storage_mb"] || 0,
        },
      };
    }),

  // Force update a user's plan (admin override)
  updateUserPlan: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        planId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input.userId))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            planId: input.planId,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, input.userId));
      } else {
        await db.insert(subscriptions).values({
          id: randomUUID(),
          userId: input.userId,
          planId: input.planId,
          status: "active",
          billingInterval: "none",
        });
      }

      return { success: true };
    }),

  // Dashboard stats
  getStats: adminProcedure.query(async () => {
    const subsByPlan = await db
      .select({
        planId: subscriptions.planId,
        count: sql<number>`count(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.planId);

    const activeSubs = await db
      .select({
        billingInterval: subscriptions.billingInterval,
        planId: subscriptions.planId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const allPlans = await db.select().from(plans);
    const planMap = new Map(allPlans.map((p) => [p.id, p]));

    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = planMap.get(sub.planId);
      if (!plan) continue;
      if (sub.billingInterval === "monthly") {
        mrr += plan.monthlyPrice;
      } else if (sub.billingInterval === "yearly") {
        mrr += Math.round(plan.yearlyPrice / 12);
      }
    }

    const [revenueResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.status, "succeeded"));

    const recentInvoices = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    return {
      mrr,
      totalRevenue: Number(revenueResult.total),
      subscriptionsByPlan: Object.fromEntries(
        subsByPlan.map((s) => [s.planId, Number(s.count)])
      ),
      totalActiveSubscriptions: activeSubs.length,
      recentInvoices: recentInvoices.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.getTime(),
        paidAt: inv.paidAt?.getTime() ?? null,
      })),
    };
  }),

  // List all subscriptions
  listSubscriptions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["active", "on_hold", "cancelled", "trialing", "expired"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(subscriptions.status, input.status));
      }

      const where =
        conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(subscriptions)
        .where(where)
        .orderBy(desc(subscriptions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(where);

      return {
        subscriptions: result.map((sub) => ({
          ...sub,
          createdAt: sub.createdAt.getTime(),
          updatedAt: sub.updatedAt.getTime(),
          currentPeriodStart: sub.currentPeriodStart?.getTime() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
        })),
        totalCount: Number(total[0].count),
      };
    }),

  // List all invoices
  listInvoices: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(["succeeded", "failed", "refunded"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      const where =
        conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(where);

      return {
        invoices: result.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.getTime(),
          paidAt: inv.paidAt?.getTime() ?? null,
        })),
        totalCount: Number(total[0].count),
      };
    }),
});
