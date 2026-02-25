import React, { useState } from 'react';
import { useStoreCategoryRules } from '@/hooks/useStoreCategoryRules';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Trash2, Loader2, Plus, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { expenseCategories } from '@/data/defaultData';

export const RegrasCategoriaTab: React.FC = () => {
  const { rules, loading, deleteRule, createRule } = useStoreCategoryRules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCategory = expenseCategories.find(c => c.id === selectedCategoryId);

  const handleCreate = async () => {
    if (!storeName.trim() || !selectedCategoryId || !selectedCategory) return;
    setSaving(true);
    const result = await createRule(storeName.trim(), selectedCategoryId, selectedCategory.name);
    setSaving(false);
    if (result.success) {
      setStoreName('');
      setSelectedCategoryId('');
      setDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Tag className="h-4 w-4 text-teal-500" />
          </div>
          Regras de Categoria
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma regra de categoria criada ainda.</p>
            <p className="text-xs mt-1">
              Clique em "Nova Regra" para criar uma regra de categorização automática.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.original_store_name || rule.normalized_store_name}
                    </TableCell>
                    <TableCell>{rule.category_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(rule.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A regra para "{rule.original_store_name || rule.normalized_store_name}" será removida.
                              As transações já categorizadas não serão alteradas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRule(rule.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Nova Regra de Categoria
              </DialogTitle>
              <DialogDescription>
                Transações futuras com este nome serão categorizadas automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nome do estabelecimento</Label>
                <Input
                  id="store-name"
                  placeholder="Ex: Netflix, Uber, iFood..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  A regra será aplicada a todas as transações que contenham este nome.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !storeName.trim() || !selectedCategoryId}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Criar Regra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
