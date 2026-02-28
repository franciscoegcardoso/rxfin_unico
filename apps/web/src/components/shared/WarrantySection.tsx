import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ShieldCheck } from 'lucide-react';
import { format, addYears } from 'date-fns';

interface WarrantySectionProps {
  hasWarranty: boolean;
  setHasWarranty: (value: boolean) => void;
  warrantyEndDate: string;
  setWarrantyEndDate: (value: string) => void;
  warrantyStore: string;
  setWarrantyStore: (value: string) => void;
  hasExtendedWarranty: boolean;
  setHasExtendedWarranty: (value: boolean) => void;
  extendedWarrantyMonths: number;
  setExtendedWarrantyMonths: (value: number) => void;
}

export const WarrantySection: React.FC<WarrantySectionProps> = ({
  hasWarranty,
  setHasWarranty,
  warrantyEndDate,
  setWarrantyEndDate,
  warrantyStore,
  setWarrantyStore,
  hasExtendedWarranty,
  setHasExtendedWarranty,
  extendedWarrantyMonths,
  setExtendedWarrantyMonths,
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label htmlFor="hasWarranty" className="flex items-center gap-2 cursor-pointer">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Possui garantia?
        </Label>
        <Switch
          id="hasWarranty"
          checked={hasWarranty}
          onCheckedChange={setHasWarranty}
        />
      </div>
      
      {hasWarranty && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="warrantyEndDate">Validade da Garantia</Label>
            <Input
              id="warrantyEndDate"
              type="date"
              value={warrantyEndDate}
              onChange={(e) => setWarrantyEndDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Padrão: 1 ano após a compra
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="warrantyStore">Loja / Fabricante (opcional)</Label>
            <Input
              id="warrantyStore"
              value={warrantyStore}
              onChange={(e) => setWarrantyStore(e.target.value)}
              placeholder="Ex: Amazon, Magazine Luiza..."
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="hasExtendedWarranty" className="flex items-center gap-2 cursor-pointer">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Garantia estendida contratada?
            </Label>
            <Switch
              id="hasExtendedWarranty"
              checked={hasExtendedWarranty}
              onCheckedChange={setHasExtendedWarranty}
            />
          </div>
          
          {hasExtendedWarranty && (
            <div className="space-y-2">
              <Label htmlFor="extendedWarrantyMonths">Meses adicionais de garantia</Label>
              <Select
                value={extendedWarrantyMonths.toString()}
                onValueChange={(v) => setExtendedWarrantyMonths(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper hook for warranty state
export const useWarrantyState = (purchaseDate?: string) => {
  const [hasWarranty, setHasWarranty] = React.useState(false);
  const [warrantyEndDate, setWarrantyEndDate] = React.useState('');
  const [warrantyStore, setWarrantyStore] = React.useState('');
  const [hasExtendedWarranty, setHasExtendedWarranty] = React.useState(false);
  const [extendedWarrantyMonths, setExtendedWarrantyMonths] = React.useState(12);

  const resetWarranty = (date?: string) => {
    setHasWarranty(false);
    const baseDate = date ? new Date(date) : new Date();
    setWarrantyEndDate(format(addYears(baseDate, 1), 'yyyy-MM-dd'));
    setHasExtendedWarranty(false);
    setExtendedWarrantyMonths(12);
    setWarrantyStore('');
  };

  return {
    hasWarranty,
    setHasWarranty,
    warrantyEndDate,
    setWarrantyEndDate,
    warrantyStore,
    setWarrantyStore,
    hasExtendedWarranty,
    setHasExtendedWarranty,
    extendedWarrantyMonths,
    setExtendedWarrantyMonths,
    resetWarranty,
  };
};
