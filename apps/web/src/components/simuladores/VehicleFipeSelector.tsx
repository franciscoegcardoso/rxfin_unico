import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { BrandSearchSelect } from '@/components/ui/brand-search-select';
import { BrandLogo } from '@/components/ui/brand-logo';
import { 
  Car, 
  Bike, 
  Truck, 
  Loader2, 
  AlertCircle, 
  X, 
  CheckCircle2,
  Star,
  Lock,
} from 'lucide-react';
import { VehicleType, formatFipeYearName, UseFipeReturn } from '@/hooks/useFipe';
import { Asset } from '@/types/financial';
import { FavoriteVehicle } from '@/hooks/useFavoriteVehicles';
import { 
  FieldWrapper, 
  getValidationState, 
  validationMessages 
} from './FipeInputValidation';
import { cn } from '@/lib/utils';
import { FavoriteSwapDialog } from './FavoriteSwapDialog';
import { useBrandLogos } from '@/hooks/useBrandLogos';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface VehicleFipeSelectorProps {
  fipe: UseFipeReturn;
  registeredVehicles?: Asset[];
  selectedRegisteredVehicle?: string;
  onSelectRegisteredVehicle?: (vehicleId: string) => void;
  // Favorites
  favoriteVehicles?: FavoriteVehicle[];
  onSelectFavorite?: (favorite: FavoriteVehicle) => void;
  onAddFavorite?: () => void;
  onRemoveFavorite?: (favoriteId: string) => void;
  onSwapFavorite?: (removeId: string) => void;
  canAddFavorite?: boolean;
  isFavorited?: boolean;
  swapDialogOpen?: boolean;
  setSwapDialogOpen?: (open: boolean) => void;
  currentVehicleDisplayName?: string;
  // Visual
  showVehicleTypeSelector?: boolean;
  compact?: boolean;
  className?: string;
}

