import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader title="Configurações Globais" description="Nome da plataforma, domínio, emails, limites e white-label" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plataforma</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome da Plataforma</Label>
              <Input defaultValue="Rankito" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Domínio</Label>
              <Input defaultValue="app.rankito.com" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">E-mail de Suporte</Label>
              <Input defaultValue="suporte@rankito.com" className="text-sm" />
            </div>
            <Button size="sm">Salvar Alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Funcionalidades</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Modo Manutenção", desc: "Bloqueia acesso de usuários não-admin", checked: false },
              { label: "Cadastro Aberto", desc: "Permite novos registros na plataforma", checked: true },
              { label: "E-mails Transacionais", desc: "Envio automático de notificações", checked: true },
              { label: "White-label", desc: "Permite customização de marca por tenant", checked: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch defaultChecked={item.checked} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
