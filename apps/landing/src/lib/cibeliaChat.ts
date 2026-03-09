// apps/landing/src/lib/cibeliaChat.ts

const SUPABASE_URL = 'https://kneaniaifzgqibpajyji.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E';

export interface CibeliaMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function createSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export async function sendToCibelia(
  messages: CibeliaMessage[],
  sessionId: string
): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      messages,
      session_id: sessionId,
      page_context: {
        phase: 'sales',
        path: window.location.pathname,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status}`);
  }

  const data = await response.json();
  return data.content as string;
}
