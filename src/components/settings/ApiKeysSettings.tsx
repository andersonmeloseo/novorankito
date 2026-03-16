import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key, Copy, Plus, Trash2, Loader2, Eye, EyeOff, BookOpen, Code2,
  ChevronDown, ChevronUp, Bot, CheckCircle2, Shield, Zap, BarChart3,
  Globe, HelpCircle, ArrowRight, Terminal, FileJson, Link2, AlertTriangle,
  Clock, Lock, Gauge
} from "lucide-react";

/* ─── Constants ─── */
const USE_CASES = [
  { title: "Dashboard externo", desc: "Puxe métricas de SEO, GA4 e GSC para Power BI, Grafana ou Data Studio.", icon: "📊" },
  { title: "Automação (n8n / Zapier)", desc: "Consulte dados de indexação, posições e conversões periodicamente.", icon: "⚡" },
  { title: "Relatórios white-label", desc: "Seus clientes consultam a API para montar painéis personalizados.", icon: "🏷️" },
  { title: "Integração com CRM", desc: "Sincronize leads e conversões do Rank & Rent com Pipedrive, HubSpot etc.", icon: "🔗" },
];

const API_ENDPOINTS = [
  { method: "GET", action: "overview", desc: "Visão geral do projeto (cliques, impressões, posição média, CTR)", params: "—", example: '?action=overview' },
  { method: "GET", action: "metrics", desc: "Métricas detalhadas de SEO por período", params: "days (padrão 28)", example: '?action=metrics&days=30' },
  { method: "GET", action: "urls", desc: "Lista de URLs monitoradas com meta tags", params: "—", example: '?action=urls' },
  { method: "GET", action: "indexing", desc: "Status das requisições de indexação enviadas", params: "—", example: '?action=indexing' },
  { method: "GET", action: "conversions", desc: "Conversões registradas no projeto", params: "days (padrão 30)", example: '?action=conversions&days=60' },
  { method: "POST", action: "conversions", desc: "Registrar novas conversões (até 50 por vez)", params: "body JSON", example: 'POST ?action=conversions' },
];

const STEP_BY_STEP = [
  { step: 1, title: "Crie uma API Key", desc: "Dê um nome para a chave (ex: \"Power BI\", \"n8n\") e clique em Criar. A chave será gerada automaticamente.", icon: Key },
  { step: 2, title: "Copie e salve a chave", desc: "Copie a chave gerada imediatamente. Ela não será exibida novamente por questões de segurança.", icon: Copy },
  { step: 3, title: "Use no seu sistema externo", desc: "Adicione a chave no header X-API-Key de cada requisição que fizer para a API.", icon: Terminal },
  { step: 4, title: "Consulte seus dados", desc: "Use os endpoints disponíveis para puxar métricas, URLs, indexação e conversões.", icon: BarChart3 },
];

const FAQ_ITEMS = [
  { q: "Onde consigo a URL base da API?", a: "A URL base é exibida na seção de documentação abaixo. Ela segue o formato: https://[seu-projeto].supabase.co/functions/v1/public-api" },
  { q: "Posso ter mais de uma API Key?", a: "Sim! Crie quantas quiser. Recomendamos uma por integração para facilitar o gerenciamento e revogação." },
  { q: "O que acontece se eu deletar uma chave?", a: "Todas as integrações que usam essa chave param de funcionar imediatamente. Crie uma nova e atualize seus sistemas." },
  { q: "Existe limite de requisições?", a: "Sim, cada chave tem limite de 60 requisições por minuto. Ideal para consultas periódicas, não para tempo real." },
  { q: "A API é segura?", a: "Sim. As chaves são armazenadas com hash SHA-256 (não guardamos a chave original). Toda chamada é autenticada e limitada." },
  { q: "Posso registrar conversões via API?", a: "Sim! Use o endpoint POST /conversions para enviar leads e conversões de fontes externas (formulários, CRMs, etc)." },
];

