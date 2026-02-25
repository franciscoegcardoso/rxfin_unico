import { useMemo } from 'react';

export interface CreditData {
  // Financiamento
  valorEntrada?: number;
  parcelasPagas?: number;
  parcelasRestantes?: number;
  valorParcela?: number;
  // Consórcio
  contemplado?: boolean;
  mesesAteBem?: number;
}

export interface ExpenseData {
  ipvaAnual: number;
  seguroAnual: number;
  manutencaoAnual: number;
  combustivelMensal: number;
  licenciamentoAnual: number;
  pneusAnual: number;
  limpezaMensal: number;
  estacionamentoMensal: number;
  pedagioMensal: number;
}

export interface OpportunityCostInputs {
  vehicleValue: number;
  isCarPaidOff: boolean;
  creditType: 'financiamento' | 'consorcio' | null;
  creditData: CreditData | null;
  expenses: ExpenseData | null;
  cdiAnual: number; // % a.a.
  includeExpenses: boolean;
}

export interface ChartDataPoint {
  mes: number;
  investido: number;
  carro: number;
}

export interface CompositionDataPoint {
  mes: number;
  capitalComRendimento: number;     // Capital inicial + valorização CDI
  parcelasComRendimento: number;    // Parcelas pagas + valorização CDI
  despesasComRendimento: number;    // Despesas operacionais + valorização CDI
  rendimentoCapital: number;
  rendimentoParcelas: number;
  rendimentoDespesas: number;
  totalRendimentos: number;
  totalPatrimonio: number;
  valorCarro: number;
  // Valores brutos sem rendimento
  parcelasAcumuladas: number;
  despesasAcumuladas: number;
}

export interface ProjecaoAnual {
  meses: number;
  anos: number;
  montanteTotal: number;
  valorResidualCarro: number;
  gapRiqueza: number;
  capitalInicial: number;
  aportesAcumulados: number;       // Total de aportes
  parcelasAcumuladas: number;      // Parcelas pagas
  despesasAcumuladas: number;      // Despesas operacionais
  rendimentos: number;
  totalInvestido: number;
  // Breakdown for chart
  chartData: ChartDataPoint[];
  compositionData: CompositionDataPoint[];
}

export interface OpportunityCostOutput {
  capitalInicial: number;
  aporteMensal: number;
  aporteMensalBreakdown: {
    parcela: number;
    custosOperacionais: number;
    custosAnuaisDiluidos: number;
  };
  projecoes: ProjecaoAnual[];
  custoMensalTotal: number;
}

const DEPRECIATION_RATE = 0.15; // 15% a.a.

