export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_influencers: {
        Row: {
          commission_per_referral: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          program_id: string
          slug: string
          total_paid: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_per_referral: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          program_id: string
          slug: string
          total_paid?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_per_referral?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          program_id?: string
          slug?: string
          total_paid?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_influencers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_offers: {
        Row: {
          fixed_commission_annual: number | null
          id: string
          is_active: boolean | null
          monthly_commission_split: number | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          fixed_commission_annual?: number | null
          id?: string
          is_active?: boolean | null
          monthly_commission_split?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          fixed_commission_annual?: number | null
          id?: string
          is_active?: boolean | null
          monthly_commission_split?: number | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_program_tiers: {
        Row: {
          commission_value: number
          created_at: string
          id: string
          max_referrals: number | null
          min_referrals: number
          program_id: string
          sort_order: number
        }
        Insert: {
          commission_value: number
          created_at?: string
          id?: string
          max_referrals?: number | null
          min_referrals: number
          program_id: string
          sort_order?: number
        }
        Update: {
          commission_value?: number
          created_at?: string
          id?: string
          max_referrals?: number | null
          min_referrals?: number
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_program_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          program_type: Database["public"]["Enums"]["affiliate_program_type"]
          requires_active_plan: boolean
          retention_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_type: Database["public"]["Enums"]["affiliate_program_type"]
          requires_active_plan?: boolean
          retention_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_type?: Database["public"]["Enums"]["affiliate_program_type"]
          requires_active_plan?: boolean
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          commission_value: number | null
          converted_at: string | null
          created_at: string
          id: string
          influencer_id: string | null
          program_type:
            | Database["public"]["Enums"]["affiliate_program_type"]
            | null
          referred_email: string | null
          referred_name: string | null
          referred_user_id: string
          referrer_id: string
          retention_validated_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_value?: number | null
          converted_at?: string | null
          created_at?: string
          id?: string
          influencer_id?: string | null
          program_type?:
            | Database["public"]["Enums"]["affiliate_program_type"]
            | null
          referred_email?: string | null
          referred_name?: string | null
          referred_user_id: string
          referrer_id: string
          retention_validated_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_value?: number | null
          converted_at?: string | null
          created_at?: string
          id?: string
          influencer_id?: string | null
          program_type?:
            | Database["public"]["Enums"]["affiliate_program_type"]
            | null
          referred_email?: string | null
          referred_name?: string | null
          referred_user_id?: string
          referrer_id?: string
          retention_validated_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "affiliate_influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      afiliados_dados_bancarios: {
        Row: {
          afiliado_id: string
          agencia: string | null
          banco: string | null
          chave_pix: string | null
          conta: string | null
          cpf_cnpj: string | null
          created_at: string | null
          id: string
          nome_completo: string | null
          pagarme_recipient_id: string | null
          tipo_conta: string | null
        }
        Insert: {
          afiliado_id: string
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          nome_completo?: string | null
          pagarme_recipient_id?: string | null
          tipo_conta?: string | null
        }
        Update: {
          afiliado_id?: string
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          nome_completo?: string | null
          pagarme_recipient_id?: string | null
          tipo_conta?: string | null
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          execution_time_ms: number | null
          id: string
          model_used: string | null
          role: string
          session_id: string
          sql_query_executed: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          model_used?: string | null
          role: string
          session_id: string
          sql_query_executed?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          model_used?: string | null
          role?: string
          session_id?: string
          sql_query_executed?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          model_used: string
          session_type: string
          started_at: string
          status: string
          token_limit: number
          total_messages: number
          total_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          model_used?: string
          session_type?: string
          started_at?: string
          status?: string
          token_limit?: number
          total_messages?: number
          total_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          model_used?: string
          session_type?: string
          started_at?: string
          status?: string
          token_limit?: number
          total_messages?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          blocked_topic: string | null
          created_at: string
          feedback_type: string
          id: string
          message_id: string | null
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          sla_deadline: string
          status: string
          user_comment: string | null
          user_id: string
        }
        Insert: {
          blocked_topic?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message_id?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          sla_deadline?: string
          status?: string
          user_comment?: string | null
          user_id: string
        }
        Update: {
          blocked_topic?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message_id?: string | null
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          sla_deadline?: string
          status?: string
          user_comment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_onboarding_events: {
        Row: {
          created_at: string
          days_since_signup: number | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days_since_signup?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days_since_signup?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_onboarding_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_audit: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          expires_at: string
          id: string
          message_id: string | null
          result_summary: Json | null
          rows_returned: number | null
          session_id: string | null
          sql_query: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          expires_at?: string
          id?: string
          message_id?: string | null
          result_summary?: Json | null
          rows_returned?: number | null
          session_id?: string | null
          sql_query: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          expires_at?: string
          id?: string
          message_id?: string | null
          result_summary?: Json | null
          rows_returned?: number | null
          session_id?: string | null
          sql_query?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_audit_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_config: {
        Row: {
          cooldown_minutes: number | null
          created_at: string | null
          function_name: string
          id: string
          is_active: boolean | null
          max_requests_per_day: number
          max_requests_per_hour: number
          max_tokens_per_day: number | null
          max_tokens_per_hour: number | null
          updated_at: string | null
        }
        Insert: {
          cooldown_minutes?: number | null
          created_at?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          max_requests_per_day?: number
          max_requests_per_hour?: number
          max_tokens_per_day?: number | null
          max_tokens_per_hour?: number | null
          updated_at?: string | null
        }
        Update: {
          cooldown_minutes?: number | null
          created_at?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          max_requests_per_day?: number
          max_requests_per_hour?: number
          max_tokens_per_day?: number | null
          max_tokens_per_hour?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          request_count: number | null
          tokens_used: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          request_count?: number | null
          tokens_used?: number | null
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          request_count?: number | null
          tokens_used?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      ai_topic_blocks: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          is_active: boolean
          reason: string | null
          topic: string
          unblocked_at: string | null
          unblocked_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          is_active?: boolean
          reason?: string | null
          topic: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          topic?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_topic_blocks_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "ai_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bill_splits: {
        Row: {
          created_at: string
          grand_total: number | null
          id: string
          items: Json
          people: Json
          service_charge: number | null
          split_mode: string | null
          splits: Json
          subtotal: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          grand_total?: number | null
          id?: string
          items?: Json
          people?: Json
          service_charge?: number | null
          split_mode?: string | null
          splits?: Json
          subtotal?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          grand_total?: number | null
          id?: string
          items?: Json
          people?: Json
          service_charge?: number | null
          split_mode?: string | null
          splits?: Json
          subtotal?: number | null
          user_id?: string
        }
        Relationships: []
      }
      budget_package_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          package_id: string
          payment_method: string | null
          responsible_person_id: string | null
          responsible_person_name: string | null
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          package_id: string
          payment_method?: string | null
          responsible_person_id?: string | null
          responsible_person_name?: string | null
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          package_id?: string
          payment_method?: string | null
          responsible_person_id?: string | null
          responsible_person_name?: string | null
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_package_transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "budget_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_packages: {
        Row: {
          budget_goal: number | null
          category_id: string
          category_name: string
          created_at: string
          description: string | null
          end_date: string
          has_budget_goal: boolean
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_goal?: number | null
          category_id: string
          category_name: string
          created_at?: string
          description?: string | null
          end_date: string
          has_budget_goal?: boolean
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_goal?: number | null
          category_id?: string
          category_name?: string
          created_at?: string
          description?: string | null
          end_date?: string
          has_budget_goal?: boolean
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comissoes_afiliados: {
        Row: {
          afiliado_id: string
          created_at: string | null
          data_liberacao: string | null
          data_pagamento: string | null
          id: string
          status_comissao: string | null
          tipo_plano: string | null
          valor_comissao: number
          valor_estornado: number | null
          venda_guru_id: string | null
        }
        Insert: {
          afiliado_id: string
          created_at?: string | null
          data_liberacao?: string | null
          data_pagamento?: string | null
          id?: string
          status_comissao?: string | null
          tipo_plano?: string | null
          valor_comissao: number
          valor_estornado?: number | null
          venda_guru_id?: string | null
        }
        Update: {
          afiliado_id?: string
          created_at?: string | null
          data_liberacao?: string | null
          data_pagamento?: string | null
          id?: string
          status_comissao?: string | null
          tipo_plano?: string | null
          valor_comissao?: number
          valor_estornado?: number | null
          venda_guru_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_afiliados_venda_guru_id_fkey"
            columns: ["venda_guru_id"]
            isOneToOne: false
            referencedRelation: "vendas_analytics"
            referencedColumns: ["guru_order_id"]
          },
        ]
      }
      consorcios: {
        Row: {
          administradora: string | null
          contemplado: boolean
          cota: string | null
          created_at: string
          data_contemplacao: string | null
          data_inicio: string
          fundo_reserva: number
          grupo: string | null
          id: string
          nome: string
          observacoes: string | null
          parcelas_pagas: number
          prazo_total: number
          reajuste_anual: number
          seguro_mensal: number
          taxa_adm_total: number
          updated_at: string
          user_id: string
          valor_carta: number
          valor_parcela_atual: number
        }
        Insert: {
          administradora?: string | null
          contemplado?: boolean
          cota?: string | null
          created_at?: string
          data_contemplacao?: string | null
          data_inicio: string
          fundo_reserva?: number
          grupo?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          parcelas_pagas?: number
          prazo_total: number
          reajuste_anual?: number
          seguro_mensal?: number
          taxa_adm_total?: number
          updated_at?: string
          user_id: string
          valor_carta: number
          valor_parcela_atual: number
        }
        Update: {
          administradora?: string | null
          contemplado?: boolean
          cota?: string | null
          created_at?: string
          data_contemplacao?: string | null
          data_inicio?: string
          fundo_reserva?: number
          grupo?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          parcelas_pagas?: number
          prazo_total?: number
          reajuste_anual?: number
          seguro_mensal?: number
          taxa_adm_total?: number
          updated_at?: string
          user_id?: string
          valor_carta?: number
          valor_parcela_atual?: number
        }
        Relationships: []
      }
      contas_pagar_receber: {
        Row: {
          categoria: string
          created_at: string
          data_fim_recorrencia: string | null
          data_pagamento: string | null
          data_vencimento: string
          dia_recorrencia: number | null
          forma_pagamento: string | null
          grupo_parcelamento: string | null
          id: string
          nome: string
          observacoes: string | null
          parcela_atual: number | null
          recorrente: boolean | null
          sem_data_fim: boolean | null
          tipo: string
          tipo_cobranca: string | null
          total_parcelas: number | null
          updated_at: string
          user_id: string
          valor: number
          vinculo_ativo_id: string | null
          vinculo_cartao_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          data_fim_recorrencia?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          dia_recorrencia?: number | null
          forma_pagamento?: string | null
          grupo_parcelamento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          parcela_atual?: number | null
          recorrente?: boolean | null
          sem_data_fim?: boolean | null
          tipo: string
          tipo_cobranca?: string | null
          total_parcelas?: number | null
          updated_at?: string
          user_id: string
          valor: number
          vinculo_ativo_id?: string | null
          vinculo_cartao_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          data_fim_recorrencia?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          dia_recorrencia?: number | null
          forma_pagamento?: string | null
          grupo_parcelamento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          parcela_atual?: number | null
          recorrente?: boolean | null
          sem_data_fim?: boolean | null
          tipo?: string
          tipo_cobranca?: string | null
          total_parcelas?: number | null
          updated_at?: string
          user_id?: string
          valor?: number
          vinculo_ativo_id?: string | null
          vinculo_cartao_id?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          page: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          page?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          page?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      credit_card_bills: {
        Row: {
          billing_month: string
          card_id: string
          card_name: string | null
          closing_date: string
          connector_image_url: string | null
          connector_primary_color: string | null
          created_at: string
          due_date: string
          id: string
          lancamento_id: string | null
          paid_amount: number | null
          payment_source: string | null
          pluggy_bill_id: string | null
          requires_manual_check: boolean
          status: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_month?: string
          card_id: string
          card_name?: string | null
          closing_date: string
          connector_image_url?: string | null
          connector_primary_color?: string | null
          created_at?: string
          due_date: string
          id?: string
          lancamento_id?: string | null
          paid_amount?: number | null
          payment_source?: string | null
          pluggy_bill_id?: string | null
          requires_manual_check?: boolean
          status?: string
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_month?: string
          card_id?: string
          card_name?: string | null
          closing_date?: string
          connector_image_url?: string | null
          connector_primary_color?: string | null
          created_at?: string
          due_date?: string
          id?: string
          lancamento_id?: string | null
          paid_amount?: number | null
          payment_source?: string | null
          pluggy_bill_id?: string | null
          requires_manual_check?: boolean
          status?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_bills_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_realizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_bills_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "v_lancamentos_full"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_imports: {
        Row: {
          card_id: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          import_batch_id: string
          imported_at: string
          total_value: number
          transaction_count: number
          user_id: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          import_batch_id: string
          imported_at?: string
          total_value?: number
          transaction_count?: number
          user_id: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          import_batch_id?: string
          imported_at?: string
          total_value?: number
          transaction_count?: number
          user_id?: string
        }
        Relationships: []
      }
      credit_card_transactions: {
        Row: {
          ai_suggested_category: string | null
          ai_suggested_category_id: string | null
          bill_from_pluggy: boolean | null
          card_id: string | null
          category: string | null
          category_id: string | null
          confidence_level: string | null
          created_at: string
          credit_card_bill_id: string | null
          friendly_name: string | null
          id: string
          import_batch_id: string | null
          installment_current: number | null
          installment_group_id: string | null
          installment_total: number | null
          is_category_confirmed: boolean | null
          is_recurring: boolean | null
          pluggy_transaction_id: string | null
          purchase_date: string | null
          purchase_registry_id: string | null
          recurring_group_id: string | null
          status: string
          store_name: string
          transaction_date: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          ai_suggested_category?: string | null
          ai_suggested_category_id?: string | null
          bill_from_pluggy?: boolean | null
          card_id?: string | null
          category?: string | null
          category_id?: string | null
          confidence_level?: string | null
          created_at?: string
          credit_card_bill_id?: string | null
          friendly_name?: string | null
          id?: string
          import_batch_id?: string | null
          installment_current?: number | null
          installment_group_id?: string | null
          installment_total?: number | null
          is_category_confirmed?: boolean | null
          is_recurring?: boolean | null
          pluggy_transaction_id?: string | null
          purchase_date?: string | null
          purchase_registry_id?: string | null
          recurring_group_id?: string | null
          status?: string
          store_name: string
          transaction_date: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          ai_suggested_category?: string | null
          ai_suggested_category_id?: string | null
          bill_from_pluggy?: boolean | null
          card_id?: string | null
          category?: string | null
          category_id?: string | null
          confidence_level?: string | null
          created_at?: string
          credit_card_bill_id?: string | null
          friendly_name?: string | null
          id?: string
          import_batch_id?: string | null
          installment_current?: number | null
          installment_group_id?: string | null
          installment_total?: number | null
          is_category_confirmed?: boolean | null
          is_recurring?: boolean | null
          pluggy_transaction_id?: string | null
          purchase_date?: string | null
          purchase_registry_id?: string | null
          recurring_group_id?: string | null
          status?: string
          store_name?: string
          transaction_date?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_credit_card_bill_id_fkey"
            columns: ["credit_card_bill_id"]
            isOneToOne: false
            referencedRelation: "credit_card_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_credit_card_bill_id_fkey"
            columns: ["credit_card_bill_id"]
            isOneToOne: false
            referencedRelation: "credit_card_bills_with_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_purchase_registry_id_fkey"
            columns: ["purchase_registry_id"]
            isOneToOne: false
            referencedRelation: "purchase_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_automations: {
        Row: {
          action_description: string
          channels: string[]
          created_at: string
          delay: string
          icon_color: string
          icon_name: string
          id: string
          is_active: boolean
          n8n_workflow_id: string | null
          n8n_workflow_name: string | null
          name: string
          sort_order: number
          trigger_description: string
          updated_at: string
        }
        Insert: {
          action_description: string
          channels?: string[]
          created_at?: string
          delay?: string
          icon_color?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          n8n_workflow_id?: string | null
          n8n_workflow_name?: string | null
          name: string
          sort_order?: number
          trigger_description: string
          updated_at?: string
        }
        Update: {
          action_description?: string
          channels?: string[]
          created_at?: string
          delay?: string
          icon_color?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          n8n_workflow_id?: string | null
          n8n_workflow_name?: string | null
          name?: string
          sort_order?: number
          trigger_description?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["crm_status_enum"] | null
          id: string
          metadata: Json | null
          to_status: Database["public"]["Enums"]["crm_status_enum"]
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["crm_status_enum"] | null
          id?: string
          metadata?: Json | null
          to_status: Database["public"]["Enums"]["crm_status_enum"]
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["crm_status_enum"] | null
          id?: string
          metadata?: Json | null
          to_status?: Database["public"]["Enums"]["crm_status_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      default_expense_items: {
        Row: {
          category_id: string
          category_name: string
          created_at: string
          enabled_by_default: boolean
          expense_nature: string
          expense_type: string
          id: string
          is_active: boolean
          is_recurring: boolean
          name: string
          order_index: number
          payment_method: string
          recurrence_type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string
          enabled_by_default?: boolean
          expense_nature?: string
          expense_type?: string
          id: string
          is_active?: boolean
          is_recurring?: boolean
          name: string
          order_index?: number
          payment_method?: string
          recurrence_type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string
          enabled_by_default?: boolean
          expense_nature?: string
          expense_type?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          name?: string
          order_index?: number
          payment_method?: string
          recurrence_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      default_income_items: {
        Row: {
          created_at: string
          enabled_by_default: boolean
          id: string
          is_active: boolean
          is_stock_compensation: boolean | null
          method: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_by_default?: boolean
          id: string
          is_active?: boolean
          is_stock_compensation?: boolean | null
          method?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_by_default?: boolean
          id?: string
          is_active?: boolean
          is_stock_compensation?: boolean | null
          method?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      deletion_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          linked_records_deleted: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          linked_records_deleted?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          linked_records_deleted?: number | null
          user_id?: string
        }
        Relationships: []
      }
      deploy_history: {
        Row: {
          changes_summary: Json | null
          completed_at: string | null
          deploy_type: string
          deployed_at: string | null
          deployed_by: string | null
          description: string | null
          environment: string
          id: string
          notes: string | null
          rollback_id: string | null
          status: string
        }
        Insert: {
          changes_summary?: Json | null
          completed_at?: string | null
          deploy_type: string
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string | null
          environment: string
          id?: string
          notes?: string | null
          rollback_id?: string | null
          status?: string
        }
        Update: {
          changes_summary?: Json | null
          completed_at?: string | null
          deploy_type?: string
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          notes?: string | null
          rollback_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deploy_history_rollback_id_fkey"
            columns: ["rollback_id"]
            isOneToOne: false
            referencedRelation: "migration_rollbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_access: {
        Row: {
          created_at: string
          driver_user_id: string
          id: string
          vehicle_id: string
          workspace_owner_id: string
        }
        Insert: {
          created_at?: string
          driver_user_id: string
          id?: string
          vehicle_id: string
          workspace_owner_id: string
        }
        Update: {
          created_at?: string
          driver_user_id?: string
          id?: string
          vehicle_id?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      edge_function_registry: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          function_slug: string
          id: string
          rate_limited: boolean
          requires_admin: boolean
          requires_internal_secret: boolean
          updated_at: string | null
          verify_jwt: boolean
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          function_slug: string
          id?: string
          rate_limited?: boolean
          requires_admin?: boolean
          requires_internal_secret?: boolean
          updated_at?: string | null
          verify_jwt?: boolean
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          function_slug?: string
          id?: string
          rate_limited?: boolean
          requires_admin?: boolean
          requires_internal_secret?: boolean
          updated_at?: string | null
          verify_jwt?: boolean
        }
        Relationships: []
      }
      email_campaign_logs: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          body: string | null
          can_unsubscribe: boolean | null
          clicks: number | null
          created_at: string | null
          created_by: string | null
          days_after_trigger: number
          html_body: string
          id: string
          is_active: boolean | null
          is_draft: boolean | null
          is_recurring: boolean | null
          name: string
          opens: number | null
          recurrence_interval_days: number | null
          scheduled_at: string | null
          segment: string | null
          sent_at: string | null
          status: string | null
          subject: string
          title: string | null
          total_recipients: number | null
          trigger_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          can_unsubscribe?: boolean | null
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          days_after_trigger: number
          html_body: string
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          is_recurring?: boolean | null
          name: string
          opens?: number | null
          recurrence_interval_days?: number | null
          scheduled_at?: string | null
          segment?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          title?: string | null
          total_recipients?: number | null
          trigger_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          can_unsubscribe?: boolean | null
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          days_after_trigger?: number
          html_body?: string
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          is_recurring?: boolean | null
          name?: string
          opens?: number | null
          recurrence_interval_days?: number | null
          scheduled_at?: string | null
          segment?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          title?: string | null
          total_recipients?: number | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          campaign_id: string
          created_at: string | null
          error_message: string | null
          html_body: string
          id: string
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string
          status: string | null
          subject: string
          to_email: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          html_body: string
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          status?: string | null
          subject: string
          to_email: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          html_body?: string
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          status?: string | null
          subject?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          subject: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          campaign_id: string | null
          email: string | null
          id: string
          reason: string | null
          unsubscribed_all: boolean | null
          unsubscribed_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          email?: string | null
          id?: string
          reason?: string | null
          unsubscribed_all?: boolean | null
          unsubscribed_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          email?: string | null
          id?: string
          reason?: string | null
          unsubscribed_all?: boolean | null
          unsubscribed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_rate_limits: {
        Row: {
          email: string
          id: string
          ip_address: string | null
          sent_at: string
        }
        Insert: {
          email: string
          id?: string
          ip_address?: string | null
          sent_at?: string
        }
        Update: {
          email?: string
          id?: string
          ip_address?: string | null
          sent_at?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          order_index?: number
          reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expiration_actions: {
        Row: {
          action_type: string
          created_at: string | null
          downgrade_to_plan_id: string | null
          id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          downgrade_to_plan_id?: string | null
          id?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          downgrade_to_plan_id?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiration_actions_downgrade_to_plan_id_fkey"
            columns: ["downgrade_to_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expiration_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "v_user_plan"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "expiration_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_vehicles: {
        Row: {
          brand_code: string
          brand_name: string
          created_at: string
          display_name: string
          fipe_code: string | null
          fipe_value: number | null
          id: string
          model_code: string
          model_name: string
          position: number
          updated_at: string
          user_id: string
          vehicle_type: string
          year_code: string
          year_label: string | null
        }
        Insert: {
          brand_code: string
          brand_name: string
          created_at?: string
          display_name: string
          fipe_code?: string | null
          fipe_value?: number | null
          id?: string
          model_code: string
          model_name: string
          position?: number
          updated_at?: string
          user_id: string
          vehicle_type?: string
          year_code: string
          year_label?: string | null
        }
        Update: {
          brand_code?: string
          brand_name?: string
          created_at?: string
          display_name?: string
          fipe_code?: string | null
          fipe_value?: number | null
          id?: string
          model_code?: string
          model_name?: string
          position?: number
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          year_code?: string
          year_label?: string | null
        }
        Relationships: []
      }
      fgts_monthly_entries: {
        Row: {
          asset_id: string
          created_at: string | null
          deposit: number | null
          final_balance: number
          id: string
          month: string
          notes: string | null
          previous_balance: number | null
          updated_at: string | null
          user_id: string
          yield: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          deposit?: number | null
          final_balance: number
          id?: string
          month: string
          notes?: string | null
          previous_balance?: number | null
          updated_at?: string | null
          user_id: string
          yield?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          deposit?: number | null
          final_balance?: number
          id?: string
          month?: string
          notes?: string | null
          previous_balance?: number | null
          updated_at?: string | null
          user_id?: string
          yield?: number | null
        }
        Relationships: []
      }
      financiamentos: {
        Row: {
          contrato: string | null
          created_at: string
          data_inicio: string
          id: string
          instituicao_financeira: string | null
          nome: string
          observacoes: string | null
          parcelas_pagas: number
          prazo_total: number
          saldo_devedor: number
          seguro_mensal: number
          sistema_amortizacao: string
          taxa_juros_mensal: number
          taxas_extras: number
          updated_at: string
          user_id: string
          valor_bem: number
          valor_entrada: number
          valor_financiado: number
          valor_parcela_atual: number
        }
        Insert: {
          contrato?: string | null
          created_at?: string
          data_inicio: string
          id?: string
          instituicao_financeira?: string | null
          nome: string
          observacoes?: string | null
          parcelas_pagas?: number
          prazo_total: number
          saldo_devedor: number
          seguro_mensal?: number
          sistema_amortizacao?: string
          taxa_juros_mensal: number
          taxas_extras?: number
          updated_at?: string
          user_id: string
          valor_bem: number
          valor_entrada?: number
          valor_financiado: number
          valor_parcela_atual: number
        }
        Update: {
          contrato?: string | null
          created_at?: string
          data_inicio?: string
          id?: string
          instituicao_financeira?: string | null
          nome?: string
          observacoes?: string | null
          parcelas_pagas?: number
          prazo_total?: number
          saldo_devedor?: number
          seguro_mensal?: number
          sistema_amortizacao?: string
          taxa_juros_mensal?: number
          taxas_extras?: number
          updated_at?: string
          user_id?: string
          valor_bem?: number
          valor_entrada?: number
          valor_financiado?: number
          valor_parcela_atual?: number
        }
        Relationships: []
      }
      fipe_catalog: {
        Row: {
          brand_id: number
          brand_name: string
          fipe_code: string
          fuel_type: number
          model_id: number
          model_name: string
          vehicle_type: number
          year: number
          year_id: string
        }
        Insert: {
          brand_id: number
          brand_name: string
          fipe_code: string
          fuel_type: number
          model_id: number
          model_name: string
          vehicle_type: number
          year: number
          year_id: string
        }
        Update: {
          brand_id?: number
          brand_name?: string
          fipe_code?: string
          fuel_type?: number
          model_id?: number
          model_name?: string
          vehicle_type?: number
          year?: number
          year_id?: string
        }
        Relationships: []
      }
      fipe_catalog_health_log: {
        Row: {
          anos_absurdos: number
          anos_faltando_catalog: number
          campos_nulos_criticos: number
          correcao_detalhes: Json | null
          correcoes_aplicadas: number
          fipe_codes_com_hifen: number
          id: string
          metadados_inconsistentes: number
          orfaos_no_historico: number
          run_at: string | null
          status: string | null
          total_issues: number | null
          trigger_context: string | null
          triggered_by: string
          year_id_inconsistentes: number
        }
        Insert: {
          anos_absurdos?: number
          anos_faltando_catalog?: number
          campos_nulos_criticos?: number
          correcao_detalhes?: Json | null
          correcoes_aplicadas?: number
          fipe_codes_com_hifen?: number
          id?: string
          metadados_inconsistentes?: number
          orfaos_no_historico?: number
          run_at?: string | null
          status?: string | null
          total_issues?: number | null
          trigger_context?: string | null
          triggered_by?: string
          year_id_inconsistentes?: number
        }
        Update: {
          anos_absurdos?: number
          anos_faltando_catalog?: number
          campos_nulos_criticos?: number
          correcao_detalhes?: Json | null
          correcoes_aplicadas?: number
          fipe_codes_com_hifen?: number
          id?: string
          metadados_inconsistentes?: number
          orfaos_no_historico?: number
          run_at?: string | null
          status?: string | null
          total_issues?: number | null
          trigger_context?: string | null
          triggered_by?: string
          year_id_inconsistentes?: number
        }
        Relationships: []
      }
      fipe_error_log: {
        Row: {
          brand_id: number | null
          created_at: string | null
          error_type: string | null
          fipe_code: string | null
          http_status: number | null
          id: number
          level: string
          message: string | null
          model_id: number | null
          parsed_price: number | null
          raw_response: string | null
          reference_code: number | null
          returned_label: string | null
          runner: string
          url: string | null
          vehicle_type: number | null
          year_id: string | null
        }
        Insert: {
          brand_id?: number | null
          created_at?: string | null
          error_type?: string | null
          fipe_code?: string | null
          http_status?: number | null
          id?: number
          level?: string
          message?: string | null
          model_id?: number | null
          parsed_price?: number | null
          raw_response?: string | null
          reference_code?: number | null
          returned_label?: string | null
          runner: string
          url?: string | null
          vehicle_type?: number | null
          year_id?: string | null
        }
        Update: {
          brand_id?: number | null
          created_at?: string | null
          error_type?: string | null
          fipe_code?: string | null
          http_status?: number | null
          id?: number
          level?: string
          message?: string | null
          model_id?: number | null
          parsed_price?: number | null
          raw_response?: string | null
          reference_code?: number | null
          returned_label?: string | null
          runner?: string
          url?: string | null
          vehicle_type?: number | null
          year_id?: string | null
        }
        Relationships: []
      }
      fipe_model_year_window: {
        Row: {
          fipe_code: string
          first_ref_code: number | null
          last_ref_code: number | null
          model_year: number
          status: string
          updated_at: string
        }
        Insert: {
          fipe_code: string
          first_ref_code?: number | null
          last_ref_code?: number | null
          model_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          fipe_code?: string
          first_ref_code?: number | null
          last_ref_code?: number | null
          model_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fipe_phase3_queue: {
        Row: {
          attempts: number
          brand_id: number
          created_at: string
          fipe_code: string
          id: number
          model_id: number
          model_year: number
          priority: number
          processed_at: string | null
          reference_code: number
          status: string
          vehicle_type: number
          year_id: string
        }
        Insert: {
          attempts?: number
          brand_id: number
          created_at?: string
          fipe_code: string
          id?: number
          model_id: number
          model_year: number
          priority?: number
          processed_at?: string | null
          reference_code: number
          status?: string
          vehicle_type: number
          year_id: string
        }
        Update: {
          attempts?: number
          brand_id?: number
          created_at?: string
          fipe_code?: string
          id?: number
          model_id?: number
          model_year?: number
          priority?: number
          processed_at?: string | null
          reference_code?: number
          status?: string
          vehicle_type?: number
          year_id?: string
        }
        Relationships: []
      }
      fipe_pilot_jobs: {
        Row: {
          batch_size: number
          created_at: string | null
          erros: number | null
          fipe_code: string
          has_more: boolean | null
          id: number
          indisponiveis: number | null
          inseridos: number | null
          mismatches: number | null
          offset_val: number
          processed_at: string | null
          result: Json | null
          status: string
        }
        Insert: {
          batch_size?: number
          created_at?: string | null
          erros?: number | null
          fipe_code: string
          has_more?: boolean | null
          id?: number
          indisponiveis?: number | null
          inseridos?: number | null
          mismatches?: number | null
          offset_val?: number
          processed_at?: string | null
          result?: Json | null
          status?: string
        }
        Update: {
          batch_size?: number
          created_at?: string | null
          erros?: number | null
          fipe_code?: string
          has_more?: boolean | null
          id?: number
          indisponiveis?: number | null
          inseridos?: number | null
          mismatches?: number | null
          offset_val?: number
          processed_at?: string | null
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      fipe_pilot_results: {
        Row: {
          created_at: string | null
          dry_run: boolean | null
          fipe_code: string | null
          id: number
          result: Json | null
        }
        Insert: {
          created_at?: string | null
          dry_run?: boolean | null
          fipe_code?: string | null
          id?: number
          result?: Json | null
        }
        Update: {
          created_at?: string | null
          dry_run?: boolean | null
          fipe_code?: string | null
          id?: number
          result?: Json | null
        }
        Relationships: []
      }
      fipe_price_history: {
        Row: {
          fetched_at: string | null
          fipe_code: string
          fuel_type: string | null
          id: string
          model_year: number
          price: number
          reference_code: number
          reference_label: string
          reference_month: number
          reference_year: number
        }
        Insert: {
          fetched_at?: string | null
          fipe_code: string
          fuel_type?: string | null
          id?: string
          model_year: number
          price: number
          reference_code: number
          reference_label: string
          reference_month: number
          reference_year: number
        }
        Update: {
          fetched_at?: string | null
          fipe_code?: string
          fuel_type?: string | null
          id?: string
          model_year?: number
          price?: number
          reference_code?: number
          reference_label?: string
          reference_month?: number
          reference_year?: number
        }
        Relationships: []
      }
      fipe_reference: {
        Row: {
          month: number
          reference_code: number
          slug: string | null
          year: number
        }
        Insert: {
          month: number
          reference_code: number
          slug?: string | null
          year: number
        }
        Update: {
          month?: number
          reference_code?: number
          slug?: string | null
          year?: number
        }
        Relationships: []
      }
      fipe_scale_jobs: {
        Row: {
          batch_size: number
          brand_id: number
          created_at: string | null
          fipe_code: string
          id: number
          model_id: number
          model_year: number
          offset_val: number
          priority: number
          ref_end: number
          ref_start: number
          result_last: Json | null
          status: string
          total_erros: number
          total_indisponiveis: number
          total_inseridos: number
          total_refs_processadas: number
          updated_at: string | null
          vehicle_type: number
          year_id: string
        }
        Insert: {
          batch_size?: number
          brand_id: number
          created_at?: string | null
          fipe_code: string
          id?: number
          model_id: number
          model_year: number
          offset_val?: number
          priority?: number
          ref_end: number
          ref_start: number
          result_last?: Json | null
          status?: string
          total_erros?: number
          total_indisponiveis?: number
          total_inseridos?: number
          total_refs_processadas?: number
          updated_at?: string | null
          vehicle_type: number
          year_id: string
        }
        Update: {
          batch_size?: number
          brand_id?: number
          created_at?: string | null
          fipe_code?: string
          id?: number
          model_id?: number
          model_year?: number
          offset_val?: number
          priority?: number
          ref_end?: number
          ref_start?: number
          result_last?: Json | null
          status?: string
          total_erros?: number
          total_indisponiveis?: number
          total_inseridos?: number
          total_refs_processadas?: number
          updated_at?: string | null
          vehicle_type?: number
          year_id?: string
        }
        Relationships: []
      }
      fipe_sibling_cache: {
        Row: {
          avg_monthly_decay_rate: number | null
          created_at: string
          expires_at: string
          fipe_code: string
          id: string
          model_year: number
          pandemic_filtered: boolean
          raw_data: Json | null
          samples_used: number
          sibling_years: number[]
        }
        Insert: {
          avg_monthly_decay_rate?: number | null
          created_at?: string
          expires_at?: string
          fipe_code: string
          id?: string
          model_year: number
          pandemic_filtered?: boolean
          raw_data?: Json | null
          samples_used?: number
          sibling_years: number[]
        }
        Update: {
          avg_monthly_decay_rate?: number | null
          created_at?: string
          expires_at?: string
          fipe_code?: string
          id?: string
          model_year?: number
          pandemic_filtered?: boolean
          raw_data?: Json | null
          samples_used?: number
          sibling_years?: number[]
        }
        Relationships: []
      }
      fipe_sync_log: {
        Row: {
          batch_key: string | null
          error_details: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          records_false_negative: number | null
          records_inserted: number | null
          records_processed: number | null
          records_unavailable: number | null
          ref_code: string
          reference_month: string
          started_at: string | null
          status: string
          sync_type: string | null
          vehicle_type: number | null
        }
        Insert: {
          batch_key?: string | null
          error_details?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          records_false_negative?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_unavailable?: number | null
          ref_code: string
          reference_month: string
          started_at?: string | null
          status: string
          sync_type?: string | null
          vehicle_type?: number | null
        }
        Update: {
          batch_key?: string | null
          error_details?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          records_false_negative?: number | null
          records_inserted?: number | null
          records_processed?: number | null
          records_unavailable?: number | null
          ref_code?: string
          reference_month?: string
          started_at?: string | null
          status?: string
          sync_type?: string | null
          vehicle_type?: number | null
        }
        Relationships: []
      }
      fipe_sync_logs: {
        Row: {
          error_details: string | null
          finished_at: string | null
          id: string
          reference_month: string
          started_at: string | null
          status: string
        }
        Insert: {
          error_details?: string | null
          finished_at?: string | null
          id?: string
          reference_month: string
          started_at?: string | null
          status: string
        }
        Update: {
          error_details?: string | null
          finished_at?: string | null
          id?: string
          reference_month?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      gift_assignments: {
        Row: {
          actual_value: number | null
          created_at: string
          event_id: string
          gift_description: string | null
          id: string
          notes: string | null
          person_id: string
          planned_value: number
          purchase_date: string | null
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          event_id: string
          gift_description?: string | null
          id?: string
          notes?: string | null
          person_id: string
          planned_value?: number
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          event_id?: string
          gift_description?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          planned_value?: number
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gift_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "gift_people"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_events: {
        Row: {
          created_at: string
          default_value: number
          event_day: number | null
          event_month: number | null
          event_type: string
          id: string
          is_system_event: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_value?: number
          event_day?: number | null
          event_month?: number | null
          event_type: string
          id?: string
          is_system_event?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_value?: number
          event_day?: number | null
          event_month?: number | null
          event_type?: string
          id?: string
          is_system_event?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_people: {
        Row: {
          birthday_day: number | null
          birthday_month: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday_day?: number | null
          birthday_month?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday_day?: number | null
          birthday_month?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          guest_email: string
          guest_user_id: string | null
          id: string
          invitation_type: string
          previous_principal_id: string | null
          principal_user_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          guest_email: string
          guest_user_id?: string | null
          id?: string
          invitation_type: string
          previous_principal_id?: string | null
          principal_user_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          guest_email?: string
          guest_user_id?: string | null
          id?: string
          invitation_type?: string
          previous_principal_id?: string | null
          principal_user_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_invitations_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_invitations_previous_principal_id_fkey"
            columns: ["previous_principal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_previous_principal_id_fkey"
            columns: ["previous_principal_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_previous_principal_id_fkey"
            columns: ["previous_principal_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guest_invitations_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invitations_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ir_comprovantes: {
        Row: {
          ano_fiscal: number
          arquivo_nome: string | null
          arquivo_path: string | null
          beneficiario_cpf: string | null
          beneficiario_nome: string | null
          categoria: string
          created_at: string
          data_comprovante: string
          descricao: string | null
          id: string
          is_valid_deduction: boolean | null
          prestador_cpf_cnpj: string | null
          prestador_nome: string | null
          subcategoria: string | null
          updated_at: string
          user_id: string
          validation_notes: string | null
          valor: number
        }
        Insert: {
          ano_fiscal: number
          arquivo_nome?: string | null
          arquivo_path?: string | null
          beneficiario_cpf?: string | null
          beneficiario_nome?: string | null
          categoria: string
          created_at?: string
          data_comprovante: string
          descricao?: string | null
          id?: string
          is_valid_deduction?: boolean | null
          prestador_cpf_cnpj?: string | null
          prestador_nome?: string | null
          subcategoria?: string | null
          updated_at?: string
          user_id: string
          validation_notes?: string | null
          valor: number
        }
        Update: {
          ano_fiscal?: number
          arquivo_nome?: string | null
          arquivo_path?: string | null
          beneficiario_cpf?: string | null
          beneficiario_nome?: string | null
          categoria?: string
          created_at?: string
          data_comprovante?: string
          descricao?: string | null
          id?: string
          is_valid_deduction?: boolean | null
          prestador_cpf_cnpj?: string | null
          prestador_nome?: string | null
          subcategoria?: string | null
          updated_at?: string
          user_id?: string
          validation_notes?: string | null
          valor?: number
        }
        Relationships: []
      }
      ir_fiscal_chat: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ir_imports: {
        Row: {
          ano_calendario: number
          ano_exercicio: number
          bens_direitos: Json | null
          dividas: Json | null
          file_name: string | null
          file_path: string | null
          id: string
          imported_at: string
          rendimentos_isentos: Json | null
          rendimentos_tributaveis: Json | null
          source_type: string
          user_id: string
        }
        Insert: {
          ano_calendario: number
          ano_exercicio: number
          bens_direitos?: Json | null
          dividas?: Json | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          imported_at?: string
          rendimentos_isentos?: Json | null
          rendimentos_tributaveis?: Json | null
          source_type: string
          user_id: string
        }
        Update: {
          ano_calendario?: number
          ano_exercicio?: number
          bens_direitos?: Json | null
          dividas?: Json | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          imported_at?: string
          rendimentos_isentos?: Json | null
          rendimentos_tributaveis?: Json | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamento_friendly_name_rules: {
        Row: {
          created_at: string
          friendly_name: string
          id: string
          normalized_name: string
          original_name: string
          pattern: string | null
          priority: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          friendly_name: string
          id?: string
          normalized_name: string
          original_name: string
          pattern?: string | null
          priority?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          friendly_name?: string
          id?: string
          normalized_name?: string
          original_name?: string
          pattern?: string | null
          priority?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lancamento_metadata: {
        Row: {
          created_at: string
          friendly_name: string | null
          id: string
          is_category_confirmed: boolean | null
          lancamento_id: string
          purchase_registry_id: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_category_confirmed?: boolean | null
          lancamento_id: string
          purchase_registry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_category_confirmed?: boolean | null
          lancamento_id?: string
          purchase_registry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_metadata_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: true
            referencedRelation: "lancamentos_realizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_metadata_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: true
            referencedRelation: "v_lancamentos_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_metadata_purchase_registry_id_fkey"
            columns: ["purchase_registry_id"]
            isOneToOne: false
            referencedRelation: "purchase_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_realizados: {
        Row: {
          categoria: string
          category_id: string | null
          created_at: string
          data_pagamento: string | null
          data_registro: string
          data_vencimento: string | null
          forma_pagamento: string | null
          friendly_name: string | null
          id: string
          is_category_confirmed: boolean | null
          mes_referencia: string
          nome: string
          observacoes: string | null
          purchase_registry_id: string | null
          source_id: string | null
          source_type: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor_previsto: number
          valor_realizado: number
        }
        Insert: {
          categoria: string
          category_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_registro?: string
          data_vencimento?: string | null
          forma_pagamento?: string | null
          friendly_name?: string | null
          id?: string
          is_category_confirmed?: boolean | null
          mes_referencia: string
          nome: string
          observacoes?: string | null
          purchase_registry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor_previsto: number
          valor_realizado: number
        }
        Update: {
          categoria?: string
          category_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_registro?: string
          data_vencimento?: string | null
          forma_pagamento?: string | null
          friendly_name?: string | null
          id?: string
          is_category_confirmed?: boolean | null
          mes_referencia?: string
          nome?: string
          observacoes?: string | null
          purchase_registry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_previsto?: number
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_realizados_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_realizados_purchase_registry_id_fkey"
            columns: ["purchase_registry_id"]
            isOneToOne: false
            referencedRelation: "purchase_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          phone: string | null
          source: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          phone?: string | null
          source: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          phone?: string | null
          source?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      legal_document_versions: {
        Row: {
          change_description: string | null
          created_at: string
          document_type: string
          effective_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          document_type: string
          effective_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          document_type?: string
          effective_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          effective_date: string
          id: string
          slug: string
          title: string
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          effective_date?: string
          id?: string
          slug: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      legal_documents_history: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          content: string
          document_id: string | null
          effective_date: string
          id: string
          slug: string
          title: string
          version: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          content: string
          document_id?: string | null
          effective_date: string
          id?: string
          slug: string
          title: string
          version: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          content?: string
          document_id?: string | null
          effective_date?: string
          id?: string
          slug?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: unknown
          success: boolean | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
        }
        Relationships: []
      }
      migration_rollbacks: {
        Row: {
          applied_at: string | null
          created_by: string | null
          description: string | null
          environment: string
          id: string
          is_reversible: boolean | null
          migration_name: string
          rollback_sql: string
          rolled_back_at: string | null
          rolled_back_by: string | null
        }
        Insert: {
          applied_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          is_reversible?: boolean | null
          migration_name: string
          rollback_sql: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Update: {
          applied_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          is_reversible?: boolean | null
          migration_name?: string
          rollback_sql?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          calculation_base: string | null
          challenge_percent: number | null
          created_at: string | null
          credit_card_goal: number | null
          expense_goal: number | null
          id: string
          income_goal: number | null
          item_goals: Json | null
          month: string
          payment_method_goals: Json | null
          savings_goal: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calculation_base?: string | null
          challenge_percent?: number | null
          created_at?: string | null
          credit_card_goal?: number | null
          expense_goal?: number | null
          id?: string
          income_goal?: number | null
          item_goals?: Json | null
          month: string
          payment_method_goals?: Json | null
          savings_goal?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calculation_base?: string | null
          challenge_percent?: number | null
          created_at?: string | null
          credit_card_goal?: number | null
          expense_goal?: number | null
          id?: string
          income_goal?: number | null
          item_goals?: Json | null
          month?: string
          payment_method_goals?: Json | null
          savings_goal?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dismissals_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          frequency: string | null
          id: string
          notification_type: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          notification_type: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          notification_type?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          action_url_template: string | null
          available_variables: string[] | null
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          name: string
          priority: string
          slug: string
          title_template: string
          type: string
          updated_at: string
        }
        Insert: {
          action_url_template?: string | null
          available_variables?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          priority?: string
          slug: string
          title_template: string
          type: string
          updated_at?: string
        }
        Update: {
          action_url_template?: string | null
          available_variables?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          priority?: string
          slug?: string
          title_template?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          metadata: Json
          priority: string
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          metadata?: Json
          priority?: string
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          metadata?: Json
          priority?: string
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      package_transaction_links: {
        Row: {
          allocated_amount: number | null
          cc_transaction_id: string | null
          created_at: string
          id: string
          lancamento_id: string | null
          package_id: string
          user_id: string
        }
        Insert: {
          allocated_amount?: number | null
          cc_transaction_id?: string | null
          created_at?: string
          id?: string
          lancamento_id?: string | null
          package_id: string
          user_id: string
        }
        Update: {
          allocated_amount?: number | null
          cc_transaction_id?: string | null
          created_at?: string
          id?: string
          lancamento_id?: string | null
          package_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_transaction_links_cc_transaction_id_fkey"
            columns: ["cc_transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_card_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_transaction_links_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_realizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_transaction_links_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "v_lancamentos_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_transaction_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "budget_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_features: {
        Row: {
          access_level: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          page_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          page_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          page_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_features_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_groups: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_collapsible: boolean | null
          name: string
          order_index: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsible?: boolean | null
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsible?: boolean | null
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          access_level: string
          category: string | null
          created_at: string
          description: string | null
          group_id: string | null
          icon: string | null
          id: string
          is_active_admin: boolean
          is_active_users: boolean
          min_plan_slug: string | null
          order_in_group: number | null
          order_index: number | null
          path: string
          show_when_unavailable: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          category?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          icon?: string | null
          id?: string
          is_active_admin?: boolean
          is_active_users?: boolean
          min_plan_slug?: string | null
          order_in_group?: number | null
          order_index?: number | null
          path: string
          show_when_unavailable?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          category?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          icon?: string | null
          id?: string
          is_active_admin?: boolean
          is_active_users?: boolean
          min_plan_slug?: string | null
          order_in_group?: number | null
          order_index?: number | null
          path?: string
          show_when_unavailable?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "page_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_comparison_features: {
        Row: {
          category: string
          created_at: string
          feature_name: string
          free_value: string
          id: string
          is_active: boolean
          is_default: boolean
          order_index: number
          page_slug: string | null
          pro_value: string
          starter_value: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          feature_name: string
          free_value?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          order_index?: number
          page_slug?: string | null
          pro_value?: string
          starter_value?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          feature_name?: string
          free_value?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          order_index?: number
          page_slug?: string | null
          pro_value?: string
          starter_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      pluggy_accounts: {
        Row: {
          available_credit_limit: number | null
          balance: number | null
          card_brand: string | null
          connection_id: string
          created_at: string
          credit_limit: number | null
          currency_code: string | null
          deleted_at: string | null
          id: string
          name: string
          number: string | null
          pluggy_account_id: string
          subtype: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_credit_limit?: number | null
          balance?: number | null
          card_brand?: string | null
          connection_id: string
          created_at?: string
          credit_limit?: number | null
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          number?: string | null
          pluggy_account_id: string
          subtype?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_credit_limit?: number | null
          balance?: number | null
          card_brand?: string | null
          connection_id?: string
          created_at?: string
          credit_limit?: number | null
          currency_code?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          number?: string | null
          pluggy_account_id?: string
          subtype?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "pluggy_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_category_map: {
        Row: {
          category_id: string | null
          category_name: string | null
          notes: string | null
          pluggy_category: string
          rxfin_category: string | null
          rxfin_id: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          notes?: string | null
          pluggy_category: string
          rxfin_category?: string | null
          rxfin_id?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          notes?: string | null
          pluggy_category?: string
          rxfin_category?: string | null
          rxfin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_connections: {
        Row: {
          connector_id: number
          connector_image_url: string | null
          connector_name: string
          connector_primary_color: string | null
          consent_expires_at: string | null
          created_at: string
          deleted_at: string | null
          execution_status: string | null
          id: string
          item_id: string
          last_error_code: string | null
          last_sync_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connector_id: number
          connector_image_url?: string | null
          connector_name: string
          connector_primary_color?: string | null
          consent_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          execution_status?: string | null
          id?: string
          item_id: string
          last_error_code?: string | null
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connector_id?: number
          connector_image_url?: string | null
          connector_name?: string
          connector_primary_color?: string | null
          consent_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          execution_status?: string | null
          id?: string
          item_id?: string
          last_error_code?: string | null
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pluggy_investments: {
        Row: {
          balance: number
          code: string | null
          connection_id: string
          created_at: string
          currency_code: string | null
          due_date: string | null
          fixed_annual_rate: number | null
          id: string
          index_name: string | null
          issue_date: string | null
          issuer: string | null
          last_month_rate: number | null
          last_twelve_months_rate: number | null
          metadata: Json | null
          name: string
          number: string | null
          pluggy_investment_id: string
          quantity: number | null
          rate: number | null
          rate_type: string | null
          subtype: string | null
          type: string | null
          unit_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          code?: string | null
          connection_id: string
          created_at?: string
          currency_code?: string | null
          due_date?: string | null
          fixed_annual_rate?: number | null
          id?: string
          index_name?: string | null
          issue_date?: string | null
          issuer?: string | null
          last_month_rate?: number | null
          last_twelve_months_rate?: number | null
          metadata?: Json | null
          name: string
          number?: string | null
          pluggy_investment_id: string
          quantity?: number | null
          rate?: number | null
          rate_type?: string | null
          subtype?: string | null
          type?: string | null
          unit_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          code?: string | null
          connection_id?: string
          created_at?: string
          currency_code?: string | null
          due_date?: string | null
          fixed_annual_rate?: number | null
          id?: string
          index_name?: string | null
          issue_date?: string | null
          issuer?: string | null
          last_month_rate?: number | null
          last_twelve_months_rate?: number | null
          metadata?: Json | null
          name?: string
          number?: string | null
          pluggy_investment_id?: string
          quantity?: number | null
          rate?: number | null
          rate_type?: string | null
          subtype?: string | null
          type?: string | null
          unit_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_investments_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "pluggy_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_recurring_payments: {
        Row: {
          account_id: string | null
          average_amount: number
          category: string | null
          created_at: string
          description: string
          frequency: string | null
          id: string
          is_active: boolean
          item_id: string
          last_occurrence_date: string | null
          next_expected_date: string | null
          raw_data: Json | null
          regularity_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          average_amount?: number
          category?: string | null
          created_at?: string
          description: string
          frequency?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          last_occurrence_date?: string | null
          next_expected_date?: string | null
          raw_data?: Json | null
          regularity_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          average_amount?: number
          category?: string | null
          created_at?: string
          description?: string
          frequency?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          last_occurrence_date?: string | null
          next_expected_date?: string | null
          raw_data?: Json | null
          regularity_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pluggy_sync_jobs: {
        Row: {
          action: string
          attempts: number | null
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          item_id: string
          max_attempts: number | null
          priority: number | null
          started_at: string | null
          status: string
          sync_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          item_id: string
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string
          sync_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          item_id?: string
          max_attempts?: number | null
          priority?: number | null
          started_at?: string | null
          status?: string
          sync_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pluggy_sync_logs: {
        Row: {
          accounts_synced: number | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          item_id: string | null
          job_id: string | null
          transactions_synced: number | null
          user_id: string | null
        }
        Insert: {
          accounts_synced?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          item_id?: string | null
          job_id?: string | null
          transactions_synced?: number | null
          user_id?: string | null
        }
        Update: {
          accounts_synced?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          item_id?: string | null
          job_id?: string | null
          transactions_synced?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_sync_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "pluggy_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pluggy_transactions: {
        Row: {
          account_id: string
          amount: number
          amount_in_account_currency: number | null
          bill_id: string | null
          category: string | null
          created_at: string
          credit_card_metadata: Json | null
          currency_code: string | null
          date: string
          description: string
          description_raw: string | null
          id: string
          payment_data: Json | null
          pluggy_bill_id: string | null
          pluggy_transaction_id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          amount_in_account_currency?: number | null
          bill_id?: string | null
          category?: string | null
          created_at?: string
          credit_card_metadata?: Json | null
          currency_code?: string | null
          date: string
          description: string
          description_raw?: string | null
          id?: string
          payment_data?: Json | null
          pluggy_bill_id?: string | null
          pluggy_transaction_id: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          amount_in_account_currency?: number | null
          bill_id?: string | null
          category?: string | null
          created_at?: string
          credit_card_metadata?: Json | null
          currency_code?: string | null
          date?: string
          description?: string
          description_raw?: string | null
          id?: string
          payment_data?: Json | null
          pluggy_bill_id?: string | null
          pluggy_transaction_id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pluggy_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pluggy_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pluggy_transactions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "credit_card_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pluggy_transactions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "credit_card_bills_with_totals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          ad_click_id: string | null
          admin_notes: string | null
          birth_date: string | null
          cpf_encrypted: string | null
          created_at: string
          crm_assigned_to: string | null
          crm_score: number | null
          crm_status: Database["public"]["Enums"]["crm_status_enum"]
          crm_status_changed_at: string | null
          crm_status_updated_at: string | null
          crm_tags: string[] | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          fbclid: string | null
          finance_mode: string | null
          first_conversion_event: string | null
          full_name: string | null
          gclid: string | null
          id: string
          invitation_status: string | null
          is_active: boolean
          last_auth_platform: string | null
          last_auth_provider: string | null
          last_login_at: string | null
          marketing_opt_in: boolean | null
          notify_due_dates: boolean
          notify_news: boolean
          notify_weekly_summary: boolean
          onboarding_completed: boolean | null
          onboarding_control_done: boolean
          onboarding_control_phase: string
          onboarding_phase: string
          phone: string | null
          principal_user_id: string | null
          push_notifications_enabled: boolean | null
          push_platform: string | null
          push_tokens: string[] | null
          referral_source: string | null
          status: string
          theme_preference: string | null
          updated_at: string
          user_type: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          account_type?: string
          ad_click_id?: string | null
          admin_notes?: string | null
          birth_date?: string | null
          cpf_encrypted?: string | null
          created_at?: string
          crm_assigned_to?: string | null
          crm_score?: number | null
          crm_status?: Database["public"]["Enums"]["crm_status_enum"]
          crm_status_changed_at?: string | null
          crm_status_updated_at?: string | null
          crm_tags?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          fbclid?: string | null
          finance_mode?: string | null
          first_conversion_event?: string | null
          full_name?: string | null
          gclid?: string | null
          id: string
          invitation_status?: string | null
          is_active?: boolean
          last_auth_platform?: string | null
          last_auth_provider?: string | null
          last_login_at?: string | null
          marketing_opt_in?: boolean | null
          notify_due_dates?: boolean
          notify_news?: boolean
          notify_weekly_summary?: boolean
          onboarding_completed?: boolean | null
          onboarding_control_done?: boolean
          onboarding_control_phase?: string
          onboarding_phase?: string
          phone?: string | null
          principal_user_id?: string | null
          push_notifications_enabled?: boolean | null
          push_platform?: string | null
          push_tokens?: string[] | null
          referral_source?: string | null
          status?: string
          theme_preference?: string | null
          updated_at?: string
          user_type?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          account_type?: string
          ad_click_id?: string | null
          admin_notes?: string | null
          birth_date?: string | null
          cpf_encrypted?: string | null
          created_at?: string
          crm_assigned_to?: string | null
          crm_score?: number | null
          crm_status?: Database["public"]["Enums"]["crm_status_enum"]
          crm_status_changed_at?: string | null
          crm_status_updated_at?: string | null
          crm_tags?: string[] | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          fbclid?: string | null
          finance_mode?: string | null
          first_conversion_event?: string | null
          full_name?: string | null
          gclid?: string | null
          id?: string
          invitation_status?: string | null
          is_active?: boolean
          last_auth_platform?: string | null
          last_auth_provider?: string | null
          last_login_at?: string | null
          marketing_opt_in?: boolean | null
          notify_due_dates?: boolean
          notify_news?: boolean
          notify_weekly_summary?: boolean
          onboarding_completed?: boolean | null
          onboarding_control_done?: boolean
          onboarding_control_phase?: string
          onboarding_phase?: string
          phone?: string | null
          principal_user_id?: string | null
          push_notifications_enabled?: boolean | null
          push_platform?: string | null
          push_tokens?: string[] | null
          referral_source?: string | null
          status?: string
          theme_preference?: string | null
          updated_at?: string
          user_type?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_crm_assigned_to_fkey"
            columns: ["crm_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_crm_assigned_to_fkey"
            columns: ["crm_assigned_to"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_crm_assigned_to_fkey"
            columns: ["crm_assigned_to"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "v_crm_kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_principal_user_id_fkey"
            columns: ["principal_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["user_id"]
          },
        ]
      }
      purchase_registry: {
        Row: {
          actual_value: number | null
          created_at: string
          estimated_value: number
          id: string
          installments: number | null
          lancamento_id: string | null
          link: string | null
          name: string
          notes: string | null
          payment_method: string | null
          planned_date: string | null
          purchase_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          installments?: number | null
          lancamento_id?: string | null
          link?: string | null
          name: string
          notes?: string | null
          payment_method?: string | null
          planned_date?: string | null
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          installments?: number | null
          lancamento_id?: string | null
          link?: string | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          planned_date?: string | null
          purchase_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notification_logs: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          platform: string | null
          sent_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          platform?: string | null
          sent_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          platform?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          action_key: string
          created_at: string | null
          id: number
          user_id: string
        }
        Insert: {
          action_key: string
          created_at?: string | null
          id?: never
          user_id: string
        }
        Update: {
          action_key?: string
          created_at?: string | null
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      rxsplit_contacts: {
        Row: {
          avatar_color: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          pix_key: string | null
          user_id: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          pix_key?: string | null
          user_id: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          pix_key?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rxsplit_expense_debtors: {
        Row: {
          amount: number
          contact_id: string
          expense_id: string
          id: string
        }
        Insert: {
          amount: number
          contact_id: string
          expense_id: string
          id?: string
        }
        Update: {
          amount?: number
          contact_id?: string
          expense_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rxsplit_expense_debtors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rxsplit_expense_debtors_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      rxsplit_expenses: {
        Row: {
          amount: number
          bill_split_id: string | null
          created_at: string
          description: string
          establishment_name: string | null
          group_id: string | null
          id: string
          payer_contact_id: string
          payment_date: string | null
          receipt_url: string | null
          split_mode: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_split_id?: string | null
          created_at?: string
          description: string
          establishment_name?: string | null
          group_id?: string | null
          id?: string
          payer_contact_id: string
          payment_date?: string | null
          receipt_url?: string | null
          split_mode?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_split_id?: string | null
          created_at?: string
          description?: string
          establishment_name?: string | null
          group_id?: string | null
          id?: string
          payer_contact_id?: string
          payment_date?: string | null
          receipt_url?: string | null
          split_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rxsplit_expenses_bill_split_id_fkey"
            columns: ["bill_split_id"]
            isOneToOne: false
            referencedRelation: "bill_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rxsplit_expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rxsplit_expenses_payer_contact_id_fkey"
            columns: ["payer_contact_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      rxsplit_group_members: {
        Row: {
          contact_id: string
          group_id: string
          id: string
          status: string
        }
        Insert: {
          contact_id: string
          group_id: string
          id?: string
          status?: string
        }
        Update: {
          contact_id?: string
          group_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rxsplit_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rxsplit_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rxsplit_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rxsplit_groups: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          is_active: boolean
          is_favorite: boolean
          is_main: boolean
          limit_per_user: number | null
          limit_total: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          is_main?: boolean
          limit_per_user?: number | null
          limit_total?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          is_main?: boolean
          limit_per_user?: number | null
          limit_total?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seguros: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          asset_id: string | null
          coberturas: Json | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          dia_vencimento: number | null
          forma_pagamento: string | null
          franquia: number | null
          id: string
          is_warranty: boolean | null
          nome: string
          numero_apolice: string | null
          observacoes: string | null
          premio_anual: number
          premio_mensal: number
          renovacao_automatica: boolean | null
          seguradora: string
          tipo: string
          updated_at: string | null
          user_id: string
          valor_cobertura: number
          warranty_extended: boolean | null
          warranty_extended_months: number | null
          warranty_store: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          asset_id?: string | null
          coberturas?: Json | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          dia_vencimento?: number | null
          forma_pagamento?: string | null
          franquia?: number | null
          id?: string
          is_warranty?: boolean | null
          nome: string
          numero_apolice?: string | null
          observacoes?: string | null
          premio_anual?: number
          premio_mensal?: number
          renovacao_automatica?: boolean | null
          seguradora: string
          tipo: string
          updated_at?: string | null
          user_id: string
          valor_cobertura?: number
          warranty_extended?: boolean | null
          warranty_extended_months?: number | null
          warranty_store?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          asset_id?: string | null
          coberturas?: Json | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          dia_vencimento?: number | null
          forma_pagamento?: string | null
          franquia?: number | null
          id?: string
          is_warranty?: boolean | null
          nome?: string
          numero_apolice?: string | null
          observacoes?: string | null
          premio_anual?: number
          premio_mensal?: number
          renovacao_automatica?: boolean | null
          seguradora?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
          valor_cobertura?: number
          warranty_extended?: boolean | null
          warranty_extended_months?: number | null
          warranty_store?: string | null
        }
        Relationships: []
      }
      store_category_rules: {
        Row: {
          category_id: string
          category_name: string
          created_at: string | null
          id: string
          normalized_store_name: string
          original_store_name: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string | null
          id?: string
          normalized_store_name: string
          original_store_name?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string | null
          id?: string
          normalized_store_name?: string
          original_store_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_friendly_name_rules: {
        Row: {
          created_at: string
          friendly_name: string
          id: string
          normalized_store_name: string
          original_store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friendly_name: string
          id?: string
          normalized_store_name: string
          original_store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friendly_name?: string
          id?: string
          normalized_store_name?: string
          original_store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          amount: number | null
          contact_email: string | null
          created_at: string
          currency: string | null
          event_status: string | null
          event_type: string
          id: string
          pagarme_transaction_id: string | null
          payment_method: string | null
          processed_at: string
          product_id: string | null
          product_name: string | null
          raw_payload: Json | null
          role_after: string | null
          role_before: string | null
          subscription_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          event_status?: string | null
          event_type: string
          id?: string
          pagarme_transaction_id?: string | null
          payment_method?: string | null
          processed_at?: string
          product_id?: string | null
          product_name?: string | null
          raw_payload?: Json | null
          role_after?: string | null
          role_before?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          event_status?: string | null
          event_type?: string
          id?: string
          pagarme_transaction_id?: string | null
          payment_method?: string | null
          processed_at?: string
          product_id?: string | null
          product_name?: string | null
          raw_payload?: Json | null
          role_after?: string | null
          role_before?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          allowed_pages: string[] | null
          checkout_url: string | null
          checkout_url_yearly: string | null
          created_at: string | null
          description: string | null
          discount_reason: string | null
          duration_days: number
          features: Json | null
          guru_product_id: string | null
          has_promo: boolean
          highlight_label: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_public: boolean | null
          name: string
          order_index: number | null
          original_price_monthly: number | null
          original_price_yearly: number | null
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          allowed_pages?: string[] | null
          checkout_url?: string | null
          checkout_url_yearly?: string | null
          created_at?: string | null
          description?: string | null
          discount_reason?: string | null
          duration_days?: number
          features?: Json | null
          guru_product_id?: string | null
          has_promo?: boolean
          highlight_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          order_index?: number | null
          original_price_monthly?: number | null
          original_price_yearly?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          allowed_pages?: string[] | null
          checkout_url?: string | null
          checkout_url_yearly?: string | null
          created_at?: string | null
          description?: string | null
          discount_reason?: string | null
          duration_days?: number
          features?: Json | null
          guru_product_id?: string | null
          has_promo?: boolean
          highlight_label?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          order_index?: number | null
          original_price_monthly?: number | null
          original_price_yearly?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          accounts_processed: number | null
          accounts_total: number | null
          bills_linked: number | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          job_type: string
          progress: number
          status: string
          transactions_saved: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts_processed?: number | null
          accounts_total?: number | null
          bills_linked?: number | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          progress?: number
          status?: string
          transactions_saved?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accounts_processed?: number | null
          accounts_total?: number | null
          bills_linked?: number | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          progress?: number
          status?: string
          transactions_saved?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tour_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_mobile: boolean | null
          session_id: string | null
          step_index: number | null
          step_target: string | null
          total_steps: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_mobile?: boolean | null
          session_id?: string | null
          step_index?: number | null
          step_target?: string | null
          total_steps?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_mobile?: boolean | null
          session_id?: string | null
          step_index?: number | null
          step_target?: string | null
          total_steps?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_asset_linked_expenses: {
        Row: {
          annual_months: number[] | null
          asset_id: string
          created_at: string
          expense_id: string
          expense_type: string
          frequency: string
          id: string
          is_auto_calculated: boolean | null
          monthly_value: number
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_months?: number[] | null
          asset_id: string
          created_at?: string
          expense_id: string
          expense_type: string
          frequency?: string
          id?: string
          is_auto_calculated?: boolean | null
          monthly_value?: number
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_months?: number[] | null
          asset_id?: string
          created_at?: string
          expense_id?: string
          expense_type?: string
          frequency?: string
          id?: string
          is_auto_calculated?: boolean | null
          monthly_value?: number
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_asset_linked_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_asset_monthly_entries: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_assets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_rental_property: boolean | null
          metadata: Json | null
          name: string
          purchase_date: string | null
          purchase_value: number | null
          rental_income_id: string | null
          rental_value: number | null
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_rental_property?: boolean | null
          metadata?: Json | null
          name: string
          purchase_date?: string | null
          purchase_value?: number | null
          rental_income_id?: string | null
          rental_value?: number | null
          type: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_rental_property?: boolean | null
          metadata?: Json | null
          name?: string
          purchase_date?: string | null
          purchase_value?: number | null
          rental_income_id?: string | null
          rental_value?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          accepted_at: string
          document_slug: string
          document_version: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_slug: string
          document_version: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_slug?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_device_tokens: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_id: string
          device_name: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_drivers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_owner: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_owner?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_owner?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_expense_items: {
        Row: {
          category_id: string
          category_name: string
          created_at: string
          default_item_id: string | null
          enabled: boolean
          expense_nature: string
          expense_type: string
          id: string
          is_recurring: boolean
          name: string
          order_index: number
          payment_method: string
          recurrence_type: string
          responsible_person_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          category_name: string
          created_at?: string
          default_item_id?: string | null
          enabled?: boolean
          expense_nature?: string
          expense_type?: string
          id?: string
          is_recurring?: boolean
          name: string
          order_index?: number
          payment_method?: string
          recurrence_type?: string
          responsible_person_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          category_name?: string
          created_at?: string
          default_item_id?: string | null
          enabled?: boolean
          expense_nature?: string
          expense_type?: string
          id?: string
          is_recurring?: boolean
          name?: string
          order_index?: number
          payment_method?: string
          recurrence_type?: string
          responsible_person_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_expense_items_default_item_id_fkey"
            columns: ["default_item_id"]
            isOneToOne: false
            referencedRelation: "default_expense_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_financial_institutions: {
        Row: {
          created_at: string
          credit_card_brand: string | null
          credit_card_due_day: number | null
          custom_code: string | null
          custom_name: string | null
          has_checking_account: boolean | null
          has_credit_card: boolean | null
          has_investments: boolean | null
          has_savings_account: boolean | null
          id: string
          institution_id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_card_brand?: string | null
          credit_card_due_day?: number | null
          custom_code?: string | null
          custom_name?: string | null
          has_checking_account?: boolean | null
          has_credit_card?: boolean | null
          has_investments?: boolean | null
          has_savings_account?: boolean | null
          id?: string
          institution_id: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_card_brand?: string | null
          credit_card_due_day?: number | null
          custom_code?: string | null
          custom_name?: string | null
          has_checking_account?: boolean | null
          has_credit_card?: boolean | null
          has_investments?: boolean | null
          has_savings_account?: boolean | null
          id?: string
          institution_id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_home_shortcuts: {
        Row: {
          created_at: string
          id: string
          slot_3: string
          slot_4: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slot_3?: string
          slot_4?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slot_3?: string
          slot_4?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_income_items: {
        Row: {
          created_at: string
          default_item_id: string | null
          enabled: boolean
          id: string
          is_stock_compensation: boolean
          method: string
          name: string
          order_index: number
          responsible_person_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_item_id?: string | null
          enabled?: boolean
          id?: string
          is_stock_compensation?: boolean
          method?: string
          name: string
          order_index?: number
          responsible_person_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_item_id?: string | null
          enabled?: boolean
          id?: string
          is_stock_compensation?: boolean
          method?: string
          name?: string
          order_index?: number
          responsible_person_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_income_items_default_item_id_fkey"
            columns: ["default_item_id"]
            isOneToOne: false
            referencedRelation: "default_income_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_kv_store: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json | null
        }
        Relationships: []
      }
      user_monthly_entries: {
        Row: {
          created_at: string
          entry_type: string
          id: string
          is_manual_override: boolean | null
          is_projection: boolean
          item_id: string
          month: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          entry_type: string
          id?: string
          is_manual_override?: boolean | null
          is_projection?: boolean
          item_id: string
          month: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          entry_type?: string
          id?: string
          is_manual_override?: boolean | null
          is_projection?: boolean
          item_id?: string
          month?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      user_shared_persons: {
        Row: {
          created_at: string
          email: string | null
          id: string
          income_item_ids: string[] | null
          is_owner: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          income_item_ids?: string[] | null
          is_owner?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          income_item_ids?: string[] | null
          is_owner?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trash: {
        Row: {
          asset_data: Json
          asset_type: string
          deleted_at: string
          deleted_reason: string | null
          expires_at: string
          id: string
          linked_data: Json | null
          original_id: string
          user_id: string
        }
        Insert: {
          asset_data: Json
          asset_type: string
          deleted_at?: string
          deleted_reason?: string | null
          expires_at?: string
          id?: string
          linked_data?: Json | null
          original_id: string
          user_id: string
        }
        Update: {
          asset_data?: Json
          asset_type?: string
          deleted_at?: string
          deleted_reason?: string | null
          expires_at?: string
          id?: string
          linked_data?: Json | null
          original_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vehicle_records: {
        Row: {
          created_at: string
          fuel_cost: number | null
          fuel_liters: number | null
          id: string
          metadata: Json | null
          notes: string | null
          odometer: number | null
          record_date: string
          record_type: string
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          fuel_cost?: number | null
          fuel_liters?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          odometer?: number | null
          record_date: string
          record_type?: string
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          fuel_cost?: number | null
          fuel_liters?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          odometer?: number | null
          record_date?: string
          record_type?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicle_fuel_consumption: {
        Row: {
          brand: string
          category: string
          consumption_average: number | null
          consumption_highway: number
          consumption_urban: number
          created_at: string
          engine: string | null
          fuel_type: string
          id: string
          model: string
          source: string | null
          updated_at: string
          user_id: string | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          brand: string
          category: string
          consumption_average?: number | null
          consumption_highway: number
          consumption_urban: number
          created_at?: string
          engine?: string | null
          fuel_type?: string
          id?: string
          model: string
          source?: string | null
          updated_at?: string
          user_id?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          brand?: string
          category?: string
          consumption_average?: number | null
          consumption_highway?: number
          consumption_urban?: number
          created_at?: string
          engine?: string | null
          fuel_type?: string
          id?: string
          model?: string
          source?: string | null
          updated_at?: string
          user_id?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: []
      }
      vendas_analytics: {
        Row: {
          afiliado_id: string | null
          canal_origem: string | null
          customer_email: string | null
          data_venda: string | null
          guru_order_id: string
          id: string
          status_pagamento: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          valor_venda: number
        }
        Insert: {
          afiliado_id?: string | null
          canal_origem?: string | null
          customer_email?: string | null
          data_venda?: string | null
          guru_order_id: string
          id?: string
          status_pagamento?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_venda: number
        }
        Update: {
          afiliado_id?: string | null
          canal_origem?: string | null
          customer_email?: string | null
          data_venda?: string | null
          guru_order_id?: string
          id?: string
          status_pagamento?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_venda?: number
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          magic_token: string | null
          otp_code: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          magic_token?: string | null
          otp_code: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          magic_token?: string | null
          otp_code?: string
        }
        Relationships: []
      }
      workspace_feature_preferences: {
        Row: {
          created_at: string
          feature_slug: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_slug: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_slug?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "v_user_plan"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          fiscal_config: Json | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string
          plan_expires_at: string | null
          plan_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fiscal_config?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id: string
          plan_expires_at?: string | null
          plan_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fiscal_config?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string
          plan_expires_at?: string | null
          plan_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      credit_card_bills_with_totals: {
        Row: {
          billing_month: string | null
          card_id: string | null
          card_name: string | null
          closing_date: string | null
          computed_total: number | null
          connector_image_url: string | null
          connector_primary_color: string | null
          created_at: string | null
          due_date: string | null
          has_total_divergence: boolean | null
          id: string | null
          lancamento_id: string | null
          paid_amount: number | null
          payment_source: string | null
          pending_total: number | null
          pluggy_bill_id: string | null
          requires_manual_check: boolean | null
          status: string | null
          total_value: number | null
          transaction_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_bills_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_realizados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_bills_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "v_lancamentos_full"
            referencedColumns: ["id"]
          },
        ]
      }
      fipe_catalog_health: {
        Row: {
          anos_absurdos: number | null
          anos_faltando_catalog: number | null
          campos_nulos_criticos: number | null
          checked_at: string | null
          fipe_codes_com_hifen: number | null
          metadados_inconsistentes: number | null
          orfaos_no_historico: number | null
          st_absurdos: string | null
          st_anos_faltando: string | null
          st_hifen: string | null
          st_metadados: string | null
          st_nulos: string | null
          st_orfaos: string | null
          st_year_id: string | null
          status_geral: string | null
          total_issues: number | null
          year_id_inconsistentes: number | null
        }
        Relationships: []
      }
      fipe_catalog_health_history: {
        Row: {
          anos_absurdos: number | null
          anos_faltando_catalog: number | null
          campos_nulos_criticos: number | null
          correcao_detalhes: Json | null
          correcoes_aplicadas: number | null
          fipe_codes_com_hifen: number | null
          metadados_inconsistentes: number | null
          orfaos_no_historico: number | null
          run_at: string | null
          status: string | null
          total_issues: number | null
          trigger_context: string | null
          triggered_by: string | null
          year_id_inconsistentes: number | null
        }
        Insert: {
          anos_absurdos?: number | null
          anos_faltando_catalog?: number | null
          campos_nulos_criticos?: number | null
          correcao_detalhes?: Json | null
          correcoes_aplicadas?: number | null
          fipe_codes_com_hifen?: number | null
          metadados_inconsistentes?: number | null
          orfaos_no_historico?: number | null
          run_at?: string | null
          status?: string | null
          total_issues?: number | null
          trigger_context?: string | null
          triggered_by?: string | null
          year_id_inconsistentes?: number | null
        }
        Update: {
          anos_absurdos?: number | null
          anos_faltando_catalog?: number | null
          campos_nulos_criticos?: number | null
          correcao_detalhes?: Json | null
          correcoes_aplicadas?: number | null
          fipe_codes_com_hifen?: number | null
          metadados_inconsistentes?: number | null
          orfaos_no_historico?: number | null
          run_at?: string | null
          status?: string | null
          total_issues?: number | null
          trigger_context?: string | null
          triggered_by?: string | null
          year_id_inconsistentes?: number | null
        }
        Relationships: []
      }
      fipe_error_summary: {
        Row: {
          error_type: string | null
          first_seen: string | null
          last_seen: string | null
          level: string | null
          runner: string | null
          total: number | null
          unique_fipe_codes: number | null
          unique_refs: number | null
        }
        Relationships: []
      }
      fipe_scale_progress: {
        Row: {
          erros: number | null
          indisponiveis: number | null
          inseridos: number | null
          jobs: number | null
          refs_processadas: number | null
          status: string | null
        }
        Relationships: []
      }
      v_crm_kanban: {
        Row: {
          account_count: number | null
          admin_notes: string | null
          computed_score: number | null
          created_at: string | null
          crm_score: number | null
          crm_status: Database["public"]["Enums"]["crm_status_enum"] | null
          crm_status_updated_at: string | null
          days_since_login: number | null
          days_since_signup: number | null
          email: string | null
          fbclid: string | null
          full_name: string | null
          gclid: string | null
          id: string | null
          last_login_at: string | null
          marketing_opt_in: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          plan_expires_at: string | null
          plan_name: string | null
          plan_slug: string | null
          referral_source: string | null
          total_balance: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Relationships: []
      }
      v_edge_function_security: {
        Row: {
          category: string | null
          function_slug: string | null
          rate_limited: boolean | null
          requires_admin: boolean | null
          requires_internal_secret: boolean | null
          security_level: string | null
          verify_jwt: boolean | null
        }
        Insert: {
          category?: string | null
          function_slug?: string | null
          rate_limited?: boolean | null
          requires_admin?: boolean | null
          requires_internal_secret?: boolean | null
          security_level?: never
          verify_jwt?: boolean | null
        }
        Update: {
          category?: string | null
          function_slug?: string | null
          rate_limited?: boolean | null
          requires_admin?: boolean | null
          requires_internal_secret?: boolean | null
          security_level?: never
          verify_jwt?: boolean | null
        }
        Relationships: []
      }
      v_lancamentos_full: {
        Row: {
          categoria: string | null
          created_at: string | null
          data_pagamento: string | null
          data_registro: string | null
          data_vencimento: string | null
          forma_pagamento: string | null
          friendly_name: string | null
          id: string | null
          is_category_confirmed: boolean | null
          mes_referencia: string | null
          meta_friendly_name: string | null
          meta_is_category_confirmed: boolean | null
          meta_purchase_registry_id: string | null
          meta_source_id: string | null
          meta_source_type: string | null
          nome: string | null
          observacoes: string | null
          purchase_registry_id: string | null
          source_id: string | null
          source_type: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string | null
          valor_previsto: number | null
          valor_realizado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_metadata_purchase_registry_id_fkey"
            columns: ["meta_purchase_registry_id"]
            isOneToOne: false
            referencedRelation: "purchase_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_realizados_purchase_registry_id_fkey"
            columns: ["purchase_registry_id"]
            isOneToOne: false
            referencedRelation: "purchase_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_plan: {
        Row: {
          plan_expires_at: string | null
          plan_name: string | null
          plan_slug: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { admin_user_id: string; target_user_id: string }
        Returns: Json
      }
      admin_get_notifications_with_stats: {
        Args: { p_limit?: number; p_offset?: number; p_type_filter?: string }
        Returns: Json
      }
      admin_manage_role: {
        Args: {
          action: string
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: Json
      }
      admin_refresh_latest_view: { Args: never; Returns: undefined }
      admin_rollback_migration: {
        Args: { _migration_name: string }
        Returns: Json
      }
      admin_send_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_priority?: string
          p_target_emails?: string[]
          p_title: string
          p_type?: string
        }
        Returns: Json
      }
      apply_batch_categories: { Args: { p_items: Json }; Returns: Json }
      apply_lancamento_category_rule: {
        Args: { p_categoria: string; p_nome_pattern: string; p_tipo: string }
        Returns: Json
      }
      apply_lancamento_friendly_name_rule: {
        Args: {
          p_friendly_name: string
          p_normalized_name: string
          p_original_name: string
        }
        Returns: Json
      }
      apply_pluggy_category_map_to_lancamentos: { Args: never; Returns: Json }
      apply_store_category_rule: {
        Args: {
          p_category_id: string
          p_category_name: string
          p_normalized_name: string
          p_original_name: string
        }
        Returns: Json
      }
      apply_store_friendly_name_rule: {
        Args: {
          p_friendly_name: string
          p_normalized_name: string
          p_original_name: string
        }
        Returns: Json
      }
      batch_link_transactions_to_bills: {
        Args: { _links: Json }
        Returns: Json
      }
      batch_update_bill_status: { Args: { _updates: Json }; Returns: Json }
      batch_upsert_pluggy_transactions: {
        Args: { _transactions: Json }
        Returns: Json
      }
      calcular_variacao_fipe: {
        Args: { fipe_input: string }
        Returns: {
          mes_ano: string
          preco: number
          variacao_percentual: number
        }[]
      }
      calculate_crm_score: { Args: { p_user_id: string }; Returns: number }
      check_admin_rate_limit: { Args: { p_email: string }; Returns: boolean }
      check_ai_rate_limit: {
        Args: { p_function_name: string; p_tokens?: number; p_user_id: string }
        Returns: Json
      }
      check_and_create_sync_job: { Args: { p_user_id: string }; Returns: Json }
      check_login_attempts: {
        Args: { p_email: string; p_ip?: unknown }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _action_key: string
          _max_per_day?: number
          _max_per_hour?: number
          _user_id: string
        }
        Returns: Json
      }
      claim_pilot_job: {
        Args: never
        Returns: {
          batch_size: number
          created_at: string | null
          erros: number | null
          fipe_code: string
          has_more: boolean | null
          id: number
          indisponiveis: number | null
          inseridos: number | null
          mismatches: number | null
          offset_val: number
          processed_at: string | null
          result: Json | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "fipe_pilot_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_scale_job: {
        Args: never
        Returns: {
          batch_size: number
          brand_id: number
          fipe_code: string
          job_id: number
          model_id: number
          model_year: number
          offset_val: number
          ref_end: number
          ref_start: number
          vehicle_type: number
          year_id: string
        }[]
      }
      cleanup_admin_sessions: { Args: never; Returns: number }
      cleanup_ai_rate_limits: { Args: never; Returns: undefined }
      cleanup_expired_admin_sessions: { Args: never; Returns: number }
      cleanup_expired_ai_audits: { Args: never; Returns: undefined }
      cleanup_expired_trash: { Args: never; Returns: Json }
      cleanup_expired_verification_tokens: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_rate_limit_log: { Args: never; Returns: number }
      cleanup_stale_device_tokens: { Args: never; Returns: number }
      continue_scale_job: {
        Args: {
          p_erros: number
          p_id: number
          p_indisponiveis: number
          p_inseridos: number
          p_next_offset: number
          p_refs_processadas: number
        }
        Returns: undefined
      }
      count_all_users_admin: {
        Args: { search_query?: string }
        Returns: number
      }
      create_admin_session: {
        Args: { _ip_address?: string; _user_agent?: string }
        Returns: Json
      }
      decrypt_api_key: {
        Args: { encrypted_key: string; encryption_key: string }
        Returns: string
      }
      detect_crm_churned_users: { Args: never; Returns: number }
      detect_crm_risk_users: { Args: never; Returns: number }
      detect_recurring_transactions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      encrypt_api_key: {
        Args: { encryption_key: string; plain_key: string }
        Returns: string
      }
      enqueue_pilot_batch: {
        Args: { p_batch_size?: number; p_fipe_code: string; p_offset: number }
        Returns: undefined
      }
      f_missing_prices: {
        Args: { ref: number }
        Returns: {
          brand_id: number
          brand_name: string
          fipe_code: string
          fuel_type: number
          model_id: number
          model_name: string
          vehicle_type: number
          year: number
          year_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "fipe_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      finish_scale_job: {
        Args: {
          p_erros: number
          p_id: number
          p_indisponiveis: number
          p_inseridos: number
          p_refs_processadas: number
          p_status?: string
        }
        Returns: undefined
      }
      generate_automatic_notifications: { Args: never; Returns: Json }
      generate_email_queue: { Args: never; Returns: number }
      generate_expiration_notifications: { Args: never; Returns: Json }
      get_active_device_tokens: {
        Args: { _user_id: string }
        Returns: {
          device_id: string
          platform: string
          token: string
        }[]
      }
      get_admin_dashboard_chart_data: { Args: never; Returns: Json }
      get_admin_dashboard_metrics_30d: { Args: never; Returns: Json }
      get_ai_monthly_summary: {
        Args: { p_month?: string; p_user_id: string }
        Returns: Json
      }
      get_ai_mvp_metrics: { Args: { p_start_date?: string }; Returns: Json }
      get_ai_raio_x_analysis: {
        Args: { p_month?: string; p_user_id: string }
        Returns: Json
      }
      get_ai_user_context: { Args: { p_user_id?: string }; Returns: Json }
      get_all_users_admin: {
        Args: {
          limit_count?: number
          offset_count?: number
          search_query?: string
        }
        Returns: Json
      }
      get_catalog_only_zero_km: {
        Args: { p_limit?: number }
        Returns: {
          brand_id: number
          brand_name: string
          fipe_code: string
          model_id: number
          model_name: string
          vehicle_type: number
        }[]
      }
      get_catalog_sparse_history: {
        Args: { p_limit?: number; p_max_refs?: number }
        Returns: {
          brand_id: number
          brand_name: string
          current_refs: number
          fipe_code: string
          model_id: number
          model_name: string
          vehicle_type: number
          year: number
          year_id: string
        }[]
      }
      get_catalog_without_history: {
        Args: { p_limit?: number }
        Returns: {
          brand_id: number
          brand_name: string
          fipe_code: string
          model_id: number
          model_name: string
          vehicle_type: number
          year: number
          year_id: string
        }[]
      }
      get_fipe_brands: {
        Args: { p_vehicle_type: number }
        Returns: {
          brand_id: number
          brand_name: string
        }[]
      }
      get_fipe_catalog_entry: {
        Args: {
          p_brand_id: number
          p_model_id: number
          p_vehicle_type: number
          p_year_id: string
        }
        Returns: {
          brand_name: string
          fipe_code: string
          fuel_type: number
          model_name: string
          year_val: number
        }[]
      }
      get_fipe_catalog_health_summary: { Args: never; Returns: Json }
      get_fipe_models: {
        Args: { p_brand_id: number; p_vehicle_type: number }
        Returns: {
          model_id: number
          model_name: string
        }[]
      }
      get_fipe_runner_status: { Args: never; Returns: Json }
      get_fipe_years: {
        Args: { p_brand_id: number; p_model_id: number; p_vehicle_type: number }
        Returns: {
          fuel_type: number
          year_id: string
          year_val: number
        }[]
      }
      get_label_mismatch_stats: { Args: never; Returns: Json }
      get_phase3_batch: {
        Args: { p_limit?: number }
        Returns: {
          brand_id: number
          fipe_code: string
          id: number
          model_id: number
          model_year: number
          reference_code: number
          vehicle_type: number
          year_id: string
        }[]
      }
      get_phase3_reference_progress: {
        Args: { p_limit?: number }
        Returns: {
          done: number
          pending: number
          reference_code: number
          slug: string
          total: number
          unavailable: number
        }[]
      }
      get_pluggy_bank_date_coverage: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
          account_name: string
          max_date: string
          min_date: string
          tx_count: number
        }[]
      }
      get_pluggy_date_coverage: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
          max_date: string
          min_date: string
          tx_count: number
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_unsynced_bank_transactions: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
          amount: number
          amount_in_account_currency: number | null
          bill_id: string | null
          category: string | null
          created_at: string
          credit_card_metadata: Json | null
          currency_code: string | null
          date: string
          description: string
          description_raw: string | null
          id: string
          payment_data: Json | null
          pluggy_bill_id: string | null
          pluggy_transaction_id: string
          status: string
          type: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pluggy_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_unsynced_pluggy_transactions: {
        Args: { p_account_id: string }
        Returns: {
          account_id: string
          amount: number
          amount_in_account_currency: number | null
          bill_id: string | null
          category: string | null
          created_at: string
          credit_card_metadata: Json | null
          currency_code: string | null
          date: string
          description: string
          description_raw: string | null
          id: string
          payment_data: Json | null
          pluggy_bill_id: string | null
          pluggy_transaction_id: string
          status: string
          type: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pluggy_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_cpf: { Args: { p_user_id: string }; Returns: string }
      get_user_plan_slug: { Args: { _user_id: string }; Returns: string }
      get_user_push_tokens: {
        Args: { _user_id: string }
        Returns: {
          platform: string
          token: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_owner_id: string
        }
        Returns: boolean
      }
      has_vehicle_access: {
        Args: {
          _user_id: string
          _vehicle_id: string
          _workspace_owner_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_mfa: { Args: { uid?: string }; Returns: boolean }
      is_protected_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_plan_expired: { Args: { _user_id: string }; Returns: boolean }
      list_available_rollbacks: {
        Args: never
        Returns: {
          applied_at: string | null
          created_by: string | null
          description: string | null
          environment: string
          id: string
          is_reversible: boolean | null
          migration_name: string
          rollback_sql: string
          rolled_back_at: string | null
          rolled_back_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "migration_rollbacks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_admin_action: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
          _severity?: string
        }
        Returns: undefined
      }
      log_admin_login_attempt: {
        Args: { p_email: string; p_ip?: unknown; p_success?: boolean }
        Returns: undefined
      }
      log_audit_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type?: string
          p_severity?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_fipe_error: {
        Args: {
          p_brand_id: number
          p_error_type: string
          p_fipe_code: string
          p_http_status: number
          p_level: string
          p_message: string
          p_model_id: number
          p_parsed_price?: number
          p_raw_response: string
          p_reference_code: number
          p_returned_label?: string
          p_runner: string
          p_url: string
          p_vehicle_type: number
          p_year_id: string
        }
        Returns: undefined
      }
      log_login_attempt: {
        Args: { p_email: string; p_ip: unknown; p_success: boolean }
        Returns: undefined
      }
      log_push_notification: {
        Args: {
          _body: string
          _data?: Json
          _platform?: string
          _status?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      mark_phase3_done: {
        Args: { p_ids: number[]; p_status?: string }
        Returns: undefined
      }
      mark_token_invalid: { Args: { _token: string }; Returns: undefined }
      move_to_trash: {
        Args: {
          _asset_data: Json
          _asset_type: string
          _linked_data?: Json
          _original_id: string
          _reason?: string
        }
        Returns: Json
      }
      normalize_store_name_sql: { Args: { raw_name: string }; Returns: string }
      populate_phase3_by_ref: {
        Args: { p_ref_end: number; p_ref_start: number }
        Returns: Json
      }
      populate_phase3_chunk: { Args: { p_limit?: number }; Returns: Json }
      populate_phase3_queue: { Args: { p_limit?: number }; Returns: Json }
      process_email_queue: { Args: never; Returns: number }
      refresh_all_crm_scores: { Args: never; Returns: undefined }
      register_device_token: {
        Args: {
          _app_version?: string
          _device_id: string
          _device_name?: string
          _platform: string
          _token: string
        }
        Returns: Json
      }
      repair_orphan_bill_links: { Args: never; Returns: number }
      repair_orphan_card_ids: { Args: { p_user_id: string }; Returns: Json }
      repair_pluggy_installment_data: { Args: never; Returns: Json }
      replace_template_vars: {
        Args: { fallback?: string; template: string; vars: Json }
        Returns: string
      }
      rescue_stuck_jobs: { Args: never; Returns: number }
      restore_from_trash: { Args: { _trash_id: string }; Returns: Json }
      revoke_admin_session: { Args: { _token: string }; Returns: Json }
      run_crm_maintenance: { Args: never; Returns: Json }
      run_fipe_catalog_health_check: {
        Args: {
          p_autocorrect?: boolean
          p_context?: string
          p_triggered_by?: string
        }
        Returns: {
          check_name: string
          corrected: number
          count: number
          status: string
        }[]
      }
      save_user_cpf: {
        Args: { p_cpf: string; p_user_id: string }
        Returns: undefined
      }
      should_send_notification: {
        Args: { _notification_type: string; _user_id: string }
        Returns: boolean
      }
      split_transaction: {
        Args: {
          p_installment_current?: number
          p_total_installments: number
          p_transaction_id: string
        }
        Returns: Json
      }
      timestamptz_to_date: { Args: { ts: string }; Returns: string }
      trigger_scale_orchestrator: {
        Args: { p_concurrency?: number }
        Returns: undefined
      }
      unregister_device_token: { Args: { _device_id: string }; Returns: Json }
      validate_admin_session: { Args: { _token: string }; Returns: Json }
      verify_admin: { Args: never; Returns: Json }
    }
    Enums: {
      affiliate_program_type: "standard" | "influencer"
      app_role: "owner" | "shared_user" | "driver" | "admin"
      crm_status_enum:
        | "lead"
        | "trial"
        | "onboarding"
        | "engajado"
        | "ativo"
        | "migrado"
        | "power_user"
        | "risco"
        | "churned"
        | "reconquistado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      affiliate_program_type: ["standard", "influencer"],
      app_role: ["owner", "shared_user", "driver", "admin"],
      crm_status_enum: [
        "lead",
        "trial",
        "onboarding",
        "engajado",
        "ativo",
        "migrado",
        "power_user",
        "risco",
        "churned",
        "reconquistado",
      ],
    },
  },
} as const
