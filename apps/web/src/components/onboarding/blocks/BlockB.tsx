import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Building2, Car, Shield, Landmark,
  Plus, Trash2, CheckCircle2, AlertCircle, SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ConquestCard } from '../ConquestCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface BlockBProps {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveDraft: (key: string, data: any) => void;
}

const ASSET_TYPES = [
  { value: 'imovel', label: 'Imóvel', icon: Building2 },
  { value: 'veiculo', label: 'Veículo', icon: Car },
  { value: 'investimento', label: 'Investimento', icon: Landmark },
  { value: 'outro', label: 'Outro', icon: Shield },
];

const formatBRL = (v: number) => v > 0 ? `R$ ${v.toLocaleString('pt-BR')}` : 'R$ 0';

export const BlockB: React.FC<BlockBProps> = ({ step, onStepChange, onComplete, onSaveDraft }) => {
  const { user } = useAuth();
  const [milestoneData, setMilestoneData] = useState<any>(null);

  useEffect(() => {
    if (step === 4 && user?.id) {
      supabase.rpc('calculate_milestone_patrimony', { p_user_id: user.id })
        .then(({ data }) => setMilestoneData(data));
    }
  }, [step, user?.id]);

  // ─── Step 0: Intro ────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Nível 2: Patrimônio</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vamos mapear tudo que você tem e tudo que você deve para calcular seu patrimônio líquido real.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Neste nível você vai registrar:</h2>
          <div className="space-y-3">
            {[
              { icon: Building2, label: 'Bens e Imóveis', desc: 'Propriedades, veículos, bens de valor' },
              { icon: Landmark, label: 'Investimentos', desc: 'CDB, ações, fundos, tesouro, poupança' },
              { icon: AlertCircle, label: 'Dívidas', desc: 'Financiamentos, cartão, empréstimos' },
              { icon: Shield, label: 'Seguros', desc: 'Vida, saúde, auto, residencial (opcional)' },
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
        <div className="text-center text-sm text-muted-foreground mb-3">⏱️ ~5 min | 📊 Resultado: Patrimônio Líquido Real</div>
        <Button variant="hero" size="lg" className="w-full" onClick={() => onStepChange(1)}>
          Mapear meu Patrimônio <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  // ─── Step 1: Assets ───────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(0)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('assets', {}); onStepChange(2); }}>
            Próximo: Dívidas <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <AssetEditor />
      </div>
    );
  }

  // ─── Step 2: Debts ────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-3xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="hero" size="sm" onClick={() => { onSaveDraft('debts', {}); onStepChange(3); }}>
            Próximo: Seguros <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <DebtEditor />
      </div>
    );
  }

  // ─── Step 3: Insurance (skip-friendly) ────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => onStepChange(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Seguros (Opcional)</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Você pode cadastrar seus seguros agora ou pular e fazer isso depois no painel de Patrimônio.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => onStepChange(4)}>
              <SkipForward className="h-4 w-4 mr-1" /> Pular por Agora
            </Button>
            <Button variant="hero" onClick={() => onStepChange(4)}>
              Concluir Patrimônio <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 4: Conquest Card ────────────────────────────────────
  if (step === 4) {
    const md = milestoneData as any;

    const metrics = md
      ? [
          { label: 'Total de Ativos', value: formatBRL(md.total_assets) },
          { label: 'Saldo Pluggy', value: formatBRL(md.total_pluggy_balance || 0) },
          { label: 'Patrimônio Líquido', value: formatBRL(md.net_worth) },
          { label: 'Meses de Renda', value: `${md.months_of_income?.toFixed(1) ?? '?'} meses` },
        ]
      : [
          { label: 'Total de Ativos', value: 'Calculando...' },
          { label: 'Patrimônio Líquido', value: 'Calculando...' },
          { label: 'Meses de Renda', value: 'Calculando...' },
          { label: 'Meta Saudável', value: '12+ meses' },
        ];

    const insightText = md
      ? `Seu patrimônio equivale a ${md.months_of_income?.toFixed(1)} meses da sua renda. Meta saudável: ${md.healthy_target_months || 12}+ meses.`
      : 'Calculando seu patrimônio...';

    return (
      <div className="py-8">
        <ConquestCard
          level={2}
          badge="silver"
          title="Patrimônio Mapeado!"
          metrics={metrics}
          insight={insightText}
          nextLevelPreview="Nível 3 — Fluxo Real: descubra para onde vai cada real do seu dinheiro."
          onContinue={onComplete}
          continueLabel="Avançar para Nível 3: Fluxo de Caixa"
          softUpsell={{
            text: '💎 No Premium: atualização automática FIPE todo mês + alertas de desvalorização',
            ctaText: 'Conhecer Premium',
            ctaRoute: '/financeiro/planos',
          }}
        />
      </div>
    );
  }

  return null;
};

