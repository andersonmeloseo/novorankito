import { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Globe, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, ArrowUpDown, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/dashboard/KpiCard";

/* ── Types ─────────────────────────────────────────── */
interface PageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  indexingStatus: string | null;
  verdict: string | null;
  lastCrawl: string | null;
  isRented: boolean;
  clientName: string | null;
  monthlyValue: number;
  rrPageId: string | null;
}

const INDEXING_BADGE: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  PASS: { label: "Indexada", icon: CheckCircle2, cls: "bg-success/10 text-success" },
  INDEXING_ALLOWED: { label: "Indexada", icon: CheckCircle2, cls: "bg-success/10 text-success" },
  NEUTRAL: { label: "Neutra", icon: Clock, cls: "bg-warning/10 text-warning" },
  FAIL: { label: "Não Indexada", icon: XCircle, cls: "bg-destructive/10 text-destructive" },
  VERDICT_UNSPECIFIED: { label: "Desconhecido", icon: AlertTriangle, cls: "bg-muted text-muted-foreground" },
};

type SortField = "url" | "clicks" | "impressions" | "ctr" | "position";

export default function RRPagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("clicks");
  const [sortAsc, setSortAsc] = useState(false);
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [rentingUrl, setRentingUrl] = useState<string | null>(null);
  const [indexingUrls, setIndexingUrls] = useState<Set<string>>(new Set());

  /* ── Projects ──────────────────── */
  const { data: projects } = useQuery({
    queryKey: ["rr-user-projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, domain")
        .eq("owner_id", user!.id)
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  // Auto-select first project
  const projectId = selectedProject || projects?.[0]?.id || "";

  /* ── Clients ──────────────────── */
  const { data: clients } = useQuery({
    queryKey: ["rr-clients-select", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("rr_clients")
        .select("id, company_name")
        .eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  /* ── Site URLs (from sitemap/GSC) ──────────────────── */
  const { data: siteUrls, isLoading: loadingUrls } = useQuery({
    queryKey: ["rr-site-urls", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_urls")
        .select("url")
        .eq("project_id", projectId)
        .order("url");
      return data || [];
    },
    enabled: !!projectId,
  });

  /* ── SEO Metrics (aggregated by page) ──────────────────── */
  const { data: seoMetrics } = useQuery({
    queryKey: ["rr-seo-metrics", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_metrics")
        .select("url, clicks, impressions, ctr, position")
        .eq("project_id", projectId)
        .eq("dimension_type", "page");
      // Aggregate by URL
      const map: Record<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }> = {};
      data?.forEach((r: any) => {
        if (!map[r.url]) map[r.url] = { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
        map[r.url].clicks += r.clicks || 0;
        map[r.url].impressions += r.impressions || 0;
        map[r.url].ctrSum += Number(r.ctr || 0);
        map[r.url].posSum += Number(r.position || 0);
        map[r.url].count += 1;
      });
      return map;
    },
    enabled: !!projectId,
  });

  /* ── Index Coverage ──────────────────── */
  const { data: indexCoverage } = useQuery({
    queryKey: ["rr-index-coverage", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("index_coverage")
        .select("url, verdict, indexing_state, last_crawl_time")
        .eq("project_id", projectId);
      const map: Record<string, { verdict: string | null; indexingState: string | null; lastCrawl: string | null }> = {};
      data?.forEach((r: any) => {
        map[r.url] = { verdict: r.verdict, indexingState: r.indexing_state, lastCrawl: r.last_crawl_time };
      });
      return map;
    },
    enabled: !!projectId,
  });

  /* ── R&R Pages (rental data) ──────────────────── */
  const { data: rrPages } = useQuery({
    queryKey: ["rr-pages-rental", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rr_pages")
        .select("id, url, status, client_id, monthly_value, rr_clients(company_name)")
        .eq("project_id", projectId);
      const map: Record<string, any> = {};
      data?.forEach((r: any) => { map[r.url] = r; });
      return map;
    },
    enabled: !!projectId,
  });

  /* ── Build unified rows ──────────────────── */
  const rows = useMemo<PageRow[]>(() => {
    if (!siteUrls) return [];
    return siteUrls.map((su) => {
      const metrics = seoMetrics?.[su.url];
      const coverage = indexCoverage?.[su.url];
      const rental = rrPages?.[su.url];
      return {
        url: su.url,
        clicks: metrics?.clicks || 0,
        impressions: metrics?.impressions || 0,
        ctr: metrics ? (metrics.ctrSum / metrics.count) * 100 : 0,
        position: metrics ? metrics.posSum / metrics.count : 0,
        indexingStatus: coverage?.indexingState || null,
        verdict: coverage?.verdict || null,
        lastCrawl: coverage?.lastCrawl || null,
        isRented: rental?.status === "alugada",
        clientName: rental?.rr_clients?.company_name || null,
        monthlyValue: Number(rental?.monthly_value || 0),
        rrPageId: rental?.id || null,
      };
    });
  }, [siteUrls, seoMetrics, indexCoverage, rrPages]);

  /* ── Filter & Sort ──────────────────── */
  const filtered = useMemo(() => {
    let list = rows;
    if (search) list = list.filter((r) => r.url.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === "indexed") list = list.filter((r) => r.verdict === "PASS" || r.indexingStatus === "INDEXING_ALLOWED");
    if (statusFilter === "not_indexed") list = list.filter((r) => r.verdict && r.verdict !== "PASS" && r.indexingStatus !== "INDEXING_ALLOWED");
    if (statusFilter === "rented") list = list.filter((r) => r.isRented);
    if (statusFilter === "available") list = list.filter((r) => !r.isRented);

    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [rows, search, statusFilter, sortField, sortAsc]);

  /* ── Indexing action ──────────────────── */
  const indexMutation = useMutation({
    mutationFn: async (url: string) => {
      setIndexingUrls((prev) => new Set(prev).add(url));
      const { data, error } = await supabase.functions.invoke("gsc-indexing", {
        body: { project_id: projectId, action: "submit", urls: [url], request_type: "URL_UPDATED" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, url) => {
      setIndexingUrls((prev) => { const s = new Set(prev); s.delete(url); return s; });
      queryClient.invalidateQueries({ queryKey: ["rr-index-coverage", projectId] });
      toast.success("URL enviada para indexação!");
    },
    onError: (_, url) => {
      setIndexingUrls((prev) => { const s = new Set(prev); s.delete(url); return s; });
      toast.error("Erro ao enviar para indexação");
    },
  });

  /* ── Rent / Unrent page ──────────────────── */
  const rentMutation = useMutation({
    mutationFn: async (formData: { url: string; client_id: string; monthly_value: number }) => {
      const existing = rrPages?.[formData.url];
      if (existing) {
        const { error } = await supabase.from("rr_pages").update({
          status: "alugada",
          client_id: formData.client_id,
          monthly_value: formData.monthly_value,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rr_pages").insert({
          owner_id: user!.id,
          project_id: projectId,
          url: formData.url,
          status: "alugada",
          client_id: formData.client_id,
          monthly_value: formData.monthly_value,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-pages-rental", projectId] });
      setRentDialogOpen(false);
      setRentingUrl(null);
      toast.success("Página alugada com sucesso!");
    },
    onError: () => toast.error("Erro ao alugar página"),
  });

  const unrentMutation = useMutation({
    mutationFn: async (rrPageId: string) => {
      const { error } = await supabase.from("rr_pages").update({ status: "disponivel", client_id: null }).eq("id", rrPageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rr-pages-rental", projectId] });
      toast.success("Página liberada!");
    },
  });

  const handleRentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rentingUrl) return;
    const fd = new FormData(e.currentTarget);
    rentMutation.mutate({
      url: rentingUrl,
      client_id: fd.get("client_id") as string,
      monthly_value: Number(fd.get("monthly_value") || 0),
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  /* ── KPIs ──────────────────── */
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const indexedCount = rows.filter((r) => r.verdict === "PASS" || r.indexingStatus === "INDEXING_ALLOWED").length;
  const rentedCount = rows.filter((r) => r.isRented).length;

  const SortHeader = ({ label, field, align }: { label: string; field: SortField; align?: string }) => (
    <th
      className={`font-medium text-muted-foreground p-3 cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

  return (
    <>
      <TopBar title="Páginas" subtitle="Inventário completo de URLs com métricas GSC, indexação e aluguel" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Project Selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Projeto</label>
              <Select value={projectId} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-56 h-9 text-xs">
                  <SelectValue placeholder="Selecionar projeto…" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} <span className="text-muted-foreground ml-1">({p.domain})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Buscar URL</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Filtrar…" className="pl-8 h-9 text-xs w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs">
                <option value="all">Todos</option>
                <option value="indexed">Indexadas</option>
                <option value="not_indexed">Não Indexadas</option>
                <option value="rented">Alugadas</option>
                <option value="available">Disponíveis</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} de {rows.length} URLs</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total URLs" value={rows.length} change={0} />
          <KpiCard label="Cliques (28d)" value={totalClicks} change={0} />
          <KpiCard label="Indexadas" value={indexedCount} change={0} />
          <KpiCard label="Alugadas" value={rentedCount} change={0} />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loadingUrls ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando URLs…
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  {projectId
                    ? "Nenhuma URL encontrada. Sincronize o sitemap do projeto primeiro."
                    : "Selecione um projeto para ver as páginas."}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <SortHeader label="URL" field="url" />
                      <SortHeader label="Cliques" field="clicks" align="right" />
                      <SortHeader label="Impressões" field="impressions" align="right" />
                      <SortHeader label="CTR" field="ctr" align="right" />
                      <SortHeader label="Posição" field="position" align="right" />
                      <th className="text-left font-medium text-muted-foreground p-3">Indexação</th>
                      <th className="text-left font-medium text-muted-foreground p-3">Aluguel</th>
                      <th className="text-right font-medium text-muted-foreground p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const idxKey = row.verdict || row.indexingStatus || "VERDICT_UNSPECIFIED";
                      const idxBadge = INDEXING_BADGE[idxKey] || INDEXING_BADGE.VERDICT_UNSPECIFIED;
                      const IdxIcon = idxBadge.icon;
                      const isSubmitting = indexingUrls.has(row.url);

                      return (
                        <motion.tr
                          key={row.url}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.01, 0.5) }}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3 font-medium text-primary truncate max-w-[260px]" title={row.url}>
                            <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {row.url.replace(/^https?:\/\/[^/]+/, "")}
                            </a>
                          </td>
                          <td className="p-3 text-right tabular-nums font-medium">{row.clicks.toLocaleString()}</td>
                          <td className="p-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                          <td className="p-3 text-right tabular-nums">{row.ctr.toFixed(1)}%</td>
                          <td className="p-3 text-right tabular-nums">{row.position > 0 ? row.position.toFixed(1) : "—"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] gap-0.5 ${idxBadge.cls}`}>
                              <IdxIcon className="h-2.5 w-2.5" />
                              {idxBadge.label}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {row.isRented ? (
                              <div>
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Alugada</Badge>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{row.clientName}</p>
                                {row.monthlyValue > 0 && (
                                  <p className="text-[10px] text-muted-foreground">R$ {row.monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Disponível</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] gap-1"
                                disabled={isSubmitting}
                                onClick={() => indexMutation.mutate(row.url)}
                                title="Enviar para indexação"
                              >
                                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Indexar
                              </Button>
                              {row.isRented ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px]"
                                  onClick={() => row.rrPageId && unrentMutation.mutate(row.rrPageId)}
                                >
                                  Liberar
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 text-[10px]"
                                  onClick={() => { setRentingUrl(row.url); setRentDialogOpen(true); }}
                                >
                                  Alugar
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rent Dialog */}
        <Dialog open={rentDialogOpen} onOpenChange={(o) => { setRentDialogOpen(o); if (!o) setRentingUrl(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Alugar Página</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground truncate mb-3">{rentingUrl}</p>
            <form onSubmit={handleRentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <select name="client_id" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm">
                  <option value="">Selecionar…</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Mensal (R$)</Label>
                <Input name="monthly_value" type="number" step="0.01" defaultValue={0} className="h-9 text-xs" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setRentDialogOpen(false); setRentingUrl(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={rentMutation.isPending}>
                  {rentMutation.isPending ? "Salvando…" : "Alugar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
