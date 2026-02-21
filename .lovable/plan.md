
# Destaque para "Comandos CEO" e "Chat Equipe"

## Problema
O painel de "Comandos CEO" e "Chat Equipe" esta escondido dentro de um painel lateral que so aparece quando o usuario clica no botao de expandir (Maximize2). Por padrao, o painel inicia colapsado (`expanded = false`), e mesmo quando visivel, as abas no modo colapsado sao minusculas (6px de altura, texto de 10px).

## Solucao

### 1. Botao flutuante no canvas (FAB)
Adicionar um botao flutuante fixo no canto inferior-direito do canvas do ReactFlow (usando `<Panel position="bottom-right">`) com destaque visual:
- Icone Brain + texto "Comandos CEO"
- Gradiente roxo/primario com efeito glow (alinhado com a identidade visual neon do sistema)
- Badge pulsante para chamar atencao
- Ao clicar, abre o painel lateral automaticamente (`setExpanded(true)`) e foca na aba "cmd"

### 2. Painel lateral inicia expandido por padrao
Mudar o estado inicial de `expanded` de `false` para `true`, para que o usuario ja veja as abas ao entrar na War Room.

### 3. Tabs com mais destaque visual (modo colapsado)
No modo colapsado, melhorar a visibilidade das tabs:
- Aumentar altura de h-6 para h-8
- Aumentar texto de 10px para 11px
- Adicionar borda e cor de fundo primaria na aba ativa
- Adicionar um indicador pulsante (dot) na aba "Comandos CEO"

## Detalhes tecnicos

**Arquivo:** `src/components/ai-agent/canvas/TeamWarRoom.tsx`

**Mudanca 1 — Estado inicial expandido (linha 1777):**
```tsx
const [expanded, setExpanded] = useState(true); // era false
```

**Mudanca 2 — Botao flutuante no canvas (apos linha ~2658, dentro do ReactFlow):**
```tsx
<Panel position="bottom-right">
  <button
    onClick={() => setExpanded(true)}
    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 border border-violet-400/50 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all cursor-pointer group"
  >
    <Brain className="h-4 w-4 text-white" />
    <span className="text-xs font-bold text-white">Comandos CEO</span>
    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
  </button>
</Panel>
```

**Mudanca 3 — Tabs colapsadas com mais destaque (linhas ~2889-2897):**
Aumentar tamanho, adicionar cores e indicador visual nas tabs do modo colapsado.
