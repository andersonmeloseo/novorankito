/**
 * Structured JSON logger for edge functions.
 * Provides consistent, searchable log output.
 */

export interface LogMeta {
  request_id?: string;
  project_id?: string;
  user_id?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

export function createLogger(functionName: string, requestId: string) {
  const base = { fn: functionName, rid: requestId };

  return {
    info(msg: string, meta: LogMeta = {}) {
      console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", ...base, msg, ...meta }));
    },
    warn(msg: string, meta: LogMeta = {}) {
      console.warn(JSON.stringify({ ts: new Date().toISOString(), level: "warn", ...base, msg, ...meta }));
    },
    error(msg: string, error?: unknown, meta: LogMeta = {}) {
      const errObj = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error != null ? { message: String(error) } : undefined;
      console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", ...base, msg, err: errObj, ...meta }));
    },
    /** Measure duration of an async operation */
    async time<T>(label: string, fn: () => Promise<T>, meta: LogMeta = {}): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const duration_ms = Math.round(performance.now() - start);
        this.info(`${label} completed`, { ...meta, duration_ms });
        return result;
      } catch (err) {
        const duration_ms = Math.round(performance.now() - start);
        this.error(`${label} failed`, err, { ...meta, duration_ms });
        throw err;
      }
    },
  };
}

/** Extract or generate a request ID from headers */
export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}
