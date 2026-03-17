import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowRight, ArrowLeft, Target, TrendingUp, Wallet,
  Plus, Trash2, FileText, Upload, CheckCircle2, Calendar, Loader2, Sparkles,
  Home, Car, PiggyBank, CreditCard, Shield, Building2, Banknote, BarChart3,
  Zap, HelpCircle
} from 'lucide-react';
import type { BemDireito } from '@/hooks/useIRImport';

/** Agrupa bem do IR por tipo (código 01–19 imóvel, 21–29 veículo, 31–99 investimento). */
function getBemGroupLabel(codigo: string | number): string {
  const n = typeof codigo === 'number' ? codigo : parseInt(String(codigo), 10);
  if (n >= 1 && n <= 19) return 'Imóveis';
  if (n >= 21 && n <= 29) return 'Veículos';
  if (n >= 31 && n <= 99) return 'Investimentos';
  return 'Outros';
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IrDownloadGuideContent } from '@/components/shared/IrDownloadGuide';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIRFileName } from '@/lib/irFileName';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ConquestCard } from '../ConquestCard';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIRImport } from '@/hooks/useIRImport';

interface BlockCProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

const GOAL_ICONS = [
  { value: 'Shield', label: '🛡️ Reserva' },
  { value: 'Plane', label: '✈️ Viagem' },
  { value: 'Home', label: '🏠 Imóvel' },
  { value: 'Car', label: '🚗 Veículo' },
  { value: 'GraduationCap', label: '🎓 Educação' },
  { value: 'Heart', label: '❤️ Pessoal' },
];

const BUDGET_CATEGORIES = [
  { id: 'moradia', label: 'Moradia', suggested: 30 },
  { id: 'alimentacao', label: 'Alimentação', suggested: 20 },
  { id: 'transporte', label: 'Transporte', suggested: 10 },
  { id: 'saude', label: 'Saúde', suggested: 10 },
  { id: 'lazer', label: 'Lazer', suggested: 10 },
  { id: 'educacao', label: 'Educação', suggested: 5 },
  { id: 'investimentos', label: 'Investimentos', suggested: 15 },
];

const formatBRL = (v: number) => v > 0 ? `R$ ${v.toLocaleString('pt-BR')}` : 'R$ 0';

type IrImportDisplay = {
  id: string;
  ano_exercicio: number;
  ano_calendario: number;
  bens_count: number;
  rendimentos_count: number;
  source_type: string;
  file_name: string | null;
  imported_at: string;
};