// ─── Asset Editor ───────────────────────────────────────────────────────

interface AssetForm { name: string; value: string; type: string; institution: string; }

const AssetEditor: React.FC = () => {
  const [assets, setAssets] = useState<AssetForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AssetForm>({ name: '', value: '', type: 'investimento', institution: '' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.value) return;
    setAssets(prev => [...prev, { ...form }]);
    setForm({ name: '', value: '', type: 'investimento', institution: '' });
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Landmark className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Seus Bens e Investimentos</h2>
          <p className="text-sm text-muted-foreground">Registre imóveis, veículos, investimentos e outros bens</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {assets.map((a, i) => (
          <Card key={i} className="border border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.type} {a.institution && `• ${a.institution}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">R$ {Number(a.value).toLocaleString('pt-BR')}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAssets(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {adding ? (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input placeholder="Ex: Apartamento, CDB Nubank..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Atual (R$) *</Label>
                <Input type="number" placeholder="0" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instituição</Label>
                <Input placeholder="Ex: Nubank, XP..." value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!form.name.trim() || !form.value}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full border-dashed py-5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Bem ou Investimento
        </Button>
      )}
      {assets.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Nenhum bem cadastrado ainda. Você pode pular e cadastrar depois.
        </p>
      )}
    </div>
  );
};

// ─── Debt Editor ────────────────────────────────────────────────────────

interface DebtForm { name: string; totalValue: string; remainingValue: string; monthlyPayment: string; }

const DebtEditor: React.FC = () => {
  const [debts, setDebts] = useState<DebtForm[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<DebtForm>({ name: '', totalValue: '', remainingValue: '', monthlyPayment: '' });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    setDebts(prev => [...prev, { ...form }]);
    setForm({ name: '', totalValue: '', remainingValue: '', monthlyPayment: '' });
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Suas Dívidas</h2>
          <p className="text-sm text-muted-foreground">Financiamentos, empréstimos, cartão parcelado</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {debts.map((d, i) => (
          <Card key={i} className="border border-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                {d.monthlyPayment && <p className="text-xs text-muted-foreground">Parcela: R$ {Number(d.monthlyPayment).toLocaleString('pt-BR')}/mês</p>}
              </div>
              <div className="flex items-center gap-2">
                {d.remainingValue && <span className="text-sm font-semibold text-destructive">R$ {Number(d.remainingValue).toLocaleString('pt-BR')}</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDebts(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {adding ? (
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da dívida *</Label>
              <Input placeholder="Ex: Financiamento Imobiliário, Cartão..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Total</Label>
                <Input type="number" placeholder="0" value={form.totalValue} onChange={e => setForm(p => ({ ...p, totalValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Saldo Devedor</Label>
                <Input type="number" placeholder="0" value={form.remainingValue} onChange={e => setForm(p => ({ ...p, remainingValue: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parcela/mês</Label>
                <Input type="number" placeholder="0" value={form.monthlyPayment} onChange={e => setForm(p => ({ ...p, monthlyPayment: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!form.name.trim()}>Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full border-dashed py-5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar Dívida
        </Button>
      )}
      {debts.length === 0 && !adding && (
        <div className="text-center mt-3">
          <p className="text-xs text-muted-foreground">Nenhuma dívida? Ótimo! Pode avançar.</p>
        </div>
      )}
    </div>
  );
};
