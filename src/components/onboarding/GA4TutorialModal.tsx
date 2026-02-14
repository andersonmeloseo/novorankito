import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const TUTORIAL_STEPS = [
  {
    title: "Acessar o Google Cloud Console",
    description: "Faça login com sua conta Google e acesse o console de administração.",
    link: "https://console.cloud.google.com/",
    linkLabel: "Abrir Google Cloud Console",
    details: [
      "Acesse console.cloud.google.com",
      "Use a mesma conta Google que tem acesso ao GA4",
      "Selecione o mesmo projeto criado para o GSC (ou crie um novo)",
    ],
  },
  {
    title: "Ativar a Google Analytics Data API",
    description: "Habilite a API necessária para a integração com GA4.",
    link: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com",
    linkLabel: "Ativar Analytics Data API",
    details: [
      "Clique no botão 'Ativar' para habilitar a API",
      "Aguarde a ativação ser concluída",
      "Esta API permite ler dados de relatórios do GA4",
    ],
  },
  {
    title: "Ativar a Google Analytics Admin API",
    description: "Habilite a API de administração para listar propriedades.",
    link: "https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com",
    linkLabel: "Ativar Admin API",
    details: [
      "Clique no botão 'Ativar' para habilitar a API",
      "Esta API permite listar as propriedades GA4 da conta",
    ],
  },
  {
    title: "Usar a Service Account existente",
    description: "Use a mesma Service Account já criada para o GSC.",
    details: [
      "Se você já criou uma Service Account para o GSC, pode reutilizá-la",
      "Caso contrário, crie uma nova em IAM e Admin > Contas de Serviço",
      "Copie o email da Service Account (formato: nome@projeto.iam.gserviceaccount.com)",
    ],
  },
  {
    title: "Adicionar Service Account no GA4",
    description: "Dê permissão de leitura à Service Account na propriedade GA4.",
    link: "https://analytics.google.com/",
    linkLabel: "Abrir Google Analytics",
    details: [
      "Abra o Google Analytics e selecione a propriedade",
      "Vá em Administração (ícone de engrenagem)",
      "Em 'Propriedade', clique em 'Gerenciamento de acesso à propriedade'",
      "Clique no '+' e depois 'Adicionar usuários'",
      "Cole o email da Service Account",
      "Selecione permissão 'Leitor' (Viewer)",
      "Clique em 'Adicionar'",
    ],
  },
  {
    title: "Obter o ID da Propriedade GA4",
    description: "Você precisará do ID numérico da propriedade.",
    link: "https://analytics.google.com/",
    linkLabel: "Abrir Google Analytics",
    details: [
      "No GA4, vá em Administração > Configurações da propriedade",
      "O 'ID da propriedade' é um número (ex: 123456789)",
      "Anote esse número, você vai precisar no próximo passo",
    ],
  },
  {
    title: "Configurar no Rankito",
    description: "Agora adicione as credenciais no sistema.",
    details: [
      "Você precisará de:",
      "1. O nome da conexão (ex: 'GA4 - Meu Site')",
      "2. O arquivo JSON da chave da Service Account",
      "3. O email da Service Account",
      "Cole o conteúdo JSON no campo de credenciais",
    ],
  },
];

interface GA4TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GA4TutorialModal({ open, onOpenChange }: GA4TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Tutorial: Conectar Google Analytics 4
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-2">
          {TUTORIAL_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{currentStep + 1}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>

          <div className="space-y-2 pl-10">
            {step.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{detail}</span>
              </div>
            ))}
          </div>

          {step.link && (
            <div className="pl-10 space-y-1.5">
              <a href={step.link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1.5 text-xs w-full">
                  <ExternalLink className="h-3 w-3" /> {step.linkLabel}
                </Button>
              </a>
              <button
                onClick={() => copyToClipboard(step.link!)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
              >
                <Copy className="h-2.5 w-2.5" /> {step.link}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" /> Anterior
          </Button>
          <Badge variant="secondary" className="text-[10px]">
            {currentStep + 1} de {TUTORIAL_STEPS.length}
          </Badge>
          {currentStep < TUTORIAL_STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="gap-1 text-xs"
            >
              Próximo <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1 text-xs"
            >
              Concluir <CheckCircle2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
