import React, { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { HeaderMetricCard } from '@/components/shared/HeaderMetricCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Consorcio, Financiamento } from '@/types/credito';
import { ConsorcioDialog } from './ConsorcioDialog';
import { FinanciamentoDialog } from './FinanciamentoDialog';
import { useCreditos } from '@/hooks/useCreditos';
import { useFinancial } from '@/contexts/FinancialContext';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { DividasObrigacoesSection } from '@/components/passivos/DividasObrigacoesSection';

import { 
  TrendingUp, 
  Landmark, 
  Plus, 
  Pencil, 
  Trash2, 
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';


const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const CreditoSection: React.FC = () => {
  const {
    consorcios,
    financiamentos,
    loading,
    loadError,
    refetch,
    addConsorcio,
    updateConsorcio,
    deleteConsorcio,
    addFinanciamento,
    updateFinanciamento,
    deleteFinanciamento,
  } = useCreditos();
  const { config } = useFinancial();
  const dividasCount = config.assets.filter((a) => a.type === 'obligations' && !a.isSold).length;

  const [activeTab, setActiveTab] = useState<'consorcios' | 'financiamentos' | 'dividas'>('consorcios');
  const [consorcioDialogOpen, setConsorcioDialogOpen] = useState(false);
  const [financiamentoDialogOpen, setFinanciamentoDialogOpen] = useState(false);
  const [editingConsorcio, setEditingConsorcio] = useState<Consorcio | null>(null);
  const [editingFinanciamento, setEditingFinanciamento] = useState<Financiamento | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'consorcio' | 'financiamento'; id: string } | null>(null);

  const handleSaveConsorcio = async (data: any) => {
    if (editingConsorcio) {
      return updateConsorcio(editingConsorcio.id, data);
    }
    return addConsorcio(data);
  };

  const handleSaveFinanciamento = async (data: any) => {
    if (editingFinanciamento) {
      return updateFinanciamento(editingFinanciamento.id, data);
    }
    return addFinanciamento(data);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'consorcio') {
      await deleteConsorcio(deleteConfirm.id);
    } else {
      await deleteFinanciamento(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleAddNew = () => {
    if (activeTab === 'consorcios') {
      setEditingConsorcio(null);
      setConsorcioDialogOpen(true);
    } else if (activeTab === 'financiamentos') {
      setEditingFinanciamento(null);
      setFinanciamentoDialogOpen(true);
    }
  };

  const totalConsorcios = consorcios.reduce((acc, c) => acc + c.valor_carta, 0);
  const totalFinanciamentos = financiamentos.reduce((acc, f) => acc + f.saldo_devedor, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <RXFinLoadingSpinner height="py-12" message="Carregando..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch} variant="outline">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary — mesmo padrão visual que Bens e Investimentos (HeaderMetricCard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <HeaderMetricCard
            label="Consórcios"
            value={formatMoney(totalConsorcios)}
            variant="blue"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <HeaderMetricCard
            label="Financiamentos"
            value={formatMoney(totalFinanciamentos)}
            variant="negative"
            icon={<Landmark className="h-4 w-4" />}
          />
          <HeaderMetricCard
            label="Total compromissos"
            value={formatMoney(totalConsorcios + totalFinanciamentos)}
            variant="neutral"
            icon={<ArrowRightLeft className="h-4 w-4" />}
          />
        </div>
        <p className="text-[10px] text-muted-foreground -mt-2">
          {consorcios.length} consórcio(s) · {financiamentos.length} financiamento(s)
        </p>

        {/* Tabs: Consórcios | Financiamentos | Dívidas e obrigações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'consorcios' | 'financiamentos' | 'dividas')}>
            <TabsList>
              <TabsTrigger value="consorcios" className="gap-1">
                <TrendingUp className="h-4 w-4" />
                Consórcios ({consorcios.length})
              </TabsTrigger>
              <TabsTrigger value="financiamentos" className="gap-1">
                <Landmark className="h-4 w-4" />
                Financiamentos ({financiamentos.length})
              </TabsTrigger>
              <TabsTrigger value="dividas" className="gap-1">
                <FileText className="h-4 w-4" />
                Dívidas e obrigações ({dividasCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab !== 'dividas' && (
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'consorcios' && (
          <Card>
            <CardContent className="pt-6">
              {consorcios.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
                  description="Você ainda não cadastrou nenhum consórcio"
                  actionLabel="Adicionar primeiro consórcio"
                  onAction={() => { setEditingConsorcio(null); setConsorcioDialogOpen(true); }}
                />
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Carta</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consorcios.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{c.nome}</p>
                              {c.administradora && (
                                <p className="text-xs text-muted-foreground">{c.administradora}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatMoney(c.valor_carta)}</TableCell>
                          <TableCell>{formatMoney(c.valor_parcela_atual)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{c.parcelas_pagas}/{c.prazo_total}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {c.contemplado ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Contemplado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                <Clock className="h-3 w-3 mr-1" />
                                Aguardando
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => { setEditingConsorcio(c); setConsorcioDialogOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setDeleteConfirm({ type: 'consorcio', id: c.id })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'financiamentos' && (
          <Card>
            <CardContent className="pt-6">
              {financiamentos.length === 0 ? (
                <EmptyState
                  icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
                  description="Você ainda não cadastrou nenhum financiamento"
                  actionLabel="Adicionar primeiro financiamento"
                  onAction={() => { setEditingFinanciamento(null); setFinanciamentoDialogOpen(true); }}
                />
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Saldo Devedor</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financiamentos.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{f.nome}</p>
                              {f.instituicao_financeira && (
                                <p className="text-xs text-muted-foreground">{f.instituicao_financeira}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatMoney(f.saldo_devedor)}</TableCell>
                          <TableCell>{formatMoney(f.valor_parcela_atual)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{f.parcelas_pagas}/{f.prazo_total}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {f.sistema_amortizacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => { setEditingFinanciamento(f); setFinanciamentoDialogOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setDeleteConfirm({ type: 'financiamento', id: f.id })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'dividas' && (
          <DividasObrigacoesSection />
        )}
      </div>

      <ConsorcioDialog
        open={consorcioDialogOpen}
        onOpenChange={setConsorcioDialogOpen}
        consorcio={editingConsorcio}
        onSave={handleSaveConsorcio}
      />

      <FinanciamentoDialog
        open={financiamentoDialogOpen}
        onOpenChange={setFinanciamentoDialogOpen}
        financiamento={editingFinanciamento}
        onSave={handleSaveFinanciamento}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este {deleteConfirm?.type === 'consorcio' ? 'consórcio' : 'financiamento'}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
