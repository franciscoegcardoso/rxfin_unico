import type { TrackingParams } from '@/hooks/useTrackingParams';

/**
 * Builds a checkout URL with the user's email and tracking params pre-filled.
 * This ensures the purchase is linked to the correct user account and campaign attribution.
 */
export function buildCheckoutUrl(
  baseUrl: string,
  email?: string | null,
  trackingParams?: Partial<TrackingParams>
): string {
  if (!baseUrl) return '';
  
  try {
    const url = new URL(baseUrl);
    
    if (email) {
      url.searchParams.set('email', email);
    }

    if (trackingParams) {
      const trackingKeys: (keyof TrackingParams)[] = [
        'aff', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      ];
      for (const key of trackingKeys) {
        const value = trackingParams[key];
        if (value) {
          url.searchParams.set(key, value);
        }
      }
    }
    
    return url.toString();
  } catch {
    // Fallback for invalid URLs
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (trackingParams) {
      Object.entries(trackingParams).forEach(([k, v]) => {
        if (v && k !== 'captured_at') params.set(k, v);
      });
    }
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}${params.toString()}`;
  }
}
