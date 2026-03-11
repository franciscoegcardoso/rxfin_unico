import React, { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LandingBrandLogo } from './LandingBrandLogo';
import { normalizeBrandName, APP_LOGOS_BASE } from '@/lib/brand-utils';

const MARCAS_URL = `${APP_LOGOS_BASE}/marcas.json`;

interface MarcasBrand {
  id: string;
  nome: string;
  fipe_id: string;
  logo_url: string;
}

let marcasCache: MarcasBrand[] | null = null;
let marcasPromise: Promise<MarcasBrand[]> | null = null;

async function loadMarcas(): Promise<MarcasBrand[]> {
  if (marcasCache && marcasCache.length > 0) return marcasCache;
  if (marcasPromise) return marcasPromise;
  marcasPromise = fetch(MARCAS_URL)
    .then((r) => (r.ok ? r.json() : { marcas: [] }))
    .then((data: { marcas?: MarcasBrand[] }) => data.marcas || [])
    .catch(() => []);
  marcasCache = await marcasPromise;
  return marcasCache || [];
}

export interface FipeBrandOption {
  codigo: string;
  nome: string;
}

interface LandingBrandSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  fipeBrands: FipeBrandOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
}

export function LandingBrandSelect({
  value,
  onValueChange,
  fipeBrands,
  loading = false,
  disabled = false,
  placeholder = 'Selecione a marca',
  searchPlaceholder = 'Buscar marca...',
}: LandingBrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [marcas, setMarcas] = useState<MarcasBrand[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(true);

  useEffect(() => {
    loadMarcas()
      .then(setMarcas)
      .finally(() => setMarcasLoading(false));
  }, []);

  const mergedBrands = useMemo(() => {
    return fipeBrands.map((fb) => {
      const local = marcas.find(
        (m) => String(m.fipe_id) === String(fb.codigo) || normalizeBrandName(m.nome) === normalizeBrandName(fb.nome)
      );
      return {
        value: fb.codigo,
        label: fb.nome,
        logoUrl: local?.logo_url,
      };
    });
  }, [fipeBrands, marcas]);

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return mergedBrands;
    const q = search.toLowerCase();
    return mergedBrands.filter((b) => b.label.toLowerCase().includes(q));
  }, [mergedBrands, search]);

  const selectedBrand = mergedBrands.find((b) => b.value === value);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
    setSearch('');
  };

  const isLoading = loading || (fipeBrands.length === 0 && marcasLoading);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span className="truncate">Carregando...</span>
            </>
          ) : selectedBrand ? (
            <>
              <LandingBrandLogo url={selectedBrand.logoUrl} name={selectedBrand.label} size="sm" />
              <span className="truncate ml-2">{selectedBrand.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10"
          />
        </div>
        <ScrollArea className="h-60">
          {filteredBrands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma marca encontrada.</div>
          ) : (
            <div className="p-1">
              {filteredBrands.map((brand) => (
                <button
                  key={brand.value}
                  type="button"
                  onClick={() => handleSelect(brand.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm py-2 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                    value === brand.value && 'bg-accent'
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0', value === brand.value ? 'opacity-100' : 'opacity-0')} />
                  <LandingBrandLogo url={brand.logoUrl} name={brand.label} size="sm" />
                  <span className="truncate">{brand.label}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
