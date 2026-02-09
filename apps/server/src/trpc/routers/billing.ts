import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../../db/client";
import { plans, subscriptions, invoices, usageRecords } from "../../db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireDodoClient } from "../../billing/dodo";
import { randomUUID } from "crypto";

export const billingRouter = router({
  // List available plans
  getPlans: protectedProcedure.query(async () => {
    return db.select().from(plans).orderBy(plans.monthlyPrice);
  }),

  // Get current user's subscription
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!subscription) {
      // Return free plan defaults
      const [freePlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, "free"))
        .limit(1);

      return {
        subscription: null,
        plan: freePlan || null,
      };
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1);

    return {
      subscription: {
        ...subscription,
        createdAt: subscription.createdAt.getTime(),
        updatedAt: subscription.updatedAt.getTime(),
        currentPeriodStart: subscription.currentPeriodStart?.getTime() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.getTime() ?? null,
      },
      plan: plan || null,
    };
  }),

  // Create checkout session for a plan
  createCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingInterval: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dodo = requireDodoClient();

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      if (plan.id === "free") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot checkout for free plan",
        });
      }

      const priceId =
        input.billingInterval === "monthly"
          ? plan.dodoPriceIdMonthly
          : plan.dodoPriceIdYearly;

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plan pricing not configured in Dodo",
        });
      }

      // Create Dodo subscription checkout
      // Billing address is collected on the Dodo checkout page; we pass a minimal default
      const checkout = await dodo.subscriptions.create({
        product_id: priceId,
        quantity: 1,
        billing: {
          country: "US",
        },
        customer: {
          email: ctx.user.email,
          name: ctx.user.name,
        },
        metadata: {
          userId: ctx.user.id,
          planId: plan.id,
          billingInterval: input.billingInterval,
        },
        payment_link: true,
      });

      // Create a pending subscription record
      const existingSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (existingSub.length === 0) {
        await db.insert(subscriptions).values({
          id: randomUUID(),
          userId: ctx.user.id,
          planId: plan.id,
          dodoSubscriptionId: checkout.subscription_id,
          dodoCustomerId: checkout.customer?.customer_id ?? null,
          status: "trialing",
          billingInterval: input.billingInterval,
        });
      } else {
        await db
          .update(subscriptions)
          .set({
            planId: plan.id,
            dodoSubscriptionId: checkout.subscription_id,
            dodoCustomerId: checkout.customer?.customer_id ?? null,
            billingInterval: input.billingInterval,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, ctx.user.id));
      }

      return {
        url: checkout.payment_link,
        subscriptionId: checkout.subscription_id,
      };
    }),

  // Change plan (upgrade/downgrade)
  changePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingInterval: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dodo = requireDodoClient();

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!currentSub?.dodoSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription to change",
        });
      }

      // Get target plan
      const [targetPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!targetPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const priceId =
        input.billingInterval === "monthly"
          ? targetPlan.dodoPriceIdMonthly
          : targetPlan.dodoPriceIdYearly;

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target plan pricing not configured",
        });
      }

      // Use Dodo's changePlan API for plan upgrades/downgrades
      await dodo.subscriptions.changePlan(currentSub.dodoSubscriptionId, {
        product_id: priceId,
        quantity: 1,
        proration_billing_mode: "prorated_immediately",
      });

      // Update local record
      await db
        .update(subscriptions)
        .set({
          planId: targetPlan.id,
          billingInterval: input.billingInterval,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, ctx.user.id));

      return { success: true };
    }),

  // Get current period usage
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    // Get current subscription period
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const now = new Date();
    const periodStart =
      sub?.currentPeriodStart ||
      new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd =
      sub?.currentPeriodEnd ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await db
      .select({
        type: usageRecords.type,
        total: sql<number>`sum(${usageRecords.quantity})`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, ctx.user.id),
          gte(usageRecords.periodStart, periodStart),
          lte(usageRecords.periodEnd, periodEnd)
        )
      )
      .groupBy(usageRecords.type);

    const usageMap: Record<string, number> = {};
    for (const row of usage) {
      usageMap[row.type] = Number(row.total) || 0;
    }

    return {
      inferenceRequests: usageMap["inference_request"] || 0,
      storageMb: usageMap["storage_mb"] || 0,
      periodStart: periodStart.getTime(),
      periodEnd: periodEnd.getTime(),
    };
  }),

  // Get invoice history
  getInvoices: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const result = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, ctx.user.id))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset);

      return result.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.getTime(),
        paidAt: inv.paidAt?.getTime() ?? null,
      }));
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const dodo = requireDodoClient();

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.dodoSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active subscription to cancel",
      });
    }

    // Cancel at end of billing period (graceful cancellation)
    await dodo.subscriptions.update(sub.dodoSubscriptionId, {
      cancel_at_next_billing_date: true,
    });

    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, ctx.user.id));

    return { success: true };
  }),

  // Get Dodo customer portal URL
  getPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.dodoCustomerId) {
      return { url: null };
    }

    // Dodo customer portal URL pattern
    const portalUrl = `https://checkout.dodopayments.com/customer-portal/${sub.dodoCustomerId}`;
    return { url: portalUrl };
  }),
});
