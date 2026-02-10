import { describe, it, expect } from "bun:test";
import { planData } from "../plan-data";

// NOTE: These tests reflect the temporary early-access state where only the
// free plan exists with unlimited limits. Update when paid plans are re-enabled.

describe("Plan Seed Data", () => {
  it("should have 1 plan (early access)", () => {
    expect(planData).toHaveLength(1);
  });

  it("should only contain the free plan", () => {
    const ids = planData.map((p) => p.id);
    expect(ids).toEqual(["free"]);
  });

  it("should have free plan at $0", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
  });

  it("should have unlimited limits on free plan during early access", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.inferenceRequestsLimit).toBe(-1);
    expect(free.byokInferenceRequestsLimit).toBe(-1);
    expect(free.storageLimitMb).toBe(-1);
    expect(free.maxEnclaves).toBe(-1);
  });

  it("should have valid feature flags on all plans", () => {
    const requiredFeatures = [
      "voiceCalls",
      "voiceInput",
      "prioritySupport",
      "dedicatedEnclaves",
      "customModels",
      "customEndpoints",
      "largeModels",
      "priorityQueue",
    ];
    for (const plan of planData) {
      for (const feature of requiredFeatures) {
        expect(typeof plan.features[feature as keyof typeof plan.features]).toBe(
          "boolean"
        );
      }
    }
  });

  it("should have most features enabled on free plan during early access", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.features.voiceCalls).toBe(true);
    expect(free.features.voiceInput).toBe(true);
    expect(free.features.dedicatedEnclaves).toBe(true);
    expect(free.features.customModels).toBe(true);
    expect(free.features.customEndpoints).toBe(true);
    expect(free.features.largeModels).toBe(true);
  });

  it("should have no Dodo price IDs on free plan", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.dodoPriceIdMonthly).toBeNull();
    expect(free.dodoPriceIdYearly).toBeNull();
  });

  it("should have byokInferenceRequestsLimit on all plans", () => {
    for (const plan of planData) {
      expect(typeof plan.byokInferenceRequestsLimit).toBe("number");
    }
    const free = planData.find((p) => p.id === "free")!;
    expect(free.byokInferenceRequestsLimit).toBe(-1); // unlimited during early access
  });
});
