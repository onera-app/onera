import { beforeEach, describe, expect, test, mock } from "bun:test";
import { TRPCError } from "@trpc/server";

let role: string | null = null;
let entitlementsCalls = 0;

const mockedEntitlements = {
  planId: "pro",
  planName: "Pro",
  inferenceRequestsLimit: 5000,
  byokInferenceRequestsLimit: -1,
  storageLimitMb: 10240,
  maxEnclaves: 1,
  features: {
    dedicatedEnclaves: true,
  },
  usageBasedBilling: false,
  dodoCustomerId: null,
};

mock.module("../../../auth/supabase", () => ({
  getUserRole: async () => role,
  authenticateRequest: async () => null,
  extractBearerToken: () => null,
}));

mock.module("../../../billing/entitlements", () => ({
  getEntitlements: async () => {
    entitlementsCalls += 1;
    return mockedEntitlements;
  },
}));

const { router, protectedProcedure, adminProcedure, entitledProcedure } = await import("../../trpc");

function authedContext(userId = "user_test") {
  return {
    user: {
      id: userId,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      name: "Test User",
      imageUrl: null,
      emailVerified: true,
    },
  };
}

async function expectTRPCCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  try {
    await promise;
    throw new Error(`Expected ${code} error`);
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe(code);
  }
}

describe("tRPC guard contracts", () => {
  beforeEach(() => {
    role = null;
    entitlementsCalls = 0;
  });

  test("protectedProcedure blocks unauthenticated callers", async () => {
    const testRouter = router({
      me: protectedProcedure.query(({ ctx }) => ctx.user.id),
    });
    const caller = testRouter.createCaller({ user: null });

    await expectTRPCCode(caller.me(), "UNAUTHORIZED");
  });

  test("protectedProcedure allows authenticated callers", async () => {
    const testRouter = router({
      me: protectedProcedure.query(({ ctx }) => ctx.user.id),
    });
    const caller = testRouter.createCaller(authedContext());

    await expect(caller.me()).resolves.toBe("user_test");
  });

  test("adminProcedure blocks unauthenticated callers", async () => {
    const testRouter = router({
      stats: adminProcedure.query(() => ({ ok: true })),
    });
    const caller = testRouter.createCaller({ user: null });

    await expectTRPCCode(caller.stats(), "UNAUTHORIZED");
  });

  test("adminProcedure blocks non-admin users", async () => {
    role = "user";
    const testRouter = router({
      stats: adminProcedure.query(() => ({ ok: true })),
    });
    const caller = testRouter.createCaller(authedContext());

    await expectTRPCCode(caller.stats(), "FORBIDDEN");
  });

  test("adminProcedure allows admin users", async () => {
    role = "admin";
    const testRouter = router({
      stats: adminProcedure.query(() => ({ ok: true })),
    });
    const caller = testRouter.createCaller(authedContext("admin_1"));

    await expect(caller.stats()).resolves.toEqual({ ok: true });
  });

  test("entitledProcedure blocks unauthenticated callers before loading entitlements", async () => {
    const testRouter = router({
      plan: entitledProcedure.query(({ ctx }) => ctx.entitlements.planId),
    });
    const caller = testRouter.createCaller({ user: null });

    await expectTRPCCode(caller.plan(), "UNAUTHORIZED");
    expect(entitlementsCalls).toBe(0);
  });

  test("entitledProcedure injects entitlements for authenticated callers", async () => {
    const testRouter = router({
      plan: entitledProcedure.query(({ ctx }) => ({
        planId: ctx.entitlements.planId,
        dedicatedEnclaves: ctx.entitlements.features.dedicatedEnclaves,
      })),
    });
    const caller = testRouter.createCaller(authedContext());

    await expect(caller.plan()).resolves.toEqual({
      planId: "pro",
      dedicatedEnclaves: true,
    });
    expect(entitlementsCalls).toBe(1);
  });
});
