/**
 * Bot detection utility.
 * Identifies known crawlers, scrapers, and AI bots from user-agent / browser strings.
 */

export interface BotInfo {
  isBot: boolean;
  botName: string | null;
  botCategory: "search" | "ai" | "social" | "monitoring" | "other" | null;
  botEmoji: string | null;
}

interface BotPattern {
  pattern: RegExp;
  name: string;
  category: BotInfo["botCategory"];
  emoji: string;
}

const BOT_PATTERNS: BotPattern[] = [
  // Search engine bots
  { pattern: /googlebot/i, name: "Googlebot", category: "search", emoji: "🔍" },
  { pattern: /google\s?web\s?preview/i, name: "Google Preview", category: "search", emoji: "🔍" },
  { pattern: /google-inspectiontool/i, name: "Google Inspection", category: "search", emoji: "🔍" },
  { pattern: /adsbot-google/i, name: "Google Ads Bot", category: "search", emoji: "📢" },
  { pattern: /mediapartners-google/i, name: "Google AdSense", category: "search", emoji: "📢" },
  { pattern: /google-safety/i, name: "Google Safety", category: "search", emoji: "🛡️" },
  { pattern: /storebot-google/i, name: "Google StoreBot", category: "search", emoji: "🛒" },
  { pattern: /google-extended/i, name: "Google Extended", category: "ai", emoji: "🤖" },
  { pattern: /bingbot/i, name: "Bingbot", category: "search", emoji: "🔎" },
  { pattern: /msnbot/i, name: "MSNBot", category: "search", emoji: "🔎" },
  { pattern: /bingpreview/i, name: "Bing Preview", category: "search", emoji: "🔎" },
  { pattern: /yandexbot/i, name: "YandexBot", category: "search", emoji: "🔍" },
  { pattern: /baiduspider/i, name: "Baidu Spider", category: "search", emoji: "🕷️" },
  { pattern: /duckduckbot/i, name: "DuckDuckBot", category: "search", emoji: "🦆" },
  { pattern: /slurp/i, name: "Yahoo Slurp", category: "search", emoji: "🔍" },
  { pattern: /sogou/i, name: "Sogou Spider", category: "search", emoji: "🕷️" },
  { pattern: /exabot/i, name: "ExaBot", category: "search", emoji: "🔍" },
  { pattern: /applebot/i, name: "AppleBot", category: "search", emoji: "🍎" },
  { pattern: /naverbot|yeti/i, name: "NaverBot", category: "search", emoji: "🔍" },

  // AI bots
  { pattern: /chatgpt-user/i, name: "ChatGPT", category: "ai", emoji: "🤖" },
  { pattern: /gptbot/i, name: "GPTBot (OpenAI)", category: "ai", emoji: "🤖" },
  { pattern: /oai-searchbot/i, name: "OpenAI Search", category: "ai", emoji: "🤖" },
  { pattern: /claude-web/i, name: "ClaudeBot", category: "ai", emoji: "🤖" },
  { pattern: /claudebot/i, name: "ClaudeBot", category: "ai", emoji: "🤖" },
  { pattern: /anthropic-ai/i, name: "Anthropic AI", category: "ai", emoji: "🤖" },
  { pattern: /perplexitybot/i, name: "PerplexityBot", category: "ai", emoji: "🤖" },
  { pattern: /cohere-ai/i, name: "Cohere AI", category: "ai", emoji: "🤖" },
  { pattern: /meta-externalagent/i, name: "Meta AI", category: "ai", emoji: "🤖" },
  { pattern: /bytespider/i, name: "ByteSpider (TikTok)", category: "ai", emoji: "🤖" },
  { pattern: /ccbot/i, name: "CCBot (Common Crawl)", category: "ai", emoji: "🤖" },
  { pattern: /diffbot/i, name: "Diffbot", category: "ai", emoji: "🤖" },
  { pattern: /friendlycrawler/i, name: "Friendly Crawler", category: "ai", emoji: "🤖" },
  { pattern: /omgili/i, name: "Omgili Bot", category: "ai", emoji: "🤖" },
  { pattern: /youbot/i, name: "You.com Bot", category: "ai", emoji: "🤖" },

  // Social media bots
  { pattern: /facebookexternalhit/i, name: "Facebook Bot", category: "social", emoji: "📘" },
  { pattern: /facebot/i, name: "Facebook Bot", category: "social", emoji: "📘" },
  { pattern: /twitterbot/i, name: "Twitter/X Bot", category: "social", emoji: "🐦" },
  { pattern: /linkedinbot/i, name: "LinkedIn Bot", category: "social", emoji: "💼" },
  { pattern: /pinterest/i, name: "Pinterest Bot", category: "social", emoji: "📌" },
  { pattern: /telegrambot/i, name: "Telegram Bot", category: "social", emoji: "✈️" },
  { pattern: /whatsapp/i, name: "WhatsApp Bot", category: "social", emoji: "💬" },
  { pattern: /slackbot/i, name: "Slack Bot", category: "social", emoji: "💬" },
  { pattern: /discordbot/i, name: "Discord Bot", category: "social", emoji: "🎮" },

  // Monitoring & SEO tools
  { pattern: /semrushbot/i, name: "SEMrush Bot", category: "monitoring", emoji: "📊" },
  { pattern: /ahrefsbot/i, name: "Ahrefs Bot", category: "monitoring", emoji: "📊" },
  { pattern: /mj12bot/i, name: "Majestic Bot", category: "monitoring", emoji: "📊" },
  { pattern: /dotbot/i, name: "Moz DotBot", category: "monitoring", emoji: "📊" },
  { pattern: /screaming\s?frog/i, name: "Screaming Frog", category: "monitoring", emoji: "🐸" },
  { pattern: /uptimerobot/i, name: "UptimeRobot", category: "monitoring", emoji: "⏱️" },
  { pattern: /pingdom/i, name: "Pingdom", category: "monitoring", emoji: "⏱️" },
  { pattern: /datadog/i, name: "Datadog", category: "monitoring", emoji: "🐕" },
  { pattern: /gtmetrix/i, name: "GTmetrix", category: "monitoring", emoji: "⚡" },

  // Generic bot patterns (keep last – lower priority)
  { pattern: /bot[\/\s;)]/i, name: "Bot Genérico", category: "other", emoji: "🤖" },
  { pattern: /crawler/i, name: "Crawler Genérico", category: "other", emoji: "🕷️" },
  { pattern: /spider/i, name: "Spider Genérico", category: "other", emoji: "🕷️" },
  { pattern: /headless/i, name: "Headless Browser", category: "other", emoji: "👻" },
  { pattern: /phantom/i, name: "PhantomJS", category: "other", emoji: "👻" },
  { pattern: /selenium/i, name: "Selenium", category: "other", emoji: "🔬" },
  { pattern: /puppeteer/i, name: "Puppeteer", category: "other", emoji: "🎭" },
  { pattern: /playwright/i, name: "Playwright", category: "other", emoji: "🎭" },
];

/**
 * Detect if a user-agent or browser string belongs to a known bot.
 * Pass any combination of browser name and user-agent.
 */
export function detectBot(browser?: string | null, userAgent?: string | null): BotInfo {
  const haystack = `${browser || ""} ${userAgent || ""}`.trim();
  if (!haystack) return { isBot: false, botName: null, botCategory: null, botEmoji: null };

  for (const bp of BOT_PATTERNS) {
    if (bp.pattern.test(haystack)) {
      return { isBot: true, botName: bp.name, botCategory: bp.category, botEmoji: bp.emoji };
    }
  }

  return { isBot: false, botName: null, botCategory: null, botEmoji: null };
}

/** Category labels in Portuguese */
export const BOT_CATEGORY_LABELS: Record<string, string> = {
  search: "Buscador",
  ai: "IA / LLM",
  social: "Rede Social",
  monitoring: "Monitoramento",
  other: "Outro",
};

/** Badge color classes per category */
export const BOT_CATEGORY_STYLES: Record<string, string> = {
  search: "bg-info/15 text-info border-info/30",
  ai: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  social: "bg-primary/15 text-primary border-primary/30",
  monitoring: "bg-warning/15 text-warning border-warning/30",
  other: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
};
