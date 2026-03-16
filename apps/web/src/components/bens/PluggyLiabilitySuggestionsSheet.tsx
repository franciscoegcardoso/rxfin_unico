import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePluggyLiabilitySuggestions,
  type PluggyLiabilitySuggestion,
} from '@/hooks/usePluggyLiabilitySuggestions';
import { cn } from '@/lib/utils';

const defaultFormatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface PluggyLiabilitySuggestionsSheetProps {
  formatCurrency?: (value: number) => string;
}

export function PluggyLiabilitySuggestionsSheet({ formatCurrency = defaultFormatCurrency }: PluggyLiabilitySuggestionsSheetProps) {
  const { suggestions, isLoading, confirm, ignore, ignoreAll } = usePluggyLiabilitySuggestions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ignoringAll, setIgnoringAll] = useState(false);

  const handleConfirm = async (item: PluggyLiabilitySuggestion) => {
    try {
      await confirm(item.id);
      toast.success('Passivo importado e vinculado ao planejamento');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao importar passivo');
    }
  };

  const handleIgnore = async (item: PluggyLiabilitySuggestion) => {
    try {
      await ignore(item.id);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao ignorar sugestão');
    }
  };

  const handleIgnoreAll = async () => {
    try {
      setIgnoringAll(true);
      await ignoreAll();
      setSheetOpen(false);
      toast.success('Todas as sugestões foram ignoradas');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao ignorar sugestões');
    } finally {
      setIgnoringAll(false);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <>
      {/* Banner inline */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-foreground">
          <span aria-hidden>🔗</span>
          <span>
            Detectamos {suggestions.length} passivo{suggestions.length !== 1 ? 's' : ''} no Open Finance
          </span>
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="h-8" onClick={() => setSheetOpen(true)}>
            Revisar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={handleIgnoreAll}
            disabled={ignoringAll}
          >
            Ignorar todos
          </Button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Passivos detectados (Open Finance)
            </SheetTitle>
            <SheetDescription>
              Revise e importe os passivos encontrados para vincular ao planejamento.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {suggestions.map((item) => (
                  <SuggestionCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    onConfirm={() => handleConfirm(item)}
                    onIgnore={() => handleIgnore(item)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SuggestionCard({
  item,
  formatCurrency,
  onConfirm,
  onIgnore,
}: {
  item: PluggyLiabilitySuggestion;
  formatCurrency: (value: number) => string;
  onConfirm: () => void;
  onIgnore: () => void;
}) {
  const confidence = typeof item.confidence_pct === 'number' ? item.confidence_pct : 0;
  const origin = typeof item.origin === 'string' ? item.origin : 'Open Finance';

  return (
    <Card className={cn('rounded-xl border border-border/80')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground truncate flex-1">{item.name || 'Passivo'}</p>
          <Badge variant="secondary" className="text-xs shrink-0">
            {item.type || 'Passivo'}
          </Badge>
        </div>
        <p className="text-lg font-bold text-primary tabular-nums">{formatCurrency(item.value)}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Confiança: {Math.round(confidence)}%</span>
          <span>·</span>
          <span>{origin}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={onConfirm}>
            Importar
          </Button>
          <Button size="sm" variant="outline" onClick={onIgnore}>
            Ignorar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
