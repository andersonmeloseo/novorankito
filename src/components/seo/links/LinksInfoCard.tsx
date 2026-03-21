import { Card } from "@/components/ui/card";
import { Link2, TrendingUp, Search, Globe, Info } from "lucide-react";

export function LinksInfoCard() {
  const features = [
    { icon: TrendingUp, title: "Performance de Páginas", desc: "Veja quais páginas atraem mais cliques e impressões orgânicas no Google." },
    { icon: Search, title: "Cobertura de Queries", desc: "Descubra quais páginas rankeiam para mais termos de busca diferentes." },
    { icon: Globe, title: "Domínios Referentes", desc: "Analise os domínios que mais contribuem para o tráfego orgânico do seu site." },
  ];

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/3">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Análise de Links & Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Entenda como o Google vê suas páginas. Identifique oportunidades de otimização, 
              páginas com potencial inexplorado e monitore a diversidade de palavras-chave.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border border-border/50">
              <f.icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-medium text-foreground leading-tight block">{f.title}</span>
                <span className="text-[10px] text-muted-foreground leading-snug">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
