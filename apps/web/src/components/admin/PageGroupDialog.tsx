import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { PageGroup, PageGroupInsert } from '@/hooks/usePageGroups';

interface PageGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: PageGroup | null;
  onSave: (data: PageGroupInsert) => void;
  isLoading?: boolean;
}

export function PageGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
  isLoading,
}: PageGroupDialogProps) {
  const [formData, setFormData] = useState<PageGroupInsert>({
    name: '',
    slug: '',
    icon: '',
    order_index: 0,
    is_collapsible: true,
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        slug: group.slug,
        icon: group.icon || '',
        order_index: group.order_index || 0,
        is_collapsible: group.is_collapsible,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        icon: '',
        order_index: 0,
        is_collapsible: true,
      });
    }
  }, [group, open]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {group ? 'Editar Grupo' : 'Novo Grupo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Planejamento"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="planejamento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input
                id="icon"
                value={formData.icon || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="CalendarRange"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_index">Ordem</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="flex items-center justify-between pt-6">
              <Label htmlFor="is_collapsible" className="text-sm">Recolhível</Label>
              <Switch
                id="is_collapsible"
                checked={formData.is_collapsible}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_collapsible: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
