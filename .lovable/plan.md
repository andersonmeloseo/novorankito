
# Funil de Compra SaaS — Correções Implementadas

## Fluxo Atual (Corrigido)

Landing (Planos) → /login?plan=slug → Signup → Stripe Checkout → /checkout-success → /onboarding

## Mudanças Realizadas

### 1. ProtectedRoute.tsx
- **TODAS** as rotas protegidas agora exigem assinatura ativa
- Rotas isentas: /checkout-success, /account/billing, /account/profile
- Grace period de 5 minutos via localStorage após checkout (para cobrir delay do Stripe)
- Redirect para /account/billing (não mais /landing)

### 2. Login.tsx
- Usuário já logado é redirecionado: com sub → /projects, sem sub → /account/billing
- Signup sem plano → /account/billing com mensagem "Escolha um plano"
- Signup com plano → Stripe Checkout direto
- Login → redirect automático baseado em subscription status

### 3. CheckoutSuccessPage.tsx
- Seta flag `checkout_completed_at` no localStorage imediatamente
- Polling mais agressivo (3 tentativas + 15s timeout)
- Auto-confirma quando subscription.subscribed muda para true

### 4. App.tsx
- /account/billing e /account/profile movidos para fora do AppLayout (acessíveis sem sidebar)
- Dentro do ProtectedRoute (requer login, mas billing é isento de sub check)

## Pendente (Requer Configuração Stripe)
- Webhook Stripe para processamento em tempo real de eventos
- Isso requer configurar o endpoint no dashboard do Stripe
