
# Redesign dos Planos na Landing Page + Billing Anual + Cupom com Duração

## Resumo

Redesenhar a seção de planos da Landing Page no estilo da imagem de referência (cards limpos, lista de features com checks, toggle Mensal/Anual com badge "2 meses grátis", exibição de cupom no card). Adicionar suporte a planos anuais no banco de dados e na lógica de checkout. Expandir cupons para suportar duração (ex: "desconto só no primeiro mês").

---

## 1. Banco de Dados

**Migration**: Adicionar campo `annual_price` na tabela `plans` e campo `duration` na tabela `coupons`.

```sql
-- Preço anual por plano (10 meses = 2 meses grátis)
ALTER TABLE public.plans
  ADD COLUMN annual_price numeric DEFAULT NULL,
  ADD COLUMN stripe_annual_price_id text DEFAULT NULL;

-- Duração do cupom no Stripe: "once" (1o mês), "repeating", "forever"
ALTER TABLE public.coupons
  ADD COLUMN duration text NOT NULL DEFAULT 'once',
  ADD COLUMN duration_in_months integer DEFAULT NULL;
```

Depois, atualizar os planos existentes com preço anual (10x mensal):
- Start: R$970/ano (R$97 x 10)
- Growth: R$2.970/ano (R$297 x 10)
- Pro: R$6.970/ano (R$697 x 10)
- Unlimited: R$9.970/ano (R$997 x 10)

## 2. Landing Page — Redesign da Seção de Planos

Redesenhar o componente `PricingCard` e a seção `#planos` com:

- **Toggle Mensal/Anual**: Pill toggle no topo com badge "2 meses grátis" ao lado de "Anual"
- **Layout do card** (seguindo a referência):
  - Nome do plano em violeta/destaque, com descrição curta em negrito parcial
  - Preço riscado original (ex: "de R$99 por mês por") + preço com desconto grande (quando cupom ativo ou promo)
  - Badge de cupom clicável ("Use o Cupom BEMVINDO25") quando houver cupom ativo público
  - Lista de features principal no topo (projetos, artigos/mês equivalente, keywords, membros) com ícones
  - Seção "Foco nas funcionalidades:" com checkmarks violeta e tooltip de ajuda
  - Botão CTA full-width ("Iniciar teste grátis" quando trial_days > 0)
- **Grid responsivo**: 3 colunas em desktop, stack no mobile
- Quando o toggle muda para "Anual", exibir `annual_price / 12` como preço mensal equivalente

## 3. Edge Function `create-checkout`

Atualizar para:
- Aceitar parâmetro `billingInterval: "monthly" | "annual"` no body
- Usar `stripe_price_id` ou `stripe_annual_price_id` do plano conforme o intervalo selecionado
- Passar `duration` e `duration_in_months` do cupom ao criar o Stripe coupon (ex: `duration: "repeating", duration_in_months: 1` para desconto no primeiro mês)

## 4. Admin — Cupons

Atualizar o formulário de criação de cupom em `AdminCouponsPage.tsx`:
- Adicionar campo **Duração do desconto** com opções:
  - "Apenas no primeiro mês" (`duration: "repeating"`, `duration_in_months: 1`)
  - "Para sempre" (`duration: "forever"`)
  - "Uma vez" (`duration: "once"`) — padrão atual
  - "Número de meses" (`duration: "repeating"`, campo numérico)
- Exibir a duração na tabela de cupons existentes

## 5. Admin — Plan Editor

Atualizar `PlanEditor.tsx`:
- Adicionar campo "Preço Anual (R$)" ao lado do preço mensal
- Adicionar campo "Stripe Annual Price ID" (preenchido automaticamente pelo sync)

## 6. Billing Page

Atualizar `BillingPage.tsx`:
- Adicionar o mesmo toggle Mensal/Anual
- Exibir preço anual quando selecionado
- Passar `billingInterval` ao chamar `create-checkout`

## 7. Sync Stripe (`sync-plan-stripe`)

Atualizar a Edge Function para:
- Criar/atualizar o produto com **dois preços**: mensal e anual
- Persistir `stripe_annual_price_id` na tabela de planos

---

## Detalhes Técnicos

### Arquivos a criar/modificar:

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/...` | Nova migration (annual_price, coupon duration) |
| `src/pages/LandingPage.tsx` | Redesign completo da seção #planos e PricingCard |
| `src/pages/BillingPage.tsx` | Toggle mensal/anual + passar billingInterval |
| `src/pages/admin/AdminCouponsPage.tsx` | Campo duração do cupom |
| `src/components/admin/plans/PlanEditor.tsx` | Campo preço anual |
| `supabase/functions/create-checkout/index.ts` | Suporte anual + duração cupom |
| `supabase/functions/sync-plan-stripe/index.ts` | Criar preço anual no Stripe |
| `src/hooks/use-plans.ts` | Atualizar interface Plan com novos campos |

### Estilo visual dos cards (baseado na referência):
- Fundo branco, borda sutil `border-slate-200`
- Nome do plano em uppercase, cor violeta
- Preço grande com "R$" pequeno, valor em `text-5xl font-black`
- Preço original riscado acima quando promo/cupom ativo
- Badge de cupom com borda e ícone de copiar
- Features com ícones específicos (blog, sparkles, search, users)
- Checkmarks violeta na lista de funcionalidades
- Botão CTA violeta/gradiente full-width com border-radius generoso
