export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string | null;
  action: 'click_button' | 'click' | 'click_and_wait' | 'choice';
  navigateTo: string | null;
  requiresAction: boolean;
  waitForCondition?: string;
  choices?: { label: string; value: string; goToStepId: string }[];
  nextStepId?: string; // override default sequential flow
}

export const TOUR_STEPS: TourStep[] = [
  // STEP 0 — BOAS-VINDAS
  {
    id: 'welcome',
    title: 'Bem-vindo ao Rankito! 🎉',
    description: 'Vamos configurar tudo para você tirar o máximo da plataforma. Este guia vai te orientar passo a passo nas configurações essenciais. Cada etapa é importante para o funcionamento correto das ferramentas.',
    targetSelector: null,
    action: 'click_button',
    navigateTo: null,
    requiresAction: false,
  },

  // STEP 1 — NAVEGAR PARA ABA SEO
  {
    id: 'navigate_seo',
    title: 'Acesse a aba SEO',
    description: 'Primeiro, precisamos sincronizar seus dados do Google Search Console. Clique na aba "SEO" no menu lateral.',
    targetSelector: '[data-tour="seo"]',
    action: 'click',
    navigateTo: '/seo',
    requiresAction: true,
  },

  // STEP 2 — SINCRONIZAR GSC
  {
    id: 'sync_gsc',
    title: 'Sincronize os dados do GSC',
    description: 'Clique no botão "Sincronizar dados" para importar todas as informações de desempenho do seu site no Google. Aguarde a sincronização completar antes de prosseguir.',
    targetSelector: '[data-tour="gsc-sync-button"]',
    action: 'click_and_wait',
    navigateTo: null,
    requiresAction: true,
    waitForCondition: 'gsc_sync_complete',
  },

  // STEP 3 — GA4 CONFIGURADO?
  {
    id: 'ga4_question',
    title: 'Google Analytics 4 (GA4)',
    description: 'Você já configurou o Google Analytics 4 (GA4) para este projeto?',
    targetSelector: null,
    action: 'choice',
    navigateTo: null,
    requiresAction: true,
    choices: [
      { label: 'Sim, já configurei', value: 'yes', goToStepId: 'sync_ga4' },
      { label: 'Não configurei ainda', value: 'no', goToStepId: 'navigate_indexing_sitemap' },
    ],
  },

  // STEP 4A — SINCRONIZAR GA4
  {
    id: 'sync_ga4',
    title: 'Sincronize os dados do GA4',
    description: 'Acesse a aba "GA4 Visão Geral" e clique em "Atualizar" para importar as métricas de tráfego e comportamento do seu site.',
    targetSelector: '[data-tour="ga4-sync-button"]',
    action: 'click_and_wait',
    navigateTo: '/ga4#overview',
    requiresAction: true,
    waitForCondition: 'ga4_sync_complete',
    nextStepId: 'navigate_indexing_sitemap',
  },

  // STEP 5 — NAVEGAR INDEXAÇÃO > SITEMAP
  {
    id: 'navigate_indexing_sitemap',
    title: 'Vamos configurar a Indexação',
    description: 'Agora vamos garantir que o Google conheça todas as páginas do seu site. Acesse a aba "Indexação" > "Sitemap".',
    targetSelector: '[data-tour="indexing-sitemap"]',
    action: 'click',
    navigateTo: '/indexing#sitemap',
    requiresAction: true,
  },

  // STEP 6 — SELECIONAR TODOS OS SITEMAPS
  {
    id: 'select_all_sitemaps',
    title: 'Selecione todos os Sitemaps',
    description: 'Clique no botão "Selecionar Todos" para marcar todos os sitemaps disponíveis do seu site.',
    targetSelector: '[data-tour="select-all-sitemaps"]',
    action: 'click',
    navigateTo: null,
    requiresAction: true,
  },

  // STEP 7 — ENVIAR SITEMAPS
  {
    id: 'submit_sitemaps',
    title: 'Envie os Sitemaps para Indexação',
    description: 'Clique em "Enviar Sitemap(s) para Indexação" para notificar o Google sobre todas as páginas do seu site.',
    targetSelector: '[data-tour="submit-sitemaps"]',
    action: 'click_and_wait',
    navigateTo: null,
    requiresAction: true,
    waitForCondition: 'sitemaps_submitted',
  },

  // STEP 8 — NAVEGAR INDEXAÇÃO > URLs
  {
    id: 'navigate_indexing_urls',
    title: 'Agora vamos indexar as URLs',
    description: 'Acesse a sub-aba "URLs" dentro de Indexação para solicitar a indexação de cada página.',
    targetSelector: '[data-tour="indexing-urls"]',
    action: 'click',
    navigateTo: '/indexing#inventory',
    requiresAction: true,
  },

  // STEP 9 — SELECIONAR TODAS AS URLs
  {
    id: 'select_all_urls',
    title: 'Selecione todas as URLs',
    description: 'Clique no checkbox do cabeçalho da tabela para selecionar todas as URLs de uma vez.',
    targetSelector: '[data-tour="urls-select-all"]',
    action: 'click',
    navigateTo: null,
    requiresAction: true,
  },

  // STEP 10 — INDEXAR SELECIONADAS
  {
    id: 'index_selected',
    title: 'Indexe as URLs selecionadas',
    description: 'Clique em "Indexar selecionada(s)" para enviar todas as URLs marcadas para indexação no Google.',
    targetSelector: '[data-tour="index-selected"]',
    action: 'click_and_wait',
    navigateTo: null,
    requiresAction: true,
    waitForCondition: 'urls_indexing_started',
  },

  // STEP 11 — DICA INDEXAÇÃO INDIVIDUAL
  {
    id: 'tip_individual_indexing',
    title: 'Dica: Indexação Individual',
    description: 'Sempre que possível, volte aqui e indexe URLs individualmente. O Google tem cota diária de envios — indexar regularmente garante que todo conteúdo novo seja descoberto. Páginas não indexadas = invisíveis no Google.',
    targetSelector: null,
    action: 'click_button',
    navigateTo: null,
    requiresAction: false,
  },

  // STEP 12 — NAVEGAR AGENDAR INDEXAÇÃO
  {
    id: 'navigate_schedule',
    title: 'Configure o Agendamento',
    description: 'Acesse a sub-aba "Agendar Indexação" para programar envios automáticos de URLs.',
    targetSelector: '[data-tour="indexing-schedule"]',
    action: 'click',
    navigateTo: '/indexing#schedule',
    requiresAction: true,
  },

  // STEP 13 — EXPLICAÇÃO AGENDAMENTO
  {
    id: 'explain_scheduling',
    title: 'Por que agendar a indexação?',
    description: 'O agendamento automático é ESSENCIAL:\n\n1. O Google limita envios por dia (cota diária). O agendamento distribui os envios.\n\n2. Novas páginas e atualizações precisam ser re-enviadas automaticamente.\n\n3. Quanto mais rápido suas páginas são indexadas, mais rápido aparecem no Google.\n\nRecomendamos envios diários.',
    targetSelector: '[data-tour="schedule-form"]',
    action: 'click_button',
    navigateTo: null,
    requiresAction: false,
  },

  // STEP 14 — NAVEGAR CONTAS
  {
    id: 'navigate_accounts',
    title: 'Gerencie suas Contas de Indexação',
    description: 'Acesse a sub-aba "Contas" dentro de Indexação.',
    targetSelector: '[data-tour="indexing-accounts"]',
    action: 'click',
    navigateTo: '/indexing#accounts',
    requiresAction: true,
  },

  // STEP 15 — EXPLICAÇÃO CONTAS GSC
  {
    id: 'explain_accounts',
    title: 'Multiplique sua Cota de Indexação',
    description: 'Cada conta GSC tem ~200 URLs/dia de cota. Adicione mais contas para multiplicar:\n\n• 1 conta = ~200 URLs/dia\n• 3 contas = ~600 URLs/dia\n• 5 contas = ~1.000 URLs/dia\n\nCrie contas Gmail adicionais, verifique a propriedade no GSC e adicione aqui.',
    targetSelector: '[data-tour="add-account"]',
    action: 'click_button',
    navigateTo: null,
    requiresAction: false,
  },

  // STEP 16 — CONCLUSÃO
  {
    id: 'tour_complete',
    title: 'Configuração Concluída! 🎉',
    description: 'Parabéns! Seu projeto está configurado e pronto.\n\nLembre-se:\n• Volte regularmente para indexar novas páginas\n• Configure o agendamento automático\n• Adicione mais contas GSC para aumentar a cota\n\nBom trabalho!',
    targetSelector: null,
    action: 'click_button',
    navigateTo: null,
    requiresAction: false,
  },
];

// Map step id to its index
export const STEP_INDEX_MAP = new Map(TOUR_STEPS.map((s, i) => [s.id, i]));

// Get effective total steps (for progress display, excluding conditional GA4)
export const TOTAL_VISIBLE_STEPS = TOUR_STEPS.length;
