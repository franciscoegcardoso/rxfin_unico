import React from 'react';
import { Shield, Cloud, Lock, CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useInView } from '@/hooks/useInView';

const badges = [
  {
    icon: Lock,
    title: 'Criptografia SSL/TLS 256-bit',
    subtitle: 'Ponta a ponta em todas as conexões e dados em repouso',
  },
  {
    icon: Cloud,
    title: 'Infraestrutura AWS + Supabase',
    subtitle: 'Mesma nuvem dos grandes bancos, com backups automáticos',
  },
  {
    icon: Shield,
    title: 'Dados Isolados por Usuário',
    subtitle: 'Controle de acesso granular — zero compartilhamento entre contas',
  },
  {
    icon: CheckCircle,
    title: 'LGPD Compliant',
    subtitle: 'Open Finance regulamentado pelo Banco Central do Brasil',
  },
];

const chips = ['Open Finance BCB', 'Supabase', 'SSL/TLS 256-bit', 'ISO 27001 ready', 'Zero Knowledge'];

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
    className={`py-14 px-4 sm:px-6 lg:px-8 bg-white transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
  >
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="mb-5 inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="h-3 w-3 mr-1.5" />
          Infraestrutura de Classe Mundial
        </Badge>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0d2b20] tracking-tight mb-3">
          Privacidade e Segurança{' '}
          <span className="text-[#0d2b20] underline decoration-primary/40 underline-offset-4">de Ponta</span>
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
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
            className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center hover:bg-slate-100 transition-colors duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-[#0d2b20] mb-1">{item.title}</h3>
            <p className="text-xs text-slate-500 leading-snug">{item.subtitle}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-8 pt-6 border-t border-slate-100">
        {chips.map((chip) => (
          <span key={chip} className="bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200">
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-5 text-center sm:text-left max-w-xl mx-auto">
        <img
          src="/assets/francisco-cardoso-BucHHWLR.png"
          alt="Francisco Cardoso"
          className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-slate-200 grayscale-[30%]"
        />
        <div>
          <p className="font-semibold text-[#0d2b20]">Francisco Cardoso</p>
          <p className="text-sm text-slate-500 mt-0.5">Engenheiro de produção · Stone · Kraft Heinz</p>
          <p className="text-sm text-slate-400 italic mt-1">
            &quot;A mesma lógica corporativa — aplicada à sua vida financeira.&quot;
          </p>
        </div>
      </div>
    </div>
  </section>
  );
};
