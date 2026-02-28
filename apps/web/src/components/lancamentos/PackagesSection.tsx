import React, { useState, useEffect } from 'react';
import { SectionSkeleton } from '@/components/shared/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Plus, 
  Calendar, 
  Target, 
  TrendingDown, 
  CreditCard, 
  Banknote, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Pencil,
  Eye
} from 'lucide-react';
import { useBudgetPackages, BudgetPackage } from '@/hooks/useBudgetPackages';
import { PackageDialog } from './PackageDialog';
import { PackageTransactionDialog } from './PackageTransactionDialog';
import { PackageDetailSheet } from './PackageDetailSheet';
import { useVisibility } from '@/contexts/VisibilityContext';
import { paymentMethods } from '@/data/defaultData';
import { format, isWithinInterval, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const PackagesSection: React.FC = () => {
  const { isHidden } = useVisibility();
  const {
    packages,
    transactions,
    loading,
    addPackage,
    updatePackage,
    deletePackage,
    addTransaction,
    deleteTransaction,
    fetchTransactions,
    getPackageStats,
  } = useBudgetPackages();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<BudgetPackage | null>(null);
  const [editingPackage, setEditingPackage] = useState<BudgetPackage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<BudgetPackage | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (packages.length > 0) {
      fetchTransactions();
    }
  }, [packages.length]);

  const formatCurrency = (value: number) => {
    if (isHidden) return '••••••';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
  };

  const getPackageStatus = (pkg: BudgetPackage) => {
    const today = new Date();
    const startDate = parseISO(pkg.start_date);
    const endDate = parseISO(pkg.end_date);

    if (isPast(endDate)) return { label: 'Finalizado', color: 'secondary' };
    if (isWithinInterval(today, { start: startDate, end: endDate })) {
      return { label: 'Em Andamento', color: 'default' };
    }
    return { label: 'Agendado', color: 'outline' };
  };

  const toggleExpanded = (packageId: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  const handleEdit = (pkg: BudgetPackage) => {
    setEditingPackage(pkg);
    setDialogOpen(true);
  };

  const handleDelete = (pkg: BudgetPackage) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (packageToDelete) {
      await deletePackage(packageToDelete.id);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    }
  };

  const handleAddTransaction = (pkg: BudgetPackage) => {
    setSelectedPackage(pkg);
    setTransactionDialogOpen(true);
  };

  const handleViewDetails = (pkg: BudgetPackage) => {
    setSelectedPackage(pkg);
    setDetailSheetOpen(true);
  };

  const handleSavePackage = async (input: any) => {
    if (editingPackage) {
      return await updatePackage(editingPackage.id, input);
    }
    return await addPackage(input);
  };

  if (loading) {
    return <SectionSkeleton rows={4} />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Pacotes de Orçamento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe gastos de viagens, projetos e eventos
              </p>
            </div>
          </div>
          <Button onClick={() => { setEditingPackage(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pacote criado ainda</p>
              <p className="text-sm mt-1">
                Crie um pacote para controlar gastos de uma viagem, evento ou projeto específico
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map(pkg => {
                const stats = getPackageStats(pkg.id);
                const status = getPackageStatus(pkg);
                const isExpanded = expandedPackages.has(pkg.id);

                return (
                  <div
                    key={pkg.id}
                    className="border rounded-xl p-4 space-y-4 bg-card hover:shadow-sm transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <Badge variant={status.color as any}>{status.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(pkg.start_date), 'dd/MM', { locale: ptBR })} - {format(parseISO(pkg.end_date), 'dd/MM/yy', { locale: ptBR })}
                          </span>
                          <Badge variant="outline">{pkg.category_name}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(pkg)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Budget Progress */}
                    {pkg.has_budget_goal && pkg.budget_goal && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Target className="h-4 w-4" />
                            Meta: {formatCurrency(Number(pkg.budget_goal))}
                          </span>
                          <span className={stats.budgetPercentage && stats.budgetPercentage > 100 ? 'text-destructive font-medium' : 'text-foreground'}>
                            {formatCurrency(stats.totalSpent)} ({stats.budgetPercentage?.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(stats.budgetPercentage || 0, 100)} 
                          className={`h-2 ${stats.budgetPercentage && stats.budgetPercentage > 100 ? '[&>div]:bg-destructive' : ''}`}
                        />
                        {stats.budgetRemaining !== null && (
                          <p className={`text-xs ${stats.budgetRemaining >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                            {stats.budgetRemaining >= 0 
                              ? `Restante: ${formatCurrency(stats.budgetRemaining)}`
                              : `Excedido em: ${formatCurrency(Math.abs(stats.budgetRemaining))}`
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {!pkg.has_budget_goal && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 text-expense" />
                        <span>Total gasto: <strong>{formatCurrency(stats.totalSpent)}</strong></span>
                        <span className="text-muted-foreground">({stats.transactionCount} lançamentos)</span>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <button
                      onClick={() => toggleExpanded(pkg.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between pt-2 border-t"
                    >
                      <span>Ver detalhes por forma de pagamento e responsável</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isExpanded && (
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        {/* By Payment Method */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Por Forma de Pagamento
                          </h4>
                          {Object.entries(stats.byPaymentMethod).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum lançamento</p>
                          ) : (
                            <div className="space-y-1">
                              {Object.entries(stats.byPaymentMethod).map(([method, value]) => (
                                <div key={method} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{getPaymentMethodLabel(method)}</span>
                                  <span>{formatCurrency(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* By Person */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Por Responsável
                          </h4>
                          {Object.entries(stats.byPerson).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum lançamento</p>
                          ) : (
                            <div className="space-y-1">
                              {Object.entries(stats.byPerson).map(([person, value]) => (
                                <div key={person} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{person}</span>
                                  <span>{formatCurrency(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleAddTransaction(pkg)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Lançamento
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Dialog */}
      <PackageDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPackage(null);
        }}
        onSave={handleSavePackage}
        editingPackage={editingPackage}
      />

      {/* Transaction Dialog */}
      {selectedPackage && (
        <PackageTransactionDialog
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
          onSave={addTransaction}
          packageId={selectedPackage.id}
        />
      )}

      {/* Detail Sheet */}
      {selectedPackage && (
        <PackageDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          package={selectedPackage}
          transactions={transactions.filter(t => t.package_id === selectedPackage.id)}
          stats={getPackageStats(selectedPackage.id)}
          onDeleteTransaction={deleteTransaction}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pacote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pacote "{packageToDelete?.name}"? 
              Todos os lançamentos vinculados também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
