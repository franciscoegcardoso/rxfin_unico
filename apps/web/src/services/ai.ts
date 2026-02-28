import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ============================================================
// AI Chat Service
// ============================================================

export interface AiMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function sendAiMessage(
  sessionId: string,
  message: string
) {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { sessionId, message },
  })
  if (error) throw error
  return data as { reply: string; messageId: string }
}

export async function getAiSessions(userId: string) {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}

export async function getAiMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AiMessage[]
}

export async function createAiSession(userId: string, title?: string) {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: userId,
      title: title ?? 'Nova conversa',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Budget Insights (AI-powered)
// ============================================================

export async function getBudgetInsights(userId: string, month: string) {
  const { data, error } = await supabase.functions.invoke('budget-insights', {
    body: { userId, month },
  })
  if (error) throw error
  return data
}

// ============================================================
// Vehicle Insights (AI-powered)
// ============================================================

export async function getVehicleInsights(fipeCode: string) {
  const { data, error } = await supabase.functions.invoke('vehicle-insights', {
    body: { fipeCode },
  })
  if (error) throw error
  return data
}
