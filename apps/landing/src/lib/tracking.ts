import { createClient } from "@/lib/supabase";

export async function track(event: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    await supabase.from("landing_events").insert({
      event,
      payload: payload ?? {},
      created_at: new Date().toISOString(),
    } as Record<string, unknown>);
  } catch {
    // optional
  }
}

export function trackCTA(label: string, destination?: string) {
  track("cta_click", { label, destination });
}

export function trackFeaturePreview(feature: string) {
  track("feature_preview_open", { feature });
}
