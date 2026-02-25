import { IncomeItem, ExpenseItem, ExpenseCategory, PaymentMethod, FinancialGoal, Asset, AssetType, FinancialInstitution, InstitutionType, ExpenseType, InvestmentType } from '@/types/financial';

export const defaultIncomeItems: IncomeItem[] = [
  { id: '1', name: 'Salário', enabled: true, method: 'gross', isSystemDefault: true },
  { id: '2', name: '13º Salário', enabled: true, method: 'gross', isSystemDefault: true },
  { id: '3', name: 'Vale Refeição / Vale Alimentação', enabled: true, method: 'net', isSystemDefault: true },
  { id: '4', name: 'Remuneração Extra', enabled: true, method: 'net', isSystemDefault: true },
  { id: '5', name: 'Bônus', enabled: true, method: 'net', isSystemDefault: true },
  { id: '6', name: 'Empréstimo', enabled: false, method: 'net', isSystemDefault: true },
  { id: '7', name: 'Pagamentos Terceiro', enabled: false, method: 'net', isSystemDefault: true },
  { id: '8', name: 'Outro', enabled: true, method: 'net', isSystemDefault: true },
  { id: '9', name: 'Renda de Aluguel', enabled: false, method: 'net', isSystemDefault: true },
  { id: '10', name: 'Stock Options / RSUs', enabled: false, method: 'net', isSystemDefault: true, isStockCompensation: true },
];

// Categorias baseadas na metodologia 50-30-20 (Elizabeth Warren)
// Ref: "All Your Worth: The Ultimate Lifetime Money Plan" (2005)
export const expenseCategories: ExpenseCategory[] = [
  { id: 'debts', name: 'Pagamento Dívidas', reference: 'Necessidades (50%)' },
  { id: 'home', name: 'Contas da Casa', reference: 'Necessidades (50%)' },
  { id: 'food', name: 'Alimentação', reference: 'Necessidades (50%)' },
  { id: 'transport', name: 'Transporte e Veículo', reference: 'Necessidades (50%)' },
  { id: 'health', name: 'Saúde', reference: 'Necessidades (50%)' },
  { id: 'personal', name: 'Vestuário e Pessoal', reference: 'Desejos (30%)' },
  { id: 'housing', name: 'Casa e Moradia', reference: 'Necessidades (50%)' },
  { id: 'leisure', name: 'Lazer e Social', reference: 'Desejos (30%)' },
  { id: 'shopping', name: 'Compras e Outros', reference: 'Desejos (30%)' },
  { id: 'streaming', name: 'Entretenimento e Streaming', reference: 'Desejos (30%)' },
  { id: 'tech', name: 'Tecnologia e Produtividade', reference: 'Desejos (30%)' },
  { id: 'services', name: 'Serviços e Utilidades', reference: 'Desejos (30%)' },
  { id: 'subscriptions', name: 'Clubes de Assinatura', reference: 'Desejos (30%)' },
  { id: 'education', name: 'Educação e Desenvolvimento', reference: 'Necessidades (50%)' },
  { id: 'insurance', name: 'Seguros e Assistências', reference: 'Necessidades (50%)' },
  { id: 'extras', name: 'Gastos Extras', reference: 'Reserva de Emergência' },
  { id: 'outros', name: 'Outros', reference: 'Ajustes e Diferenças' },
];

