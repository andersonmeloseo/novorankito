import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 13 de março de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">

          <p>
            A Rankito Tecnologia ("Empresa", "nós") respeita a privacidade de seus usuários e está comprometida 
            com a proteção dos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 
            — LGPD) e demais legislações aplicáveis.
          </p>

          <h2>1. Dados Coletados</h2>
          <p>Coletamos as seguintes categorias de dados:</p>
          <p>
            <strong>1.1. Dados fornecidos pelo Usuário:</strong> nome, sobrenome, endereço de e-mail, número de 
            WhatsApp (opcional), senha (armazenada com hash criptográfico).<br />
            <strong>1.2. Dados de uso:</strong> páginas acessadas, funcionalidades utilizadas, horários de acesso, 
            endereço IP, tipo de dispositivo e navegador, dados de geolocalização aproximada.<br />
            <strong>1.3. Dados de integrações:</strong> informações provenientes de serviços conectados pelo Usuário 
            (Google Search Console, Google Analytics, Google Ads, Meta Ads), incluindo métricas de desempenho, URLs 
            e dados analíticos. Estas informações são coletadas exclusivamente mediante autorização explícita do Usuário.<br />
            <strong>1.4. Dados de pagamento:</strong> informações de cobrança são processadas diretamente por 
            processadores de pagamento terceiros (Stripe, AbacatePay). <strong>Não armazenamos dados de cartão 
            de crédito</strong> em nossos servidores.
          </p>

          <h2>2. Finalidades do Tratamento</h2>
          <p>Utilizamos os dados pessoais para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestar, manter e melhorar os Serviços contratados;</li>
            <li>Autenticar e gerenciar a conta do Usuário;</li>
            <li>Processar pagamentos e gerenciar assinaturas;</li>
            <li>Enviar notificações operacionais (alertas de SEO, relatórios, status de indexação);</li>
            <li>Personalizar a experiência do Usuário;</li>
            <li>Cumprir obrigações legais e regulatórias;</li>
            <li>Prevenir fraudes e garantir a segurança da Plataforma;</li>
            <li>Gerar análises agregadas e anônimas para melhoria dos Serviços.</li>
          </ul>

          <h2>3. Base Legal para o Tratamento (LGPD)</h2>
          <p>O tratamento de dados pessoais é realizado com base em:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Execução de contrato</strong> (Art. 7º, V): para a prestação dos Serviços contratados;</li>
            <li><strong>Consentimento</strong> (Art. 7º, I): para comunicações de marketing e integrações com terceiros;</li>
            <li><strong>Legítimo interesse</strong> (Art. 7º, IX): para melhorias da Plataforma e prevenção de fraudes;</li>
            <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II): para obrigações fiscais e regulatórias.</li>
          </ul>

          <h2>4. Compartilhamento de Dados</h2>
          <p>
            <strong>4.1.</strong> <strong>Não vendemos, alugamos ou comercializamos</strong> dados pessoais de nossos 
            Usuários para terceiros.<br />
            <strong>4.2.</strong> Podemos compartilhar dados com:<br />
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Processadores de pagamento:</strong> Stripe e AbacatePay, exclusivamente para processamento de cobranças;</li>
            <li><strong>Provedores de infraestrutura:</strong> Supabase (banco de dados e autenticação), hospedados em data centers seguros;</li>
            <li><strong>APIs de terceiros:</strong> Google (Search Console, Analytics, Ads), Meta — conforme integrações configuradas pelo Usuário;</li>
            <li><strong>Autoridades legais:</strong> quando exigido por lei, ordem judicial ou procedimento legal.</li>
          </ul>

          <h2>5. Armazenamento e Segurança</h2>
          <p>
            <strong>5.1.</strong> Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) 
            e em repouso.<br />
            <strong>5.2.</strong> Credenciais de API de terceiros são armazenadas com criptografia PGP simétrica.<br />
            <strong>5.3.</strong> Senhas são protegidas com hashing bcrypt e nunca armazenadas em texto puro.<br />
            <strong>5.4.</strong> Implementamos controle de acesso baseado em papéis (RBAC), políticas de segurança 
            em nível de linha (RLS) e auditoria de ações administrativas.<br />
            <strong>5.5.</strong> Apesar das medidas de segurança adotadas, nenhum sistema é 100% seguro. A Empresa 
            se compromete a notificar os Usuários afetados em caso de incidente de segurança, conforme exigido pela LGPD.
          </p>

          <h2>6. Retenção de Dados</h2>
          <p>
            <strong>6.1.</strong> Dados de conta são retidos enquanto a conta estiver ativa.<br />
            <strong>6.2.</strong> Após exclusão da conta, os dados são retidos por 30 (trinta) dias para possível 
            recuperação, sendo permanentemente excluídos após esse período.<br />
            <strong>6.3.</strong> Dados de rastreamento e eventos são retidos por até 90 (noventa) dias.<br />
            <strong>6.4.</strong> Registros de auditoria são retidos por 180 (cento e oitenta) dias.<br />
            <strong>6.5.</strong> Dados necessários para cumprimento de obrigações legais ou fiscais podem ser 
            retidos pelo prazo exigido pela legislação aplicável.
          </p>

          <h2>7. Direitos do Titular (LGPD)</h2>
          <p>O Usuário tem os seguintes direitos em relação aos seus dados pessoais:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia;</li>
            <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade;</li>
            <li><strong>Portabilidade:</strong> transferir dados a outro fornecedor;</li>
            <li><strong>Eliminação:</strong> solicitar exclusão dos dados tratados com base em consentimento;</li>
            <li><strong>Informação sobre compartilhamento:</strong> saber com quais entidades seus dados são compartilhados;</li>
            <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento.</li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, envie solicitação para <strong>privacidade@rankito.com</strong>. 
            Responderemos em até 15 (quinze) dias úteis.
          </p>

          <h2>8. Cookies e Tecnologias de Rastreamento</h2>
          <p>
            <strong>8.1.</strong> Utilizamos cookies essenciais para autenticação e funcionamento da Plataforma.<br />
            <strong>8.2.</strong> Cookies analíticos podem ser utilizados para entender padrões de uso. O Usuário 
            pode desabilitá-los nas configurações do navegador.<br />
            <strong>8.3.</strong> Não utilizamos cookies de publicidade ou rastreamento de terceiros para fins de 
            marketing direcionado.
          </p>

          <h2>9. Transferência Internacional de Dados</h2>
          <p>
            Os dados podem ser processados em servidores localizados fora do Brasil, em países que possuam nível 
            adequado de proteção de dados ou mediante cláusulas contratuais padrão, conforme previsto na LGPD 
            (Art. 33).
          </p>

          <h2>10. Menores de Idade</h2>
          <p>
            A Plataforma não é destinada a menores de 18 (dezoito) anos. Não coletamos intencionalmente dados de 
            menores. Se tomarmos conhecimento de que dados de um menor foram coletados, os excluiremos imediatamente.
          </p>

          <h2>11. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. Alterações substanciais serão comunicadas por e-mail 
            e/ou notificação na Plataforma com pelo menos 15 (quinze) dias de antecedência.
          </p>

          <h2>12. Encarregado de Dados (DPO)</h2>
          <p>
            Para questões relacionadas à privacidade e proteção de dados, entre em contato com nosso Encarregado 
            de Dados (DPO) pelo e-mail: <strong>privacidade@rankito.com</strong>
          </p>

          <h2>13. Autoridade Nacional de Proteção de Dados</h2>
          <p>
            O Usuário tem o direito de peticionar à Autoridade Nacional de Proteção de Dados (ANPD) caso considere 
            que o tratamento de seus dados pessoais viola a LGPD. Website: <strong>www.gov.br/anpd</strong>
          </p>

          <div className="border-t border-border pt-6 mt-10">
            <p className="text-xs text-muted-foreground">
              Em caso de dúvidas sobre esta Política, entre em contato pelo e-mail: <strong>privacidade@rankito.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
