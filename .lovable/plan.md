
# Dropdown de Seleção de Projeto na Sidebar

## Problema Atual
O botão "Projeto Ativo" na sidebar faz `navigate("/projects")` — uma navegação de página inteira. O usuário quer que ele abra um **dropdown** direto na sidebar, listando os projetos disponíveis para troca rápida e com a opção de criar um novo.

## Solução

Transformar o botão simples em um componente com dropdown usando o `DropdownMenu` do Radix UI (já instalado no projeto).

### Comportamento do Dropdown
- **Trigger**: clica no botão "Projeto Ativo" → abre dropdown
- **Lista de projetos**: mostra todos os projetos do usuário com um indicador visual do projeto ativo
- **Seleção**: clicar num projeto seta `rankito_current_project` no localStorage e navega para `/overview`
- **Ver todos**: link para `/projects`
- **Novo Projeto**: navega para `/onboarding?new=1`

### Aparência

```text
┌─────────────────────────────────┐
│ ● Meu Site Principal     ▼      │  ← trigger (estado atual)
└─────────────────────────────────┘
         ↓ ao clicar
┌─────────────────────────────────┐
│  ✓  Meu Site Principal          │  ← ativo (check mark)
│     Site Secundário             │
│     Agência XYZ                 │
│  ─────────────────────────────  │
│     Ver todos os projetos →     │
│  +  Novo Projeto                │
└─────────────────────────────────┘
```

### Detalhes Técnicos

**Arquivo**: `src/components/layout/AppSidebar.tsx`

1. **Imports adicionados**:
   - `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` de `@/components/ui/dropdown-menu`
   - `Check` de `lucide-react`

2. **Substituição do botão simples** (linhas 259-269) por:
   ```tsx
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <button className="...mesmo estilo atual...">
         <div className="flex items-center gap-2 min-w-0">
           <div className="h-2 w-2 rounded-full bg-success ..." />
           <span className="truncate">{activeProject.name}</span>
         </div>
         <ChevronDown className="h-3 w-3 ..." />
       </button>
     </DropdownMenuTrigger>
     <DropdownMenuContent side="bottom" align="start" className="w-56 z-50">
       {projects.map(p => (
         <DropdownMenuItem key={p.id} onClick={() => switchProject(p.id)}>
           <Check className={cn("h-3.5 w-3.5 mr-2", p.id !== activeProject?.id && "invisible")} />
           <span className="truncate">{p.name}</span>
         </DropdownMenuItem>
       ))}
       <DropdownMenuSeparator />
       <DropdownMenuItem onClick={() => navigate("/projects")}>
         <FolderOpen className="h-3.5 w-3.5 mr-2" /> Ver todos os projetos
       </DropdownMenuItem>
       <DropdownMenuItem onClick={() => navigate("/onboarding?new=1")}>
         <Plus className="h-3.5 w-3.5 mr-2" /> Novo Projeto
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
   ```

3. **Função `switchProject`** adicionada dentro do componente `AppSidebar`:
   ```ts
   const switchProject = (id: string) => {
     localStorage.setItem("rankito_current_project", id);
     navigate("/overview");
     window.location.reload(); // força o re-carregamento do projeto ativo
   };
   ```
   > Ou melhor: disparar um evento customizado que o contexto já escuta — sem reload. A ser verificado com o padrão existente no projeto.

## Escopo
- Apenas `src/components/layout/AppSidebar.tsx` precisa ser editado
- Nenhuma migração de banco de dados necessária
- Nenhuma nova dependência necessária