export function useOpportunityCostCalculation({
  vehicleValue,
  isCarPaidOff,
  creditType,
  creditData,
  expenses,
  cdiAnual,
  includeExpenses,
}: OpportunityCostInputs): OpportunityCostOutput {
  
  // 1. Calcular Capital Inicial (dinheiro já imobilizado no carro)
  const capitalInicial = useMemo(() => {
    if (isCarPaidOff) {
      return vehicleValue;
    }
    
    if (creditType === 'financiamento' && creditData) {
      const entrada = creditData.valorEntrada || 0;
      const parcelasPagas = creditData.parcelasPagas || 0;
      const valorParcela = creditData.valorParcela || 0;
      return entrada + (parcelasPagas * valorParcela);
    }
    
    if (creditType === 'consorcio' && creditData) {
      const parcelasPagas = creditData.parcelasPagas || 0;
      const valorParcela = creditData.valorParcela || 0;
      return parcelasPagas * valorParcela;
    }
    
    return vehicleValue;
  }, [vehicleValue, isCarPaidOff, creditType, creditData]);

  // 2. Calcular custos mensalizados
  const custosMensais = useMemo(() => {
    if (!includeExpenses || !expenses) {
      return {
        custosOperacionais: 0,
        custosAnuaisDiluidos: 0,
        total: 0
      };
    }

    // Custos mensais puros
    const custosOperacionais = 
      (expenses.combustivelMensal || 0) +
      (expenses.limpezaMensal || 0) +
      (expenses.estacionamentoMensal || 0) +
      (expenses.pedagioMensal || 0);

    // Custos anuais diluídos por 12
    const custosAnuaisDiluidos = (
      (expenses.ipvaAnual || 0) +
      (expenses.seguroAnual || 0) +
      (expenses.manutencaoAnual || 0) +
      (expenses.licenciamentoAnual || 0) +
      (expenses.pneusAnual || 0)
    ) / 12;

    return {
      custosOperacionais,
      custosAnuaisDiluidos,
      total: custosOperacionais + custosAnuaisDiluidos
    };
  }, [includeExpenses, expenses]);

  // 3. Calcular Aporte Mensal (parcela + custos)
  const { aporteMensal, aporteMensalBreakdown } = useMemo(() => {
    let parcela = 0;
    
    // Parcela do financiamento/consórcio (enquanto houver)
    if (!isCarPaidOff && creditData) {
      const parcelasRestantes = creditData.parcelasRestantes || 0;
      if (parcelasRestantes > 0) {
        parcela = creditData.valorParcela || 0;
      }
    }

    const breakdown = {
      parcela,
      custosOperacionais: custosMensais.custosOperacionais,
      custosAnuaisDiluidos: custosMensais.custosAnuaisDiluidos,
    };

    return {
      aporteMensal: parcela + custosMensais.total,
      aporteMensalBreakdown: breakdown
    };
  }, [isCarPaidOff, creditData, custosMensais]);

  // 4. Calcular Projeções por Horizonte (1 a 5 anos)
  const projecoes = useMemo(() => {
    const horizontes = [12, 24, 36, 48, 60]; // meses
    const taxaMensal = Math.pow(1 + cdiAnual / 100, 1/12) - 1;
    const taxaDepreciacaoMensal = Math.pow(1 - DEPRECIATION_RATE, 1/12);
    
    // Parcelas restantes
    const parcelasRestantes = !isCarPaidOff && creditData 
      ? (creditData.parcelasRestantes || 0) 
      : 0;

    return horizontes.map(meses => {
      const anos = meses / 12;
      
      // Gerar dados para o gráfico mês a mês
      const chartData: ChartDataPoint[] = [];
      const compositionData: CompositionDataPoint[] = [];
      
      // Tracking separado para capital, parcelas e despesas
      let capitalComRendimento = capitalInicial;
      let parcelasAcumuladas = 0;
      let parcelasComRendimento = 0;
      let despesasAcumuladas = 0;
      let despesasComRendimento = 0;
      let valorCarro = vehicleValue;
      
      for (let m = 0; m <= meses; m++) {
        if (m === 0) {
          chartData.push({
            mes: 0,
            investido: capitalInicial,
            carro: vehicleValue
          });
          compositionData.push({
            mes: 0,
            capitalComRendimento: capitalInicial,
            parcelasComRendimento: 0,
            despesasComRendimento: 0,
            rendimentoCapital: 0,
            rendimentoParcelas: 0,
            rendimentoDespesas: 0,
            totalRendimentos: 0,
            totalPatrimonio: capitalInicial,
            valorCarro: vehicleValue,
            parcelasAcumuladas: 0,
            despesasAcumuladas: 0
          });
          continue;
        }
        
        // Rendimento do capital inicial
        capitalComRendimento = capitalComRendimento * (1 + taxaMensal);
        const rendimentoCapital = capitalComRendimento - capitalInicial;
        
        // Aporte do mês - separado em parcela e despesas
        const temParcela = m <= parcelasRestantes;
        const parcelaDoMes = temParcela ? aporteMensalBreakdown.parcela : 0;
        const despesaDoMes = custosMensais.total;
        
        // Rendimento das parcelas existentes
        parcelasComRendimento = parcelasComRendimento * (1 + taxaMensal);
        parcelasAcumuladas += parcelaDoMes;
        parcelasComRendimento += parcelaDoMes;
        const rendimentoParcelas = parcelasComRendimento - parcelasAcumuladas;
        
        // Rendimento das despesas existentes
        despesasComRendimento = despesasComRendimento * (1 + taxaMensal);
        despesasAcumuladas += despesaDoMes;
        despesasComRendimento += despesaDoMes;
        const rendimentoDespesas = despesasComRendimento - despesasAcumuladas;
        
        // Depreciação do carro
        valorCarro = valorCarro * taxaDepreciacaoMensal;
        
        const totalPatrimonio = capitalComRendimento + parcelasComRendimento + despesasComRendimento;
        const totalRendimentos = rendimentoCapital + rendimentoParcelas + rendimentoDespesas;
        
        chartData.push({
          mes: m,
          investido: totalPatrimonio,
          carro: valorCarro
        });
        
        compositionData.push({
          mes: m,
          capitalComRendimento,
          parcelasComRendimento,
          despesasComRendimento,
          rendimentoCapital,
          rendimentoParcelas,
          rendimentoDespesas,
          totalRendimentos,
          totalPatrimonio,
          valorCarro,
          parcelasAcumuladas,
          despesasAcumuladas
        });
      }
      
      const montanteTotal = capitalComRendimento + parcelasComRendimento + despesasComRendimento;
      const valorResidualCarro = valorCarro;
      const aportesAcumulados = parcelasAcumuladas + despesasAcumuladas;
      const rendimentos = (capitalComRendimento - capitalInicial) + 
                          (parcelasComRendimento - parcelasAcumuladas) + 
                          (despesasComRendimento - despesasAcumuladas);
      
      return {
        meses,
        anos,
        montanteTotal,
        valorResidualCarro,
        gapRiqueza: montanteTotal - valorResidualCarro,
        capitalInicial,
        aportesAcumulados,
        parcelasAcumuladas,
        despesasAcumuladas,
        rendimentos,
        totalInvestido: capitalInicial + aportesAcumulados,
        chartData,
        compositionData
      };
    });
  }, [capitalInicial, aporteMensal, aporteMensalBreakdown, custosMensais, vehicleValue, cdiAnual, isCarPaidOff, creditData]);

  // Custo mensal total (para exibição)
  const custoMensalTotal = aporteMensal;

  return {
    capitalInicial,
    aporteMensal,
    aporteMensalBreakdown,
    projecoes,
    custoMensalTotal
  };
}
