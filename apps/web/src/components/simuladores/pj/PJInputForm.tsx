import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Briefcase,
  HelpCircle,
  Calculator,
  ChevronDown,
  Lightbulb,
  Heart,
  Shield,
  GraduationCap,
  Dumbbell,
  Gift,
  Plus,
  X,
  PiggyBank,
  Info,
  AlertCircle,
  CheckCircle2,
  Building2,
  Factory,
  Users,
  Percent,
  Settings2,
  Clock,
} from 'lucide-react';
import {
  PJInputData,
  PJFullCalculation,
  PJTaxRegime,
  SimplesAnexo,
  AtividadeEconomica,
  PJBenefitsState,
  PJBenefit,
  ATIVIDADES,
  MEI_CONFIG,
  DEFAULT_PJ_BENEFITS,
  createCustomPJBenefit,
  calculatePJBenefitsCost,
  calculatePJFull,
  calculateFatorR,
  getAnexoLabel,
  PJ_HELP_INFO,
  getDefaultPJData,
} from './PJTaxTypes';
import { useIsMobile } from '@/hooks/use-mobile';

// ==================== HELPERS ====================

const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==================== ICON MAP ====================

const iconMap: Record<string, React.ReactNode> = {
  Heart: <Heart className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  GraduationCap: <GraduationCap className="h-4 w-4" />,
  Dumbbell: <Dumbbell className="h-4 w-4" />,
  Gift: <Gift className="h-4 w-4" />,
  PiggyBank: <PiggyBank className="h-4 w-4" />,
};

// ==================== TAX BREAKDOWN DIALOG ====================

