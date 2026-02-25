import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BrandSearchSelect } from '@/components/ui/brand-search-select';
import { Car, Loader2, Percent, AlertCircle } from 'lucide-react';
import { UseFipeReturn, VehicleType, formatFipeYearName } from '@/hooks/useFipe';

interface VehicleFipeFormProps {
  fipe: UseFipeReturn;
  fipePercentage: number;
  onFipePercentageChange: (value: number) => void;
  formatCurrency: (value: number) => string;
}

export const VehicleFipeForm: React.FC<VehicleFipeFormProps> = ({
  fipe,
  fipePercentage,
  onFipePercentageChange,
  formatCurrency,
}) => {
  return (
    <div className="space-y-4 p-4 rounded-lg bg-card border">
      <h4 className="text-sm font-medium text-primary flex items-center gap-2">
        <Car className="h-4 w-4" />
        Consulta Tabela FIPE
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de veículo */}
        <div className="space-y-2">
          <Label>Tipo de Veículo</Label>
          <Select
            value={fipe.vehicleType}
            onValueChange={(value: VehicleType) => fipe.setVehicleType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="carros">Carros</SelectItem>
              <SelectItem value="motos">Motos</SelectItem>
              <SelectItem value="caminhoes">Caminhões</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Marca */}
        <div className="space-y-2">
          <Label>Marca</Label>
          <BrandSearchSelect
            fipeBrands={fipe.brands}
            value={fipe.selectedBrand}
            onValueChange={fipe.setSelectedBrand}
            disabled={fipe.loading.brands}
            loading={fipe.loading.brands}
            placeholder="Selecione a marca"
            searchPlaceholder="Buscar marca..."
          />
        </div>

        {/* Modelo */}
        <div className="space-y-2">
          <Label>Modelo</Label>
          <SearchableSelect
            options={fipe.models.map((model) => ({
              value: String(model.codigo),
              label: model.nome,
            }))}
            value={fipe.selectedModel}
            onValueChange={fipe.setSelectedModel}
            disabled={!fipe.selectedBrand || fipe.loading.models}
            loading={fipe.loading.models}
            placeholder="Selecione o modelo"
            searchPlaceholder="Buscar modelo..."
            emptyMessage="Nenhum modelo encontrado."
          />
        </div>

        {/* Ano */}
        <div className="space-y-2">
          <Label>Ano/Modelo</Label>
          <SearchableSelect
            options={fipe.years.map((year) => ({
              value: year.codigo,
              label: formatFipeYearName(year.nome),
            }))}
            value={fipe.selectedYear}
            onValueChange={fipe.setSelectedYear}
            disabled={!fipe.selectedModel || fipe.loading.years}
            loading={fipe.loading.years}
            placeholder="Selecione o ano"
            searchPlaceholder="Buscar ano..."
            emptyMessage="Nenhum ano encontrado."
          />
        </div>
      </div>

      {/* Resultado FIPE */}
      {fipe.loading.price && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Consultando valor FIPE...</span>
        </div>
      )}

      {fipe.price && !fipe.loading.price && (
        <div className="p-4 rounded-lg bg-income/10 border border-income/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor FIPE:</span>
            <span className="text-xl font-bold text-income">{fipe.price.Valor}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>Código FIPE: {fipe.price.CodigoFipe}</p>
            <p>Referência: {fipe.price.MesReferencia}</p>
            <p>Combustível: {fipe.price.Combustivel}</p>
            <p>Ano: {fipe.price.AnoModelo}</p>
          </div>
        </div>
      )}

      {fipe.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{fipe.error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fipePercentage" className="flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Percentual da valorização do seu veículo sobre a Tabela FIPE
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="fipePercentage"
            type="number"
            min={0}
            max={150}
            value={fipePercentage}
            onChange={(e) => onFipePercentageChange(parseFloat(e.target.value) || 100)}
            className="w-24"
          />
          <span className="text-muted-foreground">%</span>
          <span className="text-sm text-muted-foreground">
            (100% = valor integral)
          </span>
        </div>
        {fipe.priceValue > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Valor ajustado: <span className="font-semibold text-foreground">
              {formatCurrency(Math.round(fipe.priceValue * (fipePercentage / 100)))}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};