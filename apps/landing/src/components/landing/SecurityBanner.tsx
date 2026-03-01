import React from 'react';
import { ShieldCheck, Lock, Server } from 'lucide-react';
import { motion } from 'framer-motion';

export const SecurityBanner: React.FC = () => (
  <motion.section
    className="relative py-4 sm:py-5 px-4 sm:px-6 lg:px-8 bg-[hsl(215,40%,13%)] dark:bg-[hsl(215,35%,8%)] border-b border-white/5 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3, duration: 0.6 }}
  >
    {/* Subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-[hsl(215,40%,13%)] via-[hsl(215,35%,16%)] to-[hsl(215,40%,13%)] dark:from-[hsl(215,35%,8%)] dark:via-[hsl(215,30%,11%)] dark:to-[hsl(215,35%,8%)]" />

    <div className="relative max-w-4xl mx-auto text-center">
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <ShieldCheck className="h-4 w-4 text-[hsl(161,60%,40%)]" />
        <p className="text-sm sm:text-base font-semibold text-white/95 tracking-wide">
          Segurança de Nível Bancário
        </p>
        <Lock className="h-3.5 w-3.5 text-white/40" />
      </div>
      <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xl mx-auto">
        Seus dados protegidos com criptografia e infraestrutura de classe mundial.
      </p>
      <div className="flex items-center justify-center gap-3 mt-2 text-[11px] sm:text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Server className="h-3 w-3" />
          Tecnologia AWS + Supabase
        </span>
        <span className="text-white/20">|</span>
        <span>Conformidade com a LGPD</span>
      </div>
    </div>
  </motion.section>
);
