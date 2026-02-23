import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  primary: [99, 91, 255] as [number, number, number],
  dark: [20, 22, 30] as [number, number, number],
  gray: [120, 120, 140] as [number, number, number],
  success: [40, 180, 110] as [number, number, number],
  warning: [230, 160, 30] as [number, number, number],
  danger: [220, 60, 60] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightBg: [245, 245, 250] as [number, number, number],
};

interface BillingTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  created: string;
  customer_email: string | null;
  customer_name: string | null;
  plan_name: string | null;
  error_message: string | null;
  period_start: string | null;
  period_end: string | null;
}

interface BillingSummary {
  today: number;
  week: number;
  month: number;
  last_month: number;
  total_paid: number;
  total_failed: number;
  total_pending: number;
  total_transactions: number;
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    succeeded: "Pago", open: "Aberta", pending: "Pendente",
    draft: "Rascunho", void: "Cancelada", uncollectible: "Não cobrada",
  };
  return map[status] || status;
};

export function generateBillingReport(
  transactions: BillingTransaction[],
  summary: BillingSummary,
  filterLabel = "Todas"
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text("Rankito", margin, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Financeiro", margin, 23);
  doc.setFontSize(8);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Filtro: ${filterLabel}`, pageW - margin, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${transactions.length} transações`, pageW - margin, 23, { align: "right" });

  y = 44;

  // KPI Cards
  const kpis = [
    { label: "RECEITA HOJE", value: `R$ ${summary.today.toFixed(2)}` },
    { label: "RECEITA SEMANA", value: `R$ ${summary.week.toFixed(2)}` },
    { label: "RECEITA MÊS", value: `R$ ${summary.month.toFixed(2)}` },
    { label: "MÊS ANTERIOR", value: `R$ ${summary.last_month.toFixed(2)}` },
    { label: "TX APROVADAS", value: String(summary.total_paid) },
    { label: "TX PENDENTES", value: String(summary.total_pending) },
    { label: "TX FALHAS", value: String(summary.total_failed) },
    { label: "TOTAL TX", value: String(summary.total_transactions) },
  ];

  const kpiW = (pageW - margin * 2 - 21) / 8;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (kpiW + 3);
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, "F");
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(kpi.label, x + 3, y + 6);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(kpi.value, x + 3, y + 14);
  });

  y += 26;

  // Transactions table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Transações", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Data", "Cliente", "E-mail", "Plano", "Valor", "Status", "Período", "Erro"]],
    body: transactions.map(tx => [
      format(new Date(tx.created), "dd/MM/yy HH:mm", { locale: ptBR }),
      tx.customer_name || "—",
      tx.customer_email || "—",
      (tx.plan_name || "—").slice(0, 30),
      `R$ ${tx.amount.toFixed(2)}`,
      statusLabel(tx.status),
      tx.period_start && tx.period_end
        ? `${format(new Date(tx.period_start), "dd/MM", { locale: ptBR })} – ${format(new Date(tx.period_end), "dd/MM", { locale: ptBR })}`
        : "—",
      (tx.error_message || "—").slice(0, 40),
    ]),
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, fontSize: 7, font: "helvetica", fontStyle: "bold", cellPadding: 2 },
    bodyStyles: { fontSize: 6.5, cellPadding: 2, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 35 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { halign: "right", cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 28 },
      7: { cellWidth: 45 },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === "Pago") data.cell.styles.textColor = COLORS.success;
        else if (val === "Pendente" || val === "Aberta") data.cell.styles.textColor = COLORS.warning;
        else if (val !== "—") data.cell.styles.textColor = COLORS.danger;
      }
    },
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.white);
    doc.text("Rankito — Relatório Financeiro Confidencial", margin, pageH - 3.5);
    doc.text(`Página ${i}/${totalPages}`, pageW - margin, pageH - 3.5, { align: "right" });
  }

  const fileName = `rankito-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
