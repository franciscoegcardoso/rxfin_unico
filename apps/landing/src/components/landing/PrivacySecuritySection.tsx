import React from 'react';
import { Lock, Cloud, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const blocks = [
  {
    icon: Lock,
    title: 'Criptografia de ponta a ponta',
    text: 'Todas as informações trafegam por conexões seguras (SSL/TLS), garantindo que seus dados financeiros estejam sempre criptografados — do momento em que você digita até o armazenamento final.',
  },
  {
    icon: Cloud,
    title: 'Infraestrutura usada por grandes bancos',
    text: 'Seus dados são armazenados na AWS (Amazon Web Services), a mesma infraestrutura utilizada por instituições financeiras globais. Escalabilidade, estabilidade e segurança no mais alto padrão.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados isolados e protegidos',
    text: 'Com a tecnologia Supabase, cada usuário possui dados isolados, protegidos por múltiplas camadas de segurança, controle de acesso e backups automáticos.',
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const PrivacySecuritySection: React.FC = () => (
  <section id="seguranca" className="py-14 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)]">
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-14"
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

      <div className="grid md:grid-cols-3 gap-6">
        {blocks.map((block, i) => (
          <motion.div
            key={block.title}
            className="relative rounded-2xl border border-[hsl(161,40%,70%)]/50 bg-[hsl(161,40%,88%)] p-7 hover:border-white/40 hover:shadow-lg transition-all duration-300 group"
            custom={i}
            variants={cardVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 rounded-xl bg-[hsl(161,79%,25%)]/20 flex items-center justify-center mb-5 group-hover:bg-[hsl(161,79%,25%)]/30 transition-colors">
              <block.icon className="h-6 w-6 text-[hsl(161,79%,25%)]" />
            </div>
            <h3 className="text-base font-semibold text-[hsl(161,40%,12%)] mb-3 tracking-tight">
              {block.title}
            </h3>
            <p className="text-sm text-[hsl(161,30%,25%)] leading-relaxed">
              {block.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
