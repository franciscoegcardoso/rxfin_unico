import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, CalendarClock } from 'lucide-react';
import { InsuranceType, insuranceTypeOptions } from '@/types/seguro';
import { cn } from '@/lib/utils';
import { addYears, format } from 'date-fns';

export interface AssetInsuranceData {
  hasInsurance: boolean;
  hasWarranty: boolean;
  // Campos de seguro (quando hasInsurance)
  insuranceType: InsuranceType;
  insuranceName: string;
  insuranceCompany: string;
  premiumMonthly: number;
  premiumAnnual: number;
  coverageValue: number;
  franchise: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  // Campos de garantia (quando hasWarranty)
  isWarranty: boolean;
  warrantyName: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyExtended: boolean;
  warrantyExtendedMonths: number;
  warrantyStore: string;
  warrantyValorPago: number;
}

export const defaultInsuranceData: AssetInsuranceData = {
  hasInsurance: false,
  hasWarranty: false,
  insuranceType: 'garantia_estendida',
  insuranceName: '',
  insuranceCompany: '',
  premiumMonthly: 0,
  premiumAnnual: 0,
  coverageValue: 0,
  franchise: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: addYears(new Date(), 1).toISOString().split('T')[0],
  autoRenew: false,
  isWarranty: false,
  warrantyName: '',
  warrantyStartDate: new Date().toISOString().split('T')[0],
  warrantyEndDate: addYears(new Date(), 1).toISOString().split('T')[0],
  warrantyExtended: false,
  warrantyExtendedMonths: 12,
  warrantyStore: '',
  warrantyValorPago: 0,
};

interface AssetInsuranceSectionProps {
  assetType: 'property' | 'vehicle' | 'valuable_objects' | 'other';
  assetName: string;
  assetValue: number;
  purchaseDate?: Date;
  data: AssetInsuranceData;
  onChange: (data: AssetInsuranceData) => void;
  compact?: boolean;
}

