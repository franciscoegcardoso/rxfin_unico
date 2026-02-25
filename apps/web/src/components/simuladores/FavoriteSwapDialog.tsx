import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, X, ArrowRight } from 'lucide-react';
import { FavoriteVehicle } from '@/hooks/useFavoriteVehicles';

interface FavoriteSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: FavoriteVehicle[];
  newVehicleName: string;
  onSwap: (removeId: string) => void;
}

export const FavoriteSwapDialog: React.FC<FavoriteSwapDialogProps> = ({
  open,
  onOpenChange,
  favorites,
  newVehicleName,
  onSwap,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            Limite de favoritos atingido
          </DialogTitle>
          <DialogDescription>
            Você já tem 5 veículos favoritos. Remova um para adicionar <strong className="text-foreground">{newVehicleName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-sm font-medium truncate">{fav.displayName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0 gap-1.5"
                onClick={() => onSwap(fav.id)}
              >
                <X className="h-3.5 w-3.5" />
                Substituir
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
