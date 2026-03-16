import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Building2, Home, Receipt, Settings, ClipboardCheck, MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePickerFriendly } from '@/components/ui/date-picker-friendly';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { PropertyAdjustmentType, RentalExpenseResponsibility, ExpenseResponsible, PropertyMonthlyExpenses, EstadoImovelType, CustoVacanciaItem, CustoProprietarioItem } from '@/types/financial';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const propertyAdjustmentOptions: { value: PropertyAdjustmentType; label: string; description: string }[] = [
  { value: 'igpm', label: 'IGP-M', description: 'Índice Geral de Preços do Mercado' },
  { value: 'ipca', label: 'IPCA', description: 'Índice Nacional de Preços ao Consumidor Amplo' },
  { value: 'minimum_wage', label: '% Salário Mínimo', description: 'Percentual do salário mínimo' },
  { value: 'none', label: 'Sem reajuste', description: 'Valor fixo sem correção' },
  { value: 'custom', label: 'Curva personalizada', description: 'Definir valor inicial e final' },
];

const monthOptions = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export type PropertyStep = 'dados' | 'aluguel' | 'despesas' | 'ajustes' | 'resumo';

interface PropertyFormData {
  name: string;
  value: number;
  description: string;
  purchaseDate: Date | undefined;
  purchaseValue: number;
  propertyCep: string;
  propertyArea: number;
  isRentalProperty: boolean;
  rentalValue: number;
  averageRentedMonths: number;
  rentAdjustmentMonth: number;
  rentAdjustmentReminder: boolean;
  expenseResponsibility: RentalExpenseResponsibility;
  propertyMonthlyExpenses: PropertyMonthlyExpenses;
  propertyAdjustment: PropertyAdjustmentType;
  useCustomCurve: boolean;
  initialValue: number;
  finalValue: number;
  finalDate: Date | undefined;
  estadoImovel?: EstadoImovelType;
  diaAluguel?: number;
  custosVacancia?: CustoVacanciaItem[];
  custosProprietario?: CustoProprietarioItem[];
}

interface PropertyStepWizardProps {
  currentStep: PropertyStep;
  onStepChange: (step: PropertyStep) => void;
  formData: PropertyFormData;
  onFormChange: (data: Partial<PropertyFormData>) => void;
}

const stepConfig = [
  { id: 'dados' as PropertyStep, label: 'Dados', icon: Building2 },
  { id: 'aluguel' as PropertyStep, label: 'Aluguel', icon: Home },
  { id: 'despesas' as PropertyStep, label: 'Despesas', icon: Receipt },
  { id: 'ajustes' as PropertyStep, label: 'Ajustes', icon: Settings },
  { id: 'resumo' as PropertyStep, label: 'Resumo', icon: ClipboardCheck },
];

// Animation variants for step transitions
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

