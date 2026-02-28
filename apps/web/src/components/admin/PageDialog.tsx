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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Page, PageInsert } from '@/hooks/usePages';
import { usePageGroups } from '@/hooks/usePageGroups';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Badge } from '@/components/ui/badge';

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: Page | null;
  onSave: (data: PageInsert) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'financas', label: 'Finanças' },
  { value: 'patrimonio', label: 'Patrimônio' },
  { value: 'veiculos', label: 'Veículos' },
  { value: 'cartao', label: 'Cartão de Crédito' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'outros', label: 'Outros' },
  { value: 'config', label: 'Configurações' },
  { value: 'simuladores', label: 'Simuladores' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'admin', label: 'Admin' },
];

export function PageDialog({
  open,
  onOpenChange,
  page,
  onSave,
  isLoading,
}: PageDialogProps) {
  const { groups } = usePageGroups();
  const { data: plans } = useSubscriptionPlans(true);
  
  const [formData, setFormData] = useState<PageInsert>({
    title: '',
    description: '',
    slug: '',
    path: '',
    icon: '',
    category: '',
    order_index: 0,
    access_level: 'free',
    min_plan_slug: 'free',
    is_active_users: false,
    is_active_admin: true,
    group_id: null,
    order_in_group: 0,
  });

  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        description: page.description || '',
        slug: page.slug,
        path: page.path,
        icon: page.icon || '',
        category: page.category || '',
        order_index: page.order_index || 0,
        access_level: page.access_level,
        min_plan_slug: page.min_plan_slug || 'free',
        is_active_users: page.is_active_users,
        is_active_admin: page.is_active_admin,
        group_id: page.group_id,
        order_in_group: page.order_in_group || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        slug: '',
        path: '',
        icon: '',
        category: '',
        order_index: 0,
        access_level: 'free',
        min_plan_slug: 'free',
        is_active_users: false,
        is_active_admin: true,
        group_id: null,
        order_in_group: 0,
      });
    }
  }, [page, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Sort plans by order_index for hierarchy display
  const sortedPlans = plans?.slice().sort((a, b) => a.order_index - b.order_index) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {page ? 'Editar Página' : 'Nova Página'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nome *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Dashboard"
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
                placeholder="dashboard"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Caminho (Rota) *</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/dashboard"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da página..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano Mínimo</Label>
              <Select
                value={formData.min_plan_slug || 'free'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  min_plan_slug: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedPlans.map((plan, index) => (
                    <SelectItem key={plan.slug} value={plan.slug}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {index + 1}
                        </Badge>
                        {plan.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Planos superiores herdam acesso automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={formData.group_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  group_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem grupo</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_in_group">Ordem no Grupo</Label>
              <Input
                id="order_in_group"
                type="number"
                value={formData.order_in_group || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, order_in_group: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Ícone (Lucide)</Label>
              <Input
                id="icon"
                value={formData.icon || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="Home, Settings..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_index">Ordem Global</Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Status de Ativação</p>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active_users" className="text-sm">Ativo para Usuários</Label>
              <Switch
                id="is_active_users"
                checked={formData.is_active_users}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_active_users: checked }))
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
