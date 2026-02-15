import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getCorsHeaders, validateBody, validateStringFields, isValidUUID, validateUUID, jsonResponse, errorResponse } from "../_shared/utils.ts";

Deno.test("getCorsHeaders returns allowed origin for whitelisted origin", () => {
  const req = new Request("https://example.com", {
    headers: { origin: "http://localhost:5173" },
  });
  const headers = getCorsHeaders(req);
  assertEquals(headers["Access-Control-Allow-Origin"], "http://localhost:5173");
});

Deno.test("getCorsHeaders falls back to first origin for unknown origin", () => {
  const req = new Request("https://example.com", {
    headers: { origin: "https://evil.com" },
  });
  const headers = getCorsHeaders(req);
  assertEquals(headers["Access-Control-Allow-Origin"], "https://novorankito.lovable.app");
});

Deno.test("getCorsHeaders falls back when no request provided", () => {
  const headers = getCorsHeaders();
  assertEquals(headers["Access-Control-Allow-Origin"], "https://novorankito.lovable.app");
});

Deno.test("validateBody returns null when all required fields present", () => {
  const cors = getCorsHeaders();
  const result = validateBody({ name: "test", id: "123" }, ["name", "id"], cors);
  assertEquals(result, null);
});

Deno.test("validateBody returns Response for missing fields", () => {
  const cors = getCorsHeaders();
  const result = validateBody({ name: "test" }, ["name", "id"], cors);
  assertEquals(result instanceof Response, true);
  assertEquals(result!.status, 400);
});

Deno.test("validateBody rejects null and empty string", () => {
  const cors = getCorsHeaders();
  assertEquals(validateBody({ a: null }, ["a"], cors) instanceof Response, true);
  assertEquals(validateBody({ a: "" }, ["a"], cors) instanceof Response, true);
});

Deno.test("validateStringFields accepts valid strings", () => {
  const cors = getCorsHeaders();
  const result = validateStringFields({ name: "hello" }, [{ name: "name", maxLength: 100 }], cors);
  assertEquals(result, null);
});

Deno.test("validateStringFields rejects non-string", () => {
  const cors = getCorsHeaders();
  const result = validateStringFields({ name: 123 }, [{ name: "name" }], cors);
  assertEquals(result instanceof Response, true);
});

Deno.test("validateStringFields rejects string exceeding maxLength", () => {
  const cors = getCorsHeaders();
  const result = validateStringFields({ name: "a".repeat(10) }, [{ name: "name", maxLength: 5 }], cors);
  assertEquals(result instanceof Response, true);
});

Deno.test("isValidUUID accepts valid UUID", () => {
  assertEquals(isValidUUID("550e8400-e29b-41d4-a716-446655440000"), true);
});

Deno.test("isValidUUID rejects invalid strings", () => {
  assertEquals(isValidUUID("not-a-uuid"), false);
  assertEquals(isValidUUID(""), false);
  assertEquals(isValidUUID("'; DROP TABLE users; --"), false);
});

Deno.test("validateUUID returns null for valid UUID field", () => {
  const cors = getCorsHeaders();
  const result = validateUUID({ id: "550e8400-e29b-41d4-a716-446655440000" }, ["id"], cors);
  assertEquals(result, null);
});

Deno.test("validateUUID rejects malformed UUID field", () => {
  const cors = getCorsHeaders();
  const result = validateUUID({ id: "bad-uuid" }, ["id"], cors);
  assertEquals(result instanceof Response, true);
});

Deno.test("jsonResponse returns correct status and JSON", async () => {
  const cors = getCorsHeaders();
  const resp = jsonResponse({ ok: true }, cors, 200);
  assertEquals(resp.status, 200);
  const body = await resp.json();
  assertEquals(body.ok, true);
});

Deno.test("errorResponse returns error JSON with status", async () => {
  const cors = getCorsHeaders();
  const resp = errorResponse("something broke", cors, 500);
  assertEquals(resp.status, 500);
  const body = await resp.json();
  assertEquals(body.error, "something broke");
});
