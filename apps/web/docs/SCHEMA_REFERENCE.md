# RXFin — Schema Reference (REAL columns, validated 28/02/2026)
## ⚠️ REGRA: Consultar SEMPRE este documento antes de referenciar qualquer tabela

---

## profiles
| Coluna | Tipo |
|--------|------|
| id | uuid (PK, = auth.users.id) |
| full_name | text |
| email | text |
| phone | text |
| birth_date | date |
| is_active | boolean |
| status | text |
| theme_preference | text |
| finance_mode | text |
| account_type | text |
| onboarding_completed | boolean |
| onboarding_phase | text |
| onboarding_completed_at | timestamptz |
| crm_status | enum(crm_lead_status) |
| crm_score | integer |
| last_login_at | timestamptz |
| **NÃO EXISTE:** avatar_url, display_name, plan_slug, subscription_id |

---

## lancamentos_realizados
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid (FK profiles) |
| tipo | text ('receita' / 'despesa') |
| categoria | text |
| category_id | text (FK expense_categories) |
| nome | text |
| valor_previsto | numeric |
| valor_realizado | numeric |
| mes_referencia | text ('YYYY-MM') |
| data_vencimento | date |
| data_pagamento | date |
| forma_pagamento | text |
| fonte_type | text |
| **NÃO EXISTE:** valor, data, status, amount |

---

## credit_card_bills
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid (FK profiles) |
| card_id | text |
| card_name | text |
| closing_date | date |
| due_date | date |
| total_value | numeric |
| status | text |
| billing_month | text ('YYYY-MM') |
| paid_amount | numeric |
| **NÃO EXISTE:** credit_card_id (FK) — NÃO existe tabela credit_cards |

---

## credit_card_transactions
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| store_name | text |
| value | numeric |
| transaction_date | date |
| category | text |
| card_id | text |
| credit_card_bill_id | uuid |
| **NÃO EXISTE:** amount, description |

---

## user_assets
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| name | text |
| type | text |
| value | numeric |
| purchase_date | date |
| purchase_value | numeric |
| is_rental_property | boolean |
| rental_value | numeric |
| **NÃO EXISTE:** asset_type, current_value, acquisition_value, acquisition_date |

---

## user_asset_linked_expenses
| Coluna | Tipo |
|--------|------|
| monthly_value | numeric |
| expense_type | text |
| **NÃO EXISTE:** monthly_amount |

---

## favorite_vehicles (tabela master de veículos do usuário)
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| brand_name | text |
| model_name | text |
| year_label | text |
| fipe_code | text |
| fipe_value | numeric |
| display_name | text |
| vehicle_type | text |
| position | integer |
| **NÃO EXISTE:** brand, model, year, plate, purchase_value, purchase_date |

---

## user_vehicle_records (registros de abastecimento/manutenção)
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| vehicle_id | text |
| record_date | date |
| odometer | integer |
| fuel_liters | numeric |
| fuel_cost | numeric |
| record_type | text |
| **NÃO É tabela master de veículos — NÃO tem:** brand, model, fipe_code, fipe_value |

---

## financiamentos
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| nome | text |
| valor_bem | numeric |
| valor_entrada | numeric |
| valor_financiado | numeric |
| prazo_total | integer |
| parcelas_pagas | integer |
| valor_parcela_atual | numeric |
| taxa_juros_mensal | numeric |
| saldo_devedor | numeric |
| instituicao_financeira | text |
| **NÃO EXISTE:** type, description, total_value, remaining_value, monthly_payment, interest_rate, total_installments, paid_installments |

---

## consorcios
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| nome | text |
| valor_carta | numeric |
| valor_parcela_atual | numeric |
| prazo_total | integer |
| parcelas_pagas | integer |
| contemplado | boolean |
| administradora | text |
| grupo | text |
| cota | text |
| **NÃO EXISTE:** type, description, total_value, monthly_payment, was_contemplated |

---

