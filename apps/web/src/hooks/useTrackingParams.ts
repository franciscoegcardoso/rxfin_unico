import { useState, useCallback, useEffect } from 'react';

export interface TrackingParams {
  aff?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  captured_at?: string;
}

const TRACKING_EXPIRY_DAYS = 60;
const STORAGE_KEY = 'rxfin_tracking';

const TRACKED_KEYS: (keyof Omit<TrackingParams, 'captured_at'>)[] = [
  'aff',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

function readFromStorage(): TrackingParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: TrackingParams = JSON.parse(raw);

    // Check expiration
    if (parsed.captured_at) {
      const capturedDate = new Date(parsed.captured_at);
      const now = new Date();
      const diffDays = (now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > TRACKING_EXPIRY_DAYS) {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(params: TrackingParams) {
  const json = JSON.stringify(params);
  localStorage.setItem(STORAGE_KEY, json);
  sessionStorage.setItem(STORAGE_KEY, json);
}

function extractFromUrl(search: string): Partial<TrackingParams> {
  const urlParams = new URLSearchParams(search);
  const result: Partial<TrackingParams> = {};

  for (const key of TRACKED_KEYS) {
    const value = urlParams.get(key);
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

export function useTrackingParams(locationSearch: string) {
  const [trackingParams, setTrackingParams] = useState<TrackingParams>(() => {
    return readFromStorage() || {};
  });

  useEffect(() => {
    const urlParams = extractFromUrl(locationSearch);
    const hasNewParams = Object.keys(urlParams).length > 0;

    const existing = readFromStorage() || {};

    if (hasNewParams) {
      // Smart merge: new URL params override, but keep existing ones that aren't in URL
      const merged: TrackingParams = {
        ...existing,
        ...urlParams,
        captured_at: new Date().toISOString(),
      };
      saveToStorage(merged);
      setTrackingParams(merged);
    } else if (Object.keys(existing).length > 0) {
      setTrackingParams(existing);
    }
  }, [locationSearch]);

  const getTrackingParams = useCallback((): TrackingParams => {
    return readFromStorage() || {};
  }, []);

  return { trackingParams, getTrackingParams };
}
// sync
