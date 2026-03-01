import React from 'react';
import { Shield, Lock, Cloud, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const bullets = [
  { icon: Lock, label: 'Criptografia ponta a ponta', detail: 'SSL/TLS em todas as conexões' },
  { icon: Cloud, label: 'Infraestrutura AWS', detail: 'Mesma tecnologia dos grandes bancos' },
  { icon: ShieldCheck, label: 'Dados isolados por usuário', detail: 'Controle de acesso + backups automáticos' },
  { icon: Shield, label: 'Conformidade LGPD', detail: 'Privacidade como premissa' },
];

export const SecurityBullets: React.FC = () => (
  <motion.div
    className="mt-14"
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
  >
    <h3 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
      Privacidade e segurança por padrão
    </h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {bullets.map((b, i) => (
        <div
          key={i}
          className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
              <b.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium leading-tight text-foreground">{b.label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug pl-[42px]">{b.detail}</p>
        </div>
      ))}
    </div>
  </motion.div>
);
