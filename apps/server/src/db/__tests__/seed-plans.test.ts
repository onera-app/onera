import { describe, it, expect } from "bun:test";
import { planData } from "../plan-data";

describe("Plan Seed Data", () => {
  it("should have 5 plans", () => {
    expect(planData).toHaveLength(5);
  });

  it("should have correct plan IDs", () => {
    const ids = planData.map((p) => p.id);
    expect(ids).toEqual(["free", "starter", "pro", "privacy_max", "team"]);
  });

  it("should have free plan at $0", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
  });

  it("should have ascending prices for individual plans", () => {
    const prices = planData
      .filter((p) => p.id !== "team")
      .map((p) => p.monthlyPrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("should have yearly discount on all paid plans", () => {
    const paid = planData.filter((p) => p.monthlyPrice > 0);
    for (const plan of paid) {
      const yearlyMonthly = plan.yearlyPrice / 12;
      expect(yearlyMonthly).toBeLessThan(plan.monthlyPrice);
    }
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

  it("should have free plan with most features disabled", () => {
    const free = planData.find((p) => p.id === "free")!;
    expect(free.features.voiceCalls).toBe(false);
    expect(free.features.dedicatedEnclaves).toBe(false);
    expect(free.features.customModels).toBe(false);
    expect(free.features.prioritySupport).toBe(false);
  });

  it("should have privacy_max with all features enabled", () => {
    const max = planData.find((p) => p.id === "privacy_max")!;
    expect(Object.values(max.features).every(Boolean)).toBe(true);
  });

  it("should have unlimited inference for privacy_max", () => {
    const max = planData.find((p) => p.id === "privacy_max")!;
    expect(max.inferenceRequestsLimit).toBe(-1);
  });

  it("should have byokInferenceRequestsLimit on all plans", () => {
    for (const plan of planData) {
      expect(typeof plan.byokInferenceRequestsLimit).toBe("number");
    }
    const free = planData.find((p) => p.id === "free")!;
    expect(free.byokInferenceRequestsLimit).toBeGreaterThan(0);
    const pro = planData.find((p) => p.id === "pro")!;
    expect(pro.byokInferenceRequestsLimit).toBe(-1); // unlimited
  });
});
