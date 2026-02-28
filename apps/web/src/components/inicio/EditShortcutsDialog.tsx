import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ALL_SHORTCUTS, useHomeShortcuts } from '@/hooks/useHomeShortcuts';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface EditShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditShortcutsDialog: React.FC<EditShortcutsDialogProps> = ({ open, onOpenChange }) => {
  const { slot3, slot4, updateShortcuts, isUpdating, getAvailableOptions } = useHomeShortcuts();
  const [selectedSlot3, setSelectedSlot3] = useState(slot3);
  const [selectedSlot4, setSelectedSlot4] = useState(slot4);

  useEffect(() => {
    if (open) {
      setSelectedSlot3(slot3);
      setSelectedSlot4(slot4);
    }
  }, [open, slot3, slot4]);

  const handleSave = () => {
    if (selectedSlot3 === selectedSlot4) {
      toast.error('Os atalhos devem ser diferentes');
      return;
    }
    updateShortcuts(
      { slot3: selectedSlot3, slot4: selectedSlot4 },
      {
        onSuccess: () => {
          toast.success('Atalhos atualizados!');
          onOpenChange(false);
        },
        onError: () => toast.error('Erro ao salvar atalhos'),
      }
    );
  };

  const availableForSlot3 = getAvailableOptions(selectedSlot3, selectedSlot4);
  const availableForSlot4 = getAvailableOptions(selectedSlot4, selectedSlot3);

  const lockedItems = ALL_SHORTCUTS.filter(s => s.locked);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">Editar atalhos da home</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Fixed shortcuts */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Fixos</p>
            <div className="space-y-1.5">
              {lockedItems.map(item => (
                <div key={item.slug} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
              ))}
            </div>
          </div>

          {/* Slot 3 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Atalho 3</p>
            <div className="space-y-1.5">
              {availableForSlot3.map(item => {
                const isSelected = item.slug === selectedSlot3;
                return (
                  <button
                    key={item.slug}
                    onClick={() => setSelectedSlot3(item.slug)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm flex-1', isSelected && 'font-medium')}>{item.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot 4 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Atalho 4</p>
            <div className="space-y-1.5">
              {availableForSlot4.map(item => {
                const isSelected = item.slug === selectedSlot4;
                return (
                  <button
                    key={item.slug}
                    onClick={() => setSelectedSlot4(item.slug)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm flex-1', isSelected && 'font-medium')}>{item.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Salvar'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
