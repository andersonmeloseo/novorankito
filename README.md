# Rankito

Projeto Rankito - Sistema de ranking e avaliação.

## Descrição

Este é um projeto desenvolvido com React e Vite para gerenciamento de rankings e avaliações.

## Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool rápido e moderno
- **TypeScript** - Superset JavaScript com tipagem estática
- **PM2** - Process Manager para produção

## Estrutura do Projeto

```
rankito/
├── src/           # Código fonte
├── dist/          # Build de produção
├── logs/          # Logs da aplicação
├── ecosystem.config.cjs  # Configuração PM2
└── package.json   # Dependências e scripts
```

## Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da aplicação
npm run preview
```

## Deploy em Produção

O projeto está configurado para rodar em produção com PM2:

```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.cjs

# Ver status
pm2 status

# Ver logs
pm2 logs rankito
```

## Configuração do Servidor

- **Porta**: Configurada no Vite
- **Ambiente**: production
- **Restart Automático**: Ativado
- **Logs**: Salvos em `./logs/`

## Desenvolvimento

Para contribuir com o projeto:

1. Faça fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## Licença

MIT License
## Deploy Test sex 20 fev 2026 17:27:21 -03