export const VehicleFipeSelector: React.FC<VehicleFipeSelectorProps> = ({
  fipe,
  registeredVehicles = [],
  selectedRegisteredVehicle = '',
  onSelectRegisteredVehicle,
  favoriteVehicles = [],
  onSelectFavorite,
  onAddFavorite,
  onRemoveFavorite,
  onSwapFavorite,
  canAddFavorite = false,
  isFavorited = false,
  swapDialogOpen = false,
  setSwapDialogOpen,
  currentVehicleDisplayName = '',
  showVehicleTypeSelector = true,
  compact = false,
  className,
}) => {
  const { getBrandByFipeId, getBrandByName } = useBrandLogos();
  const vehicleAge = fipe.price 
    ? new Date().getFullYear() - fipe.price.AnoModelo 
    : 0;

  const getAgeBadge = (age: number) => {
    if (age <= 0) return { color: 'bg-emerald-500', label: '0 km' };
    if (age <= 3) return { color: 'bg-emerald-500', label: `${age} ${age === 1 ? 'ano' : 'anos'}` };
    if (age <= 5) return { color: 'bg-amber-500', label: `${age} anos` };
    if (age <= 10) return { color: 'bg-orange-500', label: `${age} anos` };
    return { color: 'bg-red-500', label: `${age} anos` };
  };

  const hasQuickSelect = registeredVehicles.length > 0 || favoriteVehicles.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Select: Registered Vehicles + Favorites */}
      {hasQuickSelect && (onSelectRegisteredVehicle || onSelectFavorite) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Meus Veículos
            </CardTitle>
            <CardDescription>
              Selecione um veículo cadastrado ou favorito para preencher automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Registered vehicles (locked - can't remove) */}
            {registeredVehicles.length > 0 && onSelectRegisteredVehicle && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Cadastrados
                </Label>
                <div className="flex flex-wrap gap-2">
                  {registeredVehicles.map((vehicle) => {
                    const isSelected = selectedRegisteredVehicle === vehicle.id;
                    const isLoading = isSelected && fipe.isInitializing;
                    const hasFipeData = vehicle.fipeVehicleType && vehicle.fipeBrandCode && vehicle.fipeModelCode && vehicle.fipeYearCode;
                    
                    return (
                      <Button
                        key={vehicle.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelectRegisteredVehicle(vehicle.id)}
                        className="gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isSelected ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Car className="h-3 w-3" />
                        )}
                        {vehicle.name}
                        {!hasFipeData && !isSelected && (
                          <span className="text-xs opacity-60">(manual)</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favorite vehicles (can remove) */}
            {favoriteVehicles.length > 0 && onSelectFavorite && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  Favoritos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {favoriteVehicles.map((fav) => (
                    <div key={fav.id} className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectFavorite(fav)}
                        className="gap-2"
                      >
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {fav.displayName}
                      </Button>
                      {onRemoveFavorite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFavorite(fav.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRegisteredVehicle && (
              <p className="text-xs text-muted-foreground">
                Clique novamente para desmarcar
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main FIPE Selection */}
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Dados do veículo na FIPE
            </span>
            {/* Favorite button - only when a vehicle is fully selected */}
            {fipe.price && onAddFavorite && (
              <Button
                variant={isFavorited ? "secondary" : "outline"}
                size="sm"
                onClick={onAddFavorite}
                disabled={isFavorited}
                className="gap-1.5"
              >
                <Star className={cn(
                  "h-4 w-4",
                  isFavorited ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                )} />
                {isFavorited ? 'Favoritado' : 'Favoritar'}
              </Button>
            )}
          </CardTitle>
          {!compact && (
            <CardDescription>
              Consulte o valor de veículos na tabela FIPE
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn(
            "grid gap-6",
            compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
          )}>
            {/* Left Column - Selection */}
            <div className="space-y-4">
              {/* Vehicle Type */}
              {showVehicleTypeSelector && (
                <div className="space-y-2">
                  <Label>Tipo de Veículo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'carros' as VehicleType, label: 'Carros', icon: Car, color: 'text-blue-600 dark:text-blue-400' },
                      { value: 'motos' as VehicleType, label: 'Motos', icon: Bike, color: 'text-orange-600 dark:text-orange-400' },
                      { value: 'caminhoes' as VehicleType, label: 'Caminhões', icon: Truck, color: 'text-emerald-600 dark:text-emerald-400' },
                    ].map((type) => {
                      const isSelected = fipe.vehicleType === type.value;
                      const IconComponent = type.icon;
                      
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => fipe.setVehicleType(type.value)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200",
                            isSelected 
                              ? "border-primary bg-primary/10 shadow-sm" 
                              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <IconComponent 
                            className={cn("h-6 w-6 transition-colors", isSelected ? type.color : "text-muted-foreground")} 
                          />
                          <span className={cn("text-xs font-medium transition-colors", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Brand */}
              <FieldWrapper
                label="Marca"
                required
                state={getValidationState({
                  isLoading: fipe.loading.brands,
                  hasValue: !!fipe.selectedBrand,
                  hasError: !!fipe.error && !fipe.selectedBrand,
                })}
                message={
                  fipe.loading.brands 
                    ? validationMessages.brand.loading 
                    : fipe.selectedBrand 
                      ? validationMessages.brand.valid 
                      : undefined
                }
                hint={!fipe.selectedBrand && !fipe.loading.brands ? "Selecione a marca do veículo" : undefined}
              >
                <BrandSearchSelect
                  fipeBrands={fipe.brands}
                  value={fipe.selectedBrand}
                  onValueChange={fipe.setSelectedBrand}
                  disabled={fipe.loading.brands}
                  loading={fipe.loading.brands}
                  placeholder="Selecione a marca"
                  searchPlaceholder="Buscar marca..."
                />
              </FieldWrapper>

              {/* Model */}
              <FieldWrapper
                label="Modelo"
                required
                state={getValidationState({
                  isLoading: fipe.loading.models,
                  hasValue: !!fipe.selectedModel,
                  isDisabled: !fipe.selectedBrand,
                  hasError: !!fipe.error && fipe.selectedBrand && !fipe.selectedModel,
                })}
                message={
                  fipe.loading.models 
                    ? validationMessages.model.loading 
                    : fipe.selectedModel 
                      ? validationMessages.model.valid 
                      : undefined
                }
                hint={
                  !fipe.selectedBrand 
                    ? validationMessages.model.disabled 
                    : !fipe.selectedModel && !fipe.loading.models 
                      ? "Escolha o modelo do veículo" 
                      : undefined
                }
              >
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
              </FieldWrapper>

              {/* Year */}
              <FieldWrapper
                label="Ano/Modelo"
                required
                state={getValidationState({
                  isLoading: fipe.loading.years,
                  hasValue: !!fipe.selectedYear,
                  isDisabled: !fipe.selectedModel,
                  hasError: !!fipe.error && fipe.selectedModel && !fipe.selectedYear,
                })}
                message={
                  fipe.loading.years 
                    ? validationMessages.year.loading 
                    : fipe.selectedYear 
                      ? validationMessages.year.valid 
                      : undefined
                }
                hint={
                  !fipe.selectedModel 
                    ? validationMessages.year.disabled 
                    : !fipe.selectedYear && !fipe.loading.years 
                      ? "Selecione o ano de fabricação" 
                      : undefined
                }
              >
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
              </FieldWrapper>

              {/* Global Error Message */}
              <AnimatePresence>
                {fipe.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{fipe.error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Results */}
            <div className="flex flex-col">
              <AnimatePresence mode="wait">
                {fipe.loading.price && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1"
                  >
                    <div className="p-6 rounded-xl bg-muted/50 border animate-pulse flex-1 flex flex-col justify-center min-h-[200px]">
                      <div className="text-center space-y-3">
                        <div className="h-4 w-24 bg-muted rounded mx-auto" />
                        <div className="h-10 w-40 bg-muted rounded mx-auto" />
                        <div className="h-3 w-32 bg-muted rounded mx-auto" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {fipe.price && !fipe.loading.price && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                  >
                    <div className="p-6 lg:p-8 rounded-xl bg-income/10 border border-income/30 flex-1 flex flex-col justify-center relative overflow-hidden min-h-[200px]">
                      {/* Success indicator */}
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-income/20 text-income text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Consulta realizada</span>
                        </div>
                      </div>
                      
                      <div className="text-center space-y-3 pt-4">
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-muted-foreground">Valor FIPE</p>
                          <Badge className={getAgeBadge(vehicleAge).color + ' text-white text-xs px-2 py-0.5'}>
                            {getAgeBadge(vehicleAge).label}
                          </Badge>
                        </div>
                        <p className="text-4xl lg:text-5xl font-bold text-income">
                          {fipe.price.Valor}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-center gap-2.5">
                            {(() => {
                              const brand = getBrandByFipeId(String(fipe.selectedBrand)) || getBrandByName(fipe.price.Marca);
                              return (
                                <BrandLogo
                                  url={brand?.logo_url}
                                  name={fipe.price.Marca}
                                  className="h-8 w-8"
                                />
                              );
                            })()}
                            <p className="text-sm font-medium text-foreground">{fipe.price.Modelo}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Referência: {fipe.price.MesReferencia}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Código FIPE: {fipe.price.CodigoFipe}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!fipe.price && !fipe.loading.price && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1"
                  >
                    <div className="p-6 rounded-xl border border-dashed flex-1 flex flex-col justify-center items-center min-h-[200px] text-center">
                      <Car className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Selecione marca, modelo e ano para consultar o valor FIPE
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favorite Swap Dialog */}
      {setSwapDialogOpen && onSwapFavorite && (
        <FavoriteSwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          favorites={favoriteVehicles}
          newVehicleName={currentVehicleDisplayName}
          onSwap={onSwapFavorite}
        />
      )}
    </div>
  );
};
