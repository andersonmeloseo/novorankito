import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AnimatedContainer } from "@/components/ui/animated-container";
import {
  Settings, Eye, EyeOff, Save, CheckCircle2, AlertTriangle, KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  hint?: string;
}

const GOOGLE_ADS_FIELDS: CredentialField[] = [
  { key: "developer_token", label: "Developer Token", placeholder: "XXXXXXXXXXXXXXXX", type: "password", hint: "Token de desenvolvedor da conta MCC" },
  { key: "customer_id", label: "Customer ID", placeholder: "123-456-7890", hint: "ID da conta Google Ads (com hífens)" },
  { key: "client_id", label: "OAuth Client ID", placeholder: "xxxxx.apps.googleusercontent.com", hint: "Client ID do Google Cloud Console" },
  { key: "client_secret", label: "OAuth Client Secret", placeholder: "GOCSPX-xxxxx", type: "password" },
  { key: "refresh_token", label: "Refresh Token", placeholder: "1//0xxxxx", type: "password", hint: "Token de refresh do OAuth2" },
];

const META_ADS_FIELDS: CredentialField[] = [
  { key: "pixel_id", label: "Pixel ID", placeholder: "123456789012345", hint: "ID do pixel do Meta/Facebook" },
  { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx...", type: "password", hint: "Token de acesso da API de Conversões (CAPI)" },
];

function CredentialInput({ field, value, onChange }: { field: CredentialField; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const isPassword = field.type === "password";

  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</Label>
      <div className="relative">
        <Input
          type={isPassword && !show ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-xs h-8 pr-8 font-mono"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {field.hint && <p className="text-[9px] text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

export function AdsPlatformCredentials() {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [metaEnabled, setMetaEnabled] = useState(false);
  const [googleCreds, setGoogleCreds] = useState<Record<string, string>>({});
  const [metaCreds, setMetaCreds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (platform: string) => {
    setSaving(platform);
    // Simulate save — in production this would save to a secure backend table
    await new Promise(r => setTimeout(r, 800));
    toast.success(`Credenciais do ${platform} salvas com sucesso!`);
    setSaving(null);
  };

  const isGoogleComplete = GOOGLE_ADS_FIELDS.every(f => googleCreds[f.key]?.trim());
  const isMetaComplete = META_ADS_FIELDS.every(f => metaCreds[f.key]?.trim());

  return (
    <AnimatedContainer delay={0.06}>
      <Card className="p-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-primary" />
          Credenciais das Plataformas de Ads
        </h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          Configure suas chaves de API para habilitar a sincronização automática de conversões offline.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Google Ads */}
          <Card className="p-4 bg-muted/20 border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold border-chart-3/40 text-chart-3">
                  Google Ads
                </Badge>
                {isGoogleComplete && googleEnabled && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">{googleEnabled ? "Ativo" : "Inativo"}</span>
                <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
              </div>
            </div>

            {googleEnabled && (
              <div className="space-y-2.5">
                {GOOGLE_ADS_FIELDS.map(field => (
                  <CredentialInput
                    key={field.key}
                    field={field}
                    value={googleCreds[field.key] || ""}
                    onChange={v => setGoogleCreds(prev => ({ ...prev, [field.key]: v }))}
                  />
                ))}

                {!isGoogleComplete && (
                  <div className="flex items-center gap-1.5 text-[9px] text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Preencha todos os campos para habilitar sincronização
                  </div>
                )}

                <Button
                  size="sm" className="w-full h-8 text-xs gap-1.5 mt-1"
                  disabled={!isGoogleComplete || saving === "Google Ads"}
                  onClick={() => handleSave("Google Ads")}
                >
                  {saving === "Google Ads" ? (
                    <><Settings className="h-3 w-3 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="h-3 w-3" /> Salvar Credenciais Google Ads</>
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* Meta Ads */}
          <Card className="p-4 bg-muted/20 border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold border-chart-4/40 text-chart-4">
                  Meta Ads
                </Badge>
                {isMetaComplete && metaEnabled && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground">{metaEnabled ? "Ativo" : "Inativo"}</span>
                <Switch checked={metaEnabled} onCheckedChange={setMetaEnabled} />
              </div>
            </div>

            {metaEnabled && (
              <div className="space-y-2.5">
                {META_ADS_FIELDS.map(field => (
                  <CredentialInput
                    key={field.key}
                    field={field}
                    value={metaCreds[field.key] || ""}
                    onChange={v => setMetaCreds(prev => ({ ...prev, [field.key]: v }))}
                  />
                ))}

                {!isMetaComplete && (
                  <div className="flex items-center gap-1.5 text-[9px] text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Preencha todos os campos para habilitar sincronização
                  </div>
                )}

                <Button
                  size="sm" className="w-full h-8 text-xs gap-1.5 mt-1"
                  disabled={!isMetaComplete || saving === "Meta Ads"}
                  onClick={() => handleSave("Meta Ads")}
                >
                  {saving === "Meta Ads" ? (
                    <><Settings className="h-3 w-3 animate-spin" /> Salvando...</>
                  ) : (
                    <><Save className="h-3 w-3" /> Salvar Credenciais Meta Ads</>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </Card>
    </AnimatedContainer>
  );
}
