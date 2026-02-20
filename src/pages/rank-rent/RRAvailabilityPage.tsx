import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Globe, MapPin, TrendingUp, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export default function RRAvailabilityPage() {
  const { user } = useAuth();

  const { data: pages } = useQuery({
    queryKey: ["rr-pages-avail", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rr_pages").select("*, projects(name, domain)").eq("owner_id", user!.id).eq("status", "disponivel").order("traffic", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <>
      <TopBar title="Disponibilidade" subtitle="Páginas e projetos disponíveis para aluguel — marketplace interno" />
      <div className="p-4 sm:p-6 space-y-5 overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Páginas Disponíveis</h2>
            <p className="text-sm text-muted-foreground mt-1">{pages?.length || 0} páginas prontas para aluguel</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages?.map((page: any, i: number) => (
            <motion.div key={page.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Globe className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{page.url}</p>
                      <p className="text-[10px] text-muted-foreground">{page.projects?.domain}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success">Disponível</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Tráfego</p>
                    <p className="text-sm font-semibold tabular-nums">{page.traffic.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                    <p className="text-sm font-semibold tabular-nums">{page.leads}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                    <p className="text-sm font-semibold tabular-nums">{page.conversions}</p>
                  </div>
                </div>

                {(page.niche || page.location) && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {page.niche && <Badge variant="outline" className="text-[10px]">{page.niche}</Badge>}
                    {page.location && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />{page.location}
                      </Badge>
                    )}
                  </div>
                )}

                {page.suggested_price && (
                  <div className="p-2 rounded-md bg-primary/5 border border-primary/10 flex items-center gap-2 mb-3">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground">
                      Preço sugerido: <strong>R$ {Number(page.suggested_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</strong>
                    </span>
                  </div>
                )}

                <Button size="sm" className="w-full text-xs">Alugar Página</Button>
              </Card>
            </motion.div>
          ))}
          {pages?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              Nenhuma página disponível no momento. Adicione páginas com status "Disponível" no inventário.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
