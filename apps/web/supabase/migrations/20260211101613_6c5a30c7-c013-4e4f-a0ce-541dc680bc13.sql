ALTER TABLE public.lancamentos_realizados DROP CONSTRAINT lancamentos_realizados_source_type_check;

ALTER TABLE public.lancamentos_realizados ADD CONSTRAINT lancamentos_realizados_source_type_check CHECK (source_type = ANY (ARRAY['manual'::text, 'credit_card_bill'::text, 'conta_pagar'::text, 'conta_receber'::text, 'pluggy_bank'::text]));