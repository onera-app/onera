import { requireDodoClient } from "./dodo";
import { DODO_USAGE_EVENT_NAME } from "./dodo";

/**
 * Report an overage usage event to Dodo Payments.
 * Fire-and-forget: never throws, catches and logs errors.
 */
export function reportOverageEvent(
  userId: string,
  customerId: string,
  requestId: string
): void {
  const dodo = (() => {
    try {
      return requireDodoClient();
    } catch {
      return null;
    }
  })();

  if (!dodo) {
    return;
  }

  if (!customerId) {
    console.warn(`Overage event skipped: missing dodoCustomerId for user ${userId}`);
    return;
  }

  dodo.usageEvents
    .ingest({
      events: [
        {
          event_id: requestId,
          customer_id: customerId,
          event_name: DODO_USAGE_EVENT_NAME,
          timestamp: new Date().toISOString(),
          metadata: {
            user_id: userId,
          },
        },
      ],
    })
    .catch((error: unknown) => {
      console.error("Failed to report overage event to Dodo:", error);
    });
}
