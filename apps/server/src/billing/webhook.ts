import { Hono } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../db/client";
import { subscriptions, invoices, plans } from "../db/schema";
import { dodoClient, DODO_WEBHOOK_KEY } from "./dodo";
import { randomUUID } from "crypto";

export const webhookApp = new Hono();

interface WebhookPayload {
  type: string;
  data: Record<string, any>;
}

const VALID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "on_hold",
  "cancelled",
  "trialing",
  "expired",
  "pending",
]);

webhookApp.post("/dodo", async (c) => {
  const rawBody = await c.req.text();

  // Verify webhook signature — reject if not configured in production
  if (dodoClient && DODO_WEBHOOK_KEY) {
    const webhookHeaders = {
      "webhook-id": c.req.header("webhook-id") || "",
      "webhook-signature": c.req.header("webhook-signature") || "",
      "webhook-timestamp": c.req.header("webhook-timestamp") || "",
    };

    try {
      dodoClient.webhooks.unwrap(rawBody, { headers: webhookHeaders });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return c.json({ error: "Invalid signature" }, 401);
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error(
      "DODO_PAYMENTS_WEBHOOK_SECRET not configured, rejecting webhook in production"
    );
    return c.json({ error: "Webhook not configured" }, 503);
  } else {
    console.warn(
      "Webhook signature verification skipped — DODO_PAYMENTS_WEBHOOK_SECRET not set"
    );
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { type, data } = payload;
  console.log(`Webhook received: ${type}`);

  try {
    switch (type) {
      case "subscription.active": {
        await handleSubscriptionActive(data);
        break;
      }
      case "subscription.updated": {
        await handleSubscriptionUpdated(data);
        break;
      }
      case "subscription.on_hold": {
        await handleSubscriptionStatusChange(data, "on_hold");
        break;
      }
      case "subscription.cancelled": {
        await handleSubscriptionStatusChange(data, "cancelled");
        break;
      }
      case "subscription.expired": {
        await handleSubscriptionStatusChange(data, "expired");
        break;
      }
      case "subscription.renewed": {
        await handleSubscriptionRenewed(data);
        break;
      }
      case "payment.succeeded": {
        await handlePayment(data, "succeeded");
        break;
      }
      case "payment.failed": {
        await handlePayment(data, "failed");
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error);
    return c.json({ error: "Processing failed" }, 500);
  }

  return c.json({ received: true });
});

async function handleSubscriptionActive(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  const updates: Record<string, any> = {
    status: "active",
    updatedAt: new Date(),
  };

  // Set planId from metadata — this is where the plan actually upgrades
  if (data.metadata?.planId) {
    updates.planId = data.metadata.planId;
  }
  if (data.metadata?.billingInterval) {
    updates.billingInterval = data.metadata.billingInterval;
  }
  if (data.current_period_start) {
    updates.currentPeriodStart = new Date(data.current_period_start * 1000);
  }
  if (data.current_period_end) {
    updates.currentPeriodEnd = new Date(data.current_period_end * 1000);
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionUpdated(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  const updates: Record<string, any> = { updatedAt: new Date() };

  // Validate status against known values before writing (#6)
  if (data.status && VALID_SUBSCRIPTION_STATUSES.has(data.status)) {
    updates.status = data.status;
  }
  if (data.current_period_start)
    updates.currentPeriodStart = new Date(data.current_period_start * 1000);
  if (data.current_period_end)
    updates.currentPeriodEnd = new Date(data.current_period_end * 1000);

  // Resolve planId from metadata or product_id (for plan changes)
  if (data.metadata?.planId) {
    updates.planId = data.metadata.planId;
  } else if (data.product_id) {
    const plan = await lookupPlanByDodoProductId(data.product_id);
    if (plan) {
      updates.planId = plan.id;
    }
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionStatusChange(
  data: Record<string, any>,
  status: "on_hold" | "cancelled" | "expired"
) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  await db
    .update(subscriptions)
    .set({ status, updatedAt: new Date() })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionRenewed(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart: data.current_period_start
        ? new Date(data.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: data.current_period_end
        ? new Date(data.current_period_end * 1000)
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handlePayment(
  data: Record<string, any>,
  status: "succeeded" | "failed"
) {
  const dodoPaymentId = data.payment_id || data.id;
  if (!dodoPaymentId) return;

  // Idempotency check: skip if invoice already exists for this payment (#2)
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.dodoPaymentId, dodoPaymentId))
    .limit(1);
  if (existing) return;

  // Find the subscription for this payment
  const dodoSubId = data.subscription_id;
  let subscriptionId: string | null = null;

  if (dodoSubId) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.dodoSubscriptionId, dodoSubId))
      .limit(1);
    subscriptionId = sub?.id || null;
  }

  // Find userId from subscription or data
  let userId = data.customer_id || data.metadata?.userId;
  if (!userId && subscriptionId) {
    const [sub] = await db
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    userId = sub?.userId;
  }

  if (!userId) {
    console.warn("Payment webhook missing userId, skipping invoice creation");
    return;
  }

  await db.insert(invoices).values({
    id: randomUUID(),
    userId,
    subscriptionId,
    dodoPaymentId,
    amountCents: data.amount || 0,
    currency: data.currency || "USD",
    status,
    description: data.description || `Payment ${status}`,
    paidAt: status === "succeeded" ? new Date() : null,
  });
}

/**
 * Reverse-lookup a plan by its Dodo price ID (monthly or yearly).
 * Used by webhooks after plan changes where metadata isn't available.
 */
async function lookupPlanByDodoProductId(productId: string) {
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(
      or(
        eq(plans.dodoPriceIdMonthly, productId),
        eq(plans.dodoPriceIdYearly, productId)
      )
    )
    .limit(1);
  return plan || null;
}
