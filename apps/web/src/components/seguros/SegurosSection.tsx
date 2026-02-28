import React, { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Car,
  Home,
  Heart,
  Stethoscope,
  Smile,
  Plane,
  Building2,
  Dog,
  Smartphone,
  Bike,
  Briefcase,
  ShieldCheck,
  FileText,
  Info,
  TrendingUp,
  Link2,
  Filter,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSeguros } from '@/hooks/useSeguros';
import { SectionSkeleton } from '@/components/shared/PageSkeleton';
import { useFinancial } from '@/contexts/FinancialContext';
import { Insurance, InsuranceType, insuranceTypeLabels } from '@/types/seguro';
import { SeguroDialog } from './SeguroDialog';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const insuranceIcons: Record<InsuranceType, React.ElementType> = {
  auto: Car,
  residencial: Home,
  vida: Heart,
  saude: Stethoscope,
  odontologico: Smile,
  viagem: Plane,
  empresarial: Building2,
  pet: Dog,
  celular: Smartphone,
  bike: Bike,
  rc_profissional: Briefcase,
  garantia_estendida: ShieldCheck,
  outro: Shield,
};

const insuranceColors: Record<InsuranceType, string> = {
  auto: 'text-blue-500',
  residencial: 'text-green-500',
  vida: 'text-red-500',
  saude: 'text-cyan-500',
  odontologico: 'text-yellow-500',
  viagem: 'text-purple-500',
  empresarial: 'text-indigo-500',
  pet: 'text-orange-500',
  celular: 'text-gray-500',
  bike: 'text-lime-500',
  rc_profissional: 'text-slate-500',
  garantia_estendida: 'text-emerald-500',
  outro: 'text-muted-foreground',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function abbreviateCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}Bn`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Mn`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

export const SegurosSection: React.FC = () => {
  const navigate = useNavigate();
  const {
    seguros,
    segurosAtivos,
    proximosVencer,
    isLoading,
    deleteSeguro,
    totalPremioMensal,
    totalCobertura,
  } = useSeguros();
  const { config } = useFinancial();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSeguro, setSelectedSeguro] = useState<Insurance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seguroToDelete, setSeguroToDelete] = useState<Insurance | null>(null);
  const [assetFilter, setAssetFilter] = useState<string>('all');

  // Get assets that can have insurance (property, vehicle, valuable_objects)
  const insurableAssets = config.assets.filter(a => 
    ['property', 'vehicle', 'valuable_objects'].includes(a.type) && !a.isSold
  );

  // Filter seguros based on asset filter
  const filteredSeguros = seguros.filter(s => {
    if (assetFilter === 'all') return true;
    if (assetFilter === 'unlinked') return !s.asset_id;
    return s.asset_id === assetFilter;
  });

  const handleEdit = (seguro: Insurance) => {
    setSelectedSeguro(seguro);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedSeguro(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (seguro: Insurance) => {
    setSeguroToDelete(seguro);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (seguroToDelete) {
      await deleteSeguro.mutateAsync(seguroToDelete.id);
      setDeleteDialogOpen(false);
      setSeguroToDelete(null);
    }
  };

  const getStatus = (seguro: Insurance): { label: string; variant: 'default' | 'destructive' | 'secondary'; icon: React.ElementType } => {
    const today = new Date();
    const dataFim = new Date(seguro.data_fim);
    const daysUntilEnd = differenceInDays(dataFim, today);

    if (daysUntilEnd < 0) {
      return { label: 'Vencido', variant: 'destructive', icon: XCircle };
    }
    if (daysUntilEnd <= 30) {
      return { label: `Vence em ${daysUntilEnd}d`, variant: 'secondary', icon: AlertTriangle };
    }
    return { label: 'Ativo', variant: 'default', icon: CheckCircle };
  };

  if (isLoading) {
    return <SectionSkeleton rows={4} />;
  }

  return (
    <div className="space-y-4">
      {/* Orientação sobre tipos de seguro */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-700" />
        <AlertDescription className="text-sm text-blue-800">
          <span className="font-medium">Esta página gerencia apólices de proteção</span> (auto, vida, residencial, etc.).
          Para seguros com capitalização que acumulam valor (VGBL), cadastre em{' '}
          <Button 
            variant="link" 
            className="h-auto p-0 text-blue-700 font-medium"
            onClick={() => navigate('/bens-investimentos/investimentos')}
          >
            Investimentos
            <TrendingUp className="h-3 w-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Apólices Ativas</span>
          </div>
          <p className="text-lg font-bold mt-1">{segurosAtivos.length}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Próximas a Vencer</span>
          </div>
          <p className="text-lg font-bold mt-1">{proximosVencer.length}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Prêmio Mensal</span>
          </div>
          <p className="text-lg font-bold mt-1 text-destructive">
            R$ {abbreviateCurrency(totalPremioMensal)}
          </p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total Coberturas</span>
          </div>
          <p className="text-lg font-bold mt-1 text-primary">
            R$ {abbreviateCurrency(totalCobertura)}
          </p>
        </Card>
      </div>

      {/* Tabela de Seguros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Meus Seguros
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Filtro por bem */}
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filtrar por bem" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos os seguros</SelectItem>
                  <SelectItem value="unlinked">
                    <span className="flex items-center gap-1">
                      Sem vínculo a bem
                    </span>
                  </SelectItem>
                  {insurableAssets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {asset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Seguro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSeguros.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-6 w-6 text-muted-foreground" />}
              description={assetFilter !== 'all' 
                ? 'Nenhum seguro encontrado com o filtro selecionado' 
                : 'Você ainda não cadastrou nenhum seguro'}
              actionLabel={assetFilter === 'all' ? 'Adicionar primeiro seguro' : undefined}
              onAction={assetFilter === 'all' ? handleNew : undefined}
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seguro</TableHead>
                    <TableHead className="hidden sm:table-cell">Seguradora</TableHead>
                    <TableHead className="text-right">Prêmio</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Cobertura</TableHead>
                    <TableHead className="hidden sm:table-cell">Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeguros.map((seguro) => {
                    const Icon = insuranceIcons[seguro.tipo];
                    const status = getStatus(seguro);
                    const StatusIcon = status.icon;
                    const linkedAsset = seguro.asset_id 
                      ? config.assets.find(a => a.id === seguro.asset_id)
                      : null;

                    return (
                      <TableRow key={seguro.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${insuranceColors[seguro.tipo]}`} />
                            <div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="font-medium text-sm">{seguro.nome}</p>
                                {seguro.arquivo_path && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <FileText className="h-3.5 w-3.5 text-primary" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Apólice anexada</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {linkedAsset && (
                                  <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                    <Link2 className="h-2.5 w-2.5" />
                                    {linkedAsset.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {seguro.seguradora}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {seguro.seguradora}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-destructive">
                            {formatCurrency(seguro.premio_mensal)}
                          </span>
                          <span className="text-xs text-muted-foreground">/mês</span>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          <span className="text-sm">
                            {formatCurrency(seguro.valor_cobertura)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {format(new Date(seguro.data_inicio), 'dd/MM/yy', { locale: ptBR })} -{' '}
                          {format(new Date(seguro.data_fim), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(seguro)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(seguro)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Cadastro/Edição */}
      <SeguroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        seguro={selectedSeguro}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Seguro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o seguro "{seguroToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
