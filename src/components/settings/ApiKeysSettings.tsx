import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, Plus, Trash2, Loader2, Eye, EyeOff, BookOpen, Code2, ExternalLink, ChevronDown, ChevronUp, Bot, CheckCircle2 } from "lucide-react";

const USE_CASES = [
  { title: "Dashboard externo", desc: "Puxe métricas de SEO, GA4 e GSC para Power BI, Grafana ou Data Studio.", icon: "📊" },
  { title: "Automação (n8n / Zapier)", desc: "Consulte dados de indexação, posições e conversões periodicamente.", icon: "⚡" },
  { title: "Relatórios white-label", desc: "Seus clientes consultam a API para montar painéis personalizados.", icon: "🏷️" },
  { title: "Integração com CRM", desc: "Sincronize leads e conversões do Rank & Rent com Pipedrive, HubSpot etc.", icon: "🔗" },
];

const API_ENDPOINTS = [
  { method: "GET", path: "/overview", desc: "Visão geral do projeto (cliques, impressões, posição)" },
  { method: "GET", path: "/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD", desc: "Métricas por período" },
  { method: "GET", path: "/urls?limit=50", desc: "Lista de URLs monitoradas" },
  { method: "GET", path: "/indexing", desc: "Status das requisições de indexação" },
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
  const [showDocs, setShowDocs] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
          <CardDescription className="text-xs">
            Permita que sistemas externos consultem dados do seu projeto via API REST
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex gap-2">
            <Input className="h-8 text-sm flex-1" placeholder="Nome da chave" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Criar
            </Button>
          </div>

          {/* Show generated key */}
          {generatedKey && (
            <div className="p-3 rounded-lg bg-muted border border-primary/30 space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium">⚠️ Copie agora — esta chave não será exibida novamente:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate font-mono">
                  {showKey ? generatedKey : "••••••••••••••••••••"}
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(generatedKey)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* List existing keys */}
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : keys.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma API key criada ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{k.name}</span>
                    <code className="text-[10px] text-muted-foreground font-mono">{k.key_prefix}••••</code>
                    <Badge variant={k.is_active ? "secondary" : "destructive"} className="text-[10px]">
                      {k.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {k.last_used_at && (
                      <span className="text-[10px] text-muted-foreground">
                        Último uso: {new Date(k.last_used_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(k.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Docs toggle */}
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            <Code2 className="h-3.5 w-3.5" />
            {showDocs ? "Ocultar" : "Ver"} endpoints e como usar
            {showDocs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showDocs && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Como usar a API
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Envie o header <code className="bg-background px-1 rounded">X-API-Key</code> em todas as requisições:</p>
                <div className="bg-background rounded p-2 font-mono text-[10px] text-foreground overflow-x-auto">
                  {`curl -H "X-API-Key: rk_sua_chave_aqui" \\
  https://<project-url>/functions/v1/public-api?action=overview`}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-foreground">Endpoints disponíveis:</p>
                {API_ENDPOINTS.map((ep) => (
                  <div key={ep.path} className="flex items-start gap-2 text-[10px]">
                    <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5 font-mono">{ep.method}</Badge>
                    <div>
                      <code className="text-foreground font-mono">?action={ep.path}</code>
                      <p className="text-muted-foreground">{ep.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
                <p>🔒 Rate limit: 60 requisições/minuto por chave</p>
                <p>📦 Formato: JSON • Autenticação: header <code className="bg-background px-1 rounded">X-API-Key</code></p>
              </div>
            </div>
          )}
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
