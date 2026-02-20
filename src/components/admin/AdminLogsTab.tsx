import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, CheckCircle2, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { exportCSV } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminLogsTabProps {
  logs: any[];
  profiles: any[];
}

export function AdminLogsTab({ logs, profiles }: AdminLogsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.detail || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getProfileName = (userId: string) => profiles.find(p => p.user_id === userId)?.display_name || (userId ? userId.slice(0, 8) + "..." : "system");

  const handleExport = () => {
    exportCSV(filtered.map(l => ({
      "Data/Hora": format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
      Usuário: getProfileName(l.user_id), Ação: l.action, Detalhe: l.detail || "", Status: l.status,
    })), "logs-admin");
    toast({ title: "Exportado" });
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-foreground">Logs de Auditoria ({filtered.length})</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-40" placeholder="Buscar log..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border bg-muted/30">
              {["Data/Hora", "Usuário", "Ação", "Detalhe", "Entidade", "IP", "Status"].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum log encontrado</td></tr>
            ) : filtered.map(log => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "dd/MM HH:mm:ss")}</td>
                <td className="px-4 py-3 text-xs text-foreground">{getProfileName(log.user_id)}</td>
                <td className="px-4 py-3 text-xs text-foreground">{log.action}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={log.detail || ""}>{log.detail || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.entity_type || "—"}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{log.ip_address || "—"}</td>
                <td className="px-4 py-3">
                  {log.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
