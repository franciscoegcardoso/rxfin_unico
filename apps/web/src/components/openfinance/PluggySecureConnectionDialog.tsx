import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowRight, CheckCircle2, Building2, ExternalLink, ShieldCheck, UserCheck, Ban, Send, Monitor, XCircle } from 'lucide-react';
import rxfinIcon from '@/assets/logo-rxfin-icon.png';

interface PluggySecureConnectionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const bacenItems = [
  { icon: UserCheck, text: 'Você decide se quer compartilhar seus dados.' },
  { icon: Send, text: 'Você escolhe qual banco vai receber seus dados.' },
  { icon: ShieldCheck, text: 'Os dados são enviados apenas para o banco que você autorizou.' },
  { icon: Ban, text: 'Os dados não passam por nenhum outro ambiente, nem pelo BC.' },
  { icon: Building2, text: 'O processo acontece entre dois bancos por vez: o que envia e o que recebe.' },
  { icon: Monitor, text: 'Tudo é feito pelo app ou pelo site do banco.' },
  { icon: XCircle, text: 'Você pode cancelar a autorização quando quiser.' },
];

export const PluggySecureConnectionDialog: React.FC<PluggySecureConnectionDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-lg">Conexão Segura via Open Finance</DialogTitle>
          <DialogDescription className="text-center">
            Seus dados bancários são sincronizados com segurança
          </DialogDescription>
        </DialogHeader>

        {/* Connection flow visual */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
              <img src={rxfinIcon} alt="RXFin" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-xs font-medium text-foreground">RXFin</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <Lock className="h-3 w-3 text-green-500" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center">
              <svg width="28" height="16" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 5C16.2 5 5 16.2 5 30s11.2 25 25 25c8.3 0 15.6-4 20.2-10.2L60 30l-9.8-14.8C45.6 9 38.3 5 30 5zm60 0c-8.3 0-15.6 4-20.2 10.2L60 30l9.8 14.8C74.4 51 81.7 55 90 55c13.8 0 25-11.2 25-25S103.8 5 90 5z" fill="#8B5CF6" />
                <path d="M30 15c-8.3 0-15 6.7-15 15s6.7 15 15 15c4.5 0 8.5-2 11.3-5.1L50 30l-8.7-9.9C38.5 17 34.5 15 30 15zm60 0c-4.5 0-8.5 2-11.3 5.1L70 30l8.7 9.9C81.5 43 85.5 45 90 45c8.3 0 15-6.7 15-15s-6.7-15-15-15z" fill="#7C3AED" />
              </svg>
            </div>
            <span className="text-xs font-medium text-foreground">Pluggy</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-1">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <Lock className="h-3 w-3 text-green-500" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-xl bg-muted border-2 border-border flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">Seu Banco</span>
          </div>
        </div>

        {/* BACEN security section */}
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">
              Você tem controle dos seus dados
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            No Open Finance, o processo é transparente, seguro e realizado exclusivamente pelo app ou site do seu banco.
          </p>

          <div className="space-y-2.5 pt-1">
            {bacenItems.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-xs text-foreground/80 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-green-500/10">
            <a
              href="https://www.bcb.gov.br/estabilidadefinanceira/seguranca-open-finance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-400 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Fonte: Banco Central do Brasil — Segurança no Open Finance
            </a>
          </div>
        </div>

        {/* Additional trust signals */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          {['Criptografia ponta a ponta', 'Regulamentado pelo BACEN', 'Sem acesso a senhas'].map((t, i) => (
            <div key={i} className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{t}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={onConfirm} disabled={isLoading} className="w-full gap-2">
            <Lock className="h-4 w-4" />
            Continuar com Conexão Segura
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
