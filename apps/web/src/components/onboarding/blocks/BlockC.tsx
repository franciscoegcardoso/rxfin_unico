import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Target, TrendingUp, Wallet,
  Plus, Trash2, FileText, Upload, CheckCircle2, Calendar, Loader2, Sparkles,
  Home, Car, PiggyBank, CreditCard, Shield, Building2, Banknote, BarChart3,
  Zap, HelpCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IrDownloadGuideContent } from '@/components/shared/IrDownloadGuide';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getFileType = (file: File): 'pdf' | 'xml' | null => {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  if (name.endsWith('.xml') || name.endsWith('.dec') || mime.includes('xml')) return 'xml';
  return null;
};

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

export const BlockC: React.FC<BlockCProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { user } = useAuth();
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [irImports, setIrImports] = useState<Array<{
    id: string;
    ano_exercicio: number;
    ano_calendario: number;
    bens_count: number;
    rendimentos_count: number;
    source_type: string;
    file_name: string | null;
    imported_at: string;
  }>>([]);
  const [irLoaded, setIrLoaded] = useState(false);
  const [irUploading, setIrUploading] = useState(false);
  const [irUploadError, setIrUploadError] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [patrimonioData, setPatrimonioData] = useState<any>(null);
  const [patrimonioLoaded, setPatrimonioLoaded] = useState(false);
  const [irGuideOpen, setIrGuideOpen] = useState(false);

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

  const loadIrImports = async () => {
    if (irLoaded || !user?.id) return;
    try {
      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
      const allImports: typeof irImports = [];
      for (const year of years) {
        const { data } = await supabase.rpc('get_ir_dashboard', {
          p_user_id: user.id,
          p_year: year,
        });
        if (data?.imports?.length > 0) {
          allImports.push(...data.imports);
        }
      }
      setIrImports(allImports);
    } catch (err) {
      console.warn('[BlockC] loadIrImports erro:', err);
    } finally {
      setIrLoaded(true);
    }
  };

  const handleIRUpload = async (file: File, anoExercicio: number) => {
    if (!user?.id || !file) return;
    const fileType = getFileType(file);
    if (!fileType) {
      toast.error('Formato inválido. Use PDF, XML ou .DEC');
      return;
    }
    setSelectedYear(anoExercicio);
    setIrUploading(true);
    setIrUploadError('');
    try {
      const fileContent = await readFileAsBase64(file);
      const { data, error } = await supabase.functions.invoke('process-ir-import', {
        body: { fileContent, fileType, fileName: file.name },
      });
      if (error) throw new Error(error.message);
      const payload = data as { success?: boolean; error?: string; data?: { anoExercicio?: number } } | null;
      if (!payload?.success) throw new Error(payload?.error ?? 'Erro desconhecido');
      const ano = payload.data?.anoExercicio ?? anoExercicio;
      toast.success(`Declaração ${ano} importada com sucesso!`);
      setIrLoaded(false);
      await loadIrImports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar';
      toast.error(msg);
      setIrUploadError(msg);
      console.error('[BlockC] IR import error:', err);
    } finally {
      setIrUploading(false);
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
      loadIrImports();
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
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Importe pelo menos os últimos 2 anos
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Com 2 ou mais declarações, o RXFin consegue reconstruir sua evolução patrimonial,
                calcular sua taxa de poupança histórica e detectar inconsistências. Com apenas 1 ano,
                a análise fica limitada.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2 mb-5">
          {years.map(year => {
            const imported = importedYears.has(year);
            const imp = irImports.find(i => i.ano_exercicio === year);
            return (
              <div
                key={year}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                  imported ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
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
                      {imp.file_name && ` · ${imp.file_name}`}
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
                    className={cn(
                      'shrink-0 cursor-pointer',
                      irUploading && selectedYear === year && 'pointer-events-none opacity-80'
                    )}
                  >
                    <input
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
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIrGuideOpen(true)}
        >
          <HelpCircle className="h-4 w-4" />
          Como obter o PDF?
        </Button>
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

    const assets: any[] = patrimonioData?.assets ?? [];
    const vehicles: any[] = patrimonioData?.vehicles ?? [];
    const financiamentos: any[] = patrimonioData?.financiamentos ?? [];
    const consorcios: any[] = patrimonioData?.consorcios ?? [];
    const seguros: any[] = patrimonioData?.seguros ?? [];
    const netWorth = patrimonioData?.net_worth;

    const totalAtivos = (netWorth?.total_assets ?? 0) + (netWorth?.total_vehicles ?? 0);
    const totalPassivos = netWorth?.total_debt ?? 0;
    const patrimonioLiquido = totalAtivos - totalPassivos;

    const hasAnyData = assets.length > 0 || vehicles.length > 0 ||
      financiamentos.length > 0 || consorcios.length > 0;

    const formatBRLShort = (v: number) => {
      if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `R$ ${(v/1_000).toFixed(0)}k`;
      return `R$ ${v.toLocaleString('pt-BR')}`;
    };

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

          {assets.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Bens ({assets.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {assets.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{a.name}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">
                      {formatBRLShort(a.current_value ?? 0)}
                    </p>
                  </div>
                ))}
                {assets.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{assets.length - 3} outros bens
                  </p>
                )}
              </div>
            </div>
          )}

          {vehicles.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Veículos ({vehicles.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {vehicles.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{v.display_name}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">
                      {formatBRLShort(v.fipe_value ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {financiamentos.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-foreground">
                  Financiamentos ({financiamentos.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {financiamentos.slice(0, 3).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{f.nome}</p>
                    <p className="text-xs font-medium text-destructive ml-2 shrink-0">
                      -{formatBRLShort(f.saldo_devedor ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {consorcios.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PiggyBank className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Consórcios ({consorcios.length})
                </p>
              </div>
              <div className="space-y-1.5">
                {consorcios.slice(0, 2).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{c.nome}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">
                      {formatBRLShort(c.valor_carta ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seguros.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  Seguros ({seguros.filter((s: any) => s.is_active).length} ativos)
                </p>
              </div>
              <div className="space-y-1.5">
                {seguros.filter((s: any) => s.is_active).slice(0, 2).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1">{s.nome}</p>
                    <p className="text-xs font-medium text-foreground ml-2 shrink-0">
                      {formatBRLShort(s.premio_mensal ?? 0)}/mês
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAnyData && (
            <div className="bg-muted/30 rounded-xl p-6 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Conecte seus bancos ou importe o IR para identificar
                seus bens automaticamente.
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