const PJTaxBreakdownDialog: React.FC<{ calculation: PJFullCalculation }> = ({ calculation }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 h-auto p-0 gap-1">
          <Calculator className="h-3 w-3" />
          Ver detalhes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-primary" />
            Detalhamento PJ
          </DialogTitle>
          <DialogDescription>Regime: {calculation.regime}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 text-sm">
          {calculation.breakdown.map((item, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex justify-between py-2",
                item.type === 'income' && "font-semibold",
                item.type === 'tax' && "text-destructive/80 pl-4",
                item.type === 'cost' && "text-amber-600 pl-4",
                item.type === 'net' && "font-semibold text-emerald-600 border-t pt-3",
              )}
            >
              <span className="flex items-center gap-1">
                {item.type === 'tax' && '−'}
                {item.type === 'cost' && '−'}
                {item.label}
              </span>
              <span className="tabular-nums">
                {formatMoney(item.value)}
                {item.percentage !== undefined && item.percentage > 0 && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
          
          <div className="p-3 bg-muted/50 rounded-lg mt-4">
            <p className="text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 inline mr-1" />
              Alíquota efetiva: <strong>{calculation.aliquotaEfetiva.toFixed(2)}%</strong>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== COMPACT BENEFIT ITEM ====================

interface CompactBenefitItemProps {
  benefit: PJBenefit;
  onChange: (benefit: PJBenefit) => void;
  onRemove?: () => void;
}

const CompactBenefitItem: React.FC<CompactBenefitItemProps> = ({ benefit, onChange, onRemove }) => {
  return (
    <div className="flex items-center gap-2 py-2">
      <Checkbox
        checked={benefit.enabled}
        onCheckedChange={(checked) => onChange({ ...benefit, enabled: !!checked })}
      />
      <span className={cn(
        "flex-1 text-sm",
        benefit.enabled ? "font-medium" : "text-muted-foreground"
      )}>
        {benefit.name}
      </span>
      {benefit.enabled && (
        <CurrencyInput
          value={benefit.monthlyValue}
          onChange={(value) => onChange({ ...benefit, monthlyValue: value })}
          compact
          className="w-24 h-7 text-xs"
        />
      )}
      {benefit.isCustom && onRemove && (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

interface PJInputFormProps {
  data: PJInputData;
  onChange: (data: PJInputData) => void;
}

export { getDefaultPJData };
export type { PJInputData, PJFullCalculation };

export const PJInputForm: React.FC<PJInputFormProps> = ({ data, onChange }) => {
  const isMobile = useIsMobile();
  const [newBenefitName, setNewBenefitName] = useState('');
  
  // Recalculate on data change
  useEffect(() => {
    const calculation = calculatePJFull(data);
    if (JSON.stringify(calculation) !== JSON.stringify(data.calculation)) {
      onChange({ ...data, calculation });
    }
  }, [data.taxRegime, data.atividade, data.faturamentoMensal, data.rbt12, data.useAutoRBT12, 
      data.anexo, data.folhaSalarios12, data.useFatorR, data.custosFixos, data.proLabore, data.benefits]);

  // Update anexo based on atividade
  useEffect(() => {
    const atividadeInfo = ATIVIDADES.find(a => a.id === data.atividade);
    if (atividadeInfo) {
      const newAnexo = data.useFatorR && atividadeInfo.anexoFatorR 
        ? atividadeInfo.anexoFatorR 
        : atividadeInfo.anexoPadrao;
      if (newAnexo !== data.anexo) {
        onChange({ ...data, anexo: newAnexo });
      }
    }
  }, [data.atividade, data.useFatorR]);

  // Check MEI limit
  const meiExceedLimit = data.taxRegime === 'mei' && data.faturamentoMensal * 12 > MEI_CONFIG.limiteFaturamento;
  
  // Fator R calculation
  const rbt12 = data.useAutoRBT12 ? data.faturamentoMensal * 12 : data.rbt12;
  const fatorRCalc = calculateFatorR(data.folhaSalarios12, rbt12);
  const atividadeInfo = ATIVIDADES.find(a => a.id === data.atividade);
  const canUseFatorR = !!atividadeInfo?.anexoFatorR;
  
  // Benefits
  const totalBenefitsCost = calculatePJBenefitsCost(data.benefits);
  const enabledBenefitsCount = [
    data.benefits.planoSaude,
    data.benefits.seguroVida,
    data.benefits.previdenciaPrivada,
    data.benefits.auxilioEducacao,
    data.benefits.gympass,
    ...data.benefits.customBenefits,
  ].filter(b => b.enabled).length;

  const handleBenefitChange = (key: keyof Omit<PJBenefitsState, 'customBenefits'>, updated: PJBenefit) => {
    onChange({ ...data, benefits: { ...data.benefits, [key]: updated } });
  };

  const handleCustomBenefitChange = (index: number, updated: PJBenefit) => {
    const newCustom = [...data.benefits.customBenefits];
    newCustom[index] = updated;
    onChange({ ...data, benefits: { ...data.benefits, customBenefits: newCustom } });
  };

  const handleAddCustomBenefit = () => {
    if (newBenefitName.trim()) {
      onChange({
        ...data,
        benefits: {
          ...data.benefits,
          customBenefits: [...data.benefits.customBenefits, createCustomPJBenefit(newBenefitName.trim())],
        },
      });
      setNewBenefitName('');
    }
  };

  const handleRemoveCustomBenefit = (index: number) => {
    onChange({
      ...data,
      benefits: {
        ...data.benefits,
        customBenefits: data.benefits.customBenefits.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ====== SEÇÃO ESSENCIAL ====== */}
      
      {/* Regime Tributário - Cards Compactos */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Regime Tributário</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'mei', label: 'MEI', icon: Users, desc: 'Até R$ 81k/ano' },
            { value: 'simples', label: 'Simples', icon: Briefcase, desc: 'Até R$ 4,8M' },
            { value: 'lucro_presumido', label: 'L. Presumido', icon: Building2, desc: 'Qualquer' },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...data, taxRegime: option.value as PJTaxRegime })}
                className={cn(
                  "p-2 rounded-lg border text-left transition-all",
                  data.taxRegime === option.value
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 mb-1",
                  data.taxRegime === option.value ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="font-medium text-xs">{option.label}</p>
                <p className="text-[9px] text-muted-foreground">{option.desc}</p>
              </button>
            );
          })}
        </div>
        {meiExceedLimit && (
          <div className="p-2 bg-destructive/10 rounded-lg flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Faturamento ultrapassa limite MEI!</span>
          </div>
        )}
      </div>

      {/* Atividade Econômica - CAMPO ESSENCIAL (afeta alíquota) */}
      {data.taxRegime !== 'mei' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Atividade Econômica *</Label>
            {data.taxRegime === 'simples' && (
              <Badge variant="outline" className="text-[10px]">
                {getAnexoLabel(data.anexo)}
              </Badge>
            )}
          </div>
          <Select
            value={data.atividade}
            onValueChange={(value: AtividadeEconomica) => onChange({ ...data, atividade: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione sua atividade..." />
            </SelectTrigger>
            <SelectContent>
              {ATIVIDADES.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex flex-col">
                    <span className="text-sm">{a.label}</span>
                    <span className="text-[10px] text-muted-foreground">{a.descricao}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Faturamento */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Faturamento Mensal *</Label>
        <CurrencyInput
          value={data.faturamentoMensal}
          onChange={(value) => onChange({ ...data, faturamentoMensal: value })}
          placeholder="0"
        />
      </div>

      {/* Resultado: Lucro Líquido */}
      {data.calculation && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Lucro Líquido Estimado</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">
                {formatMoney(data.calculation.lucroLiquido)}
              </p>
            </div>
            <PJTaxBreakdownDialog calculation={data.calculation} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Impostos: {formatMoney(data.calculation.impostosMensais)} ({data.calculation.aliquotaEfetiva.toFixed(1)}%)
          </p>
        </div>
      )}

      {/* ====== SEÇÕES AVANÇADAS ====== */}
      
      <Accordion type="multiple" className="w-full">
        {/* Configurações Fiscais Avançadas */}
        <AccordionItem value="fiscal" className="border rounded-lg px-3">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span>Configurações Avançadas</span>
              {(data.custosFixos > 0 || data.useFatorR) && (
                <Badge variant="secondary" className="text-[10px] ml-2">Personalizado</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            {/* Fator R (for Simples Anexo V) */}
            {data.taxRegime === 'simples' && canUseFatorR && (
              <div className="p-3 bg-blue-500/10 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-blue-600" />
                    Usar Fator R? (migra p/ Anexo III)
                  </Label>
                  <Switch
                    checked={data.useFatorR}
                    onCheckedChange={(checked) => onChange({ ...data, useFatorR: checked })}
                  />
                </div>
                {data.useFatorR && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Folha de Salários (12 meses)</Label>
                      <CurrencyInput
                        value={data.folhaSalarios12}
                        onChange={(value) => onChange({ ...data, folhaSalarios12: value })}
                        className="h-8"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Fator R: <strong>{(fatorRCalc.fatorR * 100).toFixed(1)}%</strong> 
                      {fatorRCalc.aplicavel && <span className="text-emerald-600 ml-1">(Elegível Anexo III)</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Custos Fixos */}
            <div className="space-y-1.5">
              <Label className="text-xs">Custos Fixos (Contador, SW, etc.)</Label>
              <CurrencyInput
                value={data.custosFixos}
                onChange={(value) => onChange({ ...data, custosFixos: value })}
                placeholder="200"
              />
            </div>

            {/* Pró-labore (para LP/LR) */}
            {data.taxRegime === 'lucro_presumido' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Pró-labore Mensal</Label>
                <CurrencyInput
                  value={data.proLabore}
                  onChange={(value) => onChange({ ...data, proLabore: value })}
                  placeholder="0"
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Benefícios */}
        <AccordionItem value="benefits" className="border rounded-lg px-3 mt-2">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <Gift className="h-4 w-4 text-purple-600" />
              <span>Benefícios & Investimentos</span>
              {enabledBenefitsCount > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {enabledBenefitsCount} • {formatMoney(totalBenefitsCost)}/mês
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Benefícios que você paga como PJ são deduzidos do lucro.
            </p>
            
            <div className="divide-y">
              <CompactBenefitItem 
                benefit={data.benefits.planoSaude}
                onChange={(b) => handleBenefitChange('planoSaude', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.seguroVida}
                onChange={(b) => handleBenefitChange('seguroVida', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.previdenciaPrivada}
                onChange={(b) => handleBenefitChange('previdenciaPrivada', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.auxilioEducacao}
                onChange={(b) => handleBenefitChange('auxilioEducacao', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.gympass}
                onChange={(b) => handleBenefitChange('gympass', b)}
              />
              {data.benefits.customBenefits.map((benefit, idx) => (
                <CompactBenefitItem
                  key={benefit.id}
                  benefit={benefit}
                  onChange={(b) => handleCustomBenefitChange(idx, b)}
                  onRemove={() => handleRemoveCustomBenefit(idx)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Input
                value={newBenefitName}
                onChange={(e) => setNewBenefitName(e.target.value)}
                placeholder="Outro benefício..."
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomBenefit()}
              />
              <Button size="sm" onClick={handleAddCustomBenefit} disabled={!newBenefitName.trim()} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default PJInputForm;
