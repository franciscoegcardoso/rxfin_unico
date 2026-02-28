import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Mail, Download, Copy, ShieldCheck, Lock } from 'lucide-react';
import { toPng } from 'html-to-image';
import logoWhite from '@/assets/logo-rxfin-white.png';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralLink: string;
  userName: string;
}

const DEFAULT_MESSAGE = `Comecei a usar o RXfin para organizar minhas finanças e achei muito completo.

Ele integra automaticamente com contas bancárias, conecta com o Imposto de Renda e ainda tem simuladores gratuitos para decisões como troca de carro e financiamento.

Vale testar por 7 dias. Se não fizer sentido, é só cancelar.`;

/* ── Share Image ── */
const ShareImage: React.FC<{ userName: string; referralLink: string; imageRef: React.RefObject<HTMLDivElement> }> = ({ userName, referralLink, imageRef }) => (
  <div
    ref={imageRef}
    className="w-full rounded-xl overflow-hidden relative flex flex-col select-none"
    style={{
      background: 'linear-gradient(160deg, hsl(152 50% 14%), hsl(152 45% 22%), hsl(152 40% 18%))',
      padding: '32px',
    }}
  >
    {/* Logo */}
    <img src={logoWhite} alt="RXFin" className="h-7 mb-5 object-contain self-start" />

    {/* Headline */}
    <h2 className="text-white text-[18px] font-bold leading-tight mb-2">
      Planejamento financeiro{'\n'}completo e automático
    </h2>
    <p className="text-white/70 text-[12px] leading-snug mb-5">
      Conecte suas contas, organize seus gastos{'\n'}e projete seu futuro.
    </p>

    {/* Features */}
    <div className="space-y-2 mb-5">
      {[
        'Integração automática com contas bancárias',
        'Conexão com declaração de IR',
        'Categorização de gastos com IA',
        'Controles financeiros profissionais',
        'Projeção de curto e longo prazo',
      ].map((f) => (
        <div key={f} className="flex items-start gap-2">
          <span className="text-emerald-400 text-[11px] mt-px shrink-0">●</span>
          <span className="text-white/90 text-[12px] leading-tight">{f}</span>
        </div>
      ))}
    </div>

    {/* Security */}
    <div className="flex items-center gap-4 mb-5">
      <div className="flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-emerald-400/80" />
        <span className="text-white/60 text-[10px]">Open Finance</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
        <span className="text-white/60 text-[10px]">Criptografia bancária</span>
      </div>
    </div>

    {/* Simulators */}
    <div className="bg-white/10 rounded-lg px-4 py-3 mb-5">
      <p className="text-white/50 text-[10px] font-medium mb-1">Simuladores gratuitos</p>
      <p className="text-white/80 text-[11px] leading-snug">
        Troca de carro · Financiamento vs consórcio · Desconto justo
      </p>
    </div>

    {/* CTA */}
    <div
      className="rounded-lg py-3 text-center mb-5"
      style={{ background: 'linear-gradient(135deg, hsl(152 55% 45%), hsl(152 60% 38%))' }}
    >
      <span className="text-white text-[13px] font-bold tracking-wide">
        Começar gratuitamente
      </span>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between">
      <p className="text-white/50 text-[10px]">
        Indicado por: <span className="text-white/70 font-medium">{userName || 'um amigo'}</span>
      </p>
      <span className="text-white/30 text-[9px]">7 dias grátis</span>
    </div>
  </div>
);

const ShareModal: React.FC<ShareModalProps> = ({ open, onOpenChange, referralLink, userName }) => {
  const [message, setMessage] = useState(`${DEFAULT_MESSAGE}\n\n${referralLink}`);
  const imageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) setMessage(`${DEFAULT_MESSAGE}\n\n${referralLink}`);
  }, [open, referralLink]);

  const downloadImage = useCallback(async () => {
    if (!imageRef.current) return;
    try {
      const dataUrl = await toPng(imageRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'convite-rxfin.png';
      link.href = dataUrl;
      link.click();
      toast({ title: 'Imagem baixada!' });
    } catch {
      toast({ title: 'Erro ao gerar imagem', variant: 'destructive' });
    }
  }, [toast]);

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    toast({ title: 'Mensagem copiada!' });
  };

  const shareWhatsApp = async () => {
    // Download image first, then open WhatsApp with pre-filled text
    if (imageRef.current) {
      try {
        const dataUrl = await toPng(imageRef.current, { pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = 'convite-rxfin.png';
        link.href = dataUrl;
        link.click();
      } catch {
        // Image download failed silently — continue with text-only
      }
    }
    toast({
      title: 'Imagem salva!',
      description: 'O WhatsApp abrirá com a mensagem pronta. Anexe a imagem baixada à conversa.',
      duration: 5000,
    });
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Conheça o RXFin — planejamento financeiro completo');
    const body = encodeURIComponent(message);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Compartilhar convite</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image preview */}
          <ShareImage userName={userName} referralLink={referralLink} imageRef={imageRef as React.RefObject<HTMLDivElement>} />

          {/* Referral link display */}
          <div className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Seu link de indicação</p>
            <p className="text-xs font-mono text-foreground break-all select-all">{referralLink}</p>
          </div>

          {/* Editable message */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Mensagem (editável)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="text-sm resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareWhatsApp} className="gap-2 bg-[hsl(145,63%,35%)] hover:bg-[hsl(145,63%,28%)] text-white">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button onClick={shareEmail} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button onClick={downloadImage} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Baixar imagem
            </Button>
            <Button onClick={copyMessage} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar texto
            </Button>
          </div>

          {/* Trust note */}
          <p className="text-[10px] text-muted-foreground text-center">
            Seu link já inclui sua identificação de indicação.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
