import { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GitBranch, Play, ArrowRight, ArrowDown, Loader2, CheckCircle2,
  Download, Copy, Bell, Send, Mail, MessageCircle, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { streamChatToCompletion } from "@/lib/stream-chat";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownContent } from "@/components/ai-agent/AgentChatTab";
import { WorkflowNotificationConfig } from "@/components/ai-agent/WorkflowNotificationConfig";
import { useQuery } from "@tanstack/react-query";

interface WorkflowStep {
  agent: string;
  emoji: string;
  action: string;
  prompt: string;
}

interface PresetWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

const PRESET_WORKFLOWS: PresetWorkflow[] = [
  {
    id: "seo-full-analysis",
    name: "Análise SEO Completa",
    description: "SEO → Analytics → Growth → Relatório",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Analisa posições e keywords", prompt: "Analise todas as posições de keywords do projeto. Identifique top 10 oportunidades de crescimento (keywords em posição 4-20 com alto volume). Liste problemas de CTR abaixo do benchmark. Use os dados REAIS do projeto." },
      { agent: "Agente Analytics", emoji: "📊", action: "Cruza com dados de tráfego", prompt: "Com base na análise SEO do passo anterior, cruze os dados de tráfego orgânico com as landing pages. Identifique quais páginas têm melhor conversão e quais têm bounce rate alto. Use dados REAIS." },
      { agent: "Agente Growth", emoji: "🚀", action: "Gera estratégia priorizada", prompt: "Com base nas análises de SEO e Analytics dos passos anteriores, crie um plano de ação priorizado pelo framework ICE (Impacto × Confiança × Facilidade). Top 5 ações com ROI estimado." },
      { agent: "Relatório", emoji: "📄", action: "Compila relatório executivo", prompt: "Compile TUDO dos passos anteriores em um relatório executivo completo: Resumo Executivo (3 bullets), Métricas-chave, Top 5 Ações Prioritárias com responsável e deadline, Previsão de Impacto para 30 dias." },
    ],
  },
  {
    id: "content-decay-alert",
    name: "Alerta de Decay de Conteúdo",
    description: "Detecta quedas → Analisa causa → Correções → Notifica",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Monitora quedas de posição", prompt: "Identifique todas as páginas que perderam posições significativas (3+ posições). Liste URL, keyword, posição anterior vs atual e volume de busca." },
      { agent: "Agente Analytics", emoji: "📊", action: "Analisa impacto no tráfego", prompt: "Calcule o impacto em tráfego orgânico das quedas identificadas no passo anterior. Identifique correlação com mudanças no bounce rate." },
      { agent: "Agente Growth", emoji: "🚀", action: "Plano de recuperação", prompt: "Crie um plano urgente de recuperação para cada página em decay identificada: atualização de conteúdo, otimização de title/meta, internal linking e timeline." },
      { agent: "Notificador", emoji: "📱", action: "Resume para notificação", prompt: "Gere resumo compacto de todo o workflow para envio via notificação: páginas afetadas, impacto estimado e ações prioritárias em formato bullet point." },
    ],
  },
  {
    id: "weekly-report",
    name: "Relatório Semanal Automático",
    description: "Métricas → Comparação → Insights → Resumo",
    steps: [
      { agent: "Agente Analytics", emoji: "📊", action: "Coleta métricas da semana", prompt: "Relatório semanal: sessões, usuários, bounce rate, top sources, top landing pages. Compare com semana anterior, destaque variações >10%." },
      { agent: "Agente SEO", emoji: "🔍", action: "Evolução de keywords", prompt: "Relatório semanal SEO: evolução top 20 keywords, novas no top 10, saíram do top 10, evolução de cliques orgânicos." },
      { agent: "Agente Growth", emoji: "🚀", action: "Identifica tendências", prompt: "Com base nos dados dos passos anteriores, identifique 3 tendências positivas e 3 riscos. Sugira 3 ações para próxima semana com impacto estimado." },
      { agent: "Notificador", emoji: "📱", action: "Newsletter semanal", prompt: "Compile tudo em formato newsletter profissional: Destaque da Semana, Métricas-chave (↑↓), Top 3 Wins, Top 3 Ações Próxima Semana." },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Pipeline de Indexação",
    description: "Descobre → Prioriza → Indexa → Reporta",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Descobre URLs não indexadas", prompt: "Liste todas as URLs não indexadas ou com problemas de cobertura. Classifique por prioridade baseado no potencial de tráfego." },
      { agent: "Agente Analytics", emoji: "📊", action: "Prioriza por potencial", prompt: "Estime o potencial de tráfego de cada URL não indexada do passo anterior: keywords-alvo, volume, concorrência. Crie ranking de prioridade." },
      { agent: "Agente SEO", emoji: "⚡", action: "Prepara indexação", prompt: "Para as URLs priorizadas, verifique: robots.txt permite? Canonical correto? Conteúdo pronto? Liste as prontas para submissão." },
      { agent: "Notificador", emoji: "📱", action: "Reporta resultado", prompt: "Resumo completo do pipeline: URLs identificadas, priorizadas, prontas para submissão, e próximos passos concretos." },
    ],
  },
  // ── NEW WORKFLOWS ──
  {
    id: "competitor-spy",
    name: "Espionagem de Concorrentes",
    description: "Keywords concorrentes → Gaps → Oportunidades → Plano",
    steps: [
      { agent: "Agente SEO", emoji: "🕵️", action: "Mapeia keywords dos concorrentes", prompt: "Analise as keywords do projeto e identifique queries onde os concorrentes estão ranqueando e nós não. Liste as top 20 oportunidades de keywords com volume e dificuldade." },
      { agent: "Agente Analytics", emoji: "📊", action: "Estima potencial de tráfego", prompt: "Para cada keyword-gap identificada, estime o tráfego potencial caso consigamos rankear no top 3. Calcule o valor estimado desse tráfego." },
      { agent: "Agente Growth", emoji: "🚀", action: "Plano de ataque", prompt: "Crie um plano de conteúdo para conquistar as keywords dos concorrentes: tipo de conteúdo, word count estimado, internal links necessários e timeline." },
      { agent: "Notificador", emoji: "📱", action: "Resume oportunidades", prompt: "Gere um resumo executivo: Top 10 keywords para atacar, potencial de tráfego total e plano de ação resumido." },
    ],
  },
  {
    id: "ctr-optimization",
    name: "Otimização de CTR",
    description: "Identifica baixo CTR → Analisa títulos → Sugere melhorias",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Detecta CTR abaixo do benchmark", prompt: "Identifique todas as páginas com CTR abaixo do esperado para sua posição (ex: posição 1-3 com CTR <5%). Liste URL, keyword, posição, CTR atual e impressões." },
      { agent: "Agente Growth", emoji: "✍️", action: "Sugere novos títulos e metas", prompt: "Para cada página com CTR baixo, sugira 3 variações de title tag e meta description otimizadas para clique. Use gatilhos emocionais, números e power words." },
      { agent: "Notificador", emoji: "📱", action: "Lista de otimizações", prompt: "Compile uma lista prática de ação: URL, título atual vs sugerido, meta description sugerida. Formato fácil de copiar e implementar." },
    ],
  },
  {
    id: "traffic-drop-diagnostic",
    name: "Diagnóstico de Queda de Tráfego",
    description: "Detecta queda → Identifica causa → Plano de recuperação",
    steps: [
      { agent: "Agente Analytics", emoji: "📉", action: "Detecta quedas de tráfego", prompt: "Compare o tráfego dos últimos 7 dias com os 7 dias anteriores. Identifique quedas significativas por canal, landing page, device e localização." },
      { agent: "Agente SEO", emoji: "🔍", action: "Investiga causas SEO", prompt: "Para as páginas com queda de tráfego, verifique: perdas de posição, problemas de indexação, mudanças no SERP, cannibalization. Identifique a causa raiz." },
      { agent: "Agente Growth", emoji: "🚑", action: "Plano de recuperação urgente", prompt: "Crie um plano de emergência priorizado: ações imediatas (24h), curto prazo (1 semana) e médio prazo (30 dias) para recuperar o tráfego perdido." },
      { agent: "Notificador", emoji: "🚨", action: "Alerta de queda", prompt: "Gere um alerta conciso: páginas afetadas, impacto estimado em sessões/receita, causa provável e ações urgentes. Formato de alerta." },
    ],
  },
  {
    id: "conversion-funnel",
    name: "Análise de Funil de Conversão",
    description: "Mapeia funil → Identifica gargalos → Otimizações",
    steps: [
      { agent: "Agente Analytics", emoji: "📊", action: "Mapeia funil de conversão", prompt: "Analise o funil completo: landing pages → engajamento → conversão. Identifique taxa de conversão por canal, device e landing page. Destaque os gargalos." },
      { agent: "Agente SEO", emoji: "🔍", action: "Qualidade do tráfego orgânico", prompt: "Avalie a qualidade do tráfego orgânico: quais keywords trazem tráfego que converte vs tráfego que bounça? Identifique mismatch de intenção de busca." },
      { agent: "Agente Growth", emoji: "🎯", action: "Otimizações de conversão", prompt: "Sugira otimizações: melhorias em landing pages, ajuste de keywords-alvo, CTAs mais eficazes, e estimativa de impacto na conversão." },
      { agent: "Notificador", emoji: "📱", action: "Resumo do funil", prompt: "Resumo executivo do funil: taxas atuais, gargalos identificados, top 5 ações para melhorar conversão com impacto estimado." },
    ],
  },
  {
    id: "monthly-executive",
    name: "Relatório Mensal Executivo",
    description: "Dados → Comparação → ROI → Apresentação",
    steps: [
      { agent: "Agente Analytics", emoji: "📊", action: "Coleta métricas do mês", prompt: "Relatório mensal completo: sessões, usuários, receita, conversões, bounce rate, tempo no site. Compare com mês anterior E mesmo mês do ano passado. Destaque tendências." },
      { agent: "Agente SEO", emoji: "🔍", action: "Performance SEO mensal", prompt: "Evolução mensal SEO: total de keywords no top 10, top 100, novos rankings, rankings perdidos, cliques e impressões totais. Compare MoM e YoY." },
      { agent: "Agente Growth", emoji: "💰", action: "Calcula ROI e projeções", prompt: "Calcule o ROI do investimento em SEO: valor do tráfego orgânico, crescimento acumulado, projeção para próximos 3 meses baseado na tendência atual." },
      { agent: "Relatório", emoji: "📄", action: "Relatório executivo formatado", prompt: "Compile um relatório executivo profissional com: Dashboard de KPIs, Destaques do Mês, Comparação MoM, Top 10 Wins, Desafios, Plano para Próximo Mês." },
    ],
  },
  {
    id: "technical-seo-audit",
    name: "Auditoria Técnica SEO",
    description: "Crawl → Problemas técnicos → Priorização → Fixes",
    steps: [
      { agent: "Agente SEO", emoji: "🔧", action: "Identifica problemas técnicos", prompt: "Faça uma auditoria técnica: páginas com erro de indexação, canonical incorreto, robots.txt bloqueando, sitemap desatualizado, páginas lentas. Use dados do projeto." },
      { agent: "Agente Analytics", emoji: "📊", action: "Impacto dos problemas", prompt: "Para cada problema técnico identificado, calcule o impacto: quantas sessões/cliques estão sendo perdidos? Qual o potencial de recuperação?" },
      { agent: "Agente Growth", emoji: "⚡", action: "Prioriza correções", prompt: "Crie um backlog priorizado de correções técnicas usando ICE Score. Inclua complexidade de implementação e impacto esperado para cada fix." },
      { agent: "Notificador", emoji: "📱", action: "Lista de fixes", prompt: "Gere uma lista de ação prática: problema, URL afetada, fix necessário, prioridade. Formato checklist." },
    ],
  },
  {
    id: "keyword-cannibalization",
    name: "Detecção de Canibalização",
    description: "Detecta → Analisa impacto → Resolve → Monitora",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Detecta canibalização", prompt: "Identifique todas as keywords onde múltiplas URLs do projeto competem entre si. Liste keyword, URLs envolvidas, posição de cada uma e volume." },
      { agent: "Agente Analytics", emoji: "📊", action: "Analisa impacto", prompt: "Para cada caso de canibalização, analise: qual URL tem melhor performance? Qual deveria ser a canônica? Quanto tráfego está sendo desperdiçado?" },
      { agent: "Agente Growth", emoji: "🎯", action: "Plano de resolução", prompt: "Para cada caso, recomende: consolidar conteúdo, redirecionar, ou diferenciar. Inclua template de canonical e redirect map." },
    ],
  },
  {
    id: "local-seo-check",
    name: "Checkup SEO Local",
    description: "NAP → Keywords locais → Google Business → Ações",
    steps: [
      { agent: "Agente SEO", emoji: "📍", action: "Analisa presença local", prompt: "Analise a performance em keywords locais: posições para termos com localização, presença em 'perto de mim', destaque URLs com foco local do projeto." },
      { agent: "Agente Analytics", emoji: "📊", action: "Tráfego por região", prompt: "Analise o tráfego por cidade/estado: de onde vêm os visitantes? Há concentração? Compare com keywords locais que estamos ranqueando." },
      { agent: "Agente Growth", emoji: "🚀", action: "Estratégia local", prompt: "Crie plano de SEO local: otimizações de páginas existentes, novas páginas de localidade sugeridas, schema markup recomendado, e ações de link building local." },
    ],
  },
  {
    id: "link-profile-analysis",
    name: "Análise de Perfil de Links",
    description: "Links → Qualidade → Oportunidades → Estratégia",
    steps: [
      { agent: "Agente SEO", emoji: "🔗", action: "Mapeia perfil de links", prompt: "Analise o perfil de links do projeto: total de links internos e externos, distribuição por página, páginas órfãs (sem links internos), anchor texts mais usados." },
      { agent: "Agente Growth", emoji: "🎯", action: "Identifica oportunidades", prompt: "Identifique: páginas importantes sem links suficientes, oportunidades de internal linking, páginas com link juice desperdiçado. Sugira uma estratégia de siloing." },
      { agent: "Notificador", emoji: "📱", action: "Plano de links", prompt: "Resumo: estado atual do perfil de links, top 10 ações de internal linking para implementar imediatamente, e estratégia de longo prazo." },
    ],
  },
  {
    id: "content-gap-finder",
    name: "Descoberta de Gaps de Conteúdo",
    description: "Analisa cobertura → Identifica gaps → Plano editorial",
    steps: [
      { agent: "Agente SEO", emoji: "🔍", action: "Analisa cobertura de tópicos", prompt: "Analise as keywords atuais e identifique clusters temáticos não cobertos pelo site. Quais tópicos relacionados ao nicho não têm conteúdo? Liste com volume e dificuldade." },
      { agent: "Agente Analytics", emoji: "📊", action: "Valida com dados de busca", prompt: "Para os gaps identificados, valide: há demanda real? Qual o volume combinado? Qual o potencial de tráfego se ranquearmos? Compare com tópicos já cobertos." },
      { agent: "Agente Growth", emoji: "📝", action: "Cria calendário editorial", prompt: "Monte um calendário editorial de 30 dias: qual conteúdo criar, keyword-alvo, tipo de conteúdo (artigo/landing/FAQ), word count sugerido e prioridade." },
      { agent: "Notificador", emoji: "📱", action: "Resumo do plano", prompt: "Resumo: total de gaps encontrados, potencial de tráfego, calendário das próximas 4 semanas com um conteúdo prioritário por semana." },
    ],
  },
  {
    id: "mobile-performance",
    name: "Auditoria Mobile",
    description: "Performance mobile → Comparação desktop → Otimizações",
    steps: [
      { agent: "Agente Analytics", emoji: "📱", action: "Analisa métricas mobile", prompt: "Compare a performance mobile vs desktop: sessões, bounce rate, tempo no site, conversões. Identifique páginas com pior experiência mobile (alto bounce, baixo tempo)." },
      { agent: "Agente SEO", emoji: "🔍", action: "Rankings mobile", prompt: "Compare posições mobile vs desktop para as top keywords. Identifique discrepâncias significativas. Verifique se o site tem problemas de mobile-first indexing." },
      { agent: "Agente Growth", emoji: "⚡", action: "Otimizações mobile", prompt: "Crie um plano de otimização mobile: melhorias de UX, velocidade, layout responsivo. Priorize as páginas com maior impacto potencial. Estime ganho de conversão." },
    ],
  },
  {
    id: "seasonal-planner",
    name: "Planejamento Sazonal",
    description: "Tendências → Sazonalidade → Calendário → Preparação",
    steps: [
      { agent: "Agente SEO", emoji: "📅", action: "Identifica padrões sazonais", prompt: "Analise os dados históricos de keywords e identifique padrões sazonais: quais keywords têm picos em quais meses? Liste as oportunidades sazonais dos próximos 90 dias." },
      { agent: "Agente Analytics", emoji: "📊", action: "Histórico de tráfego sazonal", prompt: "Analise o tráfego histórico por mês: identifique meses de pico e vale. Correlacione com eventos, feriados e sazonalidade do nicho." },
      { agent: "Agente Growth", emoji: "🗓️", action: "Calendário de preparação", prompt: "Crie um calendário de preparação: que conteúdo criar/atualizar antes de cada pico sazonal, com antecedência de quanto tempo, e impacto esperado." },
    ],
  },
  {
    id: "roi-calculator",
    name: "Calculadora de ROI SEO",
    description: "Investimento → Valor do tráfego → ROI → Projeção",
    steps: [
      { agent: "Agente Analytics", emoji: "💰", action: "Valor do tráfego orgânico", prompt: "Calcule o valor do tráfego orgânico atual: use o CPC médio das keywords ranqueadas × cliques para estimar quanto custaria este tráfego via ads. Total mensal e acumulado." },
      { agent: "Agente SEO", emoji: "📈", action: "Crescimento e potencial", prompt: "Analise a curva de crescimento: taxa de crescimento mensal de tráfego orgânico, projeção linear para 6 e 12 meses, e potencial não explorado (keywords 4-20)." },
      { agent: "Agente Growth", emoji: "🏦", action: "Relatório de ROI", prompt: "Compile relatório de ROI: valor atual do tráfego, crescimento MoM, projeção de valor para próximos 12 meses, comparação com custo de ads equivalente." },
    ],
  },
  {
    id: "quick-wins",
    name: "Quick Wins Semanais",
    description: "Detecta → Prioriza → Ações rápidas → Notifica",
    steps: [
      { agent: "Agente SEO", emoji: "⚡", action: "Encontra quick wins", prompt: "Identifique quick wins: keywords em posição 4-10 (quase top 3), páginas com alto impressões mas baixo clique, keywords com alta intenção comercial perto do top 3." },
      { agent: "Agente Growth", emoji: "🎯", action: "Prioriza por facilidade", prompt: "Dos quick wins identificados, priorize os 5 mais fáceis de implementar: otimização de title, adição de FAQ, melhoria de conteúdo. Tempo estimado de implementação." },
      { agent: "Notificador", emoji: "📱", action: "To-do semanal", prompt: "Gere um to-do list semanal: 5 ações rápidas com URL, o que fazer e impacto estimado. Formato prático e direto." },
    ],
  },
  {
    id: "brand-monitoring",
    name: "Monitoramento de Marca",
    description: "Keywords de marca → Reputação → Alertas",
    steps: [
      { agent: "Agente SEO", emoji: "🏷️", action: "Analisa buscas de marca", prompt: "Analise todas as keywords de marca: variações do nome, marca + produto, marca + reclamação. Verifique posições e se há resultados negativos aparecendo." },
      { agent: "Agente Analytics", emoji: "📊", action: "Tráfego de marca", prompt: "Analise o tráfego de marca vs não-marca: proporção, tendência de crescimento, landing pages de entrada para buscas de marca. A marca está crescendo?" },
      { agent: "Notificador", emoji: "📱", action: "Status da marca", prompt: "Resumo: saúde da marca na busca, alertas de resultados negativos, tendência de buscas de marca, e ações recomendadas." },
    ],
  },
  {
    id: "pagespeed-report",
    name: "Relatório de Velocidade",
    description: "Performance → Core Web Vitals → Impacto → Fixes",
    steps: [
      { agent: "Agente SEO", emoji: "🏎️", action: "Analisa velocidade", prompt: "Liste as top 20 landing pages do projeto e avalie: tempo de carregamento estimado baseado nos dados de crawl, problemas de indexação que podem indicar lentidão, páginas com alto bounce rate que podem ter problemas de velocidade." },
      { agent: "Agente Analytics", emoji: "📊", action: "Correlação velocidade x métricas", prompt: "Correlacione as métricas de engajamento (bounce rate, tempo no site, conversão) com as landing pages. Identifique páginas com pior experiência do usuário." },
      { agent: "Agente Growth", emoji: "⚡", action: "Plano de otimização", prompt: "Crie um plano de otimização de velocidade priorizado: quais páginas otimizar primeiro baseado no impacto em tráfego e conversões. Sugira melhorias genéricas (compressão, cache, lazy loading)." },
    ],
  },
  {
    id: "ecommerce-seo",
    name: "SEO para E-commerce",
    description: "Categorias → Produtos → Schema → Resultados",
    steps: [
      { agent: "Agente SEO", emoji: "🛒", action: "Audita páginas de produto", prompt: "Analise as páginas de produto/categoria do site: titles, descriptions, schema Product, breadcrumbs, canonical. Identifique problemas e oportunidades." },
      { agent: "Agente Analytics", emoji: "📊", action: "Performance por categoria", prompt: "Analise tráfego e conversão por landing page de produto/categoria. Identifique as categorias com melhor e pior performance." },
      { agent: "Agente Growth", emoji: "🎯", action: "Otimizações de produto", prompt: "Crie um plano de otimização para páginas de produto: schema markup, rich snippets, reviews, FAQ, internal linking entre produtos relacionados." },
    ],
  },
  {
    id: "featured-snippets",
    name: "Conquista de Featured Snippets",
    description: "Identifica → Formata → Otimiza → Monitora",
    steps: [
      { agent: "Agente SEO", emoji: "⭐", action: "Identifica oportunidades de snippet", prompt: "Identifique keywords do projeto em posição 1-5 que têm featured snippets. Analise o formato atual do snippet (parágrafo, lista, tabela) e se nosso conteúdo está formatado para conquistá-lo." },
      { agent: "Agente Growth", emoji: "📝", action: "Formata conteúdo para snippets", prompt: "Para cada oportunidade, sugira a formatação ideal do conteúdo: parágrafos concisos de 40-60 palavras, listas ordenadas, tabelas comparativas. Forneça exemplos prontos." },
      { agent: "Notificador", emoji: "📱", action: "Lista de otimizações", prompt: "Resumo prático: top 10 oportunidades de featured snippet com URL, keyword, formato necessário e exemplo de conteúdo otimizado." },
    ],
  },
  {
    id: "site-architecture",
    name: "Arquitetura do Site",
    description: "Estrutura → Siloing → Internal Links → Melhorias",
    steps: [
      { agent: "Agente SEO", emoji: "🏗️", action: "Mapeia arquitetura atual", prompt: "Analise a estrutura do site: profundidade de cliques, distribuição de URLs por nível, páginas órfãs, estrutura de categorias e silos temáticos." },
      { agent: "Agente Analytics", emoji: "📊", action: "Fluxo de navegação", prompt: "Analise o fluxo de navegação dos usuários: páginas de entrada, caminhos mais comuns, páginas de saída. Identifique onde os usuários se perdem." },
      { agent: "Agente Growth", emoji: "🔧", action: "Plano de reestruturação", prompt: "Sugira melhorias na arquitetura: reorganização de silos, hub pages, breadcrumbs otimizados, mega menu, e redistribuição de link equity." },
    ],
  },
  {
    id: "international-expansion",
    name: "Expansão Internacional",
    description: "Mercados → Keywords locais → Hreflang → Plano",
    steps: [
      { agent: "Agente SEO", emoji: "🌍", action: "Analisa potencial internacional", prompt: "Identifique keywords do projeto com volume significativo em outros países/idiomas. Liste os mercados com maior potencial de expansão." },
      { agent: "Agente Analytics", emoji: "📊", action: "Tráfego por país", prompt: "Analise o tráfego atual por país: de onde vêm visitantes internacionais? Há demanda não atendida? Compare engagement por localização." },
      { agent: "Agente Growth", emoji: "🚀", action: "Plano de internacionalização", prompt: "Crie um roadmap de expansão: prioridade de mercados, estratégia de URLs (subdiretório vs subdomínio), implementação de hreflang e localização de conteúdo." },
    ],
  },
  {
    id: "ai-seo-readiness",
    name: "Prontidão para AI Search",
    description: "AI Overview → Citações → Otimização → Futuro",
    steps: [
      { agent: "Agente SEO", emoji: "🤖", action: "Analisa presença em AI Overviews", prompt: "Avalie como o site aparece em buscas com AI Overview do Google: keywords afetadas, páginas citadas, impacto no CTR. Identifique riscos e oportunidades." },
      { agent: "Agente Growth", emoji: "🧠", action: "Estratégia para AI Search", prompt: "Crie uma estratégia de otimização para AI Search: conteúdo E-E-A-T, structured data, citabilidade, authority building. Como se posicionar para ser citado pelas IAs." },
      { agent: "Notificador", emoji: "📱", action: "Plano de adaptação", prompt: "Resumo: impacto atual da AI Search no projeto, top 5 ações para se adaptar, e métricas para monitorar a transição." },
    ],
  },
  {
    id: "penalty-check",
    name: "Verificação de Penalidades",
    description: "Sinais → Diagnóstico → Recuperação → Monitoramento",
    steps: [
      { agent: "Agente SEO", emoji: "⚠️", action: "Detecta sinais de penalidade", prompt: "Verifique sinais de penalidade manual ou algorítmica: quedas bruscas de tráfego, páginas desindexadas, padrões suspeitos no perfil de links, conteúdo duplicado." },
      { agent: "Agente Analytics", emoji: "📊", action: "Timeline de impacto", prompt: "Crie uma timeline correlacionando quedas de tráfego com datas de updates do Google. Identifique se há correlação com Helpful Content, Core Updates ou Spam Updates." },
      { agent: "Agente Growth", emoji: "🔄", action: "Plano de recuperação", prompt: "Se houver indícios de penalidade: plano de recuperação com disavow, remoção de conteúdo thin, melhoria de E-E-A-T e timeline de recuperação esperada." },
    ],
  },
];

