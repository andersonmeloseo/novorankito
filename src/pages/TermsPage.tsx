import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 13 de março de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">

          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou utilizar a plataforma Rankito ("Plataforma"), operada por Rankito Tecnologia ("Empresa", "nós"), 
            você ("Usuário") declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. 
            Caso não concorde com qualquer disposição, não utilize a Plataforma.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            A Plataforma oferece ferramentas de análise de SEO, monitoramento de desempenho em mecanismos de busca, 
            indexação de URLs, rastreamento de eventos e analytics, inteligência artificial aplicada, e gestão de 
            projetos digitais ("Serviços"). Os Serviços são fornecidos "como estão" (as-is) e podem ser alterados, 
            atualizados ou descontinuados a qualquer momento, mediante aviso prévio de 30 (trinta) dias quando possível.
          </p>

          <h2>3. Cadastro e Conta</h2>
          <p>
            <strong>3.1.</strong> Para utilizar os Serviços, o Usuário deve criar uma conta fornecendo informações 
            verdadeiras, completas e atualizadas. O Usuário é integralmente responsável por manter a 
            confidencialidade de suas credenciais de acesso.<br />
            <strong>3.2.</strong> O Usuário é responsável por todas as atividades realizadas em sua conta, incluindo 
            ações de terceiros autorizados por ele.<br />
            <strong>3.3.</strong> Ao criar uma conta, o Usuário declara ter pelo menos 18 (dezoito) anos ou a maioridade 
            legal aplicável em sua jurisdição.<br />
            <strong>3.4.</strong> A Empresa reserva-se o direito de suspender ou encerrar contas que violem estes Termos, 
            sem aviso prévio e sem direito a reembolso.
          </p>

          <h2>4. Planos e Pagamentos</h2>
          <p>
            <strong>4.1.</strong> A Plataforma opera com modelo de assinatura mensal ou anual ("Plano"). Os valores, 
            recursos e limites de cada Plano estão descritos na página de preços e podem ser alterados com 30 (trinta) 
            dias de antecedência.<br />
            <strong>4.2.</strong> A cobrança é recorrente e automática. O Usuário pode cancelar a qualquer momento; 
            o acesso permanece ativo até o final do período já pago. <strong>Não há reembolso proporcional</strong> após 
            o período de garantia.<br />
            <strong>4.3.</strong> Oferecemos garantia de satisfação de 7 (sete) dias corridos a partir da primeira 
            assinatura paga. Dentro deste período, o Usuário pode solicitar reembolso integral.<br />
            <strong>4.4.</strong> A inadimplência por mais de 15 (quinze) dias poderá resultar em suspensão do acesso, 
            e após 60 (sessenta) dias, na exclusão dos dados armazenados.
          </p>

          <h2>5. Uso Aceitável</h2>
          <p>O Usuário compromete-se a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Não utilizar a Plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros;</li>
            <li>Não realizar engenharia reversa, scraping automatizado abusivo ou tentativas de acesso não autorizado;</li>
            <li>Não compartilhar credenciais de acesso com terceiros não autorizados;</li>
            <li>Não sobrecarregar intencionalmente a infraestrutura da Plataforma;</li>
            <li>Respeitar os limites de uso estabelecidos em seu Plano;</li>
            <li>Não utilizar os Serviços para manipulação maliciosa de resultados de busca (black hat SEO).</li>
          </ul>

          <h2>6. Propriedade Intelectual</h2>
          <p>
            <strong>6.1.</strong> Todo o conteúdo da Plataforma — incluindo software, design, marca, textos, algoritmos 
            e interfaces — é de propriedade exclusiva da Empresa ou de seus licenciadores, protegido pelas leis de 
            propriedade intelectual brasileiras e internacionais.<br />
            <strong>6.2.</strong> Os dados inseridos pelo Usuário permanecem de sua propriedade. A Empresa utiliza 
            esses dados exclusivamente para a prestação dos Serviços e conforme descrito na Política de Privacidade.<br />
            <strong>6.3.</strong> O Usuário concede à Empresa licença limitada, não exclusiva e revogável para processar 
            seus dados com o único propósito de fornecer os Serviços contratados.
          </p>

          <h2>7. Limitação de Responsabilidade</h2>
          <p>
            <strong>7.1.</strong> A Empresa não se responsabiliza por: (a) decisões tomadas pelo Usuário com base em 
            dados ou análises fornecidos pela Plataforma; (b) indisponibilidade temporária causada por manutenção, 
            falhas de terceiros ou força maior; (c) perda de receita, lucros ou oportunidades de negócio; 
            (d) ações de mecanismos de busca (Google, Bing, etc.) sobre os sites do Usuário.<br />
            <strong>7.2.</strong> A responsabilidade total da Empresa, em qualquer hipótese, é limitada ao valor 
            efetivamente pago pelo Usuário nos últimos 12 (doze) meses de assinatura.<br />
            <strong>7.3.</strong> A Plataforma integra-se com serviços de terceiros (Google Search Console, Google 
            Analytics, etc.). A Empresa não é responsável pela disponibilidade, precisão ou alterações unilaterais 
            desses serviços.
          </p>

          <h2>8. Integrações e APIs de Terceiros</h2>
          <p>
            <strong>8.1.</strong> Ao conectar serviços de terceiros (Google, Meta, etc.), o Usuário autoriza a 
            Plataforma a acessar os dados necessários para a prestação dos Serviços, nos limites das permissões 
            concedidas.<br />
            <strong>8.2.</strong> A Empresa armazena credenciais de acesso de forma criptografada e as utiliza 
            exclusivamente para as finalidades autorizadas.<br />
            <strong>8.3.</strong> O Usuário pode revogar integrações a qualquer momento através das configurações 
            de sua conta.
          </p>

          <h2>9. Rescisão</h2>
          <p>
            <strong>9.1.</strong> O Usuário pode encerrar sua conta a qualquer momento nas configurações do sistema.<br />
            <strong>9.2.</strong> Após o encerramento, os dados do Usuário serão retidos por 30 (trinta) dias para 
            possível recuperação, após os quais serão permanentemente excluídos.<br />
            <strong>9.3.</strong> A Empresa reserva-se o direito de encerrar contas por violação destes Termos, 
            atividade fraudulenta ou inatividade superior a 12 (doze) meses.
          </p>

          <h2>10. Alterações nos Termos</h2>
          <p>
            A Empresa pode modificar estes Termos a qualquer momento. Alterações substanciais serão comunicadas 
            por e-mail e/ou notificação na Plataforma com pelo menos 15 (quinze) dias de antecedência. O uso 
            continuado da Plataforma após a entrada em vigor das alterações constitui aceitação dos novos Termos.
          </p>

          <h2>11. Legislação e Foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca 
            de domicílio da Empresa para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais 
            privilegiado que seja.
          </p>

          <h2>12. Disposições Gerais</h2>
          <p>
            <strong>12.1.</strong> A eventual invalidade de qualquer cláusula não afeta as demais disposições destes Termos.<br />
            <strong>12.2.</strong> A tolerância no cumprimento de qualquer obrigação não implica renúncia ou novação.<br />
            <strong>12.3.</strong> Estes Termos constituem o acordo integral entre o Usuário e a Empresa com relação 
            ao uso da Plataforma.
          </p>

          <div className="border-t border-border pt-6 mt-10">
            <p className="text-xs text-muted-foreground">
              Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail: <strong>suporte@rankito.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
