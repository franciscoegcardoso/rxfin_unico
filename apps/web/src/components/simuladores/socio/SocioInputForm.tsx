import React, { useState, useEffect } from 'react';
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
  Briefcase,
  HelpCircle,
  Calculator,
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
  CheckCircle2,
  TrendingUp,
  Building2,
  Percent,
  Users,
  Car,
  Building,
  Coins,
  Clock,
  UserPlus,
  Settings2,
  Factory,
} from 'lucide-react';
import {
  SocioInputData,
  SocioFullCalculation,
  SocioCompanyRegime,
  SocioBenefitsState,
  SocioBenefit,
  COMPANY_TAX_CONFIGS,
  DEFAULT_SOCIO_BENEFITS,
  SOCIO_HELP_INFO,
  SALARIO_MINIMO_2026,
  createCustomSocioBenefit,
  calculateSocioBenefitsCost,
  calculateSocioFull,
  getDefaultSocioData,
} from './SocioTaxTypes';
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
  Car: <Car className="h-4 w-4" />,
  Building: <Building className="h-4 w-4" />,
  Coins: <Coins className="h-4 w-4" />,
  Briefcase: <Briefcase className="h-4 w-4" />,
  TrendingUp: <TrendingUp className="h-4 w-4" />,
  Percent: <Percent className="h-4 w-4" />,
};

// ==================== TAX BREAKDOWN DIALOG ====================