## seguros
| Coluna | Tipo |
|--------|------|
| id | uuid (PK) |
| user_id | uuid |
| nome | text |
| tipo | text |
| seguradora | text |
| premio_mensal | numeric |
| premio_anual | numeric |
| valor_cobertura | numeric |
| franquia | numeric |
| data_inicio | date |
| data_fim | date |
| **NÃO EXISTE:** type, description, insurer, premium, coverage_value, start_date, end_date |

---

## expense_categories
| Coluna | Tipo |
|--------|------|
| id | **text** (NÃO uuid!) |
| name | text |
| reference | text |

---

## user_roles
| Coluna | Tipo |
|--------|------|
| role | enum app_role: 'owner', 'shared_user', 'driver', 'admin', 'super_admin' |
| **NÃO EXISTE:** 'free', 'premium', 'subscriber' |

---

## user_expense_items
| Coluna | Tipo |
|--------|------|
| expense_type | text |
| **NÃO EXISTE:** default_value |

---

## user_goals
| Coluna | Tipo |
|--------|------|
| name | text |
| target_amount | numeric |
| current_amount | numeric |
| deadline | date |
| icon | text |
| order_index | integer |

---

## onboarding_phase_history
| Coluna | Tipo |
|--------|------|
| phase | text |
| started_at | timestamptz |
| ended_at | timestamptz |
| **NÃO EXISTE:** new_phase, old_phase |

---

## pluggy_transactions
| Coluna | Tipo |
|--------|------|
| amount | numeric |
| date | date |
| description | text |
| **Nota:** campo é `amount` (diferente de credit_card_transactions que usa `value`) |

---

## vehicle_fuel_consumption (DADOS DE REFERÊNCIA, não por usuário)
| Coluna | Tipo |
|--------|------|
| brand, model | text (referência) |
| consumption_urban, consumption_highway, consumption_average | numeric |
| **NÃO É tabela por-usuário** — NÃO tem: total_cost, liters, distance_km, date |

---

## ⚠️ TABELAS QUE NÃO EXISTEM

| Tabela inventada | Usar no lugar |
|------------------|---------------|
| credit_cards | credit_card_bills (card_name, card_id) |
| user_vehicles | favorite_vehicles |
| vehicle_records.brand/model | favorite_vehicles.brand_name/model_name |

---

## RPCs Disponíveis (21 user-facing, todas testadas ✅)

| RPC | Parâmetros | Retorno |
|-----|-----------|---------|
| get_home_dashboard | p_user_id, p_month | jsonb (mega dashboard) |
| get_dashboard_summary | p_user_id, p_month | jsonb |
| get_dashboard_enhanced | p_user_id, p_month | jsonb |
| get_smart_alerts | p_user_id, p_month | jsonb |
| get_budget_vs_actual | p_user_id, p_month | jsonb |
| get_lancamentos_summary | p_user_id, p_month | jsonb |
| get_credit_card_dashboard | p_user_id, p_month | jsonb |
| get_patrimonio_overview | p_user_id | jsonb |
| get_vehicle_dashboard | p_user_id | jsonb |
| get_banking_overview | p_user_id | jsonb |
| get_gifts_planner | p_user_id | jsonb |
| get_notifications_page | p_user_id | jsonb |
| get_annual_overview | p_user_id, p_year (text 'YYYY') | jsonb |
| get_expense_trends | p_user_id, p_months (int) | jsonb |
| get_rxsplit_overview | p_user_id | jsonb |
| get_financial_report | p_user_id, p_start_month, p_end_month | jsonb |
| get_recurring_expenses_overview | p_user_id, p_months (int, default 3) | jsonb |
| get_trash_items | p_user_id | jsonb |
| get_purchase_registry | p_user_id | jsonb |
| get_onboarding_status | p_user_id | jsonb |
| get_subscription_plans_public | (sem params) | jsonb |

**Todos p_user_id têm DEFAULT auth.uid()** — frontend autenticado pode chamar sem passar user_id.