export const PropertyStepProgress: React.FC<{
  currentStep: PropertyStep;
  isRentalProperty: boolean;
  onStepClick?: (step: PropertyStep) => void;
}> = ({ currentStep, isRentalProperty, onStepClick }) => {
  const stepIndex = stepConfig.findIndex(s => s.id === currentStep);
  
  // Filter steps based on whether it's a rental property
  const activeSteps = isRentalProperty 
    ? stepConfig 
    : stepConfig.filter(s => s.id !== 'aluguel' && s.id !== 'despesas');

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
      {activeSteps.map((step, index) => {
        const actualIndex = stepConfig.findIndex(s => s.id === step.id);
        const isComplete = stepIndex > actualIndex;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={!onStepClick}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                onStepClick && "cursor-pointer hover:opacity-80",
                !onStepClick && "cursor-default"
              )}
            >
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                isComplete
                  ? "bg-primary text-primary-foreground"
                  : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : "bg-muted text-muted-foreground"
              )}>
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={cn(
                "text-[10px] sm:text-xs transition-colors text-center",
                isCurrent
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </button>
            {index < activeSteps.length - 1 && (
              <div className={cn(
                "h-0.5 w-4 sm:w-8 transition-colors mt-[-16px] sm:mt-[-20px]",
                isComplete ? "bg-primary" : "bg-border"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ESTADO_IMOVEL_OPTIONS: { value: EstadoImovelType; label: string }[] = [
  { value: 'alugado', label: 'Alugado — gera receita de aluguel' },
  { value: 'vago', label: 'Vago — sem inquilino (custos do proprietário)' },
  { value: 'proprio', label: 'Uso próprio' },
];

const CATEGORIA_OPTIONS = [
  { value: 'Moradia', label: 'Moradia' },
  { value: 'Utilidades', label: 'Utilidades' },
  { value: 'Impostos', label: 'Impostos' },
];

// Step 1: Dados Básicos
export const PropertyStepDados: React.FC<{
  formData: PropertyFormData;
  onFormChange: (data: Partial<PropertyFormData>) => void;
}> = ({ formData, onFormChange }) => {
  const estadoImovel = formData.estadoImovel ?? 'proprio';
  const custosVacancia = formData.custosVacancia ?? [];
  const custosProprietario = formData.custosProprietario ?? [];

  const handleEstadoChange = (value: EstadoImovelType) => {
    onFormChange({ estadoImovel: value, isRentalProperty: value === 'alugado' });
  };

  const addCustoVacancia = (template?: { descricao: string; categoria: string }) => {
    const newItem: CustoVacanciaItem = {
      id: crypto.randomUUID(),
      descricao: template?.descricao ?? '',
      valor: 0,
      dia: 5,
      categoria: template?.categoria ?? 'Utilidades',
    };
    onFormChange({ custosVacancia: [...custosVacancia, newItem] });
  };

  const updateCustoVacancia = (index: number, updates: Partial<CustoVacanciaItem>) => {
    const next = [...custosVacancia];
    next[index] = { ...next[index], ...updates };
    onFormChange({ custosVacancia: next });
  };

  const removeCustoVacancia = (index: number) => {
    onFormChange({ custosVacancia: custosVacancia.filter((_, i) => i !== index) });
  };

  const addCustoProprietario = (template?: { descricao: string; categoria: string }) => {
    const newItem: CustoProprietarioItem = {
      id: crypto.randomUUID(),
      descricao: template?.descricao ?? '',
      valor: 0,
      dia: 5,
      frequencia: 'mensal',
      categoria: template?.categoria ?? 'Moradia',
    };
    onFormChange({ custosProprietario: [...custosProprietario, newItem] });
  };

  const updateCustoProprietario = (index: number, updates: Partial<CustoProprietarioItem>) => {
    const next = [...custosProprietario];
    next[index] = { ...next[index], ...updates };
    onFormChange({ custosProprietario: next });
  };

  const removeCustoProprietario = (index: number) => {
    onFormChange({ custosProprietario: custosProprietario.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome / Identificação <span className="text-xs text-muted-foreground">(máx. 20 caracteres)</span></Label>
        <Input
          id="name"
          placeholder="Ex: Apto Centro..."
          value={formData.name}
          onChange={(e) => onFormChange({ name: e.target.value.slice(0, 20) })}
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">Valor Atual do Imóvel</Label>
        <CurrencyInput
          id="value"
          value={formData.value}
          onChange={(value) => onFormChange({ value })}
          placeholder="0"
        />
      </div>

      <div className="space-y-2">
        <Label>Estado atual do imóvel</Label>
        <Select value={estadoImovel} onValueChange={(v) => handleEstadoChange(v as EstadoImovelType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {ESTADO_IMOVEL_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="propertyCep">CEP</Label>
          <Input
            id="propertyCep"
            placeholder="00000-000"
            value={formData.propertyCep}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '');
              if (value.length > 5) {
                value = value.slice(0, 5) + '-' + value.slice(5, 8);
              }
              onFormChange({ propertyCep: value });
            }}
            maxLength={9}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="propertyArea">Área (m²)</Label>
          <Input
            id="propertyArea"
            type="number"
            placeholder="Ex: 85"
            value={formData.propertyArea || ''}
            onChange={(e) => onFormChange({ propertyArea: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data da Compra</Label>
          <DatePickerFriendly
            value={formData.purchaseDate}
            onChange={(date) => onFormChange({ purchaseDate: date })}
            placeholder="DD/MM/AAAA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseValue">Valor da Compra</Label>
          <CurrencyInput
            id="purchaseValue"
            value={formData.purchaseValue}
            onChange={(value) => onFormChange({ purchaseValue: value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input
          id="description"
          placeholder="Informações adicionais..."
          value={formData.description}
          onChange={(e) => onFormChange({ description: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
        <div className="flex items-center gap-3">
          <Home className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-sm">Imóvel gera renda de aluguel?</p>
            <p className="text-xs text-muted-foreground">
              Se sim, configure receitas e despesas
            </p>
          </div>
        </div>
        <Switch
          checked={formData.isRentalProperty}
          onCheckedChange={(checked) => onFormChange({ isRentalProperty: checked, estadoImovel: checked ? 'alugado' : (formData.estadoImovel ?? 'proprio') })}
        />
      </div>

      {estadoImovel === 'vago' && (
        <Collapsible defaultOpen className="rounded-lg border p-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium text-sm">
            Custos enquanto vago
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Esses custos ficarão ativos enquanto o imóvel estiver sem inquilino.</p>
            <div className="flex flex-wrap gap-1.5">
              {[{ descricao: 'Luz', categoria: 'Utilidades' }, { descricao: 'Água', categoria: 'Utilidades' }, { descricao: 'Condomínio', categoria: 'Moradia' }, { descricao: 'IPTU', categoria: 'Impostos' }, { descricao: 'Gás', categoria: 'Utilidades' }].map((t) => (
                <button key={t.descricao} type="button" onClick={() => addCustoVacancia(t)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 border">
                  <Plus className="h-3 w-3" /> {t.descricao}
                </button>
              ))}
            </div>
            {custosVacancia.map((item, index) => (
              <div key={item.id ?? index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded border p-2 bg-background">
                <Input className="sm:col-span-4" placeholder="Descrição" value={item.descricao} onChange={(e) => updateCustoVacancia(index, { descricao: e.target.value })} />
                <CurrencyInput className="sm:col-span-2" value={item.valor} onChange={(v) => updateCustoVacancia(index, { valor: v })} placeholder="R$" />
                <Input type="number" min={1} max={31} className="sm:col-span-2" placeholder="Dia" value={item.dia || ''} onChange={(e) => updateCustoVacancia(index, { dia: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 5)) })} />
                <Select value={item.categoria} onValueChange={(v) => updateCustoVacancia(index, { categoria: v })}>
                  <SelectTrigger className="sm:col-span-3 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CATEGORIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="sm:col-span-1 flex items-center">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeCustoVacancia(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={() => addCustoVacancia()}>
              <Plus className="h-4 w-4" /> Adicionar custo
            </Button>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Collapsible defaultOpen className="rounded-lg border p-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium text-sm">
          Custos do proprietário
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Custos fixos independente de ter ou não inquilino.</p>
          <div className="flex flex-wrap gap-1.5">
            {[{ descricao: 'Fundo de reserva', categoria: 'Moradia' }, { descricao: 'IPTU', categoria: 'Impostos' }, { descricao: 'Seguro residencial', categoria: 'Moradia' }, { descricao: 'Reforma', categoria: 'Moradia' }].map((t) => (
              <button key={t.descricao} type="button" onClick={() => addCustoProprietario(t)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 border">
                <Plus className="h-3 w-3" /> {t.descricao}
              </button>
            ))}
          </div>
          {custosProprietario.map((item, index) => (
            <div key={item.id ?? index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded border p-2 bg-background">
              <Input className="sm:col-span-3" placeholder="Descrição" value={item.descricao} onChange={(e) => updateCustoProprietario(index, { descricao: e.target.value })} />
              <CurrencyInput className="sm:col-span-2" value={item.valor} onChange={(v) => updateCustoProprietario(index, { valor: v })} placeholder="R$" />
              <Input type="number" min={1} max={31} className="sm:col-span-1" placeholder="Dia" value={item.dia || ''} onChange={(e) => updateCustoProprietario(index, { dia: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 5)) })} />
              <Select value={item.frequencia} onValueChange={(v: 'mensal' | 'anual') => updateCustoProprietario(index, { frequencia: v })}>
                <SelectTrigger className="sm:col-span-2 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={item.categoria} onValueChange={(v) => updateCustoProprietario(index, { categoria: v })}>
                <SelectTrigger className="sm:col-span-3 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {CATEGORIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="sm:col-span-1 flex items-center">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeCustoProprietario(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={() => addCustoProprietario()}>
            <Plus className="h-4 w-4" /> Adicionar custo
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Step 2: Configurações de Aluguel
export const PropertyStepAluguel: React.FC<{
  formData: PropertyFormData;
  onFormChange: (data: Partial<PropertyFormData>) => void;
}> = ({ formData, onFormChange }) => {
  const diaAluguel = formData.diaAluguel ?? 5;
  return (
    <div className="space-y-4 p-4 rounded-lg bg-income/5 border border-income/20">
      <h4 className="text-sm font-medium text-income flex items-center gap-2">
        <Home className="h-4 w-4" />
        Configurações do Aluguel
      </h4>

      <div className="space-y-2">
        <Label htmlFor="rentalValue">Valor do Aluguel Mensal</Label>
        <CurrencyInput
          id="rentalValue"
          value={formData.rentalValue}
          onChange={(value) => onFormChange({ rentalValue: value })}
          placeholder="R$ 0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="diaAluguel">Dia de recebimento</Label>
        <Input
          id="diaAluguel"
          type="number"
          min={1}
          max={31}
          value={diaAluguel}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onFormChange({ diaAluguel: Math.min(31, Math.max(1, v)) });
          }}
        />
        <p className="text-xs text-muted-foreground">Dia do mês em que o aluguel é recebido (1-31)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="averageRentedMonths">Meses Alugado/Ano</Label>
          <Input
            id="averageRentedMonths"
            type="number"
            min={0}
            max={12}
            value={formData.averageRentedMonths}
            onChange={(e) => {
              const val = Math.min(12, Math.max(0, parseInt(e.target.value) || 0));
              onFormChange({ averageRentedMonths: val });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Mês de Reajuste</Label>
          <Select
            value={formData.rentAdjustmentMonth.toString()}
            onValueChange={(value) => onFormChange({ rentAdjustmentMonth: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-60">
              {monthOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value.toString()}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-background">
        <div>
          <p className="font-medium text-sm">Lembrete de reajuste</p>
          <p className="text-xs text-muted-foreground">
            Ser lembrado do ajuste do contrato?
          </p>
        </div>
        <Switch
          checked={formData.rentAdjustmentReminder}
          onCheckedChange={(checked) => onFormChange({ rentAdjustmentReminder: checked })}
        />
      </div>
    </div>
  );
};

// Step 3: Despesas do Imóvel
export const PropertyStepDespesas: React.FC<{
  formData: PropertyFormData;
  onFormChange: (data: Partial<PropertyFormData>) => void;
}> = ({ formData, onFormChange }) => {
  const expenseItems = [
    { key: 'iptu', label: 'IPTU' },
    { key: 'condominio', label: 'Condomínio' },
    { key: 'agua', label: 'Água' },
    { key: 'luz', label: 'Luz' },
    { key: 'gas', label: 'Gás' },
    { key: 'seguro', label: 'Seguro' },
    { key: 'manutencaoOrdinaria', label: 'Man. Ordinária' },
    { key: 'manutencaoExtraordinaria', label: 'Man. Extraordinária' },
  ];

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h4 className="text-sm font-medium">Despesas Mensais</h4>
        <p className="text-xs text-muted-foreground">Informe valores e responsáveis</p>
      </div>

      <div className="space-y-2">
        {expenseItems.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-background p-3 border">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{label}</span>
              <div className="grid grid-cols-2 gap-2">
                <CurrencyInput
                  value={formData.propertyMonthlyExpenses[key as keyof PropertyMonthlyExpenses]}
                  onChange={(value) =>
                    onFormChange({
                      propertyMonthlyExpenses: {
                        ...formData.propertyMonthlyExpenses,
                        [key]: value,
                      },
                    })
                  }
                  placeholder="R$ 0"
                  className="h-9 text-sm"
                />
                <Select
                  value={formData.expenseResponsibility[key as keyof RentalExpenseResponsibility]}
                  onValueChange={(value: ExpenseResponsible) =>
                    onFormChange({
                      expenseResponsibility: {
                        ...formData.expenseResponsibility,
                        [key]: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="owner">Proprietário</SelectItem>
                    <SelectItem value="tenant">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Step 4: Ajustes de Valor
export const PropertyStepAjustes: React.FC<{
  formData: PropertyFormData;
  onFormChange: (data: Partial<PropertyFormData>) => void;
}> = ({ formData, onFormChange }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Parâmetro de Ajuste de Valor</Label>
        <Select
          value={formData.propertyAdjustment}
          onValueChange={(value: PropertyAdjustmentType) => onFormChange({
            propertyAdjustment: value,
            useCustomCurve: value === 'custom'
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {propertyAdjustmentOptions.map(({ value, label, description }) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.propertyAdjustment === 'custom' && (
        <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <h4 className="text-sm font-medium">Curva Personalizada</h4>
          <p className="text-xs text-muted-foreground">
            Defina valor inicial e final para criar uma curva linear
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="initialValue">Valor Inicial</Label>
              <CurrencyInput
                id="initialValue"
                value={formData.initialValue}
                onChange={(value) => onFormChange({ initialValue: value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalValue">Valor Final</Label>
              <CurrencyInput
                id="finalValue"
                value={formData.finalValue}
                onChange={(value) => onFormChange({ finalValue: value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <DatePickerFriendly
                value={formData.finalDate}
                onChange={(date) => onFormChange({ finalDate: date })}
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>

          {formData.initialValue > 0 && formData.finalValue > 0 && (
            <div className="p-3 rounded-lg bg-accent/50">
              <p className="text-sm">
                <span className="font-medium">Variação: </span>
                <span className={formData.finalValue >= formData.initialValue ? "text-income" : "text-expense"}>
                  {formatCurrency(formData.finalValue - formData.initialValue)}
                  {' '}
                  ({((formData.finalValue - formData.initialValue) / formData.initialValue * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Step 5: Resumo Visual
export const PropertyStepResumo: React.FC<{
  formData: PropertyFormData;
}> = ({ formData }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const adjustmentLabels: Record<PropertyAdjustmentType, string> = {
    igpm: 'IGP-M',
    ipca: 'IPCA',
    minimum_wage: '% Salário Mínimo',
    none: 'Sem reajuste',
    custom: 'Curva personalizada',
  };

  const monthNames = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const totalExpenses = Object.values(formData.propertyMonthlyExpenses).reduce((acc, val) => acc + val, 0);
  const annualRent = formData.rentalValue * formData.averageRentedMonths;
  const annualExpenses = totalExpenses * 12;
  const netAnnualIncome = formData.isRentalProperty ? annualRent - annualExpenses : 0;
  const yieldPercent = formData.value > 0 && formData.isRentalProperty 
    ? ((netAnnualIncome / formData.value) * 100).toFixed(2) 
    : '0.00';

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h4 className="text-base font-semibold text-foreground">Confirme os dados do imóvel</h4>
        <p className="text-xs text-muted-foreground">Revise todas as informações antes de salvar</p>
      </div>

      {/* Dados Básicos */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Building2 className="h-4 w-4" />
          Dados Básicos
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Nome</span>
            <p className="font-medium">{formData.name || '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Valor Atual</span>
            <p className="font-medium text-primary">{formatCurrency(formData.value)}</p>
          </div>
          {formData.propertyCep && (
            <div>
              <span className="text-muted-foreground text-xs">CEP</span>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {formData.propertyCep}
              </p>
            </div>
          )}
          {formData.propertyArea > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Área</span>
              <p className="font-medium">{formData.propertyArea} m²</p>
            </div>
          )}
          {formData.purchaseDate && (
            <div>
              <span className="text-muted-foreground text-xs">Data da Compra</span>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(formData.purchaseDate, 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}
          {formData.purchaseValue > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Valor da Compra</span>
              <p className="font-medium">{formatCurrency(formData.purchaseValue)}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Informações de Aluguel */}
      {formData.isRentalProperty && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-income/30 bg-income/5 p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-income">
            <Home className="h-4 w-4" />
            Renda de Aluguel
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Valor Mensal</span>
              <p className="font-medium text-income">{formatCurrency(formData.rentalValue)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Meses Alugado/Ano</span>
              <p className="font-medium">{formData.averageRentedMonths} meses</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Mês de Reajuste</span>
              <p className="font-medium">{monthNames[formData.rentAdjustmentMonth]}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Lembrete de Reajuste</span>
              <p className="font-medium">{formData.rentAdjustmentReminder ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Despesas */}
      {formData.isRentalProperty && totalExpenses > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-expense/30 bg-expense/5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-expense">
              <Receipt className="h-4 w-4" />
              Despesas Mensais
            </div>
            <span className="text-sm font-semibold text-expense">{formatCurrency(totalExpenses)}/mês</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(formData.propertyMonthlyExpenses).map(([key, value]) => {
              if (value <= 0) return null;
              const labels: Record<string, string> = {
                iptu: 'IPTU', condominio: 'Condomínio', agua: 'Água', luz: 'Luz',
                gas: 'Gás', seguro: 'Seguro', manutencaoOrdinaria: 'Man. Ordinária',
                manutencaoExtraordinaria: 'Man. Extraordinária'
              };
              const responsible = formData.expenseResponsibility[key as keyof RentalExpenseResponsibility];
              return (
                <div key={key} className="flex justify-between items-center py-1 px-2 rounded bg-background">
                  <span className="text-muted-foreground">{labels[key]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(value)}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      responsible === 'owner' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {responsible === 'owner' ? 'Prop.' : 'Inq.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Ajuste de Valor */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg border p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <TrendingUp className="h-4 w-4" />
          Parâmetro de Ajuste
        </div>
        <div className="text-sm">
          <p className="font-medium">{adjustmentLabels[formData.propertyAdjustment]}</p>
          {formData.propertyAdjustment === 'custom' && formData.initialValue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              De {formatCurrency(formData.initialValue)} para {formatCurrency(formData.finalValue)}
              {formData.finalDate && ` até ${format(formData.finalDate, 'dd/MM/yyyy', { locale: ptBR })}`}
            </p>
          )}
        </div>
      </motion.div>

      {/* Resumo Financeiro */}
      {formData.isRentalProperty && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <DollarSign className="h-4 w-4 text-primary" />
            Resumo Financeiro Anual
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-sm font-semibold text-income">{formatCurrency(annualRent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-sm font-semibold text-expense">{formatCurrency(annualExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yield</p>
              <p className={cn(
                "text-sm font-semibold",
                parseFloat(yieldPercent) >= 0 ? "text-income" : "text-expense"
              )}>{yieldPercent}%</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const PropertyStepWizard: React.FC<PropertyStepWizardProps> = ({
  currentStep,
  onStepChange,
  formData,
  onFormChange,
}) => {
  const [direction, setDirection] = React.useState(0);
  const [prevStep, setPrevStep] = React.useState<PropertyStep>(currentStep);

  React.useEffect(() => {
    const steps = formData.isRentalProperty 
      ? ['dados', 'aluguel', 'despesas', 'ajustes', 'resumo']
      : ['dados', 'ajustes', 'resumo'];
    const prevIndex = steps.indexOf(prevStep);
    const currIndex = steps.indexOf(currentStep);
    setDirection(currIndex > prevIndex ? 1 : -1);
    setPrevStep(currentStep);
  }, [currentStep, formData.isRentalProperty]);

  const renderStep = () => {
    switch (currentStep) {
      case 'dados':
        return <PropertyStepDados formData={formData} onFormChange={onFormChange} />;
      case 'aluguel':
        return <PropertyStepAluguel formData={formData} onFormChange={onFormChange} />;
      case 'despesas':
        return <PropertyStepDespesas formData={formData} onFormChange={onFormChange} />;
      case 'ajustes':
        return <PropertyStepAjustes formData={formData} onFormChange={onFormChange} />;
      case 'resumo':
        return <PropertyStepResumo formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <PropertyStepProgress 
        currentStep={currentStep} 
        isRentalProperty={formData.isRentalProperty}
        onStepClick={onStepChange}
      />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const getNextPropertyStep = (current: PropertyStep, isRentalProperty: boolean): PropertyStep | null => {
  if (isRentalProperty) {
    const order: PropertyStep[] = ['dados', 'aluguel', 'despesas', 'ajustes', 'resumo'];
    const currentIndex = order.indexOf(current);
    return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
  } else {
    const order: PropertyStep[] = ['dados', 'ajustes', 'resumo'];
    const currentIndex = order.indexOf(current);
    return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
  }
};

export const getPrevPropertyStep = (current: PropertyStep, isRentalProperty: boolean): PropertyStep | null => {
  if (isRentalProperty) {
    const order: PropertyStep[] = ['dados', 'aluguel', 'despesas', 'ajustes', 'resumo'];
    const currentIndex = order.indexOf(current);
    return currentIndex > 0 ? order[currentIndex - 1] : null;
  } else {
    const order: PropertyStep[] = ['dados', 'ajustes', 'resumo'];
    const currentIndex = order.indexOf(current);
    return currentIndex > 0 ? order[currentIndex - 1] : null;
  }
};

export const isLastPropertyStep = (current: PropertyStep): boolean => {
  return current === 'resumo';
};

export const isFirstPropertyStep = (current: PropertyStep): boolean => {
  return current === 'dados';
};
