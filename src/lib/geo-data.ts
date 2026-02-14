// Country, city, and timezone data for autocomplete

export interface Country {
  code: string;
  name: string;
  timezones: { city: string; tz: string }[];
}

export const COUNTRIES_DATA: Country[] = [
  {
    code: "BR", name: "Brasil",
    timezones: [
      { city: "São Paulo", tz: "America/Sao_Paulo" },
      { city: "Rio de Janeiro", tz: "America/Sao_Paulo" },
      { city: "Belo Horizonte", tz: "America/Sao_Paulo" },
      { city: "Curitiba", tz: "America/Sao_Paulo" },
      { city: "Porto Alegre", tz: "America/Sao_Paulo" },
      { city: "Salvador", tz: "America/Bahia" },
      { city: "Recife", tz: "America/Recife" },
      { city: "Fortaleza", tz: "America/Fortaleza" },
      { city: "Brasília", tz: "America/Sao_Paulo" },
      { city: "Florianópolis", tz: "America/Sao_Paulo" },
      { city: "Goiânia", tz: "America/Sao_Paulo" },
      { city: "Manaus", tz: "America/Manaus" },
      { city: "Belém", tz: "America/Belem" },
      { city: "Campinas", tz: "America/Sao_Paulo" },
      { city: "Vitória", tz: "America/Sao_Paulo" },
      { city: "Natal", tz: "America/Fortaleza" },
      { city: "Maceió", tz: "America/Maceio" },
      { city: "João Pessoa", tz: "America/Fortaleza" },
      { city: "Campo Grande", tz: "America/Campo_Grande" },
      { city: "Cuiabá", tz: "America/Cuiaba" },
      { city: "Teresina", tz: "America/Fortaleza" },
      { city: "São Luís", tz: "America/Fortaleza" },
      { city: "Aracaju", tz: "America/Maceio" },
      { city: "Joinville", tz: "America/Sao_Paulo" },
      { city: "Londrina", tz: "America/Sao_Paulo" },
      { city: "Uberlândia", tz: "America/Sao_Paulo" },
      { city: "Ribeirão Preto", tz: "America/Sao_Paulo" },
      { city: "Sorocaba", tz: "America/Sao_Paulo" },
      { city: "Santos", tz: "America/Sao_Paulo" },
      { city: "Blumenau", tz: "America/Sao_Paulo" },
      { city: "Balneário Camboriú", tz: "America/Sao_Paulo" },
      { city: "Maringá", tz: "America/Sao_Paulo" },
      { city: "Niterói", tz: "America/Sao_Paulo" },
      { city: "Porto Velho", tz: "America/Porto_Velho" },
      { city: "Rio Branco", tz: "America/Rio_Branco" },
      { city: "Macapá", tz: "America/Belem" },
      { city: "Boa Vista", tz: "America/Boa_Vista" },
      { city: "Palmas", tz: "America/Sao_Paulo" },
    ],
  },
  {
    code: "US", name: "Estados Unidos",
    timezones: [
      { city: "New York", tz: "America/New_York" },
      { city: "Los Angeles", tz: "America/Los_Angeles" },
      { city: "Chicago", tz: "America/Chicago" },
      { city: "Houston", tz: "America/Chicago" },
      { city: "Miami", tz: "America/New_York" },
      { city: "San Francisco", tz: "America/Los_Angeles" },
      { city: "Seattle", tz: "America/Los_Angeles" },
      { city: "Denver", tz: "America/Denver" },
      { city: "Phoenix", tz: "America/Phoenix" },
      { city: "Dallas", tz: "America/Chicago" },
      { city: "Atlanta", tz: "America/New_York" },
      { city: "Boston", tz: "America/New_York" },
    ],
  },
  {
    code: "PT", name: "Portugal",
    timezones: [
      { city: "Lisboa", tz: "Europe/Lisbon" },
      { city: "Porto", tz: "Europe/Lisbon" },
      { city: "Braga", tz: "Europe/Lisbon" },
      { city: "Coimbra", tz: "Europe/Lisbon" },
      { city: "Faro", tz: "Europe/Lisbon" },
      { city: "Funchal", tz: "Atlantic/Madeira" },
    ],
  },
  {
    code: "ES", name: "Espanha",
    timezones: [
      { city: "Madrid", tz: "Europe/Madrid" },
      { city: "Barcelona", tz: "Europe/Madrid" },
      { city: "Valencia", tz: "Europe/Madrid" },
      { city: "Sevilla", tz: "Europe/Madrid" },
      { city: "Bilbao", tz: "Europe/Madrid" },
      { city: "Las Palmas", tz: "Atlantic/Canary" },
    ],
  },
  {
    code: "UK", name: "Reino Unido",
    timezones: [
      { city: "Londres", tz: "Europe/London" },
      { city: "Manchester", tz: "Europe/London" },
      { city: "Birmingham", tz: "Europe/London" },
      { city: "Edinburgh", tz: "Europe/London" },
      { city: "Glasgow", tz: "Europe/London" },
    ],
  },
  {
    code: "DE", name: "Alemanha",
    timezones: [
      { city: "Berlim", tz: "Europe/Berlin" },
      { city: "Munique", tz: "Europe/Berlin" },
      { city: "Frankfurt", tz: "Europe/Berlin" },
      { city: "Hamburgo", tz: "Europe/Berlin" },
      { city: "Colônia", tz: "Europe/Berlin" },
    ],
  },
  {
    code: "FR", name: "França",
    timezones: [
      { city: "Paris", tz: "Europe/Paris" },
      { city: "Lyon", tz: "Europe/Paris" },
      { city: "Marselha", tz: "Europe/Paris" },
      { city: "Nice", tz: "Europe/Paris" },
      { city: "Toulouse", tz: "Europe/Paris" },
    ],
  },
  {
    code: "MX", name: "México",
    timezones: [
      { city: "Cidade do México", tz: "America/Mexico_City" },
      { city: "Guadalajara", tz: "America/Mexico_City" },
      { city: "Monterrey", tz: "America/Monterrey" },
      { city: "Cancún", tz: "America/Cancun" },
      { city: "Tijuana", tz: "America/Tijuana" },
    ],
  },
  {
    code: "AR", name: "Argentina",
    timezones: [
      { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
      { city: "Córdoba", tz: "America/Argentina/Cordoba" },
      { city: "Rosário", tz: "America/Argentina/Buenos_Aires" },
      { city: "Mendoza", tz: "America/Argentina/Mendoza" },
    ],
  },
  {
    code: "CO", name: "Colômbia",
    timezones: [
      { city: "Bogotá", tz: "America/Bogota" },
      { city: "Medellín", tz: "America/Bogota" },
      { city: "Cali", tz: "America/Bogota" },
      { city: "Barranquilla", tz: "America/Bogota" },
    ],
  },
  {
    code: "CL", name: "Chile",
    timezones: [
      { city: "Santiago", tz: "America/Santiago" },
      { city: "Valparaíso", tz: "America/Santiago" },
      { city: "Concepción", tz: "America/Santiago" },
    ],
  },
  {
    code: "IT", name: "Itália",
    timezones: [
      { city: "Roma", tz: "Europe/Rome" },
      { city: "Milão", tz: "Europe/Rome" },
      { city: "Nápoles", tz: "Europe/Rome" },
      { city: "Turim", tz: "Europe/Rome" },
    ],
  },
];

export function getTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value || tz;
  } catch {
    return tz;
  }
}
