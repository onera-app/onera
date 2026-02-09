import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db } from "../../db/client";
import {
  plans,
  subscriptions,
  invoices,
  usageRecords,
} from "../../db/schema";
import { eq, desc, sql, and, gte, lt, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "../../auth/clerk";
import { randomUUID } from "crypto";

export const adminRouter = router({
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
      const clerkUsers = await clerkClient.users.getUserList({
        limit: input.limit,
        offset: input.offset,
        query: input.search || undefined,
      });

      const userIds = clerkUsers.data.map((u) => u.id);

      const subs =
        userIds.length > 0
          ? await db
              .select()
              .from(subscriptions)
              .where(inArray(subscriptions.userId, userIds))
          : [];

      const subMap = new Map(subs.map((s) => [s.userId, s]));

      return {
        users: clerkUsers.data.map((u) => {
          const sub = subMap.get(u.id);
          const primaryEmail = u.emailAddresses.find(
            (e) => e.id === u.primaryEmailAddressId
          );
          return {
            id: u.id,
            email: primaryEmail?.emailAddress || "",
            name:
              [u.firstName, u.lastName].filter(Boolean).join(" ") || "User",
            imageUrl: u.imageUrl,
            createdAt: u.createdAt,
            subscription: sub
              ? {
                  planId: sub.planId,
                  status: sub.status,
                  billingInterval: sub.billingInterval,
                }
              : null,
          };
        }),
        totalCount: clerkUsers.totalCount,
      };
    }),

  // Get detailed user info
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await clerkClient.users.getUser(input.userId);
      const primaryEmail = user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId
      );

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
      // Use first day of next month for exclusive upper bound (#10)
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
          email: primaryEmail?.emailAddress || "",
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") || "User",
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          role: (user.publicMetadata as Record<string, unknown>)?.role || null,
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
      // Validate that the user exists in Clerk (#8)
      try {
        await clerkClient.users.getUser(input.userId);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in Clerk",
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
