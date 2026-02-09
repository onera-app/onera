import DodoPayments from "dodopayments";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
  console.warn(
    "DODO_PAYMENTS_API_KEY not set — billing features will be unavailable"
  );
}

export const dodoClient = apiKey
  ? new DodoPayments({
      bearerToken: apiKey,
      environment:
        process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
    })
  : null;

export const DODO_WEBHOOK_KEY =
  process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "";

/**
 * Get the Dodo client, throwing if not configured.
 * Use this in billing routes that require the client.
 */
export function requireDodoClient(): DodoPayments {
  if (!dodoClient) {
    throw new Error(
      "Billing is not configured. DODO_PAYMENTS_API_KEY is missing."
    );
  }
  return dodoClient;
}