interface ApiKeysSettingsProps {
  projectId: string;
}

export function ApiKeysSettings({ projectId }: ApiKeysSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("Default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const API_BASE_URL = `${SUPABASE_URL}/functions/v1/public-api`;

  const mcpConfig = JSON.stringify({
    mcpServers: {
      rankito: {
        type: "streamable-http",
        url: `${SUPABASE_URL}/functions/v1/mcp-server`,
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
      },
    },
  }, null, 2);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const rawKey = `rk_${crypto.randomUUID().replace(/-/g, "")}`;
      const prefix = rawKey.substring(0, 8);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      const { error } = await supabase.from("api_keys").insert({
        owner_id: user!.id,
        project_id: projectId,
        key_hash: keyHash,
        key_prefix: prefix,
        name: newKeyName,
        scopes: ["read"],
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (key) => {
      setGeneratedKey(key);
      setShowKey(true);
      toast({ title: "API Key criada!", description: "Copie a chave agora — ela não será exibida novamente." });
      qc.invalidateQueries({ queryKey: ["api-keys", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chave removida" });
      qc.invalidateQueries({ queryKey: ["api-keys", projectId] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <div className="space-y-4">
      {/* Main API Keys Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            API Keys
          </CardTitle>
          <CardDescription className="text-xs">
            Conecte sistemas externos ao seu projeto. Crie chaves seguras para que ferramentas como Power BI, n8n, Zapier e CRMs acessem seus dados de SEO, conversões e indexação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="manage" className="text-[11px] gap-1"><Key className="h-3 w-3" /> Chaves</TabsTrigger>
              <TabsTrigger value="howto" className="text-[11px] gap-1"><HelpCircle className="h-3 w-3" /> Como usar</TabsTrigger>
              <TabsTrigger value="docs" className="text-[11px] gap-1"><Code2 className="h-3 w-3" /> Documentação</TabsTrigger>
              <TabsTrigger value="faq" className="text-[11px] gap-1"><BookOpen className="h-3 w-3" /> FAQ</TabsTrigger>
            </TabsList>

            {/* ── TAB: Gerenciar Chaves ── */}
            <TabsContent value="manage" className="space-y-4 mt-4">
              {/* Use Cases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {USE_CASES.map((uc) => (
                  <div key={uc.title} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                    <span className="text-base mt-0.5">{uc.icon}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{uc.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{uc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create new key */}
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  Criar nova API Key
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Dê um nome descritivo para identificar onde esta chave será usada (ex: "Power BI Dashboard", "n8n Automação")
                </p>
                <div className="flex gap-2">
                  <Input className="h-8 text-sm flex-1" placeholder="Nome da chave (ex: Power BI)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Criar chave
                  </Button>
                </div>
              </div>

              {/* Show generated key */}
              {generatedKey && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <p className="text-[11px] font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Copie agora — esta chave não será exibida novamente!
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Guarde esta chave em local seguro. Você vai precisar dela para configurar a integração no seu sistema externo.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1.5 rounded flex-1 truncate font-mono border">
                      {showKey ? generatedKey : "••••••••••••••••••••••••••••••"}
                    </code>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="default" size="sm" className="h-8 text-xs gap-1" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar chave
                    </Button>
                  </div>
                </div>
              )}

              {/* List existing keys */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  Chaves ativas ({keys.length})
                </p>
                {isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : keys.length === 0 ? (
                  <div className="text-center py-6 space-y-2 border border-dashed border-border rounded-lg">
                    <Key className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">Nenhuma API key criada ainda.</p>
                    <p className="text-[10px] text-muted-foreground">Crie sua primeira chave acima para começar a integrar.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {keys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30">
                        <div className="flex items-center gap-2.5">
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <span className="text-xs font-medium">{k.name}</span>
                            <div className="flex items-center gap-1.5">
                              <code className="text-[10px] text-muted-foreground font-mono">{k.key_prefix}••••••••</code>
                              <Badge variant={k.is_active ? "secondary" : "destructive"} className="text-[9px]">
                                {k.is_active ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {k.last_used_at ? (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Último uso: {new Date(k.last_used_at).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Nunca usada</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(k.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security info */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-semibold text-foreground">Segurança das chaves</p>
                  <p>As chaves são armazenadas com hash SHA-256 — não guardamos a chave original. Cada chamada é autenticada e limitada a 60 requisições/minuto.</p>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB: Como Usar ── */}
            <TabsContent value="howto" className="space-y-5 mt-4">
              {/* What is an API Key */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <p className="text-[11px] font-semibold text-foreground">📌 O que é uma API Key?</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Uma API Key é como uma <strong>senha especial</strong> que permite que outros sistemas acessem os dados do seu projeto de forma segura e automática, sem precisar fazer login. É a mesma lógica de um "token de acesso" que você cria em serviços como Google, Facebook ou Stripe.
                </p>
              </div>

              {/* Step by step to create */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-foreground">🔑 Passo a passo para criar sua chave:</p>
                {STEP_BY_STEP.map((s, idx) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-primary">{s.step}</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <s.icon className="h-3.5 w-3.5 text-primary" />
                        {s.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                    {idx < STEP_BY_STEP.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 mt-2 shrink-0 hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>

              {/* ══════════ PRACTICAL USE CASES ══════════ */}
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-bold text-foreground">🚀 Casos de uso práticos com passo a passo</p>

                {/* Use Case 1: SEO Dashboard */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">📊</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Dashboard de SEO completo para seu cliente</p>
                      <p className="text-[10px] text-muted-foreground">Monte um painel visual com cliques, impressões, posição e top páginas</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <strong>Objetivo:</strong> Criar um dashboard white-label que puxa dados de SEO automaticamente para apresentar ao seu cliente, sem precisar dar acesso ao Rankito.
                    </p>
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-foreground">Passo a passo:</p>
                      <div className="space-y-1.5 text-[10px] text-muted-foreground">
                        <p>1️⃣ Crie uma API Key com nome "Dashboard Cliente X"</p>
                        <p>2️⃣ Faça GET <code className="bg-background px-1 rounded">?action=overview</code> para obter KPIs gerais (cliques, impressões, posição média, CTR)</p>
                        <p>3️⃣ Faça GET <code className="bg-background px-1 rounded">?action=metrics&days=30</code> para dados diários de tendência</p>
                        <p>4️⃣ Faça GET <code className="bg-background px-1 rounded">?action=urls</code> para listar as top páginas monitoradas</p>
                        <p>5️⃣ Faça GET <code className="bg-background px-1 rounded">?action=indexing</code> para mostrar status de indexação</p>
                        <p>6️⃣ Renderize tudo num HTML/React com gráficos (Chart.js, Recharts, etc.)</p>
                      </div>
                    </div>
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`// Dashboard completo em JavaScript
const API = "${API_BASE_URL}";
const KEY = "rk_sua_chave";
const headers = { "X-API-Key": KEY };

// 1. KPIs gerais
const overview = await fetch(\`\${API}?action=overview\`, { headers }).then(r => r.json());
// overview.data → { total_clicks, total_impressions, avg_position, avg_ctr, top_pages, top_queries }

// 2. Tendência diária (últimos 30 dias)
const metrics = await fetch(\`\${API}?action=metrics&days=30\`, { headers }).then(r => r.json());
// metrics.data → array de { metric_date, clicks, impressions, position, ctr, query, url }

// 3. URLs monitoradas
const urls = await fetch(\`\${API}?action=urls\`, { headers }).then(r => r.json());
// urls.data → array de { url, status, meta_title, meta_description }

// 4. Status de indexação
const indexing = await fetch(\`\${API}?action=indexing\`, { headers }).then(r => r.json());
// indexing.data → array de { url, status, submitted_at, completed_at }

// Agora renderize no seu dashboard!
console.log("Cliques totais:", overview.data.total_clicks);
console.log("Posição média:", overview.data.avg_position);`}</pre>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground">
                      💡 <strong>Dica:</strong> Agende a atualização a cada 6 horas com um cron job ou setInterval para manter o dashboard sempre atualizado.
                    </div>
                  </div>
                </details>

                {/* Use Case 2: Google Sheets report */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">📑</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Relatório automático no Google Sheets</p>
                      <p className="text-[10px] text-muted-foreground">Atualize uma planilha automaticamente com dados de SEO do projeto</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <div className="space-y-1.5 text-[10px] text-muted-foreground">
                      <p>1️⃣ Abra o Google Sheets e vá em <strong>Extensões → Apps Script</strong></p>
                      <p>2️⃣ Cole o script abaixo e substitua a chave</p>
                      <p>3️⃣ Adicione um trigger de tempo (ex: diário às 8h) para atualizar automaticamente</p>
                      <p>4️⃣ Compartilhe a planilha com seu cliente — ele verá os dados sempre atualizados</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`// Google Apps Script - Cole no Apps Script do Google Sheets
function atualizarSEO() {
  const API = "${API_BASE_URL}";
  const KEY = "rk_sua_chave";
  
  const options = {
    method: "GET",
    headers: { "X-API-Key": KEY }
  };
  
  // Buscar overview
  const res = UrlFetchApp.fetch(API + "?action=overview", options);
  const data = JSON.parse(res.getContentText()).data;
  
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange("A1").setValue("Cliques Totais");
  sheet.getRange("B1").setValue(data.total_clicks);
  sheet.getRange("A2").setValue("Impressões");
  sheet.getRange("B2").setValue(data.total_impressions);
  sheet.getRange("A3").setValue("Posição Média");
  sheet.getRange("B3").setValue(data.avg_position);
  sheet.getRange("A4").setValue("CTR Médio (%)");
  sheet.getRange("B4").setValue(data.avg_ctr);
  sheet.getRange("A5").setValue("Última atualização");
  sheet.getRange("B5").setValue(new Date().toLocaleString("pt-BR"));
  
  // Buscar métricas diárias
  const metricsRes = UrlFetchApp.fetch(API + "?action=metrics&days=7", options);
  const metrics = JSON.parse(metricsRes.getContentText()).data;
  
  // Preencher a partir da linha 7
  sheet.getRange("A7").setValue("Data");
  sheet.getRange("B7").setValue("Cliques");
  sheet.getRange("C7").setValue("Impressões");
  
  metrics.forEach((m, i) => {
    sheet.getRange("A" + (8 + i)).setValue(m.metric_date);
    sheet.getRange("B" + (8 + i)).setValue(m.clicks);
    sheet.getRange("C" + (8 + i)).setValue(m.impressions);
  });
}`}</pre>
                    </div>
                  </div>
                </details>

                {/* Use Case 3: n8n automation */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">⚡</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Automação com n8n: alerta de queda de posição</p>
                      <p className="text-[10px] text-muted-foreground">Receba notificação no WhatsApp/Slack quando a posição média cair</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <div className="space-y-1.5 text-[10px] text-muted-foreground">
                      <p>1️⃣ No n8n, crie um workflow com trigger <strong>Schedule (Cron)</strong> → ex: a cada 6 horas</p>
                      <p>2️⃣ Adicione nó <strong>HTTP Request</strong>:</p>
                      <p className="pl-4">• Método: GET</p>
                      <p className="pl-4">• URL: <code className="bg-background px-1 rounded">{API_BASE_URL}?action=overview</code></p>
                      <p className="pl-4">• Header: <code className="bg-background px-1 rounded">X-API-Key: rk_sua_chave</code></p>
                      <p>3️⃣ Adicione nó <strong>IF</strong> → condição: <code className="bg-background px-1 rounded">{"{{$json.data.avg_position}}"} {">"} 15</code></p>
                      <p>4️⃣ Se verdadeiro → nó <strong>Slack/WhatsApp/Email</strong> com mensagem:</p>
                      <p className="pl-4 italic">"⚠️ Alerta SEO: posição média caiu para {"{{$json.data.avg_position}}"}. Verifique o projeto!"</p>
                      <p>5️⃣ Ative o workflow — ele roda sozinho a cada 6h</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground">
                      💡 <strong>Outras ideias para n8n:</strong> Alerta quando indexação falha, relatório semanal por email, sync de conversões com CRM
                    </div>
                  </div>
                </details>

                {/* Use Case 4: CRM lead sync */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">🔗</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Sincronizar leads do formulário com o Rankito</p>
                      <p className="text-[10px] text-muted-foreground">Envie conversões do seu site/CRM direto para o painel de conversões</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <strong>Cenário:</strong> Seu site tem um formulário de contato. Cada vez que alguém preenche, você quer registrar como conversão no Rankito para acompanhar no painel.
                    </p>
                    <div className="space-y-1.5 text-[10px] text-muted-foreground">
                      <p>1️⃣ Crie uma API Key com escopo "write" (ou use a padrão "read" — POST conversions funciona com read)</p>
                      <p>2️⃣ No backend do seu site, após salvar o lead, faça um POST para a API</p>
                      <p>3️⃣ O lead aparecerá automaticamente no painel de Conversões do Rankito</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`// No backend do seu site (Node.js, PHP, Python, etc.)
// Exemplo em JavaScript:

const response = await fetch("${API_BASE_URL}?action=conversions", {
  method: "POST",
  headers: {
    "X-API-Key": "rk_sua_chave",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    event_type: "lead",
    lead_name: "Maria Silva",
    lead_email: "maria@email.com",
    lead_phone: "11987654321",
    value: 200.00,
    source: "google",
    medium: "organic",
    campaign: "blog-seo",
    page: "/contato"
  })
});

// Resposta: { ok: true, created: 1 }`}</pre>
                    </div>
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`# Python (Flask/Django)
import requests

requests.post(
    "${API_BASE_URL}?action=conversions",
    headers={
        "X-API-Key": "rk_sua_chave",
        "Content-Type": "application/json"
    },
    json={
        "event_type": "lead",
        "lead_name": form.name,
        "lead_email": form.email,
        "lead_phone": form.phone,
        "value": 150.00,
        "source": "google",
        "medium": "cpc"
    }
)`}</pre>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground">
                      💡 Você pode enviar até <strong>50 conversões por vez</strong> passando um array no body.
                    </div>
                  </div>
                </details>

                {/* Use Case 5: Power BI */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">📈</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Power BI: Dashboard de SEO profissional</p>
                      <p className="text-[10px] text-muted-foreground">Conecte o Power BI à API para gráficos interativos de desempenho</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <div className="space-y-1.5 text-[10px] text-muted-foreground">
                      <p>1️⃣ Abra o Power BI Desktop → <strong>Obter Dados → Da Web → Avançado</strong></p>
                      <p>2️⃣ Em "Partes da URL", cole:</p>
                      <p className="pl-4"><code className="bg-background px-1 rounded text-[9px]">{API_BASE_URL}?action=metrics&days=90</code></p>
                      <p>3️⃣ Em "Parâmetros de cabeçalho HTTP", adicione:</p>
                      <p className="pl-4">Nome: <code className="bg-background px-1 rounded">X-API-Key</code> | Valor: <code className="bg-background px-1 rounded">rk_sua_chave</code></p>
                      <p>4️⃣ Clique em OK → o Power BI vai carregar os dados como JSON</p>
                      <p>5️⃣ No Power Query, expanda o campo "data" → converta em tabela</p>
                      <p>6️⃣ Crie visuais: gráfico de linha (cliques por dia), cartão (posição média), tabela (top queries)</p>
                      <p>7️⃣ Configure <strong>atualização agendada</strong> para manter os dados atualizados</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground">
                      💡 <strong>Dica Pro:</strong> Crie múltiplas fontes de dados (overview + metrics + urls) e relacione pelo project_id para um dashboard completo.
                    </div>
                  </div>
                </details>

                {/* Use Case 6: Zapier */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">⚙️</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Zapier: Relatório semanal por email</p>
                      <p className="text-[10px] text-muted-foreground">Envie um resumo de SEO por email toda segunda-feira de manhã</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <div className="space-y-1.5 text-[10px] text-muted-foreground">
                      <p>1️⃣ No Zapier, crie um Zap com trigger <strong>Schedule by Zapier</strong> → toda segunda às 8h</p>
                      <p>2️⃣ Ação: <strong>Webhooks by Zapier → GET</strong></p>
                      <p className="pl-4">URL: <code className="bg-background px-1 rounded">{API_BASE_URL}?action=overview</code></p>
                      <p className="pl-4">Headers: <code className="bg-background px-1 rounded">X-API-Key | rk_sua_chave</code></p>
                      <p>3️⃣ Ação: <strong>Gmail → Send Email</strong></p>
                      <p className="pl-4">Para: cliente@email.com</p>
                      <p className="pl-4">Assunto: "📊 Relatório SEO Semanal"</p>
                      <p className="pl-4">Corpo: Use os campos do step 2 para montar o texto:</p>
                      <p className="pl-6 italic">"Cliques: {"{{data__total_clicks}}"} | Impressões: {"{{data__total_impressions}}"} | Posição: {"{{data__avg_position}}"}"</p>
                      <p>4️⃣ Ative o Zap — seu cliente recebe o relatório toda segunda automaticamente! 🎉</p>
                    </div>
                  </div>
                </details>

                {/* Use Case 7: WordPress widget */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">🌐</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Widget de SEO no seu site WordPress</p>
                      <p className="text-[10px] text-muted-foreground">Exiba estatísticas de SEO em tempo real no seu site</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Cole este snippet em um bloco HTML personalizado no WordPress para exibir KPIs do projeto:
                    </p>
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`<div id="seo-stats" style="font-family:sans-serif; padding:20px; background:#f8f9fa; border-radius:12px;">
  <h3>📊 Desempenho SEO</h3>
  <p>Carregando...</p>
</div>
<script>
fetch("${API_BASE_URL}?action=overview", {
  headers: { "X-API-Key": "rk_sua_chave" }
})
.then(r => r.json())
.then(({ data }) => {
  document.getElementById("seo-stats").innerHTML = \`
    <h3>📊 Desempenho SEO</h3>
    <p><strong>\${data.total_clicks.toLocaleString()}</strong> cliques</p>
    <p><strong>\${data.total_impressions.toLocaleString()}</strong> impressões</p>
    <p>Posição média: <strong>\${data.avg_position}</strong></p>
    <p>CTR: <strong>\${data.avg_ctr}%</strong></p>
    <p style="font-size:11px;color:#888;">Atualizado: \${new Date().toLocaleDateString("pt-BR")}</p>
  \`;
});
</script>`}</pre>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground">
                      ⚠️ <strong>Atenção:</strong> Este método expõe a chave no frontend. Para produção, use um proxy no backend (ex: via functions do WordPress ou Cloudflare Worker) para proteger a chave.
                    </div>
                  </div>
                </details>

                {/* Use Case 8: Monitoring bot */}
                <details className="rounded-lg border border-border overflow-hidden group">
                  <summary className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="text-base">🤖</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Bot de monitoramento no Discord/Telegram</p>
                      <p className="text-[10px] text-muted-foreground">Crie um bot que posta atualizações de SEO no canal da equipe</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-3 py-3 space-y-3 border-t border-border/50">
                    <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                      <pre>{`# Bot Python simples para Telegram/Discord
import requests
import schedule, time

API = "${API_BASE_URL}"
KEY = "rk_sua_chave"
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/SEU_WEBHOOK"

def report():
    data = requests.get(f"{API}?action=overview",
        headers={"X-API-Key": KEY}).json()["data"]
    
    msg = f"""📊 **Relatório SEO Diário**
🖱️ Cliques: **{data['total_clicks']:,}**
👁️ Impressões: **{data['total_impressions']:,}**
📍 Posição média: **{data['avg_position']}**
📈 CTR: **{data['avg_ctr']}%**
🔗 URLs indexadas: **{data['indexing']['indexed']}/{data['indexing']['submitted']}**"""
    
    requests.post(DISCORD_WEBHOOK,
        json={"content": msg})

schedule.every().day.at("09:00").do(report)
while True:
    schedule.run_pending()
    time.sleep(60)`}</pre>
                    </div>
                  </div>
                </details>
              </div>
            </TabsContent>

            {/* ── TAB: Documentação ── */}
            <TabsContent value="docs" className="space-y-4 mt-4">
              {/* Base URL */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  URL base da API
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] bg-background px-2 py-1.5 rounded font-mono border flex-1 truncate">
                    {API_BASE_URL}
                  </code>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => copyToClipboard(API_BASE_URL)}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
              </div>

              {/* Auth header */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Autenticação
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Todas as requisições precisam do header <code className="bg-background px-1 rounded font-mono">X-API-Key</code> com o valor da sua chave:
                </p>
                <div className="bg-background rounded p-2 font-mono text-[10px] border">
                  X-API-Key: rk_sua_chave_aqui
                </div>
              </div>

              {/* Endpoints table */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <FileJson className="h-3.5 w-3.5 text-primary" />
                  Endpoints disponíveis
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-semibold">Método</th>
                        <th className="text-left px-3 py-2 font-semibold">Ação</th>
                        <th className="text-left px-3 py-2 font-semibold">Descrição</th>
                        <th className="text-left px-3 py-2 font-semibold">Parâmetros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {API_ENDPOINTS.map((ep) => (
                        <tr key={`${ep.method}-${ep.action}`} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <Badge variant={ep.method === "POST" ? "default" : "outline"} className="text-[9px] font-mono">{ep.method}</Badge>
                          </td>
                          <td className="px-3 py-2 font-mono text-foreground">{ep.action}</td>
                          <td className="px-3 py-2 text-muted-foreground">{ep.desc}</td>
                          <td className="px-3 py-2 text-muted-foreground">{ep.params}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* POST conversions example */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Exemplo: registrar conversão via API</p>
                <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                  <pre>{`curl -X POST \\
  -H "X-API-Key: rk_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "lead",
    "lead_name": "João Silva",
    "lead_email": "joao@email.com",
    "lead_phone": "11999999999",
    "value": 150.00,
    "source": "google",
    "medium": "cpc",
    "campaign": "black-friday"
  }' \\
  "${API_BASE_URL}?action=conversions"`}</pre>
                </div>
              </div>

              {/* Rate limits & response format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                    <Gauge className="h-3 w-3 text-primary" /> Rate Limit
                  </p>
                  <p className="text-[10px] text-muted-foreground">60 requisições/minuto por chave</p>
                  <p className="text-[10px] text-muted-foreground">Resposta 429 se exceder</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                  <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                    <FileJson className="h-3 w-3 text-primary" /> Formato
                  </p>
                  <p className="text-[10px] text-muted-foreground">Resposta: JSON</p>
                  <p className="text-[10px] text-muted-foreground">Encoding: UTF-8</p>
                </div>
              </div>

              {/* Response example */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Exemplo de resposta (overview):</p>
                <div className="bg-background rounded-lg p-3 font-mono text-[10px] border overflow-x-auto">
                  <pre>{`{
  "data": {
    "total_clicks": 12450,
    "total_impressions": 385000,
    "avg_position": 8.3,
    "avg_ctr": 3.23,
    "total_queries": 892,
    "indexing": {
      "submitted": 145,
      "failed": 3,
      "indexed": 142
    }
  },
  "action": "overview",
  "project_id": "uuid-do-projeto"
}`}</pre>
                </div>
              </div>

              {/* Error codes */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Códigos de erro:</p>
                <div className="space-y-1">
                  {[
                    { code: "401", desc: "Chave inválida, inativa ou expirada" },
                    { code: "403", desc: "Escopo insuficiente (ex: tentou POST sem permissão write)" },
                    { code: "429", desc: "Rate limit excedido — aguarde 1 minuto" },
                    { code: "400", desc: "Ação desconhecida ou parâmetros inválidos" },
                    { code: "500", desc: "Erro interno — tente novamente" },
                  ].map((e) => (
                    <div key={e.code} className="flex items-center gap-2 text-[10px]">
                      <Badge variant="outline" className="text-[9px] font-mono w-10 justify-center">{e.code}</Badge>
                      <span className="text-muted-foreground">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── TAB: FAQ ── */}
            <TabsContent value="faq" className="space-y-2 mt-4">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                Perguntas frequentes
              </p>
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-[11px] font-medium text-foreground">{item.q}</span>
                    {expandedFaq === idx ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-3 pb-2.5 text-[10px] text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MCP Server Config for Claude */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Claude MCP Server
          </CardTitle>
          <CardDescription className="text-xs">
            Conecte o Claude Desktop ou Claude Code ao Rankito via MCP (Model Context Protocol)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-center">
              <span className="text-base">🔌</span>
              <p className="text-[10px] font-semibold mt-1">Transporte</p>
              <p className="text-[10px] text-muted-foreground">streamable-http</p>
            </div>
            <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-center">
              <span className="text-base">🛠️</span>
              <p className="text-[10px] font-semibold mt-1">Tools disponíveis</p>
              <p className="text-[10px] text-muted-foreground">24 ferramentas MCP</p>
            </div>
            <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-center">
              <span className="text-base">🔒</span>
              <p className="text-[10px] font-semibold mt-1">Autenticação</p>
              <p className="text-[10px] text-muted-foreground">Bearer Token (anon key)</p>
            </div>
          </div>

          <button
            onClick={() => setShowMcp(!showMcp)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            <Code2 className="h-3.5 w-3.5" />
            {showMcp ? "Ocultar" : "Ver"} configuração para Claude
            {showMcp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showMcp && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Cole no <code className="bg-background px-1 rounded">settings.json</code> do Claude Desktop ou no config do Claude Code:
                </p>
                <div className="relative">
                  <pre className="bg-background rounded p-3 font-mono text-[10px] text-foreground overflow-x-auto whitespace-pre leading-relaxed max-h-64 overflow-y-auto">
                    {mcpConfig}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1.5 right-1.5 h-7 text-[10px] gap-1"
                    onClick={() => {
                      copyToClipboard(mcpConfig);
                      setMcpCopied(true);
                      setTimeout(() => setMcpCopied(false), 2000);
                    }}
                  >
                    {mcpCopied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {mcpCopied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 space-y-1">
                <p className="font-semibold text-foreground">📍 Como configurar:</p>
                <p>1. No Claude Desktop: <code className="bg-background px-1 rounded">Settings → Developer → Edit Config</code></p>
                <p>2. No Claude Code: <code className="bg-background px-1 rounded">claude mcp add-json rankito '...'</code></p>
                <p>3. Reinicie o Claude e verifique se as 24 ferramentas aparecem</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}