import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Link2, Tag, Wifi, WifiOff, Bell, Users, Bot, Settings2, Copy } from "lucide-react";

export default function ProjectSettingsPage() {
  return (
    <>
      <TopBar title="Configurações" subtitle="Gerencie domínio, integrações e preferências do projeto" />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="text-xs">Geral</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs">Integrações</TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">Tracking</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs">Metas & Alertas</TabsTrigger>
            <TabsTrigger value="team" className="text-xs">Equipe</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Informações do Projeto</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do projeto</Label>
                  <Input defaultValue="acme.com" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Domínio principal</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input defaultValue="acme.com" className="h-9 text-sm pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sitemaps</Label>
                <div className="space-y-2">
                  {["https://acme.com/sitemap.xml", "https://acme.com/sitemap-posts.xml"].map((url) => (
                    <div key={url} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs">
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-foreground flex-1">{url}</span>
                      <Badge variant="secondary" className="text-[9px]">ativo</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grupos de URL / Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["Core", "Products", "Blog", "Legacy"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{tag}</Badge>
                  ))}
                </div>
              </div>
              <Button size="sm" className="text-xs">Salvar Alterações</Button>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4 space-y-4">
            {[
              { name: "Google Search Console", status: "connected", icon: Wifi, color: "text-success" },
              { name: "Google Analytics 4", status: "connected", icon: Wifi, color: "text-success" },
              { name: "Google Ads", status: "disconnected", icon: WifiOff, color: "text-muted-foreground" },
              { name: "Meta Ads", status: "disconnected", icon: WifiOff, color: "text-muted-foreground" },
            ].map((integration) => (
              <Card key={integration.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <integration.icon className={`h-4 w-4 ${integration.color}`} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{integration.name}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {integration.status === "connected" ? "Conectado e sincronizando" : "Não conectado"}
                    </p>
                  </div>
                </div>
                <Button variant={integration.status === "connected" ? "outline" : "default"} size="sm" className="text-xs">
                  {integration.status === "connected" ? "Desconectar" : "Conectar"}
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tracking" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Script de Tracking</h3>
              <div className="space-y-1.5">
                <Label className="text-xs">Chave do Projeto</Label>
                <div className="flex items-center gap-2">
                  <Input defaultValue="rk_live_a1b2c3d4e5f6" className="h-9 text-sm font-mono" readOnly />
                  <Button variant="outline" size="sm" className="h-9"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Snippet para instalação</Label>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs text-foreground">
                  {`<script src="https://cdn.rankito.io/track.js" data-key="rk_live_a1b2c3d4e5f6"></script>`}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Eventos customizados</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["click", "scroll", "form_submit", "page_view", "cta_click"].map((ev) => (
                    <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Objetivos do Agente IA</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Foco principal</Label>
                  <Input defaultValue="SEO Growth + Leads" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta de cliques/mês</Label>
                  <Input defaultValue="30000" type="number" className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-medium text-foreground">Alertas & Thresholds</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Alerta de queda de cliques", desc: "Notificar quando cliques caírem > 20%", enabled: true },
                  { label: "Alerta de posição", desc: "Notificar quando posição média subir > 5 posições", enabled: true },
                  { label: "Alerta de erro de indexação", desc: "Notificar falhas consecutivas na fila", enabled: false },
                ].map((alert) => (
                  <div key={alert.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <span className="text-xs font-medium text-foreground">{alert.label}</span>
                      <p className="text-[10px] text-muted-foreground">{alert.desc}</p>
                    </div>
                    <Switch defaultChecked={alert.enabled} />
                  </div>
                ))}
              </div>
              <Button size="sm" className="text-xs">Salvar Configurações</Button>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-4 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Membros do Projeto</h3>
                <Button size="sm" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Convidar</Button>
              </div>
              {[
                { name: "Rafael", email: "rafael@acme.com", role: "Owner" },
                { name: "Maria", email: "maria@acme.com", role: "Admin" },
                { name: "João", email: "joao@acme.com", role: "Analyst" },
              ].map((member) => (
                <div key={member.email} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {member.name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      <p className="text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
