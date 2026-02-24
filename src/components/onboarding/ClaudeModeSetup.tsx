import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Bot, Copy, CheckCircle2, ArrowRight, ExternalLink,
  Wifi, Shield, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const MCP_URL = "https://luulxhajwrxnthjutibc.supabase.co/functions/v1/mcp-server";

const CONFIG_JSON = `{
  "mcpServers": {
    "rankito": {
      "type": "streamable-http",
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer SUA_API_KEY"
      }
    }
  }
}`;

interface StepItemProps {
  number: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}

function StepItem({ number, title, done, children }: StepItemProps) {
  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg transition-colors",
      done ? "bg-emerald-500/5" : "bg-muted/30"
    )}>
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
        done
          ? "bg-emerald-500/20 text-emerald-500"
          : "bg-primary/10 text-primary"
      )}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold mb-1.5", done && "text-emerald-500")}>{title}</p>
        {children}
      </div>
    </div>
  );
}

export function ClaudeModeSetup() {
  const [expanded, setExpanded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);

  const copyText = (text: string, type: "url" | "config") => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
    if (type === "url") { setCopiedUrl(true); setStep1Done(true); setTimeout(() => setCopiedUrl(false), 2000); }
    if (type === "config") { setCopiedConfig(true); setStep2Done(true); setTimeout(() => setCopiedConfig(false), 2000); }
  };

  const allDone = step1Done && step2Done && step3Done;

  return (
    <Card className={cn(
      "overflow-hidden transition-all border",
      allDone ? "border-emerald-500/30" : "border-primary/20"
    )}>
      <CardContent className="p-0">
        {/* Header */}
        <button
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Conectar Claude Mode (MCP)</p>
              {allDone && (
                <Badge variant="secondary" className="text-[9px] gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Configurado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Integre o Claude Desktop ou Antigravity via protocolo MCP streamable-http
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex gap-1">
              <Badge variant="outline" className="text-[8px] gap-1 px-1.5">
                <Wifi className="h-2 w-2" /> streamable-http
              </Badge>
              <Badge variant="outline" className="text-[8px] gap-1 px-1.5">
                <Shield className="h-2 w-2" /> Bearer Auth
              </Badge>
              <Badge variant="outline" className="text-[8px] gap-1 px-1.5">
                <Zap className="h-2 w-2" /> 24 tools
              </Badge>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Expandable content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                {/* Step 1: Get API Key */}
                <StepItem number={1} title="Gere uma API Key no Rankito" done={step1Done}>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Vá em <strong>Configurações → API Keys</strong> e crie uma nova chave. Ela será usada como Bearer Token na autenticação MCP.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 gap-1.5"
                    onClick={() => { setStep1Done(true); window.open("/project-settings#api", "_self"); }}
                  >
                    <ArrowRight className="h-2.5 w-2.5" /> Ir para API Keys
                  </Button>
                </StepItem>

                {/* Step 2: Copy MCP config */}
                <StepItem number={2} title="Copie a configuração MCP" done={step2Done}>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Cole esta configuração no arquivo <code className="text-[10px] bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code> ou nas settings do Antigravity.
                  </p>

                  {/* URL field */}
                  <div className="mb-2">
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Endpoint URL</label>
                    <div className="flex gap-1.5">
                      <Input
                        readOnly
                        value={MCP_URL}
                        className="text-[10px] font-mono h-8 bg-muted/50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 shrink-0"
                        onClick={() => copyText(MCP_URL, "url")}
                      >
                        {copiedUrl ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Config JSON */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Configuração JSON</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[9px] h-5 px-1.5 gap-1"
                        onClick={() => copyText(CONFIG_JSON, "config")}
                      >
                        {copiedConfig ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                        {copiedConfig ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                    <pre className="text-[10px] bg-muted/60 p-2.5 rounded-lg font-mono overflow-x-auto leading-relaxed border border-border/30">
                      {CONFIG_JSON}
                    </pre>
                  </div>

                  {/* Transport info */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[8px]">Transport: streamable-http</Badge>
                    <Badge variant="outline" className="text-[8px]">Protocol: JSON-RPC 2.0</Badge>
                    <Badge variant="outline" className="text-[8px]">Auth: Bearer Token</Badge>
                  </div>
                </StepItem>

                {/* Step 3: Test connection */}
                <StepItem number={3} title="Teste a conexão" done={step3Done}>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    No Claude Desktop ou Antigravity, envie uma mensagem como <em>"Liste meus projetos no Rankito"</em>.
                    Se o Claude retornar seus projetos, está tudo funcionando!
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 gap-1.5"
                      onClick={() => setStep3Done(true)}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" /> Conexão testada com sucesso
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-7 gap-1.5"
                      onClick={() => window.open("/command-center", "_self")}
                    >
                      <ExternalLink className="h-2.5 w-2.5" /> Ir para Command Center
                    </Button>
                  </div>
                </StepItem>

                {/* Completion banner */}
                {allDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Claude Mode configurado! Use o <strong>Command Center</strong> para monitorar ações e anomalias.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