const SocioTaxBreakdownDialog: React.FC<{ calculation: SocioFullCalculation }> = ({ calculation }) => {
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
            Detalhamento Sócio
          </DialogTitle>
          <DialogDescription>Regime da empresa: {calculation.regime}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 text-sm">
          {calculation.breakdown.map((item, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex justify-between py-2",
                item.type === 'income' && "font-semibold",
                item.type === 'tax' && "text-destructive/80 pl-4",
                item.type === 'benefit' && "text-purple-600 pl-4",
                item.type === 'net' && "font-semibold text-emerald-600 border-t pt-3",
              )}
            >
              <span className="flex items-center gap-1">
                {item.type === 'tax' && '−'}
                {item.type === 'benefit' && '+'}
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
              Alíquota efetiva: <strong>{calculation.aliquotaEfetivaGeral.toFixed(2)}%</strong>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== COMPACT BENEFIT ITEM ====================

interface CompactBenefitItemProps {
  benefit: SocioBenefit;
  onChange: (benefit: SocioBenefit) => void;
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

interface SocioInputFormProps {
  data: SocioInputData;
  onChange: (data: SocioInputData) => void;
}

export { getDefaultSocioData };
export type { SocioInputData, SocioFullCalculation };

export const SocioInputForm: React.FC<SocioInputFormProps> = ({ data, onChange }) => {
  const isMobile = useIsMobile();
  const [newBenefitName, setNewBenefitName] = useState('');

  // Recalculate on data change
  useEffect(() => {
    const calculation = calculateSocioFull(data);
    if (JSON.stringify(calculation) !== JSON.stringify(data.calculation)) {
      onChange({ ...data, calculation });
    }
  }, [
    data.companyRegime, data.proLabore, data.distribuicaoLucros, 
    data.jurosCapitalProprio, data.dividendos, data.bonusAnual,
    data.dependents, data.benefits, data.weeklyHours
  ]);

  const proLaboreAboveMinimum = data.proLabore >= SALARIO_MINIMO_2026;
  
  // Benefits
  const { total, totalCompanyPaid, totalPersonal } = calculateSocioBenefitsCost(data.benefits);
  const enabledBenefitsCount = [
    data.benefits.planoSaude,
    data.benefits.seguroVida,
    data.benefits.previdenciaPrivada,
    data.benefits.auxilioEducacao,
    data.benefits.gympass,
    data.benefits.veiculoEmpresa,
    data.benefits.aluguelEscritorio,
    ...data.benefits.customBenefits,
  ].filter(b => b.enabled).length;

  const handleBenefitChange = (key: keyof Omit<SocioBenefitsState, 'customBenefits'>, updated: SocioBenefit) => {
    onChange({ ...data, benefits: { ...data.benefits, [key]: updated } });
  };

  const handleCustomBenefitChange = (index: number, updated: SocioBenefit) => {
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
          customBenefits: [...data.benefits.customBenefits, createCustomSocioBenefit(newBenefitName.trim())],
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
      
      {/* Regime da Empresa */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Regime da Empresa</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'simples', label: 'Simples', icon: Briefcase },
            { value: 'lucro_presumido', label: 'L. Presumido', icon: Building2 },
            { value: 'lucro_real', label: 'L. Real', icon: Factory },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...data, companyRegime: option.value as SocioCompanyRegime })}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all",
                  data.companyRegime === option.value
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 mx-auto mb-1",
                  data.companyRegime === option.value ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="font-medium text-xs">{option.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pró-labore + Lucros (campos principais) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Pró-labore *</Label>
          <CurrencyInput
            value={data.proLabore}
            onChange={(value) => onChange({ ...data, proLabore: value })}
            placeholder="0"
          />
          {data.proLabore > 0 && !proLaboreAboveMinimum && (
            <p className="text-[10px] text-destructive">Mín: {formatMoney(SALARIO_MINIMO_2026)}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Lucros Distribuídos</Label>
          <CurrencyInput
            value={data.distribuicaoLucros}
            onChange={(value) => onChange({ ...data, distribuicaoLucros: value })}
            placeholder="0"
          />
          <p className="text-[10px] text-emerald-600">Isento de IR</p>
        </div>
      </div>


      {/* Resultado: Total Líquido */}
      {data.calculation && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Líquido Mensal</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">
                {formatMoney(data.calculation.totalLiquidoMensal)}
              </p>
            </div>
            <SocioTaxBreakdownDialog calculation={data.calculation} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Alíquota efetiva: {data.calculation.aliquotaEfetivaGeral.toFixed(1)}%
          </p>
        </div>
      )}

      {/* ====== SEÇÕES AVANÇADAS ====== */}
      
      <Accordion type="multiple" className="w-full">
        {/* Outras Rendas */}
        <AccordionItem value="outras-rendas" className="border rounded-lg px-3">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span>Outras Rendas</span>
              {(data.jurosCapitalProprio > 0 || data.dividendos > 0 || data.bonusAnual > 0) && (
                <Badge variant="secondary" className="text-[10px] ml-2">Configurado</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Outras formas de remuneração como sócio.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Juros s/ Capital Próprio</Label>
                <CurrencyInput
                  value={data.jurosCapitalProprio}
                  onChange={(value) => onChange({ ...data, jurosCapitalProprio: value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dividendos</Label>
                <CurrencyInput
                  value={data.dividendos}
                  onChange={(value) => onChange({ ...data, dividendos: value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Bônus Anual</Label>
              <CurrencyInput
                value={data.bonusAnual}
                onChange={(value) => onChange({ ...data, bonusAnual: value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Dependentes (IRPF)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={data.dependents || ''}
                onChange={(e) => onChange({ ...data, dependents: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Benefícios */}
        <AccordionItem value="benefits" className="border rounded-lg px-3 mt-2">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-sm">
              <Gift className="h-4 w-4 text-purple-600" />
              <span>Benefícios via Empresa</span>
              {enabledBenefitsCount > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {enabledBenefitsCount} • {formatMoney(total)}/mês
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Benefícios pagos pela empresa podem ter vantagens fiscais.
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
              <CompactBenefitItem 
                benefit={data.benefits.veiculoEmpresa}
                onChange={(b) => handleBenefitChange('veiculoEmpresa', b)}
              />
              <CompactBenefitItem 
                benefit={data.benefits.aluguelEscritorio}
                onChange={(b) => handleBenefitChange('aluguelEscritorio', b)}
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

export default SocioInputForm;
