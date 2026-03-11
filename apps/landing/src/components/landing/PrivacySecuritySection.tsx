import React from 'react';
import { Shield, Cloud, Lock, CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useInView } from '@/hooks/useInView';

const badges = [
  {
    icon: Shield,
    title: 'Criptografia SSL/TLS',
    subtitle: 'Ponta a ponta em todas as conexões',
  },
  {
    icon: Cloud,
    title: 'Infraestrutura AWS',
    subtitle: 'Mesma nuvem dos grandes bancos',
  },
  {
    icon: Lock,
    title: 'Dados Isolados',
    subtitle: 'Cada usuário, ambiente separado',
  },
  {
    icon: CheckCircle,
    title: 'LGPD Compliant',
    subtitle: 'Privacidade como premissa',
  },
];

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const PrivacySecuritySection: React.FC = () => {
  const [sectionRef, isInView] = useInView(0.08);
  return (
  <section
    id="seguranca"
    ref={sectionRef}
    className={`py-14 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)] transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
  >
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="mb-5 bg-white/20 text-white border-white/30 hover:bg-white/25 text-xs px-3 py-1 font-medium">
          <Sparkles className="h-3 w-3 mr-1.5" />
          Infraestrutura de Classe Mundial
        </Badge>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
          Privacidade e Segurança{' '}
          <span className="text-white underline decoration-white/40 underline-offset-4">de Ponta</span>
        </h2>
        <p className="text-white/75 max-w-2xl mx-auto text-sm sm:text-base">
          Seus dados financeiros merecem o mais alto nível de proteção. Conheça a infraestrutura por trás do RXFin.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((item, i) => (
          <motion.div
            key={item.title}
            custom={i}
            variants={itemVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-xl border border-white/20 bg-white/10 p-5 text-center hover:bg-white/15 transition-colors duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-3">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-xs text-white/70 leading-snug">{item.subtitle}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
  );
};
