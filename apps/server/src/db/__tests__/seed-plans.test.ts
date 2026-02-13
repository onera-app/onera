import { describe, it, expect } from "bun:test";
import { planData } from "../plan-data";

describe("Plan Seed Data", () => {
  it("should have all active plans", () => {
    expect(planData).toHaveLength(4);
  });

  it("should contain expected plan IDs", () => {
    const ids = planData.map((p) => p.id);
    expect(ids).toEqual(["free", "starter", "pro", "team"]);
  });

  it("should have free plan at $0", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
  });

  it("should have bounded limits on free plan", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.inferenceRequestsLimit).toBe(100);
    expect(free.byokInferenceRequestsLimit).toBe(500);
    expect(free.storageLimitMb).toBe(1000);
    expect(free.maxEnclaves).toBe(0);
  });

  it("should have valid feature flags on all plans", () => {
    const requiredFeatures = [
      "prioritySupport",
      "dedicatedEnclaves",
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

  it("should have correct features on free plan", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.features.customEndpoints).toBe(true);
    expect(free.features.dedicatedEnclaves).toBe(false);
    expect(free.features.largeModels).toBe(false);
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
  });

  it("should have Dodo product IDs on paid plans", () => {
    for (const plan of planData.filter((p) => p.id !== "free")) {
      expect(plan.dodoPriceIdMonthly).toBeTruthy();
      expect(plan.dodoPriceIdYearly).toBeTruthy();
    }
  });
});
