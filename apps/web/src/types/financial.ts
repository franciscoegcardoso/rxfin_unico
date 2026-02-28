export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'debit_card' | 'auto_debit' | 'cash';

export type IncomeMethod = 'gross' | 'net';

// Tipos de reajuste para projeção
export type AdjustmentType = 'ipca' | 'igpm' | 'ibovespa' | 'fixed' | 'none';

// Base de cálculo para projeções
export type CalculationBase = 'last_month' | 'avg_3_months' | 'avg_6_months' | 'avg_12_months';

// Configuração global de projeção (padrões em Parâmetros)
export interface ProjectionDefaults {
  // Despesas
  expenseAdjustmentType: AdjustmentType;
  expenseAdditionalPercentage: number;
  expenseCalculationBase: CalculationBase;
  expenseIncludeZeroMonths: boolean;
  // Receitas
  incomeAdjustmentType: 'percentage' | 'fixed_value' | 'none';
  incomeAdjustmentValue: number;
  incomeCalculationBase: CalculationBase;
  incomeIncludeZeroMonths: boolean;
  // Pagamento padrão
  defaultPaymentMethod: PaymentMethod;
}

// Configuração de projeção para receitas
export interface IncomeProjectionConfig {
  adjustmentType: 'percentage' | 'fixed_value' | 'none';
  adjustmentValue: number; // Percentual ou valor em R$
  startMonth?: string; // Mês a partir do qual aplica (YYYY-MM)
  calculationBase?: CalculationBase; // Base de cálculo para o aumento
  includeZeroMonths?: boolean; // Se considera meses com valor zero na média
}

// Configuração de projeção para despesas
export interface ExpenseProjectionConfig {
  adjustmentType: AdjustmentType;
  additionalPercentage: number; // +X% adicional ao índice
  startMonth?: string; // Mês a partir do qual aplica (YYYY-MM)
  calculationBase?: CalculationBase; // Base de cálculo para o reajuste
  includeZeroMonths?: boolean; // Se considera meses com valor zero na média
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  // Configurações fiscais
  dependentsCount?: number; // Número de dependentes para cálculo de dedução
  alimonyValue?: number; // Valor mensal de pensão alimentícia (quando aplicável)
  irNotApplicableCategories?: string[]; // Categorias IR marcadas como não aplicáveis
  // PGBL
  pgblLimit?: number; // Limite anual de PGBL calculado/editado
  pgblIncomeGrowthRate?: number; // Taxa de crescimento da renda projetada (%)
  // FGTS
  fgtsSaqueAniversarioEnabled?: boolean; // Se aderiu ao saque aniversário
  fgtsBirthMonth?: number; // Mês de aniversário (1-12) para cálculo do saque
}

export interface SharedPerson {
  id: string;
  name: string;
  email?: string;
  isOwner?: boolean;
  incomeItemIds?: string[]; // IDs das receitas vinculadas
}

// Configuração de parcelamento do 13º salário
export interface ThirteenthSalaryConfig {
  isInstallment: boolean; // Se é parcelado ou pagamento único
  installmentCount?: number; // Número de parcelas (geralmente 2)
  installmentMonths?: number[]; // Meses das parcelas (ex: [11, 12] para novembro e dezembro)
}

export interface IncomeItem {
  id: string;
  name: string;
  enabled: boolean;
  method: IncomeMethod;
  responsiblePersonId?: string;
  projectionConfig?: IncomeProjectionConfig;
  // Definição de valores padrão
  grossValue?: number; // Valor Bruto em centavos
  discountRate?: number; // Alíquota de desconto (0-100)
  netValue?: number; // Valor Líquido em centavos
  // Flag para itens padrão do sistema
  isSystemDefault?: boolean;
  // Vínculo com ativo (relação 1:1)
  sourceAssetId?: string; // ID do ativo que gerou esta receita
  isAssetGenerated?: boolean; // Se foi gerado automaticamente por um ativo
  defaultValue?: number; // Valor default do cadastro do ativo
  // Novos campos para configuração de receitas
  dueDay?: number; // Dia de recebimento (1-31)
  frequency?: 'monthly' | 'annual' | 'custom'; // Frequência do recebimento
  occurrenceMonths?: number[]; // Meses de ocorrência para receitas não-mensais (1-12)
  thirteenthConfig?: ThirteenthSalaryConfig; // Configuração específica do 13º
  // Identificação da empresa pagadora
  payerCnpj?: string; // CNPJ da empresa pagadora
  payerCompanyName?: string; // Nome da empresa pagadora
  alias?: string; // Nome curto/identificador (máx 10 caracteres, para aluguéis)
  // Stock Compensation (Ações da empresa)
  isStockCompensation?: boolean; // Se é compensação em ações
  stockVestingConfig?: StockVestingConfig; // Configuração do vesting
}