export const AssetInsuranceSection: React.FC<AssetInsuranceSectionProps> = ({
  assetType,
  assetName,
  assetValue,
  purchaseDate,
  data,
  onChange,
  compact = false,
}) => {
  // Tipo de seguro sugerido baseado no tipo de ativo
  const getSuggestedInsuranceType = (): InsuranceType => {
    switch (assetType) {
      case 'property': return 'residencial';
      case 'vehicle': return 'auto';
      default: return 'garantia_estendida';
    }
  };

  // Atualiza tipo de seguro quando toggle é ativado
  const handleHasInsuranceChange = (enabled: boolean) => {
    onChange({
      ...data,
      hasInsurance: enabled,
      insuranceType: enabled ? getSuggestedInsuranceType() : data.insuranceType,
      insuranceName: enabled && !data.insuranceName ? `Seguro ${assetName}` : data.insuranceName,
      startDate: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : data.startDate,
      coverageValue: assetValue > 0 ? assetValue : data.coverageValue,
    });
  };

  // Toggle "tem garantia" (independente de seguro)
  const handleHasWarrantyChange = (enabled: boolean) => {
    onChange({
      ...data,
      hasWarranty: enabled,
      warrantyName: enabled && !data.warrantyName ? `Garantia ${assetName}` : data.warrantyName,
      warrantyStartDate: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : data.warrantyStartDate,
    });
  };

  const handlePremiumMonthlyChange = (value: number) => {
    onChange({
      ...data,
      premiumMonthly: value,
      premiumAnnual: value * 12,
    });
  };

  const handlePremiumAnnualChange = (value: number) => {
    onChange({
      ...data,
      premiumAnnual: value,
      premiumMonthly: Math.round((value / 12) * 100) / 100,
    });
  };

  if (compact) {
    return (
      <div className="space-y-6">
        {/* Seguro — toggle independente */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Tem seguro?</Label>
            </div>
            <Switch
              checked={data.hasInsurance}
              onCheckedChange={handleHasInsuranceChange}
            />
          </div>
          {data.hasInsurance && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              {!['property', 'vehicle'].includes(assetType) && (
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de Seguro</Label>
                  <Select
                    value={data.insuranceType}
                    onValueChange={(v) => onChange({ ...data, insuranceType: v as InsuranceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {insuranceTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Seguradora</Label>
                  <Input
                    placeholder="Ex: Porto Seguro"
                    value={data.insuranceCompany}
                    onChange={(e) => onChange({ ...data, insuranceCompany: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Prêmio Mensal</Label>
                  <CurrencyInput
                    value={data.premiumMonthly}
                    onChange={handlePremiumMonthlyChange}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Início da Vigência</Label>
                  <Input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => onChange({ ...data, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={data.endDate}
                    onChange={(e) => onChange({ ...data, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Renovação Automática</Label>
                <Switch
                  checked={data.autoRenew}
                  onCheckedChange={(v) => onChange({ ...data, autoRenew: v })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Garantia — toggle independente */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Tem garantia?</Label>
            </div>
            <Switch
              checked={data.hasWarranty}
              onCheckedChange={handleHasWarrantyChange}
            />
          </div>
          {data.hasWarranty && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Nome da Garantia</Label>
                  <Input
                    placeholder="Ex: Garantia de fábrica"
                    value={data.warrantyName}
                    onChange={(e) => onChange({ ...data, warrantyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Loja/Fabricante</Label>
                  <Input
                    placeholder="Ex: Amazon, Samsung..."
                    value={data.warrantyStore}
                    onChange={(e) => onChange({ ...data, warrantyStore: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={data.warrantyStartDate}
                    onChange={(e) => onChange({ ...data, warrantyStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Limite da Garantia</Label>
                  <Input
                    type="date"
                    value={data.warrantyEndDate}
                    onChange={(e) => onChange({ ...data, warrantyEndDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-income" />
                  <Label className="text-sm">Garantia Estendida Contratada</Label>
                </div>
                <Switch
                  checked={data.warrantyExtended}
                  onCheckedChange={(v) => onChange({ ...data, warrantyExtended: v })}
                />
              </div>
              {data.warrantyExtended && (
                <div className="space-y-2">
                  <Label className="text-xs">Meses Adicionais de Garantia</Label>
                  <Select
                    value={String(data.warrantyExtendedMonths)}
                    onValueChange={(v) => onChange({ ...data, warrantyExtendedMonths: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses (1 ano)</SelectItem>
                      <SelectItem value="24">24 meses (2 anos)</SelectItem>
                      <SelectItem value="36">36 meses (3 anos)</SelectItem>
                      <SelectItem value="48">48 meses (4 anos)</SelectItem>
                      <SelectItem value="60">60 meses (5 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Versão expandida (Card)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Seguro e Garantia</CardTitle>
        </div>
        <CardDescription>
          Você pode cadastrar seguro, garantia ou os dois para este bem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tem seguro? */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Tem seguro?</Label>
            <Switch
              checked={data.hasInsurance}
              onCheckedChange={handleHasInsuranceChange}
            />
          </div>
          {data.hasInsurance && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Seguro</Label>
                  <Input
                    placeholder="Ex: Seguro Auto Completo"
                    value={data.insuranceName}
                    onChange={(e) => onChange({ ...data, insuranceName: e.target.value })}
                  />
                </div>
                {!['property', 'vehicle'].includes(assetType) && (
                  <div className="space-y-2">
                    <Label>Tipo de Seguro</Label>
                    <Select
                      value={data.insuranceType}
                      onValueChange={(v) => onChange({ ...data, insuranceType: v as InsuranceType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceTypeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seguradora</Label>
                  <Input
                    placeholder="Ex: Porto Seguro, Bradesco..."
                    value={data.insuranceCompany}
                    onChange={(e) => onChange({ ...data, insuranceCompany: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Cobertura</Label>
                  <CurrencyInput
                    value={data.coverageValue}
                    onChange={(v) => onChange({ ...data, coverageValue: v })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prêmio Mensal</Label>
                  <CurrencyInput
                    value={data.premiumMonthly}
                    onChange={handlePremiumMonthlyChange}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prêmio Anual</Label>
                  <CurrencyInput
                    value={data.premiumAnnual}
                    onChange={handlePremiumAnnualChange}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Franquia</Label>
                  <CurrencyInput
                    value={data.franchise}
                    onChange={(v) => onChange({ ...data, franchise: v })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início da Vigência</Label>
                  <Input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => onChange({ ...data, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={data.endDate}
                    onChange={(e) => onChange({ ...data, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <Label className="font-medium">Renovação Automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Seguro renova automaticamente ao fim da vigência
                  </p>
                </div>
                <Switch
                  checked={data.autoRenew}
                  onCheckedChange={(v) => onChange({ ...data, autoRenew: v })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tem garantia? */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Tem garantia?</Label>
            <Switch
              checked={data.hasWarranty}
              onCheckedChange={handleHasWarrantyChange}
            />
          </div>
          {data.hasWarranty && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="p-3 rounded-lg bg-accent/50 flex items-start gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Acompanhe sua garantia</p>
                  <p className="text-muted-foreground text-xs">
                    Você será alertado quando a garantia estiver próxima de expirar
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Garantia</Label>
                  <Input
                    placeholder="Ex: Garantia Notebook Dell"
                    value={data.warrantyName}
                    onChange={(e) => onChange({ ...data, warrantyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loja/Fabricante</Label>
                  <Input
                    placeholder="Ex: Amazon, Dell, Samsung..."
                    value={data.warrantyStore}
                    onChange={(e) => onChange({ ...data, warrantyStore: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Compra</Label>
                  <Input
                    type="date"
                    value={data.warrantyStartDate}
                    onChange={(e) => onChange({ ...data, warrantyStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Limite da Garantia</Label>
                  <Input
                    type="date"
                    value={data.warrantyEndDate}
                    onChange={(e) => onChange({ ...data, warrantyEndDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-income" />
                    <div>
                      <Label className="font-medium">Garantia Estendida</Label>
                      <p className="text-xs text-muted-foreground">Contratou garantia adicional?</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.warrantyExtended}
                    onCheckedChange={(v) => onChange({ ...data, warrantyExtended: v })}
                  />
                </div>
                {data.warrantyExtended && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Meses Adicionais</Label>
                      <Select
                        value={String(data.warrantyExtendedMonths)}
                        onValueChange={(v) => onChange({ ...data, warrantyExtendedMonths: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 meses</SelectItem>
                          <SelectItem value="12">12 meses (1 ano)</SelectItem>
                          <SelectItem value="24">24 meses (2 anos)</SelectItem>
                          <SelectItem value="36">36 meses (3 anos)</SelectItem>
                          <SelectItem value="48">48 meses (4 anos)</SelectItem>
                          <SelectItem value="60">60 meses (5 anos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Valor Pago</Label>
                      <CurrencyInput
                        value={data.warrantyValorPago}
                        onChange={(v) => onChange({ ...data, warrantyValorPago: v })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
