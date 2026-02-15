import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createLogger, getRequestId } from "../_shared/logger.ts";

Deno.test("createLogger returns object with all log methods", () => {
  const log = createLogger("test-fn", "req-123");
  assertExists(log.info);
  assertExists(log.error);
  assertExists(log.warn);
  assertExists(log.time);
});

Deno.test("createLogger.info produces structured output", () => {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  const log = createLogger("test-fn", "req-abc");
  log.info("hello world", { extra: 42 });

  console.log = origLog;

  assertEquals(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assertEquals(parsed.level, "info");
  assertEquals(parsed.fn, "test-fn");
  assertEquals(parsed.rid, "req-abc");
  assertEquals(parsed.msg, "hello world");
  assertEquals(parsed.extra, 42);
  assertExists(parsed.ts);
});

Deno.test("createLogger.error captures error details", () => {
  const logs: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => logs.push(msg);

  const log = createLogger("err-fn", "req-err");
  log.error("failed", new Error("test error"));

  console.error = origError;

  const parsed = JSON.parse(logs[0]);
  assertEquals(parsed.level, "error");
  assertEquals(parsed.msg, "failed");
  assertEquals(parsed.err.message, "test error");
  assertExists(parsed.err.stack);
});

Deno.test("createLogger.error handles non-Error objects", () => {
  const logs: string[] = [];
  const origError = console.error;
  console.error = (msg: string) => logs.push(msg);

  const log = createLogger("fn", "rid");
  log.error("oops", "string error");

  console.error = origError;

  const parsed = JSON.parse(logs[0]);
  assertEquals(parsed.err.message, "string error");
});

Deno.test("createLogger.warn logs at warn level", () => {
  const logs: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => logs.push(msg);

  const log = createLogger("warn-fn", "req-w");
  log.warn("careful", { project_id: "p1" });

  console.warn = origWarn;

  const parsed = JSON.parse(logs[0]);
  assertEquals(parsed.level, "warn");
  assertEquals(parsed.project_id, "p1");
});

Deno.test("createLogger.time measures async operation", async () => {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  const log = createLogger("timer-fn", "req-t");
  const result = await log.time("op", async () => {
    await new Promise((r) => setTimeout(r, 10));
    return 42;
  });

  console.log = origLog;

  assertEquals(result, 42);
  const parsed = JSON.parse(logs[0]);
  assertEquals(parsed.msg, "op completed");
  assertEquals(typeof parsed.duration_ms, "number");
  assertEquals(parsed.duration_ms >= 0, true);
});

Deno.test("getRequestId uses header when present", () => {
  const req = new Request("https://example.com", {
    headers: { "x-request-id": "custom-id-123" },
  });
  assertEquals(getRequestId(req), "custom-id-123");
});

Deno.test("getRequestId generates UUID when no header", () => {
  const req = new Request("https://example.com");
  const id = getRequestId(req);
  assertEquals(typeof id, "string");
  assertEquals(id.length > 0, true);
});