export interface ExpenseCategory {
  id: string;
  name: string;
  reference?: string; // Referência bibliográfica
}

// Tipos de despesa baseados em metodologias de finanças pessoais
export type ExpenseType = 
  | 'fixed_essential'      // Despesa Fixa Essencial (moradia, contas básicas)
  | 'fixed_non_essential'  // Despesa Fixa Não Essencial (assinaturas, streaming)
  | 'variable_essential'   // Despesa Variável Essencial (alimentação, saúde)
  | 'variable_non_essential' // Despesa Variável Não Essencial (lazer, compras)
  | 'debt_payment'         // Pagamento de Dívidas
  | 'investment'           // Investimento/Poupança
  | 'emergency';           // Gastos Emergenciais

// Natureza da despesa: Fixa, Semi-variável ou Variável
export type ExpenseNature = 'fixed' | 'semi_variable' | 'variable';

// Tipo de recorrência
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface ExpenseItem {
  id: string;
  categoryId: string;
  category: string;
  name: string;
  expenseType: ExpenseType; // Tipo de despesa
  enabled: boolean;
  isRecurring: boolean;
  paymentMethod: PaymentMethod;
  responsiblePersonId?: string;
  projectionConfig?: ExpenseProjectionConfig;
  // Flag para itens padrão do sistema
  isSystemDefault?: boolean;
  // Flag para item de ajuste (delta do cartão de crédito)
  isAdjustmentItem?: boolean;
  // Vínculo com ativo (relação 1:1)
  sourceAssetId?: string; // ID do ativo que gerou esta despesa
  isAssetGenerated?: boolean; // Se foi gerado automaticamente por um ativo
  defaultValue?: number; // Valor default do cadastro do ativo
  frequency?: 'monthly' | 'annual' | 'custom'; // Frequência da despesa (legacy)
  annualMonths?: number[]; // Meses de pagamento para despesas anuais (1-12)
  // Novos campos para configuração de despesas
  dueDay?: number; // Dia de vencimento (1-31)
  alias?: string; // Nome curto/identificador (máx 10 caracteres, para aluguéis)
  // Classificação de natureza e recorrência
  expenseNature?: ExpenseNature; // Fixa ou Variável
  recurrenceType?: RecurrenceType; // Tipo de recorrência
}

export interface FinancialGoal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  deadline: Date;
}

// Tipos de patrimônio (aba Patrimônio)
export type AssetType = 
  | 'property'              // Imóvel
  | 'vehicle'               // Veículo
  | 'company'               // Empresa
  | 'valuable_objects'      // Objetos de valor (joias, obras de arte, antiguidades)
  | 'intellectual_property' // Propriedade intelectual (direitos autorais, patentes, marcas)
  | 'licenses_software'     // Licenças e Softwares
  | 'rights'                // Direitos (valores a receber)
  | 'obligations'           // Obrigações (dívidas a pagar)
  | 'investment'            // Investimento (usado na aba Investimentos)
  | 'other';                // Outro

