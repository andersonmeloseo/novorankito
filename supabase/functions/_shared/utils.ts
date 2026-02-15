// Shared utilities for all edge functions
// Import: import { corsHeaders, validateBody, jsonResponse, errorResponse } from "../_shared/utils.ts";

const ALLOWED_ORIGINS = [
  "https://novorankito.lovable.app",
  "https://id-preview--c5a9c519-57e7-4f0b-9801-8f7300bce728.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all lovable preview/project domains
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Validates required fields in a parsed body. Returns null if valid, or an error Response.
 */
export function validateBody(
  body: Record<string, unknown>,
  requiredFields: string[],
  corsHeaders: Record<string, string>
): Response | null {
  const missing = requiredFields.filter((f) => {
    const val = body[f];
    return val === undefined || val === null || val === "";
  });

  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

/**
 * Validates string fields are actually strings and within max length.
 */
export function validateStringFields(
  body: Record<string, unknown>,
  fields: { name: string; maxLength?: number }[],
  corsHeaders: Record<string, string>
): Response | null {
  for (const field of fields) {
    const val = body[field.name];
    if (val !== undefined && val !== null) {
      if (typeof val !== "string") {
        return new Response(
          JSON.stringify({ error: `Field '${field.name}' must be a string` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (field.maxLength && val.length > field.maxLength) {
        return new Response(
          JSON.stringify({ error: `Field '${field.name}' exceeds maximum length of ${field.maxLength}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }
  return null;
}

/**
 * Validates UUID format.
 */
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function validateUUID(
  body: Record<string, unknown>,
  fields: string[],
  corsHeaders: Record<string, string>
): Response | null {
  for (const field of fields) {
    const val = body[field];
    if (val !== undefined && val !== null && typeof val === "string" && !isValidUUID(val)) {
      return new Response(
        JSON.stringify({ error: `Field '${field}' must be a valid UUID` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  return null;
}

export function jsonResponse(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, corsHeaders: Record<string, string>, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Google JWT creation helper (shared across GSC/GA4 functions)
 */
export async function createGoogleJWT(
  credentials: { client_email: string; private_key: string },
  scope: string
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${signatureB64}`;
}

export async function getGoogleAccessToken(
  credentials: { client_email: string; private_key: string },
  scope: string
): Promise<string> {
  const jwt = await createGoogleJWT(credentials, scope);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}
