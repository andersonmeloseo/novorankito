/**
 * Valuation Engine — calcula valor estimado de ativos digitais
 * baseado em tráfego, leads, CPC do nicho, conversão e receita atual.
 */

// CPC médio estimado por nicho (USD)
const NICHE_CPC: Record<string, number> = {
  pavers: 8.50,
  roofing: 12.00,
  plumbing: 9.50,
  hvac: 11.00,
  landscaping: 5.80,
  dental: 7.20,
  legal: 15.00,
  real_estate: 6.50,
  insurance: 14.00,
  home_services: 7.00,
  auto_repair: 5.50,
  cleaning: 4.80,
  pest_control: 6.20,
  electrician: 8.00,
  painting: 5.00,
  default: 6.00,
};

export interface ValuationInput {
  traffic: number;
  leads: number;
  conversions: number;
  niche?: string | null;
  location?: string | null;
  currentMonthlyRevenue?: number;
}

export interface ValuationResult {
  estimatedMonthlyValue: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  trafficValue: number;
  leadValue: number;
  conversionPotential: number;
  cpcUsed: number;
  multiplier: number;
}

export function calculateValuation(input: ValuationInput): ValuationResult {
  const cpc = NICHE_CPC[(input.niche || "default").toLowerCase().replace(/\s+/g, "_")] || NICHE_CPC.default;
  
  // Traffic value: what it would cost to buy this traffic via ads
  const trafficValue = input.traffic * cpc * 0.3; // 30% of CPC (organic value discount)
  
  // Lead value: estimated value per lead based on niche CPC
  const cpl = cpc * 3.5; // Cost per lead multiplier
  const leadValue = input.leads * cpl;
  
  // Conversion potential: leads * avg conversion rate * estimated deal value
  const avgDealValue = cpc * 50; // rough estimate
  const conversionPotential = input.conversions * avgDealValue * 0.1;
  
  // Base monthly value (weighted average)
  const baseValue = (trafficValue * 0.2) + (leadValue * 0.5) + (conversionPotential * 0.3);
  
  // Multiplier based on data quality
  let multiplier = 1.0;
  if (input.leads > 20) multiplier += 0.15;
  if (input.traffic > 500) multiplier += 0.1;
  if (input.conversions > 5) multiplier += 0.1;
  if (input.currentMonthlyRevenue && input.currentMonthlyRevenue > 0) multiplier += 0.1;
  
  const estimatedMonthlyValue = Math.round(baseValue * multiplier);
  const suggestedMinPrice = Math.round(estimatedMonthlyValue * 0.7);
  const suggestedMaxPrice = Math.round(estimatedMonthlyValue * 1.3);
  
  return {
    estimatedMonthlyValue,
    suggestedMinPrice,
    suggestedMaxPrice,
    trafficValue: Math.round(trafficValue),
    leadValue: Math.round(leadValue),
    conversionPotential: Math.round(conversionPotential),
    cpcUsed: cpc,
    multiplier,
  };
}

/**
 * Calcula o patrimônio digital total (valor de todos os ativos)
 * usando um múltiplo da receita anual + valor base de tráfego
 */
export function calculatePortfolioValue(
  totalMonthlyRevenue: number,
  totalTrafficValue: number,
  totalAssets: number
): number {
  // Portfolio = receita anual * múltiplo (2.5x-4x) + traffic value baseline
  const revenueMultiple = 3;
  const annualRevenue = totalMonthlyRevenue * 12;
  const portfolioFromRevenue = annualRevenue * revenueMultiple;
  const portfolioFromTraffic = totalTrafficValue * 12 * 0.5;
  
  return Math.round(portfolioFromRevenue + portfolioFromTraffic);
}

export function getNicheCPC(niche: string): number {
  return NICHE_CPC[niche.toLowerCase().replace(/\s+/g, "_")] || NICHE_CPC.default;
}

export const AVAILABLE_NICHES = Object.keys(NICHE_CPC).filter(n => n !== "default").map(n => ({
  value: n,
  label: n.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
}));
