import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBrandLogos } from '@/hooks/useBrandLogos';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { VehicleType } from '@/hooks/useFipe';

interface BrandSearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  vehicleType?: VehicleType;
  fipeBrands?: Array<{ codigo: string; nome: string }>;
}

interface MergedBrand {
  value: string;
  label: string;
  logoUrl: string | null;
}

export function BrandSearchSelect({
  value,
  onValueChange,
  placeholder = 'Selecione a marca...',
  searchPlaceholder = 'Buscar marca...',
  disabled = false,
  loading: externalLoading = false,
  vehicleType,
  fipeBrands = [],
}: BrandSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const { brands: localBrands, loading: brandsLoading, getBrandByFipeId } =
    useBrandLogos(vehicleType);

  const mergedBrands = React.useMemo((): MergedBrand[] => {
    if (fipeBrands.length === 0) {
      return localBrands.map((b) => ({
        value: String(b.brand_id),
        label: b.brand_name,
        logoUrl: b.logo_path ?? null,
      }));
    }
    return fipeBrands.map((fb) => {
      const local = getBrandByFipeId(fb.codigo);
      return {
        value: fb.codigo,
        label: fb.nome,
        logoUrl: local?.logo_path ?? null,
      };
    });
  }, [fipeBrands, localBrands, getBrandByFipeId]);

  const selectedBrand = mergedBrands.find((b) => b.value === value);

  const filteredBrands = React.useMemo(() => {
    if (!search) return mergedBrands;
    const s = search.toLowerCase();
    return mergedBrands.filter((b) => b.label.toLowerCase().includes(s));
  }, [mergedBrands, search]);

  const isLoading = externalLoading || brandsLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : selectedBrand ? (
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo url={selectedBrand.logoUrl ?? undefined} name={selectedBrand.label} size="sm" />
              <span className="truncate">{selectedBrand.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
          />
        </div>
        <ScrollArea className="h-60" type="always">
          {filteredBrands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma marca encontrada.
            </div>
          ) : (
            <div className="p-1">
              {filteredBrands.map((brand) => (
                <button
                  key={brand.value}
                  type="button"
                  onClick={() => {
                    onValueChange(brand.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === brand.value && 'bg-accent',
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === brand.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <BrandLogo url={brand.logoUrl ?? undefined} name={brand.label} size="sm" />
                  <span className="ml-2 truncate">{brand.label}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
