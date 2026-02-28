import { useCallback, useMemo, useState } from 'react';
import { useFavoriteVehicles, FavoriteVehicle } from '@/hooks/useFavoriteVehicles';
import { UseFipeReturn } from '@/hooks/useFipe';
import { formatFipeYearName } from '@/hooks/useFipe';

/**
 * Integrates useFavoriteVehicles with a useFipe instance.
 * Returns props ready to pass to VehicleFipeSelector.
 */
export function useFipeFavorites(fipe: UseFipeReturn) {
  const { favorites, loading, addFavorite, removeFavorite, isFavorited, canAddMore } = useFavoriteVehicles();
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);

  const currentIsFavorited = useMemo(() => {
    if (!fipe.selectedBrand || !fipe.selectedModel || !fipe.selectedYear) return false;
    return isFavorited(fipe.vehicleType, fipe.selectedBrand, fipe.selectedModel, fipe.selectedYear);
  }, [fipe.vehicleType, fipe.selectedBrand, fipe.selectedModel, fipe.selectedYear, isFavorited]);

  const currentVehicleInfo = useMemo(() => {
    if (!fipe.price || !fipe.selectedBrand || !fipe.selectedModel || !fipe.selectedYear) return null;
    const brandName = fipe.brands.find(b => b.codigo === fipe.selectedBrand)?.nome || '';
    const modelName = fipe.models.find(m => String(m.codigo) === fipe.selectedModel)?.nome || '';
    const yearLabel = fipe.years.find(y => y.codigo === fipe.selectedYear)?.nome || '';
    return {
      vehicleType: fipe.vehicleType,
      brandCode: fipe.selectedBrand,
      brandName,
      modelCode: fipe.selectedModel,
      modelName,
      yearCode: fipe.selectedYear,
      yearLabel: formatFipeYearName(yearLabel),
      fipeCode: fipe.price.CodigoFipe,
      fipeValue: fipe.priceValue,
      displayName: `${brandName} ${modelName} ${formatFipeYearName(yearLabel)}`.trim(),
    };
  }, [fipe]);

  const handleAddFavorite = useCallback(async () => {
    if (!currentVehicleInfo) return;

    if (!canAddMore) {
      setSwapDialogOpen(true);
      return;
    }

    await addFavorite(currentVehicleInfo);
  }, [currentVehicleInfo, canAddMore, addFavorite]);

  const handleSwapFavorite = useCallback(async (removeId: string) => {
    if (!currentVehicleInfo) return;
    await removeFavorite(removeId);
    await addFavorite(currentVehicleInfo);
    setSwapDialogOpen(false);
  }, [currentVehicleInfo, removeFavorite, addFavorite]);

  const handleSelectFavorite = useCallback((favorite: FavoriteVehicle) => {
    fipe.initializeFromSaved({
      vehicleType: favorite.vehicleType,
      brandCode: favorite.brandCode,
      modelCode: favorite.modelCode,
      yearCode: favorite.yearCode,
    });
  }, [fipe]);

  return {
    favoriteVehicles: favorites,
    favoritesLoading: loading,
    onSelectFavorite: handleSelectFavorite,
    onAddFavorite: handleAddFavorite,
    onRemoveFavorite: removeFavorite,
    onSwapFavorite: handleSwapFavorite,
    canAddFavorite: canAddMore,
    isFavorited: currentIsFavorited,
    swapDialogOpen,
    setSwapDialogOpen,
    currentVehicleDisplayName: currentVehicleInfo?.displayName || '',
  };
}
// sync