const STEP_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  "Agente SEO": { border: "border-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
  "Agente Analytics": { border: "border-amber-500/50", bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/20" },
  "Agente Growth": { border: "border-emerald-500/50", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  "Relatório": { border: "border-purple-500/50", bg: "bg-purple-500/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
  "Notificador": { border: "border-pink-500/50", bg: "bg-pink-500/10", text: "text-pink-400", glow: "shadow-pink-500/20" },
};

function getStepColor(agent: string) {
  return STEP_COLORS[agent] || { border: "border-border", bg: "bg-muted/50", text: "text-muted-foreground", glow: "" };
}

interface AgentWorkflowsProps {
  onExecuteWorkflow?: (workflowName: string, steps: WorkflowStep[]) => void;
  projectId?: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "14", label: "Últimos 14 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export function AgentWorkflows({ onExecuteWorkflow, projectId }: AgentWorkflowsProps) {
  const [activeWorkflows, setActiveWorkflows] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("rankito_active_workflows");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const [executingWorkflow, setExecutingWorkflow] = useState<PresetWorkflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepResults, setStepResults] = useState<Record<number, string>>({});
  const [stepStreaming, setStepStreaming] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const [notifyWorkflowId, setNotifyWorkflowId] = useState<string | null>(null);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState("30");

  // Fetch schedule configs to show indicators
  const { data: schedules = [] } = useQuery({
    queryKey: ["workflow-schedules-list", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("workflow_schedules")
        .select("workflow_id, enabled, notify_email, notify_whatsapp, schedule_time, schedule_days")
        .eq("project_id", projectId);
      return data || [];
    },
    enabled: !!projectId,
  });

  const toggleWorkflow = (id: string) => {
    setActiveWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("rankito_active_workflows", JSON.stringify([...next]));
      return next;
    });
  };

  // Auto-execute ALL steps sequentially
  const executeWorkflow = useCallback(async (workflow: PresetWorkflow) => {
    if (isRunning) return;
    setExecutingWorkflow(workflow);
    setCurrentStepIndex(-1);
    setStepResults({});
    setStepStreaming("");
    setIsRunning(true);
    abortRef.current = false;

    const results: Record<number, string> = {};

    for (let i = 0; i < workflow.steps.length; i++) {
      if (abortRef.current) break;

      const step = workflow.steps[i];
      setCurrentStepIndex(i);
      setStepStreaming("");

      // Build context from ALL previous steps
      const previousContext = Object.entries(results)
        .map(([idx, result]) => `=== RESULTADO DO PASSO ${Number(idx) + 1} (${workflow.steps[Number(idx)].agent}) ===\n${result}`)
        .join("\n\n");

      const periodInstruction = `PERÍODO DE ANÁLISE: Use dados dos últimos ${analysisPeriod} dias para todas as comparações e métricas.\n\n`;

      const fullPrompt = previousContext
        ? `${periodInstruction}CONTEXTO ACUMULADO DOS PASSOS ANTERIORES:\n${previousContext}\n\n---\n\nAGORA EXECUTE O PASSO ${i + 1} (${step.agent}):\n${step.prompt}`
        : `${periodInstruction}${step.prompt}`;

      try {
        console.log(`[Workflow] Step ${i + 1}/${workflow.steps.length}: ${step.agent}, projectId: ${projectId}`);
        const result = await streamChatToCompletion({
          prompt: fullPrompt,
          agentName: step.agent,
          agentInstructions: `Você é o ${step.agent}, parte de um workflow automatizado chamado "${workflow.name}".

REGRA FUNDAMENTAL: Você TEM acesso aos dados REAIS do projeto via contexto do sistema. USE-OS.
- NÃO diga "não tenho acesso aos dados" — os dados estão no contexto do sistema
- NÃO invente dados fictícios — use APENAS os dados reais fornecidos
- Cite URLs, keywords, métricas e números EXATOS do projeto
- Se um dado específico não estiver disponível, diga claramente qual dado falta

Execute EXATAMENTE o que é pedido. Seja específico, acionável e detalhado.`,
          projectId,
          onDelta: (text) => setStepStreaming(text),
        });

        results[i] = result;
        setStepResults(prev => ({ ...prev, [i]: result }));
        setStepStreaming("");
      } catch (err: any) {
        results[i] = `❌ Erro: ${err.message}`;
        setStepResults(prev => ({ ...prev, [i]: `❌ Erro: ${err.message}` }));
        setStepStreaming("");
        toast.error(`Erro no passo ${i + 1}: ${err.message}`);
        break;
      }
    }

    setIsRunning(false);
    if (!abortRef.current) {
      toast.success(`Workflow "${workflow.name}" concluído! ✅`);

      // Save to agent_action_history if we have results
      const fullReport = Object.entries(results)
        .map(([idx, result]) => `## Passo ${Number(idx) + 1}: ${workflow.steps[Number(idx)].agent}\n${result}`)
        .join("\n\n---\n\n");

      // Try to save - won't fail if no agents exist
      try {
        const { data: agents } = await supabase
          .from("ai_agents")
          .select("id")
          .eq("project_id", projectId || "")
          .limit(1);

        if (agents?.[0] && projectId) {
          await supabase.from("agent_action_history").insert({
            agent_id: agents[0].id,
            project_id: projectId,
            action_type: `Workflow: ${workflow.name}`,
            action_detail: fullReport.substring(0, 5000),
          });
        }
      } catch { /* silent */ }

      // Send notifications if configured
      if (projectId) {
        try {
          const { data: sched } = await supabase
            .from("workflow_schedules")
            .select("id, notify_email, notify_whatsapp")
            .eq("workflow_id", workflow.id)
            .eq("project_id", projectId)
            .maybeSingle();

          if (sched && (sched.notify_email || sched.notify_whatsapp)) {
            const notifResp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workflow-notification`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  schedule_id: sched.id,
                  report: fullReport,
                  workflow_name: workflow.name,
                }),
              }
            );
            if (notifResp.ok) {
              toast.success("Notificações enviadas! 📩");
            }
          }
        } catch { /* silent */ }
      }
    }
  }, [isRunning, projectId]);

  const closeCanvas = () => {
    abortRef.current = true;
    setExecutingWorkflow(null);
    setCurrentStepIndex(-1);
    setStepResults({});
    setStepStreaming("");
    setIsRunning(false);
    setShowSendForm(false);
    setSendSuccess(false);
    setSendEmail("");
    setSendPhone("");
  };

  const copyAllResults = () => {
    if (!executingWorkflow) return;
    const full = Object.entries(stepResults)
      .map(([idx, r]) => `## ${executingWorkflow.steps[Number(idx)].agent}\n${r}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(full);
    toast.success("Relatório copiado!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Workflows de Agentes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fluxos automatizados que encadeiam agentes — ative e execute
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Período de análise:</Label>
          <Select value={analysisPeriod} onValueChange={setAnalysisPeriod}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRESET_WORKFLOWS.map((workflow) => {
          const isActive = activeWorkflows.has(workflow.id);
          return (
            <Card key={workflow.id} className={cn(
              "p-4 space-y-3 transition-all duration-300",
              isActive && "ring-1 ring-primary/30 shadow-md"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{workflow.name}</h4>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-[9px]">
                      {isActive ? "Ativo" : "Preset"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{workflow.description}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={() => toggleWorkflow(workflow.id)} />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {workflow.steps.map((step, i) => {
                  const c = getStepColor(step.agent);
                  return (
                    <div key={i} className="flex items-center gap-1 flex-shrink-0">
                      <div className={cn("px-2.5 py-1.5 rounded-lg border text-[10px] font-medium flex items-center gap-1.5", c.border, c.bg)}>
                        <span>{step.emoji}</span>
                        <span className="max-w-[100px] truncate">{step.action}</span>
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {isActive && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => executeWorkflow(workflow)}
                    disabled={isRunning}
                  >
                    {isRunning && executingWorkflow?.id === workflow.id
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Executando...</>
                      : <><Play className="h-3 w-3" /> Executar Agora</>
                    }
                  </Button>
                  {projectId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 px-2.5"
                      onClick={() => setNotifyWorkflowId(workflow.id)}
                    >
                      <Bell className={cn(
                        "h-3 w-3",
                        schedules.find(s => s.workflow_id === workflow.id && s.enabled) && "text-primary"
                      )} />
                    </Button>
                  )}
                </div>
              )}
              {/* Schedule indicator */}
              {(() => {
                const sched = schedules.find(s => s.workflow_id === workflow.id && s.enabled);
                if (!sched) return null;
                const dayLabels = (sched.schedule_days || []).map((d: number) => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d]).join(", ");
                return (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Bell className="h-3 w-3 text-primary" />
                    <span>{dayLabels} às {(sched.schedule_time as string)?.substring(0, 5)}</span>
                    {sched.notify_email && <span>📧</span>}
                    {sched.notify_whatsapp && <span>💬</span>}
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>

      {/* EXECUTION CANVAS */}
      <Dialog open={!!executingWorkflow} onOpenChange={(o) => { if (!o && !isRunning) closeCanvas(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-5 w-5 text-primary" />
              {executingWorkflow?.name}
              <Badge variant={isRunning ? "default" : "outline"} className="text-[10px] ml-2">
                {isRunning
                  ? `Executando passo ${currentStepIndex + 1}/${executingWorkflow?.steps.length}`
                  : Object.keys(stepResults).length === executingWorkflow?.steps.length
                    ? "Concluído ✅"
                    : "Preparando..."}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {executingWorkflow?.steps.map((step, i) => {
              const c = getStepColor(step.agent);
              const isDone = !!stepResults[i];
              const isCurrent = i === currentStepIndex && !isDone;
              const isWaiting = i > currentStepIndex;

              return (
                <div key={i}>
                  <div className={cn(
                    "rounded-xl border-2 p-4 transition-all duration-500",
                    isDone ? "border-green-500/40 bg-green-500/5" :
                    isCurrent ? cn(c.border, c.bg, "shadow-lg", c.glow) :
                    cn("border-border bg-muted/20", isWaiting && "opacity-40")
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
                        isDone ? "bg-green-500/20" : c.bg
                      )}>
                        {isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                         isCurrent ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> :
                         <span>{step.emoji}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{step.agent}</span>
                          <Badge variant="outline" className={cn("text-[9px]", isDone ? "text-green-500" : c.text)}>
                            Passo {i + 1}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{step.action}</p>
                      </div>
                    </div>

                    {/* Live streaming text */}
                    {isCurrent && stepStreaming && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border max-h-[250px] overflow-y-auto scrollbar-thin">
                        <div className="text-xs">
                          <MarkdownContent content={stepStreaming} className="[&_table]:text-[10px] [&_th]:px-2 [&_td]:px-2" />
                        </div>
                      </div>
                    )}

                    {isCurrent && !stepStreaming && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span>{step.agent} está analisando os dados do projeto...</span>
                        </div>
                      </div>
                    )}

                    {/* Completed result */}
                    {isDone && stepResults[i] && (
                      <div className="mt-3 p-3 rounded-lg bg-card border border-border max-h-[250px] overflow-y-auto scrollbar-thin">
                        <div className="text-xs">
                          <MarkdownContent content={stepResults[i]} className="[&_table]:text-[10px] [&_th]:px-2 [&_td]:px-2" />
                        </div>
                      </div>
                    )}
                  </div>

                  {i < executingWorkflow.steps.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className={cn(
                        "h-4 w-4",
                        isDone ? "text-green-500" : "text-muted-foreground/20"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Success overlay */}
          {sendSuccess && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm">
              <div className="text-center space-y-3 animate-in fade-in zoom-in duration-300">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Relatório enviado com sucesso! 📩</h3>
                <p className="text-sm text-muted-foreground">As notificações foram disparadas.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={closeCanvas}>
                  Fechar
                </Button>
              </div>
            </div>
          )}

          <div className="border-t border-border px-6 py-3 bg-muted/20 space-y-3">
            {/* Inline send form */}
            {showSendForm && !isRunning && !sendSuccess && (
              <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Send className="h-3.5 w-3.5 text-primary" />
                  Enviar relatório agora
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> WhatsApp (com DDI)
                    </Label>
                    <Input
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value)}
                      placeholder="+5511999999999"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <Input
                      value={sendEmail}
                      onChange={(e) => setSendEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="text-xs h-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowSendForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs gap-1.5"
                    disabled={isSending || (!sendPhone.trim() && !sendEmail.trim())}
                    onClick={async () => {
                      if (!executingWorkflow || !projectId) return;
                      const phones = sendPhone.split(",").map(p => p.trim()).filter(Boolean);
                      const emails = sendEmail.split(",").map(e => e.trim()).filter(Boolean);
                      if (phones.length === 0 && emails.length === 0) {
                        toast.warning("Informe pelo menos um telefone ou email");
                        return;
                      }
                      setIsSending(true);
                      const fullReport = Object.entries(stepResults)
                        .map(([idx, r]) => `## ${executingWorkflow.steps[Number(idx)].agent}\n${r}`)
                        .join("\n\n---\n\n");
                      try {
                        const res = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workflow-notification`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                            },
                            body: JSON.stringify({
                              report: fullReport,
                              workflow_name: executingWorkflow.name,
                              direct_send: {
                                project_id: projectId,
                                workflow_id: executingWorkflow.id,
                                phones,
                                emails,
                              },
                            }),
                          }
                        );
                        if (res.ok) {
                          setSendSuccess(true);
                          setShowSendForm(false);
                        } else {
                          const err = await res.json();
                          toast.error(`Erro: ${err.error || "Falha ao enviar"}`);
                        }
                      } catch (e: any) {
                        toast.error(`Erro: ${e.message}`);
                      } finally {
                        setIsSending(false);
                      }
                    }}
                  >
                    {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {isSending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">
                {Object.keys(stepResults).length} de {executingWorkflow?.steps.length} passos concluídos
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {!isRunning && Object.keys(stepResults).length === executingWorkflow?.steps.length && !showSendForm && !sendSuccess && (
                  <>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={copyAllResults}>
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs gap-1.5"
                      onClick={() => setShowSendForm(true)}
                    >
                      <Send className="h-3 w-3" /> Enviar Agora
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        if (!executingWorkflow) return;
                        setNotifyWorkflowId(executingWorkflow.id);
                      }}
                    >
                      <Bell className="h-3 w-3" /> Agendar
                    </Button>
                  </>
                )}
                {!isRunning && Object.keys(stepResults).length > 0 && Object.keys(stepResults).length < (executingWorkflow?.steps.length || 0) && (
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={copyAllResults}>
                    <Copy className="h-3 w-3" /> Copiar Relatório
                  </Button>
                )}
                {!sendSuccess && (
                  <Button
                    size="sm"
                    variant={isRunning ? "destructive" : "outline"}
                    className="text-xs"
                    onClick={closeCanvas}
                  >
                    {isRunning ? "Cancelar" : "Fechar"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Config Dialog */}
      {notifyWorkflowId && projectId && (
        <WorkflowNotificationConfig
          open={!!notifyWorkflowId}
          onOpenChange={(open) => !open && setNotifyWorkflowId(null)}
          workflowId={notifyWorkflowId}
          workflowName={PRESET_WORKFLOWS.find(w => w.id === notifyWorkflowId)?.name || "Workflow"}
          projectId={projectId}
        />
      )}
    </div>
  );
}
