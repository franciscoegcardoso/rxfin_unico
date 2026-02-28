// =============================================================================
// supabase/functions/fipe-proxy/index.ts
// 
// FIPE API Proxy with Resilience Features:
// - In-memory caching with TTL by data type
// - Automatic retries with exponential backoff
// - Graceful error handling (404s treated as empty, not errors)
// - Rate limit detection and recovery
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// =============================================================================
// CORS CONFIGURATION
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// API CONFIGURATION
// =============================================================================
const FIPE_API_BASE = "https://parallelum.com.br/fipe/api/v1";
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

// =============================================================================
// CACHE DURATIONS (in seconds)
// Different TTLs based on how frequently data changes
// =============================================================================
const CACHE_DURATIONS = {
  brands: 86400 * 7, // 7 days - brands rarely change
  models: 86400,     // 1 day - models update infrequently
  years: 86400,      // 1 day - years are stable within a month
  price: 3600,       // 1 hour - prices can change monthly, but cache short for testing
} as const;

// =============================================================================
// IN-MEMORY CACHE
// Shared across requests within the same function instance
// Note: Edge function instances can be recycled, so this is ephemeral
// =============================================================================
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Retrieves data from memory cache if not expired
 * @param key - Cache key
 * @returns Cached data or null if expired/missing
 */
function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data as T;
  }
  // Cleanup expired entry
  memoryCache.delete(key);
  return null;
}

/**
 * Stores data in memory cache with TTL
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds
 */
function setMemoryCache(key: string, data: unknown, ttlSeconds: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// =============================================================================
// FETCH WITH RETRY
// Resilient HTTP fetch with exponential backoff and error classification
// =============================================================================

/**
 * Fetches URL with automatic retries and error handling
 * 
 * Error Classification:
 * - 400/404: Invalid path (e.g., year doesn't exist for model) → return null, don't retry
 * - 429: Rate limited → wait with exponential backoff, then retry
 * - 500: Upstream error (often invalid combination) → return null, don't retry
 * - Network errors: Retry with backoff
 * 
 * @param url - URL to fetch
 * @param retries - Number of retry attempts (default: 3)
 * @returns Response object or null on permanent failure
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Step 1: Make the HTTP request
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
      });
      
      // Step 2: Handle successful response
      if (res.ok) return res;
      
      // Step 3: Classify error and decide on retry strategy
      
      // 400/404 = Invalid path (year doesn't exist for model) - permanent, don't retry
      if (res.status === 400 || res.status === 404) {
        console.log(`[fipe-proxy] Invalid path (${res.status}): ${url}`);
        return null;
      }
      
      // 500 from upstream often means invalid combination - permanent, don't retry
      if (res.status === 500) {
        console.log(`[fipe-proxy] Upstream error (500): ${url}`);
        return null;
      }
      
      // 429 = Rate limited - temporary, wait and retry with exponential backoff
      if (res.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[fipe-proxy] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      // Other 4xx/5xx - throw to trigger retry
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err as Error;
      
      // Log the error for debugging
      console.warn(`[fipe-proxy] Attempt ${attempt + 1}/${retries} failed for ${url}:`, 
        err instanceof Error ? err.message : err);
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        const waitTime = BASE_RETRY_DELAY_MS * (attempt + 1);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  
  console.error(`[fipe-proxy] All ${retries} retries exhausted for: ${url}`, lastError);
  return null;
}

// =============================================================================
// CACHE TYPE DETECTION
// Determines cache duration based on API path structure
// =============================================================================

interface CacheConfig {
  duration: number;
  type: keyof typeof CACHE_DURATIONS;
}

/**
 * Determines cache configuration based on FIPE API path
 * @param path - FIPE API path
 * @returns Cache duration and type
 */
function getCacheConfig(path: string): CacheConfig {
  // /carros/marcas → brands (7 days)
  if (path.includes("/marcas") && !path.includes("/modelos")) {
    return { duration: CACHE_DURATIONS.brands, type: "brands" };
  }
  // /carros/marcas/XX/modelos → models (1 day)
  if (path.includes("/modelos") && !path.includes("/anos")) {
    return { duration: CACHE_DURATIONS.models, type: "models" };
  }
  // /carros/marcas/XX/modelos/YY/anos → years (1 day)
  if (path.includes("/anos") && !path.match(/\/anos\/[^/]+$/)) {
    return { duration: CACHE_DURATIONS.years, type: "years" };
  }
  // /carros/marcas/XX/modelos/YY/anos/ZZ → price (1 hour)
  return { duration: CACHE_DURATIONS.price, type: "price" };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Parse and validate request
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Determine cache configuration based on path
    const { duration: cacheDuration, type: cacheType } = getCacheConfig(path);
    const cacheKey = `fipe:${path}`;
    
    // Step 3: Check memory cache first (fast path)
    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      console.log(`[fipe-proxy] Cache HIT (${cacheType}): ${path}`);
      return new Response(
        JSON.stringify(cached),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`,
            "X-Cache": "HIT",
          },
        }
      );
    }

    // Step 4: Fetch from upstream API with retry logic
    console.log(`[fipe-proxy] Cache MISS, fetching (${cacheType}): ${path}`);
    
    const apiUrl = `${FIPE_API_BASE}${path}`;
    const response = await fetchWithRetry(apiUrl);
    
    // Step 5: Handle null response (invalid path or permanent upstream error)
    // IMPORTANT:
    // We return 200 with an explicit payload (ok:false) instead of 404.
    // Some client-side error monitors treat any 4xx from backend functions as a
    // "runtime error" / blank screen, even when handled.
    if (!response) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Not found or upstream unavailable",
          path,
          suggestion: "Verifique a combinação marca/modelo/ano",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Step 6: Parse response and store in cache
    const data = await response.json();
    setMemoryCache(cacheKey, data, cacheDuration);
    
    console.log(`[fipe-proxy] Cached (${cacheType}, ${cacheDuration}s): ${path}`);
    
    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${cacheDuration}, s-maxage=${cacheDuration}`,
          "X-Cache": "MISS",
        },
      }
    );
  } catch (err) {
    // Step 7: Handle unexpected errors with user-friendly message
    console.error("[fipe-proxy] Unexpected error:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : "Erro interno do servidor",
        suggestion: "Tente novamente em alguns segundos"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
