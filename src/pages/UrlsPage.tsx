import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockUrlInventory } from "@/lib/mock-data";
import {
  Search,
  Download,
  Tag,
  Send,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  ArrowUpDown,
  Filter,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  noindex: "bg-warning/10 text-warning border-warning/20",
  redirect: "bg-info/10 text-info border-info/20",
  "404": "bg-destructive/10 text-destructive border-destructive/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  noindex: "Noindex",
  redirect: "Redirecionado",
  "404": "404",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export default function UrlsPage() {
  const [search, setSearch] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [drawerUrl, setDrawerUrl] = useState<(typeof mockUrlInventory)[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = mockUrlInventory.filter((u) => {
    const matchesSearch = u.url.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (url: string) => {
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const allSelected = filtered.length > 0 && selectedUrls.length === filtered.length;

  return (
    <>
      <TopBar title="URLs" subtitle="Inventário completo de páginas, status e prioridades de otimização" />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar URLs..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="noindex">Noindex</SelectItem>
                <SelectItem value="redirect">Redirecionado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled={selectedUrls.length === 0}>
              <Tag className="h-3 w-3" /> Tag
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" disabled={selectedUrls.length === 0}>
              <Send className="h-3 w-3" /> Indexar
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <Download className="h-3 w-3" /> Exportar
            </Button>
          </div>
        </div>

        {selectedUrls.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {selectedUrls.length} URL{selectedUrls.length > 1 ? "s" : ""} selecionada{selectedUrls.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        setSelectedUrls(checked ? filtered.map((u) => u.url) : []);
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Prioridade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Último Rastreio</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.url}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setDrawerUrl(item)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedUrls.includes(item.url)}
                        onCheckedChange={() => toggleSelect(item.url)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{item.url}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] font-normal">{item.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.group}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[item.status] || ""}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[item.priority] || ""}`}>
                        {PRIORITY_LABELS[item.priority] || item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.lastCrawl}</td>
                    <td className="px-4 py-3">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} URLs</span>
          <span>Página 1 de 1</span>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!drawerUrl} onOpenChange={() => setDrawerUrl(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {drawerUrl && (
            <>
              <SheetHeader>
                <SheetTitle className="text-sm font-mono break-all">{drawerUrl.url}</SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="seo" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="seo" className="flex-1 text-xs">SEO</TabsTrigger>
                  <TabsTrigger value="analytics" className="flex-1 text-xs">Analytics</TabsTrigger>
                  <TabsTrigger value="tracking" className="flex-1 text-xs">Tracking</TabsTrigger>
                </TabsList>
                <TabsContent value="seo" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniKpi icon={MousePointerClick} label="Cliques" value="3.842" change={12.4} />
                    <MiniKpi icon={Eye} label="Impressões" value="98.420" change={8.1} />
                    <MiniKpi icon={TrendingUp} label="CTR" value="3,9%" change={3.2} />
                    <MiniKpi icon={ArrowUpDown} label="Posição" value="4,2" change={-1.2} />
                  </div>
                  <Card className="p-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">Principais Consultas</h4>
                    <div className="space-y-2">
                      {["wireless headphones review", "best headphones 2026", "noise cancelling headphones"].map((q) => (
                        <div key={q} className="flex justify-between text-xs">
                          <span className="text-foreground">{q}</span>
                          <span className="text-muted-foreground">pos. {(Math.random() * 10 + 1).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="analytics" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniKpi icon={Eye} label="Usuários" value="1.240" change={15.2} />
                    <MiniKpi icon={TrendingUp} label="Sessões" value="1.890" change={9.7} />
                  </div>
                </TabsContent>
                <TabsContent value="tracking" className="mt-4 space-y-4">
                  <Card className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum evento de tracking ainda. Instale o script do Rankito para começar a coletar dados.
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function MiniKpi({ icon: Icon, label, value, change }: { icon: React.ElementType; label: string; value: string; change: number }) {
  const positive = change >= 0;
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className={`text-[10px] font-medium ${positive ? "text-success" : "text-destructive"}`}>
        {positive ? "+" : ""}{change}%
      </div>
    </Card>
  );
}
