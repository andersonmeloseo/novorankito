import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { exportCSV, exportXML } from "@/lib/export-utils";
import { History, Loader2, Search as SearchIcon, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  projectId: string | undefined;
}

export function PositionHistoryTab({ projectId }: Props) {
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [days, setDays] = useState("90");

  const { data, isLoading, error } = useQuery({
    queryKey: ["gsc-position-history", projectId, searchKeyword, days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("gsc-position-history", {
        body: { project_id: projectId, query: searchKeyword, days: parseInt(days) },
      });

      if (error) {
        if (error.message?.includes("No GSC connection found")) {
          return { query: searchKeyword, rows: [], noConnection: true };
        }
        throw error;
      }

      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!projectId && !!searchKeyword,
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows || [];
  const noConnection = Boolean(data?.noConnection);
  const chartData = rows.map((r: any) => ({
    ...r,
    dateLabel: format(parseISO(r.date), "dd MMM", { locale: ptBR }),
  }));

  const handleSearch = () => {
    if (keyword.trim()) setSearchKeyword(keyword.trim());
  };

  const doExportCSV = () => exportCSV(rows, `posicao-${searchKeyword}`);
  const doExportXML = () => exportXML(rows, `posicao-${searchKeyword}`, "positionHistory", "day");

  return (
    <div className="space-y-4">
      <AnimatedContainer>
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs">
            <History className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">Histórico de Posições:</span>
            <span className="text-muted-foreground">Acompanhe a evolução diária de posição, cliques e impressões de uma keyword específica.</span>
          </div>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Digite uma keyword para rastrear..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="28">28 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={!keyword.trim()} size="sm" className="text-xs gap-1.5">
            <SearchIcon className="h-3.5 w-3.5" />
            Rastrear
          </Button>
        </div>
      </AnimatedContainer>

      {isLoading && (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      )}

      {error && (
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {(error as Error).message?.includes("No GSC connection")
                  ? "Conexão GSC não encontrada"
                  : "Não foi possível carregar os dados"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(error as Error).message?.includes("No GSC connection")
                  ? "Nenhuma conta do Google Search Console está conectada a este projeto. Configure a integração nas configurações do projeto."
                  : (error as Error).message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!searchKeyword && !isLoading && (
        <EmptyState
          icon={TrendingUp}
          title="Rastreie uma keyword"
          description="Digite uma keyword acima para ver a evolução da posição ao longo do tempo."
        />
      )}

      {searchKeyword && !isLoading && !error && noConnection && (
        <EmptyState
          icon={History}
          title="Conexão não encontrada"
          description="Não encontramos uma conexão do Google Search Console neste projeto. Configure a integração para analisar o histórico de posição."
        />
      )}

      {searchKeyword && !isLoading && !error && !noConnection && rows.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="Palavra não encontrada"
          description={`A keyword "${searchKeyword}" não foi encontrada no histórico do Google Search Console nos últimos ${days} dias. Tente outra palavra-chave ou aumente o período de análise.`}
        />
      )}

      {rows.length > 0 && (
        <>
          <AnimatedContainer delay={0.05}>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <span className="text-xs text-muted-foreground">
                  Keyword: <strong className="text-foreground">{searchKeyword}</strong> · {rows.length} dias
                </span>
                <ExportMenu onExportCSV={doExportCSV} onExportXML={doExportXML} />
              </div>
              <div className="p-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis yAxisId="position" orientation="right" reversed domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10 }} label={{ value: "Posição ↑ melhor", angle: 90, position: "insideRight", style: { fontSize: 9, fill: "hsl(var(--muted-foreground))" } }} />
                      <YAxis yAxisId="clicks" orientation="left" tick={{ fontSize: 10 }} label={{ value: "Cliques / Impressões", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "hsl(var(--muted-foreground))" } }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(value: any, name: string) => {
                        if (name === "CTR") return [`${value}%`, name];
                        return [value?.toLocaleString(), name];
                      }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="position" type="monotone" dataKey="position" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Posição" />
                      <Line yAxisId="clicks" type="monotone" dataKey="clicks" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} name="Cliques" />
                      <Line yAxisId="clicks" type="monotone" dataKey="impressions" stroke="hsl(var(--chart-3))" strokeWidth={1} dot={false} name="Impressões" strokeDasharray="4 2" />
                      <Line yAxisId="clicks" type="monotone" dataKey="ctr" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} name="CTR" strokeDasharray="2 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </AnimatedContainer>

          <AnimatedContainer delay={0.1}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Posição</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cliques</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Impressões</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(-20).reverse().map((row: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0 table-row-hover">
                        <td className="px-4 py-3 text-xs text-foreground">{format(parseISO(row.date), "dd/MM/yyyy")}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-primary">{row.position}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.clicks}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.impressions}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnimatedContainer>
        </>
      )}
    </div>
  );
}
