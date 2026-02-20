// Centralized status translations and badge variants for the admin panel

export const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  trial: "Em Trial",
  cancelled: "Cancelado",
  pending: "Pendente",
  success: "Sucesso",
  failed: "Falha",
  error: "Erro",
  operational: "Operacional",
  degraded: "Degradado",
  down: "Fora do ar",
  connected: "Conectado",
  available: "Disponível",
  disconnected: "Desconectado",
  none: "Nenhum",
  free: "Gratuito",
};

export function translateStatus(status: string): string {
  return STATUS_LABELS[status?.toLowerCase()] || status || "—";
}

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function getStatusVariant(status: string): BadgeVariant {
  switch (status?.toLowerCase()) {
    case "active":
    case "success":
    case "operational":
    case "connected":
      return "default";
    case "trial":
    case "pending":
    case "inactive":
    case "available":
    case "degraded":
      return "secondary";
    case "suspended":
    case "cancelled":
    case "failed":
    case "error":
    case "down":
    case "disconnected":
      return "destructive";
    default:
      return "outline";
  }
}