export const BlockC: React.FC<BlockCProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { user } = useAuth();
  const { processFile, fetchImports, imports: irImportList, isLoading: irUploading } = useIRImport();
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [irLoaded, setIrLoaded] = useState(false);
  const [irUploadError, setIrUploadError] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const irImports: IrImportDisplay[] = React.useMemo(() => {
    return irImportList.map((imp) => ({
      id: imp.id,
      ano_exercicio: imp.anoExercicio,
      ano_calendario: imp.anoCalendario,
      bens_count: imp.bensDireitos?.length ?? 0,
      rendimentos_count: (imp.rendimentosTributaveis?.length ?? 0) + (imp.rendimentosIsentos?.length ?? 0),
      source_type: imp.sourceType,
      file_name: imp.fileName ?? null,
      imported_at: imp.importedAt,
    }));
  }, [irImportList]);
  const [patrimonioData, setPatrimonioData] = useState<any>(null);
  const [patrimonioLoaded, setPatrimonioLoaded] = useState(false);
  const [irGuideOpen, setIrGuideOpen] = useState(false);
  const [summaryYear, setSummaryYear] = useState<number | null>(null);

  /** Primeiro ir_import com bens_direitos não vazio (ano_exercicio DESC), para step Patrimônio. */
  const irPatrimonySource = useMemo(() => {
    const sorted = [...irImportList].sort((a, b) => b.anoExercicio - a.anoExercicio);
    return sorted.find((imp) => (imp.bensDireitos?.length ?? 0) > 0) ?? null;
  }, [irImportList]);

  /** Bens do IR agrupados por tipo (Imóveis, Veículos, Investimentos, Outros) para step 2. */
  const bensByGroup = useMemo(() => {
    if (!irPatrimonySource?.bensDireitos?.length) return null;
    const groups: Record<string, BemDireito[]> = {};
    irPatrimonySource.bensDireitos!.forEach((b) => {
      const label = getBemGroupLabel(b.codigo);
      if (!groups[label]) groups[label] = [];
      groups[label].push(b);
    });
    const order = ['Imóveis', 'Veículos', 'Investimentos', 'Outros'];
    return order.filter((k) => groups[k]?.length).map((k) => ({ label: k, items: groups[k]! }));
  }, [irPatrimonySource]);

  const loadPatrimonio = async () => {
    if (patrimonioLoaded || !user?.id) return;
    try {
      const { data } = await supabase.rpc('get_patrimonio_overview', {
        p_user_id: user.id,
      });
      setPatrimonioData(data);
    } catch (err) {
      console.warn('[BlockC] loadPatrimonio erro:', err);
    } finally {
      setPatrimonioLoaded(true);
    }
  };

  const hasFetchedIrRef = useRef(false);
  useEffect(() => {
    if (step !== 1) {
      hasFetchedIrRef.current = false;
      setIrLoaded(false);
      return;
    }
    if (!user?.id) return;
    if (hasFetchedIrRef.current) return;
    hasFetchedIrRef.current = true;
    fetchImports()
      .then(() => setIrLoaded(true))
      .catch((err) => {
        console.warn('[BlockC] fetchImports erro:', err);
        setIrLoaded(true);
      });
  }, [step, user?.id]);

  const handleIRUpload = async (file: File, anoExercicio: number) => {
    if (!user?.id || !file) return;
    setSelectedYear(anoExercicio);
    setIrUploadError('');
    const result = await processFile(file);
    if (result) {
      toast.success(`Declaração ${result.anoExercicio} importada com sucesso!`);
      await fetchImports();
    } else {
      setIrUploadError('Erro ao importar. Tente novamente.');
    }
  };

  useEffect(() => {
    if (step === 6 && user?.id) {
      supabase.rpc('calculate_milestone_cashflow', { p_user_id: user.id })
        .then(({ data }) => setMilestoneData(data));
    }
  }, [step, user?.id]);

  // ─── Step 0: Intro ────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Nível 3: Planejamento</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Configure seus objetivos financeiros e defina para onde vai cada real do seu dinheiro.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Neste nível você vai:</h2>
          <div className="space-y-3">
            {[
              { icon: Wallet, label: 'Orçamento Mensal', desc: 'Defina limites por categoria de gasto' },
              { icon: Target, label: 'Metas Financeiras', desc: 'Reserva de emergência, viagem, investimento' },
              { icon: TrendingUp, label: 'Visão do Futuro', desc: 'Projeção personalizada baseada nos seus dados' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground mb-3">⏱️ ~5 min | 📊 Resultado: Fluxo de Caixa</div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Planejar meu Futuro <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Import IR ──────────────────────────────────────
  if (step === 1) {
    if (!irLoaded) {
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando declarações anteriores...</p>
        </div>
      );
    }
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const importedYears = new Set(irImports.map(imp => imp.ano_exercicio));
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Declaração de IR
            </p>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Importe suas declarações de IR
          </h2>
          <p className="text-sm text-muted-foreground">
            O RXFin usa seus dados do IR para construir um histórico patrimonial
            preciso. Importe o PDF da declaração de cada ano disponível.
          </p>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-4 mb-5">
          <div className="flex gap-3">
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Importe pelo menos os últimos 2 anos
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Com 2 ou mais declarações, o RXFin consegue reconstruir sua evolução patrimonial,
                calcular sua taxa de poupança histórica e detectar inconsistências. Com apenas 1 ano,
                a análise fica limitada.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => setIrGuideOpen(true)}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Como obter o PDF?
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2 mb-5">
          {years.map(year => {
            const imported = importedYears.has(year);
            const imp = irImports.find(i => i.ano_exercicio === year);
            const displayFileName = imp
              ? formatIRFileName(imp.ano_exercicio, imp.ano_calendario, user?.user_metadata?.cpf)
              : null;
            return (
              <div
                key={year}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                  imported ? 'border-primary bg-primary/5 cursor-pointer hover:bg-primary/10' : 'border-border bg-card'
                )}
                onClick={imported ? () => setSummaryYear(year) : undefined}
                role={imported ? 'button' : undefined}
              >
                <div className="shrink-0">
                  {imported
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <Calendar className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Exercício {year} <span className="text-muted-foreground font-normal text-xs">(ano-base {year - 1})</span>
                  </p>
                  {imported && imp && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {imp.bens_count} bens · {imp.rendimentos_count} rendimentos
                      {displayFileName && ` · ${displayFileName}`}
                    </p>
                  )}
                  {!imported && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Não importada
                    </p>
                  )}
                </div>
                {!imported && (
                  <label
                    htmlFor={`ir-upload-${year}`}
                    className={cn(
                      'shrink-0 cursor-pointer',
                      irUploading && selectedYear === year && 'pointer-events-none opacity-80'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      id={`ir-upload-${year}`}
                      type="file"
                      accept=".pdf,.xml,.dec,application/pdf,text/xml,application/xml"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleIRUpload(file, year);
                          e.target.value = '';
                        }
                      }}
                    />
                    <span
                      className={cn(
                        'inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                        irUploading && selectedYear === year
                          ? 'border-primary/40 text-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {irUploading && selectedYear === year ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin shrink-0 mr-1" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 shrink-0 mr-1" />
                          PDF
                        </>
                      )}
                    </span>
                  </label>
                )}
              </div>
            );
          })}
        </div>
        {irUploadError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-destructive">{irUploadError}</p>
          </div>
        )}
        {irImports.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">{irImports.length} declaraç{irImports.length !== 1 ? 'ões importadas' : 'ão importada'}.</span>
              {' '}O histórico patrimonial será construído automaticamente.
            </p>
          </div>
        )}
        <Dialog open={irGuideOpen} onOpenChange={setIrGuideOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Como baixar sua declaração do IR
              </DialogTitle>
            </DialogHeader>
            <IrDownloadGuideContent />
          </DialogContent>
        </Dialog>

        {summaryYear != null && (() => {
          const imp = irImportList.find(i => i.anoExercicio === summaryYear);
          if (!imp) return null;
          const totalBens = (imp.bensDireitos ?? []).reduce((s: number, b: { situacaoAtual?: number }) => s + (b.situacaoAtual ?? 0), 0);
          const totalRendTrib = (imp.rendimentosTributaveis ?? []).reduce((s: number, r: { valor?: number }) => s + (r.valor ?? 0), 0);
          const totalRendIsentos = (imp.rendimentosIsentos ?? []).reduce((s: number, r: { valor?: number }) => s + (r.valor ?? 0), 0);
          const totalRend = totalRendTrib + totalRendIsentos;
          const totalDiv = (imp.dividas ?? []).reduce((s: number, d: { situacaoAtual?: number }) => s + (d.situacaoAtual ?? 0), 0);
          const numFontes = (imp.rendimentosTributaveis?.length ?? 0) + (imp.rendimentosIsentos?.length ?? 0);
          const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
          const handleImportAnother = () => {
            const y = summaryYear;
            setSummaryYear(null);
            setTimeout(() => document.getElementById(`ir-upload-${y}`)?.click(), 100);
          };
          return (
            <Dialog open={true} onOpenChange={(open) => !open && setSummaryYear(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Declaração {imp.anoExercicio} (ano-base {imp.anoCalendario})</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="p-3 border-blue-500/20 bg-blue-500/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bens e Direitos</p>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">{(imp.bensDireitos ?? []).length} itens</p>
                    <p className="text-sm font-medium">{fmt(totalBens)}</p>
                  </Card>
                  <Card className="p-3 border-green-500/20 bg-green-500/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rendimentos</p>
                    <p className="text-xs text-muted-foreground">Trib. {fmt(totalRendTrib)} · Isentos {fmt(totalRendIsentos)}</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{fmt(totalRend)}</p>
                    <p className="text-xs text-muted-foreground">{numFontes} fontes pagadoras</p>
                  </Card>
                  <Card className="p-3 border-orange-500/20 bg-orange-500/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dívidas e Ônus</p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400">{(imp.dividas ?? []).length} itens</p>
                    <p className="text-sm font-medium">{fmt(totalDiv)}</p>
                  </Card>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Button variant="outline" className="sm:flex-1" onClick={() => setSummaryYear(null)}>Concluir</Button>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-1" onClick={handleImportAnother}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar outro ano
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={() => onStepChange(2)}
          disabled={irUploading}
        >
          {irImports.length > 0 ? 'Continuar' : 'Pular por agora'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        {irImports.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Você pode importar depois em Configurações → IR
          </p>
        )}
      </div>
    );
  }

  // ─── Step 2: Patrimônio ─────────────────────────────────────
  if (step === 2) {
    if (!patrimonioLoaded) {
      loadPatrimonio();
      return (
        <div className="max-w-2xl mx-auto py-16 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando seu patrimônio...</p>
        </div>
      );
    }

    const formatBRLShort = (v: number) => {
      if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `R$ ${(v/1_000).toFixed(0)}k`;
      return `R$ ${v.toLocaleString('pt-BR')}`;
    };
    const formatBRLFull = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

    const useIRData = irPatrimonySource != null && (irPatrimonySource.bensDireitos?.length ?? 0) > 0;

    const totalAtivos = useIRData
      ? (irPatrimonySource!.bensDireitos ?? []).reduce((s, b) => s + (b.situacaoAtual ?? 0), 0)
      : (patrimonioData?.net_worth?.total_assets ?? 0) + (patrimonioData?.net_worth?.total_vehicles ?? 0);
    const totalPassivos = useIRData
      ? (irPatrimonySource!.dividas ?? []).reduce((s, d) => s + (d.situacaoAtual ?? 0), 0)
      : (patrimonioData?.net_worth?.total_debt ?? 0);
    const patrimonioLiquido = totalAtivos - totalPassivos;

    const assets: any[] = patrimonioData?.assets ?? [];
    const vehicles: any[] = patrimonioData?.vehicles ?? [];
    const financiamentos: any[] = patrimonioData?.financiamentos ?? [];
    const consorcios: any[] = patrimonioData?.consorcios ?? [];
    const seguros: any[] = patrimonioData?.seguros ?? [];

    const hasBensFromIR = useIRData && (irPatrimonySource!.bensDireitos?.length ?? 0) > 0;
    const hasAnyDataBens = assets.length > 0 || vehicles.length > 0 ||
      financiamentos.length > 0 || consorcios.length > 0;
    const hasAnyData = useIRData ? hasBensFromIR || totalPassivos > 0 : hasAnyDataBens;

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Seu patrimônio
            </p>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Confira o que identificamos
          </h2>
          {useIRData && irPatrimonySource && (
            <p className="text-xs text-muted-foreground mb-1">
              Baseado na declaração de IR — Exercício {irPatrimonySource.anoExercicio}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {hasAnyData
              ? 'Encontramos esses bens e obrigações no seu perfil. Confirme ou ajuste depois em Bens & Investimentos.'
              : 'Nenhum bem cadastrado ainda. Você pode adicionar seus ativos depois em Bens & Investimentos.'}
          </p>
        </div>

        {hasAnyData && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total ativos', value: totalAtivos, color: 'text-primary' },
              { label: 'Dívidas', value: totalPassivos, color: 'text-destructive' },
              { label: 'Patrimônio líquido', value: patrimonioLiquido, color: patrimonioLiquido >= 0 ? 'text-primary' : 'text-destructive' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{formatBRLShort(value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 mb-5">
          {useIRData && bensByGroup && bensByGroup.length > 0 && (
            <>
              {bensByGroup.map(({ label, items }) => {
                const Icon = label === 'Imóveis' ? Home : label === 'Veículos' ? Car : label === 'Investimentos' ? Banknote : FileText;
                return (
                  <div key={label} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        {label} ({items.length})
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {items.slice(0, 5).map((b, idx) => (
                        <div key={`${b.codigo}-${idx}`} className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground truncate flex-1" title={b.descricao || b.discriminacao}>
                            {(b.descricao || b.discriminacao || `Bem ${b.codigo}`).slice(0, 40)}
                            {(b.descricao || b.discriminacao || '').length > 40 ? '…' : ''}
                          </p>
                          <p className="text-xs font-medium text-foreground shrink-0 tabular-nums">
                            {formatBRLFull(b.situacaoAtual ?? 0)}
                          </p>
                        </div>
                      ))}
                      {items.length > 5 && (
                        <p className="text-xs text-muted-foreground">+{items.length - 5} outros</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!useIRData && assets.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Bens ({assets.length})</p>
              </div>
              <div className="space-y-1.5">
                {assets.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{a.name}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">{formatBRLShort(a.current_value ?? 0)}</p>
                  </div>
                ))}
                {assets.length > 3 && <p className="text-xs text-muted-foreground">+{assets.length - 3} outros bens</p>}
              </div>
            </div>
          )}

          {!useIRData && vehicles.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Veículos ({vehicles.length})</p>
              </div>
              <div className="space-y-1.5">
                {vehicles.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{v.display_name}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">{formatBRLShort(v.fipe_value ?? 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!useIRData && financiamentos.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-foreground">Financiamentos ({financiamentos.length})</p>
              </div>
              <div className="space-y-1.5">
                {financiamentos.slice(0, 3).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{f.nome}</p>
                    <p className="text-xs font-medium text-destructive ml-2 shrink-0">-{formatBRLShort(f.saldo_devedor ?? 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!useIRData && consorcios.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PiggyBank className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Consórcios ({consorcios.length})</p>
              </div>
              <div className="space-y-1.5">
                {consorcios.slice(0, 2).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{c.nome}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">{formatBRLShort(c.valor_carta ?? 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!useIRData && seguros.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Seguros ({seguros.filter((s: any) => s.is_active).length} ativos)</p>
              </div>
              <div className="space-y-1.5">
                {seguros.filter((s: any) => s.is_active).slice(0, 2).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{s.nome}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">{formatBRLShort(s.premio_mensal ?? 0)}/mês</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAnyData && (
            <div className="bg-muted/30 rounded-xl p-6 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Conecte seus bancos ou importe o IR para identificar seus bens automaticamente.
              </p>
            </div>
          )}
        </div>

        <div className="bg-muted/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Você pode cadastrar e editar todos os seus bens em detalhes
            na seção <strong>Bens & Investimentos</strong> após o onboarding.
          </p>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={() => onStepChange(3)}
        >
          Continuar para Orçamento <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 3: Budget allocation ────────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('budget', {}); onStepChange(4); }}>
            Próximo: Metas <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <BudgetEditor />
      </div>
    );
  }

  // ─── Step 4: Goals ────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(3)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('goals', {}); onStepChange(5); }}>
            Próximo: Revisão <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <GoalEditor />
      </div>
    );
  }

  // ─── Step 5: Review ───────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(4)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Quase lá!</h2>
          <p className="text-sm text-muted-foreground">Vamos ver o resultado do seu fluxo de caixa.</p>
        </div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(6)}>
          Ver meu Fluxo de Caixa <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 6: Conquest Card ────────────────────────────────────
  if (step === 6) {
    const md = milestoneData as any;
    const variancePositive = md?.variance >= 0;

    const metrics = md
      ? [
          { label: 'Receita Planejada', value: formatBRL(md.planned_income) },
          { label: 'Despesa Planejada', value: formatBRL(md.planned_expenses) },
          { label: 'Receita Real', value: formatBRL(md.actual_income) },
          { label: 'Variância', value: `${md.variance_label || (variancePositive ? 'Abaixo do orçamento ✓' : 'Acima do orçamento ⚠️')}` },
        ]
      : [
          { label: 'Planejado', value: 'Calculando...' },
          { label: 'Realizado', value: 'Calculando...' },
          { label: 'Variância', value: 'Calculando...' },
          { label: 'Status', value: '...' },
        ];

    const insightText = md
      ? variancePositive
        ? `Suas despesas reais estão abaixo do planejado. Excelente controle! ✓`
        : `Suas despesas reais estão acima do planejado. Hora de ajustar! ⚠️`
      : 'Calculando seu fluxo de caixa...';

    return (
      <div className="py-8">
        <ConquestCard
          level={3}
          badge="gold"
          title="Fluxo de Caixa Mapeado!"
          metrics={metrics}
          insight={insightText}
          nextLevelPreview="Nível 4 — Domínio Total: projeção financeira de 30 anos."
          onContinue={onComplete}
          continueLabel="Avançar para Nível 4: Domínio Total"
        />
      </div>
    );
  }

  return null;
};

// ─── Budget Editor ──────────────────────────────────────────────

const BudgetEditor: React.FC = () => {
  const [budgets, setBudgets] = useState(
    BUDGET_CATEGORIES.map(c => ({ ...c, percent: c.suggested }))
  );
  const total = budgets.reduce((acc, b) => acc + b.percent, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Orçamento por Categoria</h2>
          <p className="text-sm text-muted-foreground">Distribua sua renda em % por categoria</p>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {budgets.map((b, i) => (
          <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <span className="text-sm font-medium text-foreground flex-1">{b.label}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-16 h-8 text-center text-sm"
                value={b.percent}
                min={0}
                max={100}
                onChange={e => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setBudgets(prev => prev.map((item, idx) => idx === i ? { ...item, percent: val } : item));
                }}
              />
              <span className="text-xs text-muted-foreground w-6">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className={`text-center text-sm font-medium ${total === 100 ? 'text-primary' : total > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
        Total: {total}% {total !== 100 && `(ideal: 100%)`}
      </div>
    </div>
  );
};

// ─── Goal Editor ────────────────────────────────────────────────

interface GoalForm { name: string; targetValue: string; currentValue: string; deadline: string; icon: string; }

const GoalEditor: React.FC = () => {
  const [goals, setGoals] = useState<GoalForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<GoalForm>({ name: '', targetValue: '', currentValue: '0', deadline: '', icon: 'Shield' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.targetValue) return;
    setGoals(prev => [...prev, { ...form }]);
    setForm({ name: '', targetValue: '', currentValue: '0', deadline: '', icon: 'Shield' });
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Metas Financeiras</h2>
          <p className="text-sm text-muted-foreground">Defina objetivos concretos para o seu dinheiro</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {goals.map((g, i) => (
          <Card key={i} className="border border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(g.currentValue).toLocaleString('pt-BR')} / R$ {Number(g.targetValue).toLocaleString('pt-BR')}
                  {g.deadline && ` • até ${g.deadline}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGoals(prev => prev.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {adding ? (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da meta *</Label>
                <Input placeholder="Ex: Reserva de Emergência" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ícone</Label>
                <Select value={form.icon} onValueChange={v => setForm(p => ({ ...p, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_ICONS.map(ic => <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor alvo (R$) *</Label>
                <Input type="number" placeholder="0" value={form.targetValue} onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Já acumulado (R$)</Label>
                <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm(p => ({ ...p, currentValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!form.name.trim() || !form.targetValue}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full border-dashed py-5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Meta
        </Button>
      )}
      {goals.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Metas ajudam a dar direção ao seu dinheiro. Você pode pular e criar depois.
        </p>
      )}
    </div>
  );
};
