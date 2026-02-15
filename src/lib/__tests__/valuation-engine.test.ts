import { describe, it, expect } from "vitest";
import {
  calculateValuation,
  calculatePortfolioValue,
  getNicheCPC,
  AVAILABLE_NICHES,
  type ValuationInput,
} from "../valuation-engine";

describe("calculateValuation", () => {
  const baseInput: ValuationInput = {
    traffic: 1000,
    leads: 30,
    conversions: 10,
    niche: "plumbing",
  };

  it("returns all required fields", () => {
    const result = calculateValuation(baseInput);
    expect(result).toHaveProperty("estimatedMonthlyValue");
    expect(result).toHaveProperty("suggestedMinPrice");
    expect(result).toHaveProperty("suggestedMaxPrice");
    expect(result).toHaveProperty("trafficValue");
    expect(result).toHaveProperty("leadValue");
    expect(result).toHaveProperty("conversionPotential");
    expect(result).toHaveProperty("cpcUsed");
    expect(result).toHaveProperty("multiplier");
  });

  it("uses correct CPC for known niche", () => {
    const result = calculateValuation({ ...baseInput, niche: "legal" });
    expect(result.cpcUsed).toBe(15.0);
  });

  it("falls back to default CPC for unknown niche", () => {
    const result = calculateValuation({ ...baseInput, niche: "unknown_niche" });
    expect(result.cpcUsed).toBe(6.0);
  });

  it("falls back to default CPC when niche is null", () => {
    const result = calculateValuation({ ...baseInput, niche: null });
    expect(result.cpcUsed).toBe(6.0);
  });

  it("suggestedMinPrice < estimatedMonthlyValue < suggestedMaxPrice", () => {
    const result = calculateValuation(baseInput);
    expect(result.suggestedMinPrice).toBeLessThanOrEqual(result.estimatedMonthlyValue);
    expect(result.suggestedMaxPrice).toBeGreaterThanOrEqual(result.estimatedMonthlyValue);
  });

  it("increases multiplier with high leads", () => {
    const low = calculateValuation({ ...baseInput, leads: 5 });
    const high = calculateValuation({ ...baseInput, leads: 25 });
    expect(high.multiplier).toBeGreaterThan(low.multiplier);
  });

  it("increases multiplier with high traffic", () => {
    const low = calculateValuation({ ...baseInput, traffic: 100 });
    const high = calculateValuation({ ...baseInput, traffic: 600 });
    expect(high.multiplier).toBeGreaterThan(low.multiplier);
  });

  it("increases multiplier with currentMonthlyRevenue", () => {
    const without = calculateValuation(baseInput);
    const with_ = calculateValuation({ ...baseInput, currentMonthlyRevenue: 500 });
    expect(with_.multiplier).toBeGreaterThan(without.multiplier);
  });

  it("returns rounded integer values", () => {
    const result = calculateValuation(baseInput);
    expect(result.estimatedMonthlyValue).toBe(Math.round(result.estimatedMonthlyValue));
    expect(result.suggestedMinPrice).toBe(Math.round(result.suggestedMinPrice));
    expect(result.suggestedMaxPrice).toBe(Math.round(result.suggestedMaxPrice));
    expect(result.trafficValue).toBe(Math.round(result.trafficValue));
    expect(result.leadValue).toBe(Math.round(result.leadValue));
  });

  it("handles zero inputs without error", () => {
    const result = calculateValuation({ traffic: 0, leads: 0, conversions: 0 });
    expect(result.estimatedMonthlyValue).toBe(0);
    expect(result.suggestedMinPrice).toBe(0);
    expect(result.suggestedMaxPrice).toBe(0);
  });
});

describe("calculatePortfolioValue", () => {
  it("returns a positive integer for positive inputs", () => {
    const val = calculatePortfolioValue(1000, 500, 10);
    expect(val).toBeGreaterThan(0);
    expect(val).toBe(Math.round(val));
  });

  it("returns 0 for zero inputs", () => {
    expect(calculatePortfolioValue(0, 0, 0)).toBe(0);
  });

  it("scales with revenue", () => {
    const low = calculatePortfolioValue(100, 500, 5);
    const high = calculatePortfolioValue(1000, 500, 5);
    expect(high).toBeGreaterThan(low);
  });
});

describe("getNicheCPC", () => {
  it("returns CPC for known niche", () => {
    expect(getNicheCPC("roofing")).toBe(12.0);
  });

  it("returns default for unknown niche", () => {
    expect(getNicheCPC("underwater_basket_weaving")).toBe(6.0);
  });

  it("handles spaces in niche name", () => {
    expect(getNicheCPC("home services")).toBe(7.0);
  });
});

describe("AVAILABLE_NICHES", () => {
  it("does not include default", () => {
    expect(AVAILABLE_NICHES.find((n) => n.value === "default")).toBeUndefined();
  });

  it("has label and value for each niche", () => {
    for (const niche of AVAILABLE_NICHES) {
      expect(niche.value).toBeTruthy();
      expect(niche.label).toBeTruthy();
    }
  });
});
