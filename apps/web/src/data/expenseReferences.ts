// Referências bibliográficas para classificação de despesas
// Baseado em metodologias consagradas de finanças pessoais

export const expenseClassificationReferences = {
  methodology: "Orçamento 50-30-20",
  author: "Elizabeth Warren & Amelia Warren Tyagi",
  book: "All Your Worth: The Ultimate Lifetime Money Plan",
  year: 2005,
  description: "Metodologia que sugere dividir a renda em 50% necessidades, 30% desejos e 20% poupança/dívidas",
  adaptations: [
    {
      source: "Gustavo Cerbasi",
      book: "Casais Inteligentes Enriquecem Juntos",
      country: "Brasil"
    },
    {
      source: "Nathalia Arcuri",
      channel: "Me Poupe!",
      country: "Brasil"
    }
  ]
};

export const expenseTypeLabels: Record<string, { label: string; description: string; color: string }> = {
  fixed_essential: {
    label: 'Fixa Essencial',
    description: 'Despesas fixas necessárias para sobrevivência e moradia (aluguel, contas básicas)',
    color: 'hsl(var(--chart-1))'
  },
  fixed_non_essential: {
    label: 'Fixa Não Essencial',
    description: 'Despesas fixas que agregam qualidade de vida mas não são essenciais (streaming, assinaturas)',
    color: 'hsl(var(--chart-2))'
  },
  variable_essential: {
    label: 'Variável Essencial',
    description: 'Despesas variáveis necessárias (alimentação, saúde, transporte básico)',
    color: 'hsl(var(--chart-3))'
  },
  variable_non_essential: {
    label: 'Variável Não Essencial',
    description: 'Despesas variáveis de lazer e consumo (restaurantes, compras, entretenimento)',
    color: 'hsl(var(--chart-4))'
  },
  debt_payment: {
    label: 'Pagamento de Dívidas',
    description: 'Pagamentos de empréstimos, financiamentos e dívidas',
    color: 'hsl(var(--destructive))'
  },
  investment: {
    label: 'Investimento',
    description: 'Valores destinados a poupança e investimentos',
    color: 'hsl(var(--chart-5))'
  },
  emergency: {
    label: 'Gastos Extras',
    description: 'Despesas emergenciais ou não planejadas',
    color: 'hsl(var(--muted-foreground))'
  }
};

// Regra 50-30-20 adaptada para o Brasil
export const budgetRuleTargets = {
  necessities: {
    percentage: 50,
    types: ['fixed_essential', 'variable_essential', 'debt_payment'],
    label: 'Necessidades'
  },
  wants: {
    percentage: 30,
    types: ['fixed_non_essential', 'variable_non_essential', 'emergency'],
    label: 'Desejos'
  },
  savings: {
    percentage: 20,
    types: ['investment'],
    label: 'Poupança/Investimentos'
  }
};
