/**
 * Shared recurring transaction whitelist.
 * Mirrors the whitelist in the SQL function `detect_recurring_transactions`.
 * Used at import time to auto-tag transactions as recurring with 'very_high' confidence.
 */

const RECURRING_WHITELIST: string[] = [
  // Streaming video
  'netflix', 'disney+', 'disney plus', 'hbo', 'hbo max', 'max', 'amazon prime',
  'prime video', 'paramount', 'paramount+', 'globoplay', 'star+', 'starplus',
  'apple tv', 'crunchyroll', 'mubi', 'telecine',
  // Streaming music
  'spotify', 'deezer', 'tidal', 'apple music', 'youtube music', 'youtube premium',
  'amazon music', 'audible',
  // Cloud / storage
  'icloud', 'google one', 'google storage', 'dropbox', 'onedrive',
  // Gaming
  'xbox', 'game pass', 'gamepass', 'playstation', 'ps plus', 'psplus',
  'nintendo', 'ea play', 'steam',
  // Productivity / SaaS
  'chatgpt', 'openai', 'notion', 'canva', 'adobe', 'microsoft 365', 'office 365',
  'github', 'linkedin premium', 'grammarly', 'evernote', 'todoist',
  // Education
  'coursera', 'duolingo', 'alura', 'udemy',
  // Fitness / wellness
  'gympass', 'totalpass', 'strava', 'headspace', 'calm',
  // Transport / mobility
  'sem parar', 'veloe', 'conectcar', 'move mais',
  // Telecom
  'claro', 'vivo', 'tim', 'oi',
  // Housing / bills
  'quinto andar', 'quintoandar', 'aluguel', 'condominio', 'condomínio',
  // Delivery clubs
  'ifood club', 'rappi prime', 'rappi turbo',
  // Insurance related
  'porto seguro', 'sulamerica', 'sulamérica', 'bradesco saude', 'bradesco saúde',
  'unimed', 'amil', 'hapvida',
  // Internet
  'internet', 'banda larga', 'fibra',
];

/**
 * Normalize a store name for whitelist matching.
 * Mirrors `normalize_store_name_sql` from the database.
 */
export function normalizeForWhitelist(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\*+/g, ' ')                          // asterisks -> space
    .replace(/\s*\d{1,2}\s*[/\\]\s*\d{1,2}\s*/g, '') // installment patterns
    .replace(/\s*parc\.?\s*\d+\s*/gi, '')           // "parc 3", "parc. 5"
    .replace(/\s*parcela\s*\d*\s*/gi, '')            // "parcela 3"
    .replace(/\s+/g, ' ')                            // collapse spaces
    .trim();
}

/**
 * Detects if a store name matches the recurring services whitelist.
 * Returns true if the normalized name contains any whitelist term.
 */
export function detectRecurringByWhitelist(storeName: string): boolean {
  const normalized = normalizeForWhitelist(storeName);
  return RECURRING_WHITELIST.some(term => normalized.includes(term));
}
// sync