// Tipos de investimento detalhados (aba Investimentos)
export type InvestmentType = 
  | 'renda_fixa'           // CDB, LCI, LCA, Tesouro Direto, Poupança
  | 'fundos_investimento'  // Fundos de Investimento
  | 'coe'                  // Certificado de Operações Estruturadas
  | 'renda_variavel'       // Ações, BDRs
  | 'fii'                  // Fundos Imobiliários
  | 'etf'                  // ETFs
  | 'ofertas_publicas'     // IPO, Follow-on
  | 'clubes_investimento'  // Clubes de Investimento
  | 'investimento_global'  // Investimentos no exterior
  | 'previdencia_privada'  // PGBL, VGBL
  | 'previdencia_corporativa' // Previdência oferecida pela empresa
  | 'seguro'               // Seguros com capitalização
  | 'criptoativos'         // Bitcoin, Ethereum, Altcoins
  | 'debentures'           // Debêntures
  | 'cri_cra'              // CRI e CRA
  | 'dinheiro_especie'     // Dinheiro em espécie
  | 'metais_preciosos'     // Ouro, prata, etc.
  | 'aplicacao_financeira' // Aplicação financeira geral
  | 'reserva_emergencia'   // Reserva de emergência
  | 'fgts'                 // Fundo de Garantia do Tempo de Serviço
  | 'outros';              // Outros investimentos

// Tipos de plano de previdência corporativa
export type CorporatePensionPlanType = 'CD' | 'BD'; // Contribuição Definida ou Benefício Definido
export type CorporatePensionTaxationType = 'PGBL' | 'VGBL' | 'EFPC'; // Entidade Fechada de Previdência Complementar

// Tipos de compensação em ações (Stock Compensation)
export type StockCompensationType = 'stock_options' | 'rsu' | 'espp' | 'phantom_stock';
export type VestingType = 'cliff' | 'graded' | 'immediate';

// Evento individual de vesting
export interface VestingEvent {
  date: string; // Data do vesting (YYYY-MM-DD)
  quantity: number; // Quantidade que veste nesta data
  isVested: boolean; // Se já vestiu
  value?: number; // Valor estimado no momento do vesting
}

// Configuração de Stock Options/RSUs
export interface StockVestingConfig {
  // Dados do plano
  compensationType: StockCompensationType;
  companyName: string; // Empresa que oferece as ações
  ticker?: string; // Ticker da ação (ex: PETR4, GOOGL)
  
  // Grant (concessão)
  grantDate: string; // Data da concessão
  grantQuantity: number; // Quantidade de ações concedidas
  grantPrice?: number; // Preço de exercício (Stock Options) ou preço na data do grant (RSU)
  currentStockPrice?: number; // Preço atual da ação
  
  // Vesting
  vestingType: VestingType;
  cliffMonths?: number; // Meses até primeiro vesting (se cliff)
  vestingPeriodMonths: number; // Período total de vesting
  vestingSchedule?: VestingEvent[]; // Schedule customizado/calculado
  
  // Status
  vestedQuantity: number; // Quantidade já vestida
  exercisedQuantity?: number; // Quantidade já exercida (Stock Options)
  
  // Vínculo
  linkedIncomeId?: string; // Salário vinculado para contexto
}

// Configuração de previdência privada corporativa
export interface CorporatePensionConfig {
  planName: string; // Nome do plano (ex: "FunPrev", "Bradesco Corporate")
  planType: CorporatePensionPlanType;
  taxationType: CorporatePensionTaxationType;
  
  // Contribuições
  employeeContributionPercent: number; // % do salário descontado
  employerMatchPercent: number; // % de match da empresa (ex: 100% = empresa iguala)
  employerMaxMatchPercent?: number; // Limite máximo do match (ex: até 6% do salário)
  
  // Vesting (direito às contribuições da empresa)
  vestingPeriodMonths: number; // Prazo para vesting total (em meses)
  vestingStartDate?: string; // Data de início do vesting
  currentVestingPercent?: number; // % atual já vestido
  
  // Portabilidade
  isPortable: boolean; // Se permite portabilidade
  portabilityStartDate?: string; // Data a partir da qual pode portar
  
  // Valores acumulados
  employeeBalance: number; // Saldo das contribuições do funcionário
  employerBalance: number; // Saldo das contribuições da empresa
  
  // Vínculo com receita (salário)
  linkedIncomeId?: string; // ID da receita (salário) vinculada
  
  // Dados da empresa
  companyName?: string; // Nome da empresa que oferece o plano
  cnpj?: string; // CNPJ da empresa
}

