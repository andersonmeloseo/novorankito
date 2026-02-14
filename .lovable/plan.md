

## Corrigir Erro de Importação de URLs Duplicadas

### Problema
Ao tentar importar as URLs do sitemap, o sistema retorna erro porque já existem URLs importadas anteriormente para o mesmo projeto. A tabela `site_urls` tem uma constraint única em `(project_id, url)`, o que impede duplicatas.

### Solução
Alterar a lógica de inserção para usar **upsert** (INSERT ... ON CONFLICT DO NOTHING) em vez de INSERT simples. Assim, URLs já existentes são ignoradas e apenas as novas são adicionadas.

### Detalhes Técnicos

**Arquivo:** `src/pages/Onboarding.tsx`

Na função `saveUrlsToDb` (linha ~407), trocar:
```typescript
const { error } = await supabase.from("site_urls").insert(chunk);
```
por:
```typescript
const { error } = await supabase.from("site_urls").upsert(chunk, { onConflict: "project_id,url", ignoreDuplicates: true });
```

Isso faz com que URLs duplicadas sejam simplesmente ignoradas sem gerar erro, permitindo reimportar o sitemap quantas vezes quiser.