export const defaultExpenseItems: ExpenseItem[] = [
  // Pagamento Dívidas
  { id: 'e1', categoryId: 'debts', category: 'Pagamento Dívidas', name: 'Pagamento Empréstimo', expenseType: 'debt_payment', enabled: false, isRecurring: true, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e2', categoryId: 'debts', category: 'Pagamento Dívidas', name: 'Pagamento Dívida', expenseType: 'debt_payment', enabled: false, isRecurring: true, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Contas da Casa (Fixas Essenciais)
  { id: 'e3', categoryId: 'home', category: 'Contas da Casa', name: 'Aluguel', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e4', categoryId: 'home', category: 'Contas da Casa', name: 'Condomínio', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e5', categoryId: 'home', category: 'Contas da Casa', name: 'Luz', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e6', categoryId: 'home', category: 'Contas da Casa', name: 'Água', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e7', categoryId: 'home', category: 'Contas da Casa', name: 'Gás', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e8', categoryId: 'home', category: 'Contas da Casa', name: 'Internet', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Alimentação
  { id: 'e9', categoryId: 'food', category: 'Alimentação', name: 'Supermercado (compras para casa)', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  { id: 'e10', categoryId: 'food', category: 'Alimentação', name: 'Refeição Fora (Jantar / Saída)', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  
  // Transporte e Veículo
  { id: 'e11', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Combustível', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  { id: 'e12', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Manutenção', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e13', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Aplicativos de Transporte', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  { id: 'e14', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Estacionamento Avulso', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  { id: 'e44', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Lavagem de Carro', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e45', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Multas de Trânsito', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e46', categoryId: 'transport', category: 'Transporte e Veículo', name: 'Sem Parar / Pedágio', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  
  // Saúde
  { id: 'e15', categoryId: 'health', category: 'Saúde', name: 'Plano de Saúde', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'debit_card', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e16', categoryId: 'health', category: 'Saúde', name: 'Medicamentos', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e17', categoryId: 'health', category: 'Saúde', name: 'Consultas Médicas (Particulares)', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e47', categoryId: 'health', category: 'Saúde', name: 'Higiene Pessoal e Perfumaria', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e48', categoryId: 'health', category: 'Saúde', name: 'Exames Laboratoriais / Imagem', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e49', categoryId: 'health', category: 'Saúde', name: 'Dentista (Procedimentos avulsos)', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e50', categoryId: 'health', category: 'Saúde', name: 'Terapia / Psicólogo', expenseType: 'variable_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'weekly' },
  { id: 'e51', categoryId: 'health', category: 'Saúde', name: 'Bem-estar', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  
  // Vestuário e Pessoal
  { id: 'e40', categoryId: 'personal', category: 'Vestuário e Pessoal', name: 'Roupas', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e41', categoryId: 'personal', category: 'Vestuário e Pessoal', name: 'Calçados (Tênis / Sapatos)', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e42', categoryId: 'personal', category: 'Vestuário e Pessoal', name: 'Acessórios (Óculos / Relógios / Joias)', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'annual' },
  { id: 'e43', categoryId: 'personal', category: 'Vestuário e Pessoal', name: 'Beleza (Cabeleireiro / Barbearia)', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e52', categoryId: 'personal', category: 'Vestuário e Pessoal', name: 'Beleza (Manicure / Pedicure / Estética)', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  
  // Casa e Moradia
  { id: 'e53', categoryId: 'housing', category: 'Casa e Moradia', name: 'Material de Construção / Reparos', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e54', categoryId: 'housing', category: 'Casa e Moradia', name: 'Mão de obra (Encanador, Eletricista)', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e55', categoryId: 'housing', category: 'Casa e Moradia', name: 'Móveis e Decoração', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'annual' },
  { id: 'e56', categoryId: 'housing', category: 'Casa e Moradia', name: 'Utilidades Domésticas', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e57', categoryId: 'housing', category: 'Casa e Moradia', name: 'Material de Limpeza', expenseType: 'variable_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e58', categoryId: 'housing', category: 'Casa e Moradia', name: 'Veterinário / Banho e Tosa', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e59', categoryId: 'housing', category: 'Casa e Moradia', name: 'Ração e Acessórios (Pets)', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'semi_variable', recurrenceType: 'monthly' },
  { id: 'e60', categoryId: 'housing', category: 'Casa e Moradia', name: 'Faxina / Diarista', expenseType: 'variable_essential', enabled: false, isRecurring: true, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'weekly' },
  
  // Lazer e Social
  { id: 'e18', categoryId: 'leisure', category: 'Lazer e Social', name: 'Entretenimento (Cinema / Teatro)', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e19', categoryId: 'leisure', category: 'Lazer e Social', name: 'Viagens', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'semiannual' },
  { id: 'e61', categoryId: 'leisure', category: 'Lazer e Social', name: 'Shows / Eventos / Festas', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e62', categoryId: 'leisure', category: 'Lazer e Social', name: 'Livros / Revistas', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e63', categoryId: 'leisure', category: 'Lazer e Social', name: 'Barzinho / Happy Hour', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'weekly' },
  
  // Compras e Outros
  { id: 'e64', categoryId: 'shopping', category: 'Compras e Outros', name: 'Eletrônicos (Celulares)', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'annual' },
  { id: 'e65', categoryId: 'shopping', category: 'Compras e Outros', name: 'Eletrônicos (Tablets / Computadores)', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'annual' },
  { id: 'e66', categoryId: 'shopping', category: 'Compras e Outros', name: 'Acessórios Eletrônicos', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'quarterly' },
  { id: 'e67', categoryId: 'shopping', category: 'Compras e Outros', name: 'Presentes', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  { id: 'e68', categoryId: 'shopping', category: 'Compras e Outros', name: 'Doações / Caridade', expenseType: 'variable_non_essential', enabled: false, isRecurring: false, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Entretenimento e Streaming (Fixas Não Essenciais)
  { id: 'e20', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Netflix', expenseType: 'fixed_non_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e21', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Spotify', expenseType: 'fixed_non_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e22', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Amazon Prime', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e25', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Disney+', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e26', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'HBO Max', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e27', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Apple TV+', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e28', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Globoplay', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e29', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Paramount+', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e30', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'YouTube Premium', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e31', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'YouTube Music', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e32', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Apple Music', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e33', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Deezer', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e34', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Premiere FC', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e35', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Telecine', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e36', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Crunchyroll', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e37', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'Xbox Game Pass', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e38', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'PlayStation Plus', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'annual' },
  { id: 'e39', categoryId: 'streaming', category: 'Entretenimento e Streaming', name: 'iCloud', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Tecnologia e Produtividade
  { id: 'e69', categoryId: 'tech', category: 'Tecnologia e Produtividade', name: 'Armazenamento em Nuvem (Google Drive / Dropbox)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e70', categoryId: 'tech', category: 'Tecnologia e Produtividade', name: 'Produtividade (Microsoft 365 / Notion)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e71', categoryId: 'tech', category: 'Tecnologia e Produtividade', name: 'Segurança (VPN / Antivírus)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'annual' },
  { id: 'e72', categoryId: 'tech', category: 'Tecnologia e Produtividade', name: 'Domínios e Hospedagem', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'annual' },
  
  // Serviços e Utilidades
  { id: 'e23', categoryId: 'services', category: 'Serviços e Utilidades', name: 'Academia', expenseType: 'fixed_non_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e24', categoryId: 'services', category: 'Serviços e Utilidades', name: 'Plano de Celular', expenseType: 'fixed_essential', enabled: true, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e73', categoryId: 'services', category: 'Serviços e Utilidades', name: 'Mobilidade (99 / Uber Pass)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e74', categoryId: 'services', category: 'Serviços e Utilidades', name: 'Delivery (iFood Plus / Rappi Prime)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Clubes de Assinatura
  { id: 'e75', categoryId: 'subscriptions', category: 'Clubes de Assinatura', name: 'Clube de Vinhos / Cervejas', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e76', categoryId: 'subscriptions', category: 'Clubes de Assinatura', name: 'Clube de Leitura (TAG / Intrínsecos)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e77', categoryId: 'subscriptions', category: 'Clubes de Assinatura', name: 'Assinatura Pets', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e78', categoryId: 'subscriptions', category: 'Clubes de Assinatura', name: 'Beleza / Cuidados Pessoais', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Educação e Desenvolvimento
  { id: 'e79', categoryId: 'education', category: 'Educação e Desenvolvimento', name: 'Mensalidade Escolar / Faculdade', expenseType: 'fixed_essential', enabled: false, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e80', categoryId: 'education', category: 'Educação e Desenvolvimento', name: 'Material Escolar / Papelaria', expenseType: 'variable_essential', enabled: false, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'annual' },
  { id: 'e81', categoryId: 'education', category: 'Educação e Desenvolvimento', name: 'Cursos Online (Udemy / Coursera)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e82', categoryId: 'education', category: 'Educação e Desenvolvimento', name: 'Idiomas (Duolingo / Babbel)', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e83', categoryId: 'education', category: 'Educação e Desenvolvimento', name: 'Jornais e Revistas Digitais', expenseType: 'fixed_non_essential', enabled: false, isRecurring: true, paymentMethod: 'credit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Seguros e Assistências
  { id: 'e84', categoryId: 'insurance', category: 'Seguros e Assistências', name: 'Seguro de Vida', expenseType: 'fixed_essential', enabled: false, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  { id: 'e85', categoryId: 'insurance', category: 'Seguros e Assistências', name: 'Seguro Auto', expenseType: 'fixed_essential', enabled: false, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'annual' },
  { id: 'e86', categoryId: 'insurance', category: 'Seguros e Assistências', name: 'Seguro Residencial', expenseType: 'fixed_essential', enabled: false, isRecurring: true, paymentMethod: 'boleto', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'annual' },
  { id: 'e87', categoryId: 'insurance', category: 'Seguros e Assistências', name: 'Plano Odontológico', expenseType: 'fixed_essential', enabled: false, isRecurring: true, paymentMethod: 'debit_card', isSystemDefault: true, expenseNature: 'fixed', recurrenceType: 'monthly' },
  
  // Gastos Extras
  { id: 'e88', categoryId: 'extras', category: 'Gastos Extras', name: 'Reserva para Imprevistos (10%)', expenseType: 'emergency', enabled: false, isRecurring: false, paymentMethod: 'pix', isSystemDefault: true, expenseNature: 'variable', recurrenceType: 'monthly' },
  
  // Outros (Ajustes)
  { id: 'e_cc_adjust', categoryId: 'outros', category: 'Outros', name: 'Ajuste Fatura Cartão', expenseType: 'variable_non_essential', enabled: true, isRecurring: false, paymentMethod: 'credit_card', isSystemDefault: true, isAdjustmentItem: true, expenseNature: 'variable', recurrenceType: 'monthly' },
];

export const defaultGoals: FinancialGoal[] = [
  { id: 'g1', name: 'Comprar meu carro', currentAmount: 0, targetAmount: 50000, deadline: new Date('2026-12-31') },
  { id: 'g2', name: 'Comprar minha casa', currentAmount: 0, targetAmount: 300000, deadline: new Date('2030-12-31') },
  { id: 'g3', name: 'Viagem dos sonhos', currentAmount: 0, targetAmount: 15000, deadline: new Date('2025-12-31') },
  { id: 'g4', name: 'Quitar dívidas', currentAmount: 0, targetAmount: 10000, deadline: new Date('2025-06-30') },
  { id: 'g5', name: 'Liberdade financeira', currentAmount: 0, targetAmount: 1000000, deadline: new Date('2040-12-31') },
  { id: 'g6', name: 'Aposentadoria', currentAmount: 0, targetAmount: 2000000, deadline: new Date('2050-12-31') },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'auto_debit', label: 'Débito Automático' },
  { value: 'cash', label: 'Dinheiro em Espécie' },
];

// Tipos de patrimônio (aba Patrimônio)
export const assetTypes: { value: AssetType; label: string; description?: string }[] = [
  { value: 'property', label: 'Imóvel', description: 'Casas, apartamentos, terrenos' },
  { value: 'vehicle', label: 'Veículo', description: 'Carros, motos, embarcações' },
  { value: 'company', label: 'Empresa', description: 'Participações societárias' },
  { value: 'valuable_objects', label: 'Objetos de Valor', description: 'Joias, obras de arte, antiguidades, móveis de design' },
  { value: 'intellectual_property', label: 'Propriedade Intelectual', description: 'Direitos autorais, patentes, marcas registradas' },
  { value: 'licenses_software', label: 'Licenças e Softwares', description: 'Programas e licenças que geram renda ou valor' },
  { value: 'rights', label: 'Direitos', description: 'Valores a receber de terceiros (salários, aluguéis, dividendos)' },
  { value: 'obligations', label: 'Obrigações', description: 'Dívidas e compromissos financeiros a pagar' },
  { value: 'other', label: 'Outro', description: 'Outros tipos de patrimônio' },
];

// Tipos somente para aba Patrimônio (excluindo investment)
export const patrimonioAssetTypes: { value: AssetType; label: string; description?: string }[] = [
  { value: 'property', label: 'Imóvel', description: 'Casas, apartamentos, terrenos' },
  { value: 'vehicle', label: 'Veículo', description: 'Carros, motos, embarcações' },
  { value: 'company', label: 'Empresa', description: 'Participações societárias' },
  { value: 'valuable_objects', label: 'Objetos de Valor', description: 'Joias, obras de arte, antiguidades, móveis de design' },
  { value: 'intellectual_property', label: 'Propriedade Intelectual', description: 'Direitos autorais, patentes, marcas registradas' },
  { value: 'licenses_software', label: 'Licenças e Softwares', description: 'Programas e licenças que geram renda ou valor' },
  { value: 'rights', label: 'Direitos', description: 'Valores a receber de terceiros (salários, aluguéis, dividendos)' },
  { value: 'obligations', label: 'Obrigações', description: 'Dívidas e compromissos financeiros a pagar' },
  { value: 'other', label: 'Outro', description: 'Outros tipos de patrimônio' },
];

// Tipos de investimento detalhados (aba Investimentos)
export const investmentTypes: { value: InvestmentType; label: string; description: string }[] = [
  { value: 'fgts', label: 'FGTS', description: 'Fundo de Garantia do Tempo de Serviço' },
  { value: 'reserva_emergencia', label: 'Reserva de Emergência', description: 'Fundo para imprevistos e emergências' },
  { value: 'dinheiro_especie', label: 'Dinheiro em Espécie', description: 'Moeda em espécie guardada' },
  { value: 'metais_preciosos', label: 'Metais Preciosos', description: 'Ouro, prata, platina' },
  { value: 'aplicacao_financeira', label: 'Aplicação Financeira', description: 'Aplicações bancárias gerais' },
  { value: 'renda_fixa', label: 'Renda Fixa', description: 'CDB, LCI, LCA, Tesouro Direto, Poupança' },
  { value: 'fundos_investimento', label: 'Fundos de Investimento', description: 'Fundos multimercado, de ações, cambiais' },
  { value: 'coe', label: 'COE', description: 'Certificado de Operações Estruturadas' },
  { value: 'renda_variavel', label: 'Renda Variável', description: 'Ações, BDRs' },
  { value: 'fii', label: 'Fundos Imobiliários', description: 'FIIs - Fundos de Investimento Imobiliário' },
  { value: 'etf', label: 'ETFs', description: 'Exchange Traded Funds' },
  { value: 'ofertas_publicas', label: 'Ofertas Públicas', description: 'IPO, Follow-on' },
  { value: 'clubes_investimento', label: 'Clubes de Investimento', description: 'Clubes de investimento' },
  { value: 'investimento_global', label: 'Investimento Global', description: 'Investimentos no exterior' },
  { value: 'previdencia_privada', label: 'Previdência Privada', description: 'PGBL, VGBL' },
  { value: 'previdencia_corporativa', label: 'Previdência Corporativa', description: 'Plano de previdência oferecido pela empresa' },
  { value: 'seguro', label: 'Seguro com Capitalização', description: 'Seguros que acumulam valor de resgate (ex: VGBL)' },
  { value: 'criptoativos', label: 'Criptoativos', description: 'Bitcoin, Ethereum, Altcoins' },
  { value: 'debentures', label: 'Debêntures', description: 'Títulos de dívida corporativa' },
  { value: 'cri_cra', label: 'CRI/CRA', description: 'Certificados de Recebíveis Imobiliários e do Agronegócio' },
  { value: 'outros', label: 'Outros', description: 'Outros tipos de investimento' },
];

export const defaultAssets: Asset[] = [];

export const institutionTypes: { value: InstitutionType; label: string }[] = [
  { value: 'bank', label: 'Banco Tradicional' },
  { value: 'digital_bank', label: 'Banco Digital' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'brokerage', label: 'Corretora' },
  { value: 'fintech', label: 'Fintech' },
];

export const financialInstitutions: FinancialInstitution[] = [
  { id: 'bb', code: '001', name: 'Banco do Brasil', type: 'bank', color: '#FFED00' },
  { id: 'itau', code: '341', name: 'Itaú Unibanco', type: 'bank', color: '#EC7000' },
  { id: 'bradesco', code: '237', name: 'Bradesco', type: 'bank', color: '#CC092F' },
  { id: 'santander', code: '033', name: 'Santander', type: 'bank', color: '#EC0000' },
  { id: 'caixa', code: '104', name: 'Caixa Econômica Federal', type: 'bank', color: '#005CA9' },
  { id: 'safra', code: '422', name: 'Banco Safra', type: 'bank', color: '#003366' },
  { id: 'btg', code: '208', name: 'BTG Pactual', type: 'bank', color: '#001E50' },
  { id: 'nubank', code: '260', name: 'Nubank', type: 'digital_bank', color: '#820AD1' },
  { id: 'inter', code: '077', name: 'Banco Inter', type: 'digital_bank', color: '#FF7A00' },
  { id: 'c6', code: '336', name: 'C6 Bank', type: 'digital_bank', color: '#242424' },
  { id: 'neon', code: '735', name: 'Neon', type: 'digital_bank', color: '#00E5A0' },
  { id: 'next', code: '237', name: 'Next', type: 'digital_bank', color: '#00FF7F' },
  { id: 'original', code: '212', name: 'Banco Original', type: 'digital_bank', color: '#00A651' },
  { id: 'pan', code: '623', name: 'Banco Pan', type: 'digital_bank', color: '#00AEEF' },
  { id: 'will', code: '280', name: 'Will Bank', type: 'digital_bank', color: '#FFD700' },
  { id: 'picpay', code: '380', name: 'PicPay', type: 'digital_bank', color: '#21C25E' },
  { id: 'mercadopago', code: '323', name: 'Mercado Pago', type: 'digital_bank', color: '#009EE3' },
  { id: 'pagbank', code: '290', name: 'PagBank', type: 'digital_bank', color: '#00A859' },
  { id: 'iti', code: '341', name: 'Iti Itaú', type: 'digital_bank', color: '#FF6600' },
  { id: 'xp', code: '102', name: 'XP Investimentos', type: 'brokerage', color: '#FFD100' },
  { id: 'rico', code: '102', name: 'Rico', type: 'brokerage', color: '#FF6B00' },
  { id: 'clear', code: '102', name: 'Clear', type: 'brokerage', color: '#00D4AA' },
  { id: 'modal', code: '746', name: 'Modal Mais', type: 'brokerage', color: '#00B2A9' },
  { id: 'toro', code: '352', name: 'Toro Investimentos', type: 'brokerage', color: '#0066CC' },
  { id: 'avenue', code: '332', name: 'Avenue', type: 'brokerage', color: '#1E3A5F' },
  { id: 'genial', code: '278', name: 'Genial Investimentos', type: 'brokerage', color: '#FF4500' },
  { id: 'stone', code: '197', name: 'Conta Stone', type: 'fintech', color: '#00A868' },
  { id: 'digio', code: '335', name: 'Digio', type: 'credit_card', color: '#00D4FF' },
  { id: 'ame', code: '301', name: 'Ame Digital', type: 'fintech', color: '#FF0066' },
  { id: 'porto', code: 'Portal', name: 'Porto Seguro Cartões', type: 'credit_card', color: '#0066B3' },
  { id: 'credicard', code: '341', name: 'Credicard', type: 'credit_card', color: '#00529B' },
  { id: 'ourocard', code: '001', name: 'Ourocard', type: 'credit_card', color: '#FFCC00' },
  { id: 'banrisul', code: '041', name: 'Banrisul', type: 'bank', color: '#004080' },
  { id: 'sicoob', code: '756', name: 'Sicoob', type: 'bank', color: '#003641' },
  { id: 'sicredi', code: '748', name: 'Sicredi', type: 'bank', color: '#00843D' },
  { id: 'bmg', code: '318', name: 'Banco BMG', type: 'bank', color: '#FF6B00' },
  { id: 'banco_do_nordeste', code: '004', name: 'Banco do Nordeste', type: 'bank', color: '#E31837' },
  { id: 'bndes', code: '007', name: 'BNDES', type: 'bank', color: '#009639' },
  { id: 'bs2', code: '218', name: 'Banco BS2', type: 'digital_bank', color: '#00D2B8' },
  { id: 'agibank', code: '121', name: 'Agibank', type: 'digital_bank', color: '#FF5722' },
  { id: 'sofisa', code: '637', name: 'Sofisa Direto', type: 'digital_bank', color: '#1E3A8A' },
  { id: 'banco_abc', code: '246', name: 'Banco ABC Brasil', type: 'bank', color: '#002855' },
  { id: 'daycoval', code: '707', name: 'Banco Daycoval', type: 'bank', color: '#005BAC' },
];

export const creditCardBrands = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Diners Club',
];
