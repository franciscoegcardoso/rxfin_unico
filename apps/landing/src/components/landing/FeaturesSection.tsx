import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SecurityBullets } from './SecurityBullets';
import { trackMicroCtaClick } from '@/lib/tracking';

export type FeatureItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
};

interface FeaturesSectionProps {
  pillars: FeatureItem[];
  complementary: FeatureItem[];
  onFeatureClick: (featureId: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  pillars,
  complementary,
  onFeatureClick,
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast.error('Digite um email válido');
      return;
    }
    setLoading(true);
    try {
      await (supabase.from('leads') as any).upsert(
        { email: trimmed, phone: phone.trim() || null, source: 'waitlist_final', user_agent: navigator.userAgent },
        { onConflict: 'email' }
      );
      trackWaitlistClick('final');
      trackEvent('lead_captured', { source: 'waitlist_final' });
      toast.success('Você está na lista! 🎉');
      setEmail('');
      setPhone('');
      setPhoneValid(false);
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicroCta = (featureId: string) => {
    trackMicroCtaClick(featureId);
    onFeatureClick(featureId);
  };

  const renderPillarCard = (item: FeatureItem) => (
    <Card
      className="h-full cursor-pointer border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group"
      onClick={() => handleMicroCta(item.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-300">
            <item.icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
            <Star className="h-2.5 w-2.5 mr-0.5" />
            Pilar
          </Badge>
        </div>
        <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors leading-snug">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{item.description}</p>
        <div className="flex items-center text-xs font-semibold text-primary opacity-75 group-hover:opacity-100 transition-opacity">
          {item.cta}
          <ArrowRight className="h-3 w-3 ml-1.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );

  const renderComplementaryCard = (item: FeatureItem) => (
    <Card
      className="h-full cursor-pointer border-border/50 hover:border-primary/25 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
      onClick={() => handleMicroCta(item.id)}
    >
      <CardContent className="p-5">
        <div className="mb-3">
          <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors leading-snug">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
        <div className="flex items-center text-xs font-medium text-primary/70 group-hover:text-primary transition-colors">
          {item.cta}
          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        {/* Bloco A — Header de Conversão */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge className="mb-5 bg-primary/15 text-primary border-primary/40 hover:bg-primary/20 text-xs px-3 py-1 font-medium">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Beta previsto: Março/26 • Vagas limitadas para onboarding
          </Badge>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 max-w-3xl mx-auto leading-tight tracking-tight">
            Pare de adivinhar sua vida financeira.{' '}
            <span className="text-primary">Veja o futuro do seu dinheiro</span> e execute um plano.
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base mb-8 leading-relaxed">
            Conecte seus bancos e cartões — o RXFin organiza tudo automaticamente e te diz exatamente o que fazer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="https://app.rxfin.com.br/signup">
              <Button
                size="lg"
                className="gradient-primary text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 group px-8 h-12 text-base font-semibold"
              >
                Entrar na lista de acesso antecipado
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="lg"
              className="text-muted-foreground hover:text-foreground h-12 underline-offset-4 hover:underline"
              onClick={() => onFeatureClick('app-screens')}
            >
              Ver telas do app
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground/70">
            Sem spam • Sem cartão • Você sai quando quiser
          </p>
        </motion.div>

        {/* Bloco B — 3 Pilares */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {pillars.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              {renderPillarCard(p)}
            </motion.div>
          ))}
        </div>

        {/* Separador visual */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Recursos Complementares</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Bloco C — 3 Complementares */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {complementary.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              {renderComplementaryCard(c)}
            </motion.div>
          ))}
        </div>

        {/* Bloco D — CTA final */}
        <SecurityBullets />

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <a href="https://app.rxfin.com.br/signup">
            <Button
              size="lg"
              className="gradient-primary text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 group px-8 h-12 text-base font-semibold"
            >
              Entrar na lista de acesso antecipado
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            Sem spam • Sem cartão • Você sai quando quiser
          </p>
        </motion.div>

      </div>
    </section>
  );
};
