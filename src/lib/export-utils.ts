/**
 * Export data as CSV or XML file
 */

export function exportCSV(rows: any[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","))].join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv");
}

export function exportXML(rows: any[], filename: string, rootTag = "data", rowTag = "row") {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escapeXml = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const sanitizeTag = (key: string) => key.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n`;
  for (const row of rows) {
    xml += `  <${rowTag}>\n`;
    for (const h of headers) {
      const tag = sanitizeTag(h);
      xml += `    <${tag}>${escapeXml(row[h])}</${tag}>\n`;
    }
    xml += `  </${rowTag}>\n`;
  }
  xml += `</${rootTag}>`;
  downloadFile(xml, `${filename}.xml`, "application/xml");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
