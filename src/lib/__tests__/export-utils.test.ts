import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportCSV, exportXML } from "../export-utils";

let lastContent: string | null = null;
const OriginalBlob = globalThis.Blob;

beforeEach(() => {
  lastContent = null;

  vi.stubGlobal("Blob", class extends OriginalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      lastContent = parts?.[0] as string ?? null;
    }
  });

  vi.stubGlobal("URL", {
    createObjectURL: () => "blob://test",
    revokeObjectURL: vi.fn(),
  });

  const mockAnchor = { href: "", download: "", click: vi.fn() };
  vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as any);
});

describe("exportCSV", () => {
  it("does nothing for empty array", () => {
    exportCSV([], "test");
    expect(lastContent).toBeNull();
  });

  it("generates valid CSV with headers", () => {
    const rows = [
      { name: "Alice", score: 100 },
      { name: "Bob", score: 85 },
    ];
    exportCSV(rows, "scores");
    expect(lastContent).not.toBeNull();
    expect(lastContent).toContain("name,score");
    expect(lastContent).toContain('"Alice"');
    expect(lastContent).toContain('"85"');
  });

  it("handles null values gracefully", () => {
    const rows = [{ a: null, b: undefined }];
    exportCSV(rows, "nulls");
    expect(lastContent).toContain('""');
  });
});

describe("exportXML", () => {
  it("does nothing for empty array", () => {
    exportXML([], "test");
    expect(lastContent).toBeNull();
  });

  it("generates valid XML structure", () => {
    const rows = [{ url: "https://example.com", clicks: 42 }];
    exportXML(rows, "export", "report", "item");
    expect(lastContent).toContain('<?xml version="1.0"');
    expect(lastContent).toContain("<report>");
    expect(lastContent).toContain("<item>");
    expect(lastContent).toContain("<url>https://example.com</url>");
    expect(lastContent).toContain("<clicks>42</clicks>");
    expect(lastContent).toContain("</report>");
  });

  it("escapes XML special characters", () => {
    const rows = [{ text: 'A & B <"C">' }];
    exportXML(rows, "escape");
    expect(lastContent).toContain("&amp;");
    expect(lastContent).toContain("&lt;");
    expect(lastContent).toContain("&gt;");
    expect(lastContent).toContain("&quot;");
  });

  it("sanitizes invalid tag names", () => {
    const rows = [{ "1invalid-key!": "value" }];
    exportXML(rows, "sanitize");
    expect(lastContent).toContain("<_1invalid_key_>");
  });
});
