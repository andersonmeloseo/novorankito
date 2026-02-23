

# Correção do toast "Verifique seu e-mail"

## Problema

Na `src/pages/Login.tsx`, linha ~136, existe este código:

```text
// If no plan or checkout failed, show confirmation message
toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
```

Este toast **sempre executa** após o signup, mesmo quando o checkout funciona, porque:
1. `window.location.href = data.url` nao impede a execucao imediata das linhas seguintes
2. O toast aparece antes do redirect acontecer

O auto-confirm de e-mail JA esta ativo (comprovado pelo response do signup mostrando `email_confirmed_at` preenchido). O problema e puramente o texto errado no codigo.

## Solucao

### Arquivo: `src/pages/Login.tsx`

1. Remover o toast "Verifique seu e-mail para confirmar" que aparece apos o bloco de checkout
2. Reorganizar a logica para que:
   - Se tem plano com `stripe_price_id` e o redirect funcionou: nao mostra nenhum toast extra (o `return` ja cuida disso)
   - Se tem plano mas o checkout falhou: mostra toast de erro e redireciona para `/onboarding`
   - Se nao tem plano selecionado: mostra "Conta criada!" e redireciona para `/onboarding`

### Mudanca especifica (linhas ~126-137):

Substituir:
```text
} catch (err: any) {
  console.error("Checkout redirect error:", err);
  toast({ title: "Erro ao redirecionar para pagamento", description: err.message, variant: "destructive" });
}

// If no plan or checkout failed, show confirmation message
toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
```

Por:
```text
} catch (err: any) {
  console.error("Checkout redirect error:", err);
  toast({ title: "Erro ao redirecionar para pagamento", description: err.message, variant: "destructive" });
  navigate("/onboarding");
}
} else {
  toast({ title: "Conta criada!" });
  navigate("/onboarding");
}
```

Isso garante que:
- Com plano + checkout OK: redireciona para Stripe (ja funciona)
- Com plano + checkout falhou: vai para onboarding com mensagem de erro
- Sem plano: vai para onboarding
- **Nenhuma mensagem de verificacao de e-mail aparece**

## Resultado

Fluxo limpo: **Cadastro -> Stripe Checkout -> Pagamento -> checkout-success -> Onboarding**

