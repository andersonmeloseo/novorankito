/**
 * Tests for edge function _shared/utils.ts logic
 * We test the pure functions by re-implementing their logic here
 * since edge functions use Deno imports.
 */
import { describe, it, expect } from "vitest";

// Re-implement pure functions from _shared/utils.ts for testing
const ALLOWED_ORIGINS = [
  "https://novorankito.lovable.app",
  "https://id-preview--c5a9c519-57e7-4f0b-9801-8f7300bce728.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateBody(body: Record<string, unknown>, requiredFields: string[]): string[] {
  return requiredFields.filter((f) => {
    const val = body[f];
    return val === undefined || val === null || val === "";
  });
}

describe("getCorsHeaders", () => {
  it("returns allowed origin when origin is in whitelist", () => {
    const headers = getCorsHeaders("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });

  it("falls back to first origin for unknown origin", () => {
    const headers = getCorsHeaders("https://evil.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://novorankito.lovable.app");
  });

  it("falls back to first origin when no origin provided", () => {
    const headers = getCorsHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://novorankito.lovable.app");
  });

  it("includes Vary: Origin header", () => {
    const headers = getCorsHeaders("http://localhost:5173");
    expect(headers["Vary"]).toBe("Origin");
  });
});

describe("isValidUUID", () => {
  it("accepts valid UUID v4", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUID", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidUUID("")).toBe(false);
  });

  it("rejects malformed UUID", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });

  it("rejects UUID with extra characters", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000-extra")).toBe(false);
  });

  it("rejects SQL injection attempt", () => {
    expect(isValidUUID("'; DROP TABLE users; --")).toBe(false);
  });
});

describe("validateBody", () => {
  it("returns empty array when all fields present", () => {
    const missing = validateBody({ name: "test", id: "123" }, ["name", "id"]);
    expect(missing).toEqual([]);
  });

  it("detects missing fields", () => {
    const missing = validateBody({ name: "test" }, ["name", "id"]);
    expect(missing).toEqual(["id"]);
  });

  it("detects null fields as missing", () => {
    const missing = validateBody({ name: null }, ["name"]);
    expect(missing).toEqual(["name"]);
  });

  it("detects empty string fields as missing", () => {
    const missing = validateBody({ name: "" }, ["name"]);
    expect(missing).toEqual(["name"]);
  });

  it("accepts zero and false as valid", () => {
    const missing = validateBody({ count: 0, active: false }, ["count", "active"]);
    expect(missing).toEqual([]);
  });
});
