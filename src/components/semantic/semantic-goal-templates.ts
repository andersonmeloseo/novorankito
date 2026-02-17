import { GoalStep } from "@/hooks/use-semantic-goals";

export interface GoalTemplate {
  key: string;
  name: string;
  description: string;
  goal_type: "niche_template" | "seo_objective" | "custom";
  icon: string; // lucide icon name for display
  color: string;
  steps: GoalStep[];
}

let stepId = 0;
const s = (title: string, description: string, type: GoalStep["type"], target_entity_type?: string, target_count?: number): GoalStep => ({
  id: `step-${++stepId}`,
  title,
  description,
  type,
  target_entity_type,
  target_count,
  completed: false,
});

// Reset counter for each template creation
function resetId() { stepId = 0; }

// ────────────── NICHE TEMPLATES ──────────────
export const NICHE_TEMPLATES: GoalTemplate[] = [
  (() => { resetId(); return {
    key: "clinica_odonto",
    name: "Clínica Odontológica",
    description: "Grafo completo para clínicas odontológicas com profissionais, serviços, localização e avaliações.",
    goal_type: "niche_template" as const,
    icon: "Stethoscope",
    color: "#22c55e",
    steps: [
      s("Criar entidade da Clínica", "Crie a entidade principal do tipo 'empresa' representando sua clínica", "entity", "empresa", 1),
      s("Adicionar Profissionais", "Crie pelo menos 2 entidades 'pessoa' para dentistas/especialistas", "entity", "pessoa", 2),
      s("Listar Serviços", "Crie entidades 'servico' para cada procedimento (limpeza, implante, etc.)", "entity", "servico", 3),
      s("Definir Localização", "Crie entidade 'local' com endereço completo da clínica", "entity", "local", 1),
      s("Adicionar Avaliações", "Crie pelo menos 1 entidade 'avaliacao' com rating agregado", "entity", "avaliacao", 1),
      s("Criar relações profissional→clínica", "Conecte cada profissional à clínica com 'trabalha_em'", "relation"),
      s("Criar relações serviço→clínica", "Conecte serviços à clínica com 'oferece' ou 'presta'", "relation"),
      s("Gerar Schema LocalBusiness", "Gere o Schema.org do tipo LocalBusiness na aba Schema", "schema"),
      s("Gerar Schema para Profissionais", "Gere Schema Person para cada dentista", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "ecommerce_moda",
    name: "E-commerce de Moda",
    description: "Estrutura semântica para lojas virtuais de moda com produtos, marcas, categorias e ofertas.",
    goal_type: "niche_template" as const,
    icon: "ShoppingBag",
    color: "#ec4899",
    steps: [
      s("Criar entidade da Loja", "Entidade principal 'empresa' representando o e-commerce", "entity", "empresa", 1),
      s("Adicionar Marcas", "Crie entidades 'marca' para as principais marcas vendidas", "entity", "marca", 3),
      s("Criar Categorias", "Crie entidades 'categoria' (Ex: Vestidos, Calçados, Acessórios)", "entity", "categoria", 3),
      s("Listar Produtos", "Crie pelo menos 5 entidades 'produto' com descrições", "entity", "produto", 5),
      s("Adicionar Ofertas", "Crie entidades 'oferta' para promoções ativas", "entity", "oferta", 2),
      s("Conectar Produtos a Categorias", "Use 'categorizado_em' para vincular produtos", "relation"),
      s("Conectar Produtos a Marcas", "Use 'possui_marca' para vincular", "relation"),
      s("Gerar Schema Product", "Gere Schema.org Product com preço e disponibilidade", "schema"),
      s("Gerar Schema Organization", "Gere Schema da loja com logo e contato", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "restaurante",
    name: "Restaurante / Delivery",
    description: "Grafo para restaurantes com cardápio, localização, horários e avaliações no Google.",
    goal_type: "niche_template" as const,
    icon: "UtensilsCrossed",
    color: "#f97316",
    steps: [
      s("Criar entidade do Restaurante", "Entidade 'empresa' com nome e descrição", "entity", "empresa", 1),
      s("Adicionar Localização", "Entidade 'local' com endereço e coordenadas", "entity", "local", 1),
      s("Definir Horários", "Crie entidade 'horario' com horário de funcionamento", "entity", "horario", 1),
      s("Listar Pratos/Produtos", "Crie entidades 'produto' para itens do cardápio", "entity", "produto", 5),
      s("Criar Categorias do Cardápio", "Entidades 'categoria' (Entradas, Pratos, Sobremesas)", "entity", "categoria", 3),
      s("Adicionar Avaliações", "Entidade 'avaliacao' com rating agregado", "entity", "avaliacao", 1),
      s("Conectar tudo ao Restaurante", "Crie relações de cada item ao restaurante", "relation"),
      s("Gerar Schema Restaurant", "Gere Schema.org LocalBusiness > Restaurant", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "escritorio_advocacia",
    name: "Escritório de Advocacia",
    description: "Estrutura para escritórios jurídicos com advogados, áreas de atuação e credenciais.",
    goal_type: "niche_template" as const,
    icon: "Scale",
    color: "#6366f1",
    steps: [
      s("Criar entidade do Escritório", "Entidade 'empresa' com razão social", "entity", "empresa", 1),
      s("Adicionar Advogados", "Crie entidades 'pessoa' para cada advogado", "entity", "pessoa", 2),
      s("Listar Áreas de Atuação", "Entidades 'servico' (Direito Civil, Trabalhista, etc.)", "entity", "servico", 3),
      s("Credenciais OAB", "Crie entidades 'credencial' com números da OAB", "entity", "credencial", 2),
      s("Adicionar Artigos/Publicações", "Entidades 'artigo' para conteúdo jurídico publicado", "entity", "artigo", 2),
      s("Conectar advogados ao escritório", "Relação 'trabalha_em'", "relation"),
      s("Vincular credenciais", "Relação 'possui_credencial'", "relation"),
      s("Gerar Schemas", "Gere Schema LegalService + Person + Article", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "imobiliaria",
    name: "Imobiliária / Corretor",
    description: "Grafo para imobiliárias com imóveis, localizações, agentes e avaliações.",
    goal_type: "niche_template" as const,
    icon: "Home",
    color: "#06b6d4",
    steps: [
      s("Criar entidade da Imobiliária", "Entidade 'empresa' principal", "entity", "empresa", 1),
      s("Adicionar Corretores", "Entidades 'pessoa' para agentes imobiliários", "entity", "pessoa", 2),
      s("Listar Imóveis", "Entidades 'produto' para imóveis à venda/locação", "entity", "produto", 3),
      s("Definir Bairros/Regiões", "Entidades 'local' para áreas de atuação", "entity", "local", 2),
      s("Criar Ofertas", "Entidades 'oferta' com valores e condições", "entity", "oferta", 2),
      s("Conectar imóveis a locais", "Relação 'localizado_em'", "relation"),
      s("Gerar Schema RealEstateAgent", "Schema.org para imobiliária e listagens", "schema"),
    ],
  }; })(),
];

// ────────────── SEO OBJECTIVES ──────────────
export const SEO_OBJECTIVES: GoalTemplate[] = [
  (() => { resetId(); return {
    key: "knowledge_panel",
    name: "Aparecer no Knowledge Panel",
    description: "Construa autoridade semântica suficiente para o Google gerar um Knowledge Panel da sua marca.",
    goal_type: "seo_objective" as const,
    icon: "Award",
    color: "#eab308",
    steps: [
      s("Entidade principal com descrição rica", "A empresa precisa de descrição detalhada com mais de 100 palavras", "entity", "empresa", 1),
      s("Criar pelo menos 10 entidades conectadas", "Mínimo de 10 nós no grafo para demonstrar cobertura", "entity", undefined, 10),
      s("Ter pelo menos 15 relações", "Rede densa de conexões entre entidades", "relation"),
      s("Schema Organization completo", "Gere Schema com logo, fundadores, URL, redes sociais", "schema"),
      s("Adicionar perfis sociais", "Entidades 'site' para Wikipedia, LinkedIn, redes sociais", "entity", "site", 3),
      s("Vincular fundador/CEO", "Entidade 'pessoa' conectada à empresa com 'fundado_por'", "entity", "pessoa", 1),
      s("Implementar Schema em todas as páginas", "Gere e implemente JSON-LD em pelo menos 5 páginas", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "entity_pack",
    name: "Dominar Entity Pack do Google",
    description: "Otimize para aparecer nos pacotes de entidades (carrosséis, listas) dos resultados de busca.",
    goal_type: "seo_objective" as const,
    icon: "Layers",
    color: "#8b5cf6",
    steps: [
      s("Mapear entidades do seu segmento", "Identifique todas as entidades relevantes do seu nicho", "entity", undefined, 8),
      s("Criar relações hierárquicas", "Use 'parte_de', 'categorizado_em' para criar hierarquia", "relation"),
      s("Cobrir todos os tipos de Schema", "Cada entidade deve ter Schema.org específico", "schema"),
      s("Adicionar FAQs", "Crie entidades 'faq' para perguntas frequentes do nicho", "entity", "faq", 3),
      s("Adicionar Eventos", "Se aplicável, crie eventos do nicho", "entity", "evento", 1),
      s("Gerar Schema FAQPage", "Implemente FAQPage Schema nas páginas de perguntas", "schema"),
      s("Análise de concorrentes", "Use a aba Concorrentes para identificar gaps", "custom"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "local_seo",
    name: "SEO Local Completo",
    description: "Domine a busca local com entidades geográficas, GBP otimizado e reviews estruturados.",
    goal_type: "seo_objective" as const,
    icon: "MapPin",
    color: "#f43f5e",
    steps: [
      s("Configurar entidade GBP", "Crie entidade 'gbp' vinculada ao negócio", "entity", "gbp", 1),
      s("Adicionar Endereço completo", "Entidade 'endereco' com CEP, rua, número, bairro", "entity", "endereco", 1),
      s("Coordenadas geográficas", "Entidade 'geo' com latitude/longitude", "entity", "geo", 1),
      s("Horários de funcionamento", "Entidade 'horario' detalhada por dia da semana", "entity", "horario", 1),
      s("Avaliações estruturadas", "Entidades 'rating' com notas e contagem", "entity", "rating", 1),
      s("Áreas de atendimento", "Entidades 'local' para bairros/cidades atendidas", "entity", "local", 3),
      s("Gerar Schema LocalBusiness", "Schema completo com endereço, horário, geo", "schema"),
      s("Gerar Schema GeoCoordinates", "Coordenadas no schema do negócio", "schema"),
    ],
  }; })(),
  (() => { resetId(); return {
    key: "content_authority",
    name: "Autoridade de Conteúdo",
    description: "Construa E-E-A-T (Experience, Expertise, Authoritativeness, Trust) com entidades de autor e credenciais.",
    goal_type: "seo_objective" as const,
    icon: "BookOpen",
    color: "#22c55e",
    steps: [
      s("Criar autores com biografias", "Entidades 'pessoa' com descrições ricas e credenciais", "entity", "pessoa", 2),
      s("Adicionar credenciais profissionais", "Entidades 'credencial' para certificações e formações", "entity", "credencial", 2),
      s("Criar artigos vinculados", "Entidades 'artigo' conectadas aos autores", "entity", "artigo", 5),
      s("Organizar por categorias", "Categorize artigos em temas/pilares de conteúdo", "entity", "categoria", 3),
      s("Vincular autores a artigos", "Relação 'é_autor_de' para cada publicação", "relation"),
      s("Gerar Schema Article", "Schema com author, datePublished, publisher", "schema"),
      s("Gerar Schema Person com credenciais", "Schema Person com sameAs e knowsAbout", "schema"),
    ],
  }; })(),
];

export const ALL_TEMPLATES = [...NICHE_TEMPLATES, ...SEO_OBJECTIVES];
