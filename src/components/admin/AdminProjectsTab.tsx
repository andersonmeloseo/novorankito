import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { exportCSV } from "@/lib/export-utils";
import { toast } from "@/hooks/use-toast";
import { translateStatus, getStatusVariant } from "@/lib/admin-status";

interface AdminProjectsTabProps {
  projects: any[];
  profiles: any[];
  isLoading: boolean;
}

export function AdminProjectsTab({ projects, profiles, isLoading }: AdminProjectsTabProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailProject, setDetailProject] = useState<any | null>(null);

  const filtered = projects.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) || p.domain.toLowerCase().includes(search.toLowerCase())
  );

  const getOwnerName = (ownerId: string) => profiles.find(p => p.user_id === ownerId)?.display_name || ownerId.slice(0, 8) + "...";

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const selectAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));

  const handleExport = () => {
    exportCSV(filtered.map(p => ({
      Nome: p.name, Domínio: p.domain, Status: p.status, Proprietário: getOwnerName(p.owner_id),
      Monetização: p.monetization_status, "Criado em": format(new Date(p.created_at), "dd/MM/yyyy"),
    })), "projetos-admin");
    toast({ title: "Exportado" });
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Projetos ({projects.length})</h3>
            {selected.size > 0 && <Badge variant="secondary" className="text-[10px]">{selected.size} selecionados</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input className="h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs w-48" placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExport}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-8"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} /></th>
                {["Projeto", "Domínio", "Proprietário", "Status", "Monetização", "Criado em", ""].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhum projeto encontrado</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.domain}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{getOwnerName(p.owner_id)}</td>
                  <td className="px-4 py-3"><Badge variant={getStatusVariant(p.status)} className="text-[10px]">{translateStatus(p.status)}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{p.monetization_status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailProject(p)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!detailProject} onOpenChange={open => !open && setDetailProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Projeto</DialogTitle></DialogHeader>
          {detailProject && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nome", value: detailProject.name },
                { label: "Domínio", value: detailProject.domain },
                { label: "Status", value: translateStatus(detailProject.status) },
                { label: "Monetização", value: detailProject.monetization_status },
                { label: "Proprietário", value: getOwnerName(detailProject.owner_id) },
                { label: "Tipo", value: detailProject.site_type || "—" },
                { label: "País", value: detailProject.country || "—" },
                { label: "Criado em", value: format(new Date(detailProject.created_at), "dd/MM/yyyy HH:mm") },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/30">
                  <div className="text-[10px] text-muted-foreground uppercase">{item.label}</div>
                  <div className="text-sm font-medium text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
