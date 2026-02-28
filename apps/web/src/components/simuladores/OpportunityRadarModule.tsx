import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/ui/money-input';
import { 
  Smartphone, 
  CreditCard, 
  Zap, 
  Car, 
  Wifi, 
  ShoppingBag,
  UtensilsCrossed,
  Dumbbell,
  Music,
  Tv,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles,
  Clock,
  Target,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface OpportunityRadarModuleProps {
  realHourlyRate: number;
}

interface Opportunity {
  id: string;
  icon: React.ElementType;
  name: string;
  category: string;
  avgSaving: number;
  color: string;
  steps: string[];
}

interface SelectedOpportunityData {
  saving: number;
  currentValue?: number; // Valor atual (opcional)
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'celular',
    icon: Smartphone,
    name: 'Plano de Celular',
    category: 'Telecom',
    avgSaving: 50,
    color: 'bg-blue-500',
    steps: [
      'Compare planos em sites como Melhor Plano',
      'Ligue para a operadora atual e peça desconto de fidelidade',
      'Considere planos família ou controle',
      'Avalie operadoras virtuais (MVNOs) mais baratas'
    ]
  },
  {
    id: 'cashback',
    icon: CreditCard,
    name: 'Cashback Ativo',
    category: 'Finanças',
    avgSaving: 80,
    color: 'bg-emerald-500',
    steps: [
      'Cadastre-se em apps de cashback (Méliuz, Ame, Picpay)',
      'Use cartões com cashback automático',
      'Sempre verifique se há cashback antes de comprar online',
      'Acumule e resgate periodicamente'
    ]
  },
  {
    id: 'energia',
    icon: Zap,
    name: 'Conta de Energia',
    category: 'Casa',
    avgSaving: 60,
    color: 'bg-amber-500',
    steps: [
      'Troque lâmpadas por LED',
      'Desligue aparelhos em standby',
      'Use ar-condicionado em 23°C',
      'Verifique se sua tarifa é a mais vantajosa'
    ]
  },
  {
    id: 'combustivel',
    icon: Car,
    name: 'Combustível',
    category: 'Transporte',
    avgSaving: 100,
    color: 'bg-red-500',
    steps: [
      'Use apps de comparação de preços (Waze, Fuelio)',
      'Abasteça em dias promocionais',
      'Mantenha pneus calibrados (+3% economia)',
      'Considere carona compartilhada'
    ]
  },
  {
    id: 'internet',
    icon: Wifi,
    name: 'Internet',
    category: 'Telecom',
    avgSaving: 40,
    color: 'bg-purple-500',
    steps: [
      'Negocie anualmente com sua operadora',
      'Compare planos de fibra óptica locais',
      'Verifique se precisa da velocidade atual',
      'Avalie combos com streaming inclusos'
    ]
  },
  {
    id: 'supermercado',
    icon: ShoppingBag,
    name: 'Supermercado',
    category: 'Alimentação',
    avgSaving: 150,
    color: 'bg-orange-500',
    steps: [
      'Faça lista antes de ir e siga ela',
      'Compare preços entre mercados',
      'Aproveite promoções de terça/quarta',
      'Compre marcas próprias do mercado'
    ]
  },
  {
    id: 'delivery',
    icon: UtensilsCrossed,
    name: 'Delivery/Restaurantes',
    category: 'Alimentação',
    avgSaving: 200,
    color: 'bg-pink-500',
    steps: [
      'Limite pedidos a 1-2x por semana',
      'Use cupons e programas de fidelidade',
      'Cozinhe em batch no fim de semana',
      'Substitua por marmitas caseiras'
    ]
  },
  {
    id: 'academia',
    icon: Dumbbell,
    name: 'Academia',
    category: 'Saúde',
    avgSaving: 70,
    color: 'bg-cyan-500',
    steps: [
      'Negocie planos anuais com desconto',
      'Considere academias de bairro',
      'Use apps de treino em casa (grátis)',
      'Forme grupos para desconto coletivo'
    ]
  },
  {
    id: 'streaming-musica',
    icon: Music,
    name: 'Streaming Música',
    category: 'Entretenimento',
    avgSaving: 20,
    color: 'bg-green-500',
    steps: [
      'Use planos família ou universitário',
      'Alterne entre serviços gratuitos',
      'Avalie se usa o suficiente para valer',
      'Cancele duplicidades (Spotify + Deezer)'
    ]
  },
  {
    id: 'streaming-video',
    icon: Tv,
    name: 'Streaming Vídeo',
    category: 'Entretenimento',
    avgSaving: 50,
    color: 'bg-indigo-500',
    steps: [
      'Rotacione assinaturas mensalmente',
      'Divida contas com família/amigos',
      'Cancele serviços pouco usados',
      'Aproveite períodos gratuitos'
    ]
  },
];

