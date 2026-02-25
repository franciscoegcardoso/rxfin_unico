import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical,
  Check,
  X,
  Minus,
  Edit2,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  usePlanComparisonFeatures, 
  PlanComparisonFeature 
} from '@/hooks/usePlanComparisonFeatures';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = [
  'Gestão Básica',
  'Patrimônio',
  'Fluxo Financeiro',
  'Planejamento',
  'Recursos Avançados',
  'Simuladores',
  'Suporte',
];

const VALUE_OPTIONS = [
  { value: 'true', label: 'Incluso', icon: Check, color: 'text-emerald-500' },
  { value: 'false', label: 'Não incluso', icon: X, color: 'text-muted-foreground/40' },
  { value: 'partial', label: 'Parcial', icon: Minus, color: 'text-amber-500' },
];

interface FeatureFormData {
  feature_name: string;
  category: string;
  free_value: string;
  starter_value: string;
  pro_value: string;
  page_slug: string;
}

const defaultFormData: FeatureFormData = {
  feature_name: '',
  category: 'Gestão Básica',
  free_value: 'false',
  starter_value: 'true',
  pro_value: 'true',
  page_slug: '',
};

export function PlanComparisonManager() {
  const { data: features, isLoading } = usePlanComparisonFeatures(true);
  const {
    deferToggleComparisonFeature,
    deferCreateComparisonFeature,
    deferUpdateComparisonFeature,
    deferDeleteComparisonFeature,
  } = useAdminDeferredMutations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlanComparisonFeature | null>(null);
  const [formData, setFormData] = useState<FeatureFormData>(defaultFormData);

  const activeFeatures = features?.filter(f => f.is_active) || [];
  const inactiveFeatures = features?.filter(f => !f.is_active) || [];

  const groupedActive = activeFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, PlanComparisonFeature[]>);

  const handleOpenDialog = (feature?: PlanComparisonFeature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        feature_name: feature.feature_name,
        category: feature.category,
        free_value: feature.free_value,
        starter_value: feature.starter_value,
        pro_value: feature.pro_value,
        page_slug: feature.page_slug || '',
      });
    } else {
      setEditingFeature(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.feature_name.trim()) return;

    const maxOrder = Math.max(0, ...(features?.map(f => f.order_index) || [0]));

    if (editingFeature) {
      deferUpdateComparisonFeature(
        editingFeature.id,
        {
          ...formData,
          page_slug: formData.page_slug || null,
        },
        editingFeature.feature_name
      );
    } else {
      deferCreateComparisonFeature({
        ...formData,
        page_slug: formData.page_slug || null,
        order_index: maxOrder + 1,
        is_default: false,
        is_active: true,
      });
    }

    setDialogOpen(false);
    setEditingFeature(null);
    setFormData(defaultFormData);
  };

  const handleToggleActive = (feature: PlanComparisonFeature) => {
    deferToggleComparisonFeature(feature);
  };

  const handleDelete = (feature: PlanComparisonFeature) => {
    if (feature.is_default) {
      // For default items, just deactivate
      deferToggleComparisonFeature(feature);
    } else {
      // For custom items, actually delete
      deferDeleteComparisonFeature(feature);
    }
  };

  const renderValueIcon = (value: string) => {
    const option = VALUE_OPTIONS.find(o => o.value === value);
    if (!option) return <span className="text-xs">{value}</span>;
    const Icon = option.icon;
    return <Icon className={cn('h-4 w-4', option.color)} />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Tabela de Comparação</CardTitle>
            <CardDescription>
              Configure os itens exibidos na comparação de planos
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Features */}
          <ScrollArea className="h-[400px] pr-4">
            {CATEGORIES.map(category => {
              const categoryFeatures = groupedActive[category];
              if (!categoryFeatures?.length) return null;

              return (
                <div key={category} className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {categoryFeatures.map(feature => (
                      <div
                        key={feature.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                        
                        <span className="flex-1 text-sm font-medium">
                          {feature.feature_name}
                        </span>

                        {feature.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Padrão
                          </Badge>
                        )}

                        <div className="flex items-center gap-1">
                          {renderValueIcon(feature.free_value)}
                          {renderValueIcon(feature.starter_value)}
                          {renderValueIcon(feature.pro_value)}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenDialog(feature)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(feature)}
                          >
                            {feature.is_default ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </ScrollArea>

          {/* Inactive Features (Not Inserted) */}
          {inactiveFeatures.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Itens Não Inseridos ({inactiveFeatures.length})
                </h4>
                <div className="space-y-1">
                  {inactiveFeatures.map(feature => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/20"
                    >
                      <span className="flex-1 text-sm text-muted-foreground">
                        {feature.feature_name}
                      </span>

                      <Badge variant="outline" className="text-xs">
                        {feature.category}
                      </Badge>

                      {feature.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(feature)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? 'Editar Item' : 'Novo Item de Comparação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Funcionalidade</Label>
              <Input
                value={formData.feature_name}
                onChange={(e) => setFormData(prev => ({ ...prev, feature_name: e.target.value }))}
                placeholder="Ex: Gestão de Veículos"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Slug da Página (opcional)</Label>
              <Input
                value={formData.page_slug}
                onChange={(e) => setFormData(prev => ({ ...prev, page_slug: e.target.value }))}
                placeholder="Ex: veiculos"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Free</Label>
                <Select
                  value={formData.free_value}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, free_value: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALUE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className={cn('h-4 w-4', opt.color)} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Starter</Label>
                <Select
                  value={formData.starter_value}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, starter_value: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALUE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className={cn('h-4 w-4', opt.color)} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Pro</Label>
                <Select
                  value={formData.pro_value}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pro_value: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALUE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className={cn('h-4 w-4', opt.color)} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.feature_name.trim()}
            >
              {editingFeature ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
