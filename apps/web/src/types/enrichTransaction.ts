/**
 * Resposta da Edge Function `enrich-transaction` (Supabase).
 */
export interface EnrichTransactionSuggestionPayload {
  category_id: string;
  category_name: string;
  pluggy_category?: string | null;
  merchant_name?: string | null;
  cnpj?: string | null;
}

export interface EnrichTransactionResponse {
  suggestion: EnrichTransactionSuggestionPayload | null;
  reason?: string | null;
}
