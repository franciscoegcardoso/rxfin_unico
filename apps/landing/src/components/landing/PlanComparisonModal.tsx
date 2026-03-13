import React, { useEffect } from 'react';
import { X, Check, Minus, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';

const APP_URL = 'https://app.rxfin.com.br';

type FeatureRow = {
  category?: string;
  label: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
};

const rows: FeatureRow[] = [
  { category: 'Funcionalidades gerais', label: '', free: '', starter: '', pro: '' },
  { label: 'Módulos inclusos', free: '8 módulos', starter: '11 módulos', pro: 'Todos' },
  { label: 'Simuladores financeiros', free: true, starter: true, pro: true },
  { label: 'Dashboard multibancos', free: false, starter: true, pro: true },
  { label: 'Exportação de dados', free: false, starter: true, pro: true },

  { category: 'Open Finance', label: '', free: '', starter: '', pro: '' },
  { label: 'Bancos conectados', free: false, starter: '+300 bancos', pro: '+300 bancos' },
  { label: 'Sincronização automática', free: false, starter: 'A cada 24h', pro: 'A cada 24h' },
  { label: 'Categorização com IA', free: false, starter: true, pro: true },

  { category: 'Planejamento', label: '', free: '', starter: '', pro: '' },
  { label: 'Orçamento mensal', free: true, starter: true, pro: true },
  { label: 'Planejamento anual', free: false, starter: true, pro: true },
  { label: 'Metas financeiras', free: false, starter: true, pro: true },
  { label: 'Projeção de patrimônio 30 anos', free: false, starter: false, pro: true },

  { category: 'Imposto de Renda', label: '', free: '', starter: '', pro: '' },
  { label: 'Organização fiscal anual', free: false, starter: true, pro: true },
  { label: 'Cálculo de deduções', free: false, starter: false, pro: true },
  { label: 'Comprovantes categorizados', free: false, starter: false, pro: true },

  { category: 'IA — Cibélia', label: '', free: '', starter: '', pro: '' },
  { label: 'Insights financeiros básicos', free: true, starter: true, pro: true },
  { label: 'Recomendações personalizadas', free: false, starter: '10/mês', pro: 'Ilimitado' },
  { label: 'Fiscal Organizer IA', free: false, starter: false, pro: true },

  { category: 'Suporte', label: '', free: '', starter: '', pro: '' },
  { label: 'Suporte por e-mail', free: true, starter: true, pro: true },
  { label: 'Suporte prioritário', free: false, starter: false, pro: true },
];

const plans = [
  { key: 'free', name: 'Free', price: 'R$ 0', cta: 'Criar conta', href: `${APP_URL}/signup` },
  { key: 'starter', name: 'RX Starter', price: 'R$ 14,90', cta: '7 dias grátis', href: `${APP_URL}/signup` },
  { key: 'pro', name: 'RX Pro', price: 'R$ 19,90', cta: '7 dias grátis', href: `${APP_URL}/signup`, featured: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-foreground/80 text-center block">{value}</span>;
}

interface PlanComparisonModalProps {
  open: boolean;
  onClose: () => void;
}

export const PlanComparisonModal: React.FC<PlanComparisonModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Comparar planos</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div />
            {plans.map((p) => (
              <div
                key={p.key}
                className={`text-center rounded-xl p-3 ${p.featured ? 'bg-primary/8 border border-primary/20' : 'bg-muted/40'}`}
              >
                <p className="text-xs text-muted-foreground mb-0.5">{p.name}</p>
                <p className="text-base font-black text-foreground leading-none">
                  {p.price}
                  {p.price !== 'R$ 0' && (
                    <span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, i) => {
                if (row.category) {
                  return (
                    <tr key={i}>
                      <td colSpan={4} className="pt-5 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {row.category}
                        </span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 text-xs text-foreground/70 w-[40%]">{row.label}</td>
                    <td className="py-2.5 text-center w-[20%]">
                      <Cell value={row.free} />
                    </td>
                    <td className="py-2.5 text-center w-[20%]">
                      <Cell value={row.starter} />
                    </td>
                    <td className="py-2.5 text-center w-[20%]">
                      <Cell value={row.pro} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/20 rounded-b-2xl">
          <div className="grid grid-cols-4 gap-3">
            <div />
            {plans.map((p) => (
              <a
                key={p.key}
                href={p.href}
                onClick={() => {
                  trackCTAClick(`modal_comparar_${p.key}`, p.href);
                  onClose();
                }}
              >
                <Button
                  size="sm"
                  className={`w-full text-xs ${
                    p.featured
                      ? 'gradient-primary text-white'
                      : 'border border-border bg-transparent text-foreground/70 hover:bg-muted/50'
                  }`}
                  variant={p.featured ? 'default' : 'outline'}
                >
                  {p.featured && <Zap className="w-3 h-3 mr-1" />}
                  {p.cta}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </a>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            Preços no plano anual. Cancele quando quiser. 7 dias de teste grátis nos planos pagos.
          </p>
        </div>
      </div>
    </div>
  );
};
