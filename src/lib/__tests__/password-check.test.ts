import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the sha1 + parsing logic by mocking fetch
describe("checkLeakedPassword", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should detect a leaked password when suffix matches", async () => {
    // SHA-1 of "password" = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const mockResponse = [
      "1D2DA4053E34E76F6576ED1DA63134B5E2A:3",
      "1E4C9B93F3F0682250B6CF8331B7EE68FD8:10434848",
      "1F2B668E8AABEF1C59E9EC6F82E3F3CD786:8",
    ].join("\n");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockResponse, { status: 200 })
    );

    const { checkLeakedPassword } = await import("../password-check");
    const result = await checkLeakedPassword("password");

    expect(result.isLeaked).toBe(true);
    expect(result.occurrences).toBe(10434848);
  });

  it("should return safe for unknown password", async () => {
    const mockResponse = [
      "1D2DA4053E34E76F6576ED1DA63134B5E2A:3",
      "AAAAABBBBCCCCDDDDEEEEFFFFFFFFFFF:0",
    ].join("\n");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockResponse, { status: 200 })
    );

    const { checkLeakedPassword } = await import("../password-check");
    const result = await checkLeakedPassword("my-super-unique-pass-xyz-12345!");

    expect(result.isLeaked).toBe(false);
    expect(result.occurrences).toBe(0);
  });

  it("should gracefully handle API failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Service Unavailable", { status: 503 })
    );

    const { checkLeakedPassword } = await import("../password-check");
    const result = await checkLeakedPassword("anything");

    expect(result.isLeaked).toBe(false);
  });

  it("should gracefully handle network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const { checkLeakedPassword } = await import("../password-check");
    const result = await checkLeakedPassword("anything");

    expect(result.isLeaked).toBe(false);
  });
});
