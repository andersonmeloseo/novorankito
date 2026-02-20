/**
 * Leaked Password Protection using HaveIBeenPwned k-Anonymity API.
 * Only the first 5 chars of the SHA-1 hash are sent to the API,
 * so the full password never leaves the client.
 */

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export interface PasswordCheckResult {
  isLeaked: boolean;
  occurrences: number;
}

/**
 * Check if a password has been found in known data breaches.
 * Uses the k-Anonymity model: only the first 5 chars of the SHA-1 hash are sent.
 */
export async function checkLeakedPassword(password: string): Promise<PasswordCheckResult> {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });

    if (!response.ok) {
      // If API is unavailable, don't block the user
      console.warn("HIBP API unavailable, skipping password check");
      return { isLeaked: false, occurrences: 0 };
    }

    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const occurrences = parseInt(count, 10);
        if (occurrences > 0) {
          return { isLeaked: true, occurrences };
        }
      }
    }

    return { isLeaked: false, occurrences: 0 };
  } catch {
    // Network error — don't block user
    console.warn("Password check failed, skipping");
    return { isLeaked: false, occurrences: 0 };
  }
}
