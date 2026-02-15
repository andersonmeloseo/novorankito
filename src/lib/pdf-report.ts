import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

interface ReportData {
  projectName: string;
  domain: string;
  dateRange: string;
  generatedAt: string;
  kpis: { label: string; value: string; change?: string }[];
  topPages?: { url: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topQueries?: { query: string; clicks: number; impressions: number; position: number }[];
  indexing?: { submitted: number; inspected: number; failed: number; pending: number; total: number };
  ga4?: { users: number; sessions: number; bounceRate?: number; avgDuration?: number };
}

const COLORS = {
  primary: [99, 91, 255] as [number, number, number],
  dark: [20, 22, 30] as [number, number, number],
  gray: [120, 120, 140] as [number, number, number],
  success: [40, 180, 110] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [245, 245, 250] as [number, number, number],
};

export function generateSeoReport(data: ReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 0;

  // === Header band ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 42, "F");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text("Rankito", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SEO Intelligence Report", margin, 25);

  // Project info right-aligned
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.projectName, pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.domain, pageW - margin, 20, { align: "right" });
  doc.text(data.dateRange, pageW - margin, 26, { align: "right" });
  doc.setFontSize(7);
  doc.text(`Gerado: ${data.generatedAt}`, pageW - margin, 36, { align: "right" });

  y = 52;

  // === KPI Cards ===
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Métricas Principais", margin, y);
  y += 8;

  const kpiW = (pageW - margin * 2 - 6) / 3;
  data.kpis.forEach((kpi, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (kpiW + 3);
    const ky = y + row * 22;

    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, ky, kpiW, 18, 3, 3, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(kpi.label.toUpperCase(), x + 4, ky + 6);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(kpi.value, x + 4, ky + 14);

    if (kpi.change) {
      const isPos = !kpi.change.startsWith("-");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isPos ? COLORS.success : [220, 60, 60] as [number, number, number]));
      doc.text(kpi.change, x + kpiW - 4, ky + 6, { align: "right" });
    }
  });

  y += Math.ceil(data.kpis.length / 3) * 22 + 10;

  // === Top Pages Table ===
  if (data.topPages && data.topPages.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Top Páginas", margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["URL", "Cliques", "Impressões", "CTR", "Posição"]],
      body: data.topPages.slice(0, 15).map(p => [
        p.url.replace(/https?:\/\/[^/]+/, "").slice(0, 50),
        p.clicks.toLocaleString("pt-BR"),
        p.impressions.toLocaleString("pt-BR"),
        `${p.ctr.toFixed(1)}%`,
        p.position.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: COLORS.primary, fontSize: 7, font: "helvetica", fontStyle: "bold", cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: "right", cellWidth: 20 },
        2: { halign: "right", cellWidth: 25 },
        3: { halign: "right", cellWidth: 18 },
        4: { halign: "right", cellWidth: 18 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Top Queries Table ===
  if (data.topQueries && data.topQueries.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Top Keywords", margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Consulta", "Cliques", "Impressões", "Posição"]],
      body: data.topQueries.slice(0, 15).map(q => [
        q.query.slice(0, 50),
        q.clicks.toLocaleString("pt-BR"),
        q.impressions.toLocaleString("pt-BR"),
        q.position.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: COLORS.primary, fontSize: 7, font: "helvetica", fontStyle: "bold", cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: "right", cellWidth: 20 },
        2: { halign: "right", cellWidth: 25 },
        3: { halign: "right", cellWidth: 18 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // === Indexing Stats ===
  if (data.indexing && data.indexing.total > 0) {
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Indexação", margin, y);
    y += 8;

    const stats = [
      { label: "Enviadas", value: data.indexing.submitted, pct: ((data.indexing.submitted / data.indexing.total) * 100).toFixed(0) + "%" },
      { label: "Inspecionadas", value: data.indexing.inspected, pct: ((data.indexing.inspected / data.indexing.total) * 100).toFixed(0) + "%" },
      { label: "Falhas", value: data.indexing.failed, pct: "" },
      { label: "Pendentes", value: data.indexing.pending, pct: ((data.indexing.pending / data.indexing.total) * 100).toFixed(0) + "%" },
    ];

    const statW = (pageW - margin * 2 - 9) / 4;
    stats.forEach((s, i) => {
      const x = margin + i * (statW + 3);
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(x, y, statW, 16, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);
      doc.text(s.label.toUpperCase(), x + 3, y + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.dark);
      doc.text(s.value.toLocaleString("pt-BR"), x + 3, y + 12);
      if (s.pct) {
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.gray);
        doc.text(s.pct, x + statW - 3, y + 5, { align: "right" });
      }
    });

    y += 24;
  }

  // === GA4 Section ===
  if (data.ga4) {
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Google Analytics 4", margin, y);
    y += 8;

    const ga4Stats = [
      { label: "Usuários", value: data.ga4.users.toLocaleString("pt-BR") },
      { label: "Sessões", value: data.ga4.sessions.toLocaleString("pt-BR") },
      ...(data.ga4.bounceRate != null ? [{ label: "Bounce Rate", value: `${(data.ga4.bounceRate * 100).toFixed(1)}%` }] : []),
      ...(data.ga4.avgDuration != null ? [{ label: "Duração Média", value: `${Math.round(data.ga4.avgDuration)}s` }] : []),
    ];

    const gaW = (pageW - margin * 2 - 9) / Math.min(ga4Stats.length, 4);
    ga4Stats.forEach((s, i) => {
      const x = margin + i * (gaW + 3);
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(x, y, gaW, 16, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);
      doc.text(s.label.toUpperCase(), x + 3, y + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.dark);
      doc.text(s.value, x + 3, y + 12);
    });
  }

  // === Footer ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.white);
    doc.text("Rankito — SEO Intelligence Platform", margin, pageH - 4);
    doc.text(`Página ${i}/${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  // Save
  const fileName = `rankito-${data.projectName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
