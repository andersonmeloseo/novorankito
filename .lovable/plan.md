
# Sistema de Análise de SEO On-Page com DataForSEO

## O que é possível fazer

A API On-Page da DataForSEO permite analisar qualquer domínio ou URL e identificar mais de 60 problemas técnicos de SEO. Ela funciona de forma assíncrona: você envia um domínio para crawl, e depois recupera os resultados.

## O que será construído

Uma nova aba "On-Page" dentro do módulo de SEO existente (`/seo#onpage`), com:

### Dashboard de Auditoria
- Score de saúde do site (0-100) com breakdown por categorias
- Cards de KPI: páginas rastreadas, erros críticos, avisos, URLs aprovadas
- Botão para iniciar nova auditoria do domínio do projeto

### Aba de Páginas
- Tabela de todas as páginas rastreadas com status de cada check:
  - Meta title/description (ausente, duplicado, tamanho)
  - H1/H2 (ausente, duplicado)
  - Imagens sem alt
  - Links quebrados
  - Tempo de carregamento
  - Status HTTP

### Aba de Recursos
- Lista de recursos com problemas (imagens, scripts, CSS)
- Identificação de recursos pesados ou quebrados

### Aba de Links Internos
- Mapa de links internos e externos do site
- Identificação de redirect chains

### Aba de Conteúdo Duplicado
- Detecção de páginas com title/description duplicados
- Análise de similaridade de conteúdo

## Arquitetura Técnica

### Banco de dados (novas tabelas)

```text
onpage_audits
  id, project_id, task_id (dataforseo), domain, status,
  crawl_progress, pages_crawled, pages_total,
  summary (jsonb), started_at, completed_at

onpage_pages
  id, audit_id, project_id, url, status_code,
  checks (jsonb), meta_title, meta_description,
  h1, page_score, load_time, created_at
```

### Credenciais
A DataForSEO usa autenticação Basic Auth (login + senha). Precisará:
- `DATAFORSEO_LOGIN` — email do login DataForSEO
- `DATAFORSEO_PASSWORD` — senha da conta

### Edge Functions (backend)

1. **`dataforseo-onpage-start`** — Inicia o crawl de um domínio:
   - Recebe `project_id`, busca o domínio do projeto
   - Faz POST para `https://api.dataforseo.com/v3/on_page/task_post`
   - Salva o `task_id` retornado na tabela `onpage_audits`

2. **`dataforseo-onpage-poll`** — Verifica status e coleta resultados:
   - Chama o endpoint `/summary` com o `task_id`
   - Quando crawl completo, busca os `/pages` e salva em `onpage_pages`
   - Atualiza o status da auditoria

3. **`dataforseo-onpage-pages`** — Busca páginas paginadas de uma auditoria

### Frontend

- **Novo componente**: `src/components/seo/OnPageAuditTab.tsx`
- **Nova aba** adicionada ao `SeoPage.tsx` com hash `#onpage`
- **Polling automático**: quando auditoria está em andamento, consulta o status a cada 10 segundos
- Usa os mesmos padrões visuais do projeto (cards, tables, badges de status)

## Fluxo de uso

```text
Usuário clica "Iniciar Auditoria"
    → Edge Function inicia task no DataForSEO
    → Status: "em andamento" com barra de progresso
    → Polling a cada 10s verifica o progresso
    → Quando 100%: resultados exibidos em tabelas
    → Próxima auditoria fica salva no histórico
```

## Pré-requisitos para o usuário

O usuário precisa ter uma conta na DataForSEO (tem plano gratuito de teste via Sandbox). As credenciais serão armazenadas de forma segura como secrets do backend.

## Escopo dos arquivos

- Nova migração SQL (2 tabelas + RLS)
- 3 novas Edge Functions
- 1 novo componente React (`OnPageAuditTab.tsx`)
- Modificação em `SeoPage.tsx` (adicionar aba)
- `supabase/config.toml` (registrar novas funções)
