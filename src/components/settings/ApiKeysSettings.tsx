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
            <TabsContent value="howto" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <p className="text-[11px] font-semibold text-foreground">📌 O que é uma API Key?</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Uma API Key é como uma <strong>senha especial</strong> que permite que outros sistemas (como Power BI, n8n, Zapier ou seu próprio site) 
                  acessem os dados do seu projeto de forma segura e automática, sem precisar fazer login. É a mesma lógica de um "token de acesso" que você 
                  cria em outros serviços como Google, Facebook ou Stripe.
                </p>
              </div>

              {/* Step by step */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-foreground">Passo a passo:</p>
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

              {/* Quick example */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Exemplo prático rápido
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Após criar sua chave, teste no terminal do computador ou em qualquer ferramenta HTTP (Postman, Insomnia, etc.):
                </p>
                <div className="relative bg-background rounded-lg p-3 border font-mono text-[10px] text-foreground overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{`curl -H "X-API-Key: rk_sua_chave_aqui" \\
  "${API_BASE_URL}?action=overview"`}</pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 text-[9px]"
                    onClick={() => copyToClipboard(`curl -H "X-API-Key: SUA_CHAVE" "${API_BASE_URL}?action=overview"`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  A resposta será um JSON com os dados do seu projeto (cliques, impressões, posição média, etc.).
                </p>
              </div>

              {/* Integration examples */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Exemplos por ferramenta:</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">⚡ n8n / Make (Integromat)</p>
                    <p className="text-[10px] text-muted-foreground">Use o nó "HTTP Request" → Método GET → URL: a URL base + ?action=overview → Adicione header "X-API-Key" com o valor da sua chave.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">📊 Power BI</p>
                    <p className="text-[10px] text-muted-foreground">Use "Obter Dados" → "Da Web" → Avançado → Cole a URL com ?action=metrics → Adicione o header X-API-Key nas opções de requisição.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">🔗 Zapier</p>
                    <p className="text-[10px] text-muted-foreground">Use a ação "Webhooks by Zapier" → GET → Cole a URL → Em "Headers", adicione "X-API-Key" com sua chave.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">💻 JavaScript / Fetch</p>
                    <div className="bg-background rounded p-2 font-mono text-[10px] overflow-x-auto mt-1">
                      <pre>{`const res = await fetch("${API_BASE_URL}?action=overview", {
  headers: { "X-API-Key": "rk_sua_chave" }
});
const data = await res.json();
console.log(data);`}</pre>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">🐍 Python</p>
                    <div className="bg-background rounded p-2 font-mono text-[10px] overflow-x-auto mt-1">
                      <pre>{`import requests

resp = requests.get(
    "${API_BASE_URL}?action=overview",
    headers={"X-API-Key": "rk_sua_chave"}
)
print(resp.json())`}</pre>
                    </div>
                  </div>
                </div>
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