// Tipos para empresas
export type CompanyValuationType = 'simple' | 'calculated';
export type CompanySector = 'technology' | 'services' | 'retail' | 'industry' | 'finance' | 'health' | 'agribusiness' | 'construction' | 'education' | 'other';

// Multiplicadores por setor (EV/EBITDA médio do mercado brasileiro)
export const COMPANY_SECTOR_MULTIPLIERS: Record<CompanySector, { multiplier: number; label: string }> = {
  technology: { multiplier: 8, label: 'Tecnologia' },
  finance: { multiplier: 7, label: 'Serviços Financeiros' },
  health: { multiplier: 6, label: 'Saúde' },
  services: { multiplier: 4, label: 'Serviços' },
  education: { multiplier: 4, label: 'Educação' },
  industry: { multiplier: 4, label: 'Indústria' },
  construction: { multiplier: 3.5, label: 'Construção' },
  retail: { multiplier: 3, label: 'Comércio' },
  agribusiness: { multiplier: 3, label: 'Agronegócio' },
  other: { multiplier: 3, label: 'Outro' },
};

export type PropertyAdjustmentType = 'igpm' | 'ipca' | 'minimum_wage' | 'none' | 'custom';
export type VehicleAdjustmentType = 'fipe' | 'custom';

export type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex';

// Responsável por despesas do imóvel alugado
export type ExpenseResponsible = 'owner' | 'tenant';

// Responsabilidade padrão de mercado para despesas de aluguel
export interface RentalExpenseResponsibility {
  iptu: ExpenseResponsible;
  condominio: ExpenseResponsible;
  agua: ExpenseResponsible;
  luz: ExpenseResponsible;
  gas: ExpenseResponsible;
  seguro: ExpenseResponsible;
  manutencaoOrdinaria: ExpenseResponsible; // Pequenos reparos
  manutencaoExtraordinaria: ExpenseResponsible; // Reformas estruturais
}

// Valores mensais médios das despesas do imóvel
export interface PropertyMonthlyExpenses {
  iptu: number;
  condominio: number;
  agua: number;
  luz: number;
  gas: number;
  seguro: number;
  manutencaoOrdinaria: number;
  manutencaoExtraordinaria: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  description?: string;
  isRentalProperty?: boolean;
  rentalIncomeId?: string;
  rentalValue?: number; // Valor do aluguel mensal
  // Novos campos
  purchaseDate?: string;
  purchaseValue?: number;
  // Para imóveis
  propertyAdjustment?: PropertyAdjustmentType;
  propertyCep?: string; // CEP do imóvel
  propertyArea?: number; // Área em m²
  averageRentedMonths?: number; // Média de meses alugado por ano (0-12)
  // Para aluguel de imóveis
  rentAdjustmentMonth?: number; // 1-12
  rentAdjustmentReminder?: boolean;
  expenseResponsibility?: RentalExpenseResponsibility; // Quem arca com cada despesa
  propertyMonthlyExpenses?: PropertyMonthlyExpenses; // Valores mensais médios
  linkExpensesToPlanning?: boolean; // Se deve vincular despesas ao planejamento
  // Para veículos
  isZeroKm?: boolean;
  vehicleAdjustment?: VehicleAdjustmentType;
  fipePercentage?: number; // % da tabela FIPE
  // Códigos FIPE para auto-preenchimento
  fipeVehicleType?: 'carros' | 'motos' | 'caminhoes';
  fipeBrandCode?: string;
  fipeModelCode?: string;
  fipeYearCode?: string;
  fipeFullName?: string; // Nome completo do veículo via FIPE
  // Parâmetros de custo do veículo
  vehicleState?: string; // UF onde está licenciado
  monthlyKm?: number; // Média de km rodados por mês
  fuelConsumption?: number; // Consumo médio em km/l
  fuelType?: FuelType; // Tipo de combustível
  fuelPrice?: number; // Preço médio do combustível em R$/litro
  mainDriverId?: string; // Motorista principal do veículo
  // Campos para veículos vendidos
  isSold?: boolean; // Se o veículo foi vendido
  saleDate?: string; // Data da venda
  saleValue?: number; // Valor de venda
  saleOdometer?: number; // Odômetro no momento da venda
  purchaseOdometer?: number; // Odômetro no momento da compra
  // Para curva linear personalizada
  useCustomCurve?: boolean;
  initialValue?: number;
  finalValue?: number;
  finalDate?: string;
  // Para empresas
  companyValuationType?: CompanyValuationType; // Tipo de valoração
  companyOwnershipPercent?: number; // Participação % (0-100)
  companyMarketValue?: number; // Valor de mercado estimado (100% da empresa)
  companySector?: CompanySector; // Setor de atuação
  companyAnnualProfit?: number; // Lucro líquido anual (LTM)
  companyCashPosition?: number; // Caixa líquido (+) ou Dívidas (-)
  companyCalculatedValue?: number; // Valor calculado pelo algoritmo
  // Custos vinculados ao ativo (para projeção automática)
  linkedExpenses?: AssetLinkedExpense[];
  // Para investimentos
  investmentType?: InvestmentType; // Tipo de investimento detalhado
  investmentInstitutionId?: string; // ID da instituição financeira vinculada
  investmentTicker?: string; // Ticker/código do ativo (ex: PETR4, ITUB4)
  investmentQuantity?: number; // Quantidade de cotas/ações
  investmentAveragePrice?: number; // Preço médio de aquisição
  // Campos específicos para previdência corporativa
  isCorporatePension?: boolean; // Se é um plano de previdência corporativa
  corporatePensionConfig?: CorporatePensionConfig; // Configuração do plano corporativo
}

