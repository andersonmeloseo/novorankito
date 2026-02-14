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
      "Faça login com a mesma conta Google que você usa no Search Console",
    ],
  },
  {
    title: "Criar um novo projeto",
    description: "Crie um projeto dedicado para o Rankito CRM.",
    link: "https://console.cloud.google.com/projectcreate",
    linkLabel: "Criar Projeto",
    details: [
      "Dê o nome de 'Rankito CRM'",
      "Não precisa escolher nada em Local",
      "Clique em 'Criar'",
    ],
  },
  {
    title: "Ativar a API do Google Search Console",
    description: "Habilite a API necessária para a integração.",
    link: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
    linkLabel: "Ativar Search Console API",
    details: [
      "Clique no botão 'Ativar' para habilitar a API",
      "Aguarde a ativação ser concluída",
    ],
  },
  {
    title: "Ativar a Web Search Indexing API",
    description: "Habilite a API de indexação para envio automático de URLs.",
    link: "https://console.cloud.google.com/apis/library/indexing.googleapis.com",
    linkLabel: "Ativar Indexing API",
    details: [
      "Clique no botão 'Ativar' para habilitar a API de indexação",
      "Esta API permite enviar URLs para indexação automaticamente",
    ],
  },
  {
    title: "Criar Conta de Serviço",
    description: "Crie uma Service Account que será usada para autenticação.",
    link: "https://console.cloud.google.com/iam-admin/serviceaccounts/create",
    linkLabel: "Criar Service Account",
    details: [
      "Acesse IAM e Admin > Contas de Serviço",
      "Clique em '+ Criar Conta de Serviço'",
      "Dê o nome de 'Rankito CRM'",
      "Clique em 'Criar e Continuar'",
      "Nas permissões, clique em 'Concluído'",
    ],
  },
  {
    title: "Gerenciar chaves da Service Account",
    description: "Gere a chave JSON que será usada para autenticação.",
    details: [
      "Na lista de contas de serviço, clique nos 3 pontinhos no final da linha",
      "Selecione 'Gerenciar Chaves'",
    ],
  },
  {
    title: "Gerar chave JSON",
    description: "Baixe o arquivo de credenciais em formato JSON.",
    details: [
      "Clique em 'Adicionar Chave' > 'Criar nova chave'",
      "Selecione 'JSON'",
      "Salve o arquivo baixado em local seguro",
      "⚠️ Este arquivo contém credenciais sensíveis!",
    ],
  },
  {
    title: "Copiar email da Service Account",
    description: "Você precisará do email da Service Account para o próximo passo.",
    details: [
      "Volte em 'Contas de Serviço'",
      "Passe o mouse sobre o email e clique no ícone de copiar",
      "Cole em um arquivo para consultar depois",
      "O email terá formato: nome@projeto.iam.gserviceaccount.com",
    ],
  },
  {
    title: "Adicionar Service Account no Search Console",
    description: "Adicione a Service Account como proprietária no Google Search Console.",
    link: "https://search.google.com/search-console",
    linkLabel: "Abrir Search Console",
    details: [
      "Abra o Search Console e selecione o projeto",
      "Vá em 'Configurações' (menu lateral, final)",
      "Clique em 'Usuários e Permissões'",
      "Clique em 'Adicionar Usuário'",
      "Cole o email da Service Account copiado",
      "Selecione permissão 'Proprietário'",
      "Clique em 'Adicionar'",
    ],
  },
  {
    title: "Configurar no Rankito",
    description: "Agora adicione as credenciais no sistema.",
    details: [
      "Você precisará de:",
      "1. O nome da conexão (ex: 'Meu Site Principal')",
      "2. O arquivo JSON da chave (passo 7)",
      "3. O email da Service Account (passo 8)",
      "Cole o conteúdo JSON no campo de credenciais abaixo",
    ],
  },
];

interface GSCTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GSCTutorialModal({ open, onOpenChange }: GSCTutorialModalProps) {
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
            Tutorial: Conectar Google Search Console
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
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
          {/* Step header */}
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{currentStep + 1}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 pl-10">
            {step.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{detail}</span>
              </div>
            ))}
          </div>

          {/* Link button */}
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

        {/* Navigation */}
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