const ANNUAL_RATE = 0.10; // 10% a.a.
const PROJECTION_YEARS = 10;

export const OpportunityRadarModule: React.FC<OpportunityRadarModuleProps> = ({ realHourlyRate }) => {
  // Track selected opportunities with saving and optional current value
  const [selectedOpportunities, setSelectedOpportunities] = useState<Record<string, SelectedOpportunityData>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customOpportunities, setCustomOpportunities] = useState<Array<{ id: string; name: string; saving: number }>>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomSaving, setNewCustomSaving] = useState(0);

  // Toggle opportunity selection
  const toggleOpportunity = (id: string, defaultSaving: number) => {
    setSelectedOpportunities(prev => {
      if (prev[id] !== undefined) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { saving: defaultSaving } };
    });
  };

  // Update saving value
  const updateSaving = (id: string, value: number) => {
    setSelectedOpportunities(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], saving: value } 
    }));
  };

  // Update current value
  const updateCurrentValue = (id: string, value: number) => {
    setSelectedOpportunities(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], currentValue: value > 0 ? value : undefined } 
    }));
  };

  // Add custom opportunity
  const addCustomOpportunity = () => {
    if (newCustomName && newCustomSaving > 0) {
      const id = `custom-${Date.now()}`;
      setCustomOpportunities(prev => [...prev, { id, name: newCustomName, saving: newCustomSaving }]);
      setSelectedOpportunities(prev => ({ ...prev, [id]: { saving: newCustomSaving } }));
      setNewCustomName('');
      setNewCustomSaving(0);
    }
  };

  // Remove custom opportunity
  const removeCustomOpportunity = (id: string) => {
    setCustomOpportunities(prev => prev.filter(o => o.id !== id));
    setSelectedOpportunities(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const monthlySavings = Object.values(selectedOpportunities).reduce((sum, v) => sum + v.saving, 0);
    const annualSavings = monthlySavings * 12;
    
    // Sum of current values (for annual expense display)
    const monthlyCurrentValue = Object.values(selectedOpportunities).reduce((sum, v) => sum + (v.currentValue || 0), 0);
    const annualCurrentValue = monthlyCurrentValue * 12;
    
    // Compound interest calculation: FV = PMT * [((1 + r)^n - 1) / r]
    // Monthly rate from annual
    const monthlyRate = Math.pow(1 + ANNUAL_RATE, 1/12) - 1;
    const totalMonths = PROJECTION_YEARS * 12;
    
    // Future Value of monthly contributions
    const futureValue = monthlySavings * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    
    // Total contributions
    const totalContributions = monthlySavings * totalMonths;
    
    // Interest earned
    const interestEarned = futureValue - totalContributions;
    
    // Convert to life hours
    const hoursPerYear = annualSavings / realHourlyRate;
    const totalHoursFreedom = futureValue / realHourlyRate;
    
    return {
      monthlySavings,
      annualSavings,
      monthlyCurrentValue,
      annualCurrentValue,
      futureValue,
      totalContributions,
      interestEarned,
      hoursPerYear,
      totalHoursFreedom
    };
  }, [selectedOpportunities, realHourlyRate]);

  const selectedCount = Object.keys(selectedOpportunities).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center p-4 bg-muted/30 rounded-xl">
        <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
        <h3 className="font-semibold text-lg">Radar de Oportunidades</h3>
        <p className="text-sm text-muted-foreground">
          Pequenas economias que viram fortuna no longo prazo
        </p>
      </div>

      {/* Opportunity Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {OPPORTUNITIES.map((opp) => {
          const isSelected = selectedOpportunities[opp.id] !== undefined;
          const Icon = opp.icon;
          
          return (
            <motion.button
              key={opp.id}
              onClick={() => toggleOpportunity(opp.id, opp.avgSaving)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all text-left",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", opp.color)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-medium text-sm truncate">{opp.name}</p>
              <p className="text-xs text-muted-foreground">~R$ {opp.avgSaving}/mês</p>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Opportunities - Expandable List */}
      {selectedCount > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Oportunidades Selecionadas ({selectedCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {OPPORTUNITIES.filter(o => selectedOpportunities[o.id] !== undefined).map((opp) => {
              const Icon = opp.icon;
              const isExpanded = expandedId === opp.id;
              const data = selectedOpportunities[opp.id];
              const savingPercent = data.currentValue && data.currentValue > 0 
                ? ((data.saving / data.currentValue) * 100).toFixed(0)
                : null;
              const annualExpense = data.currentValue ? data.currentValue * 12 : null;
              
              return (
                <Collapsible 
                  key={opp.id} 
                  open={isExpanded} 
                  onOpenChange={() => setExpandedId(isExpanded ? null : opp.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", opp.color)}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">{opp.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-emerald-600">
                            R$ {data.saving}/mês
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-3 space-y-4 bg-background">
                        {/* Valor Atual e Economia - Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Valor atual (opcional):</span>
                            <MoneyInput
                              value={data.currentValue || 0}
                              onChange={(v) => updateCurrentValue(opp.id, v)}
                              className="h-8 text-sm"
                              placeholder="R$ 0,00"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Economia estimada:</span>
                            <MoneyInput
                              value={data.saving}
                              onChange={(v) => updateSaving(opp.id, v)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        {/* Impacto Anual - mostra apenas se valor atual preenchido */}
                        {annualExpense !== null && annualExpense > 0 && (
                          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Gasto Anual</p>
                                <p className="text-lg font-bold text-amber-600">
                                  R$ {annualExpense.toLocaleString('pt-BR')}
                                </p>
                              </div>
                              {savingPercent && (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Economia</p>
                                  <p className="text-lg font-bold text-emerald-600">
                                    {savingPercent}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Passos práticos:</p>
                          <ol className="space-y-1">
                            {opp.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {/* Custom opportunities */}
            {customOpportunities.map((custom) => {
              const data = selectedOpportunities[custom.id];
              const savingValue = data?.saving || custom.saving;
              return (
                <div key={custom.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-500 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-sm">{custom.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-emerald-600">
                      R$ {savingValue}/mês
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => removeCustomOpportunity(custom.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add Custom */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Nova economia..."
                value={newCustomName}
                onChange={(e) => setNewCustomName(e.target.value)}
                className="flex-1 h-9 px-3 text-sm rounded-md border border-input bg-background"
              />
              <MoneyInput
                value={newCustomSaving}
                onChange={setNewCustomSaving}
                placeholder="Valor"
                className="w-28 h-9 text-sm"
              />
              <Button size="sm" onClick={addCustomOpportunity} disabled={!newCustomName || newCustomSaving <= 0}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Impact Dashboard */}
      {calculations.monthlySavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Annual Savings Card - MAIN FOCUS */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Economia Anual Total</p>
                <p className="text-5xl font-bold text-emerald-500">
                  R$ {calculations.annualSavings.toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  = R$ {calculations.monthlySavings.toLocaleString('pt-BR')}/mês
                </p>
                
                {/* Mostrar gasto anual total apenas se algum valor atual foi preenchido */}
                {calculations.annualCurrentValue > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">Gasto total nestas categorias:</p>
                    <p className="text-lg font-semibold text-amber-600">
                      R$ {calculations.annualCurrentValue.toLocaleString('pt-BR')}/ano
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Economia representa {((calculations.annualSavings / calculations.annualCurrentValue) * 100).toFixed(0)}% do gasto
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 10-Year Projection */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Projeção de Riqueza em {PROJECTION_YEARS} Anos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Investindo a economia todo mês a {(ANNUAL_RATE * 100).toFixed(0)}% a.a.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Aportes</p>
                  <p className="text-lg font-bold">
                    R$ {Math.round(calculations.totalContributions).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Juros Ganhos</p>
                  <p className="text-lg font-bold text-emerald-500">
                    +R$ {Math.round(calculations.interestEarned).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Final</p>
                  <p className="text-lg font-bold text-primary">
                    R$ {Math.round(calculations.futureValue).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Life Hours Freedom */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold">Tradução em Horas de Vida Livre</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-500/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Por ano</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {Math.round(calculations.hoursPerYear)}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      = {(calculations.hoursPerYear / 8).toFixed(1)} dias de trabalho
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total em {PROJECTION_YEARS} anos</p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(calculations.totalHoursFreedom).toLocaleString('pt-BR')}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      = {(calculations.totalHoursFreedom / (8 * 22)).toFixed(1)} meses livres
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {selectedCount === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecione oportunidades acima para ver o impacto</p>
        </div>
      )}
    </div>
  );
};