// Despesa vinculada a um ativo (para projeção automática)
export interface AssetLinkedExpense {
  expenseId: string; // ID do ExpenseItem vinculado
  expenseType: 'ipva' | 'seguro_auto' | 'combustivel' | 'manutencao_veiculo' | 'licenciamento' | 'estacionamento' | 'sem_parar' | 'iptu' | 'condominio' | 'seguro_residencial' | 'agua' | 'luz' | 'manutencao_imovel';
  monthlyValue: number; // Valor mensal calculado/configurado
  isAutoCalculated: boolean; // Se usa o cálculo de benchmark
  frequency: 'monthly' | 'annual';
  annualMonths?: number[]; // Meses de pagamento para despesas anuais (1-12)
  paymentMethod?: PaymentMethod; // Forma de pagamento
}

// Dados mensais para planejamento
export interface MonthlyEntry {
  month: string; // formato YYYY-MM
  itemId: string;
  type: 'income' | 'expense';
  value: number;
  isProjection: boolean;
  isManualOverride?: boolean; // Se o valor foi ajustado manualmente sobre a projeção
}

// Dados mensais para evolução patrimonial
export interface AssetMonthlyEntry {
  month: string; // formato YYYY-MM
  assetId: string;
  value: number;
}

// Driver interface (imported from vehicle.ts for consistency)
export interface Driver {
  id: string;
  name: string;
  email?: string;
  isOwner?: boolean; // Owner cannot be deleted
}

export interface FinancialConfig {
  accountType: 'individual' | 'shared';
  userProfile: UserProfile;
  sharedWith: SharedPerson[];
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
  goals: FinancialGoal[];
  assets: Asset[];
  monthlyEntries: MonthlyEntry[];
  assetMonthlyEntries: AssetMonthlyEntry[];
  financialInstitutions: UserFinancialInstitution[];
  drivers: Driver[];
  projectionDefaults?: ProjectionDefaults;
}

export type InstitutionType = 'bank' | 'digital_bank' | 'credit_card' | 'brokerage' | 'fintech';

export interface FinancialInstitution {
  id: string;
  code: string;
  name: string;
  type: InstitutionType;
  logo?: string;
  color: string;
}

export interface UserFinancialInstitution {
  id: string;
  institutionId: string;
  customName?: string;
  customCode?: string;
  hasCheckingAccount: boolean;
  hasSavingsAccount: boolean;
  hasCreditCard: boolean;
  hasInvestments: boolean;
  creditCardBrand?: string;
  creditCardDueDay?: number; // Dia do vencimento da fatura (1-31)
  notes?: string;
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}
