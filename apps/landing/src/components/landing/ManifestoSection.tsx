import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const ManifestoSection: React.FC = () => (
  <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Document card */}
        <div className="relative bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {/* Subtle top accent line */}
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          {/* Document ribbon */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" />
              Manifesto Oficial
            </div>
            <span className="text-[10px] text-muted-foreground/50 tracking-wide">RXFin · 2025</span>
          </div>

          {/* Content */}
          <div className="px-8 sm:px-12 py-10 text-center space-y-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Planejamento financeiro não é luxo.
              <br />
              <span className="text-primary">É método.</span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Acreditamos que qualquer pessoa merece o mesmo nível de organização financeira
              que uma grande empresa. Sem atalhos, sem promessas fáceis — com estrutura, clareza e dados.
            </p>

            <div className="pt-2">
              <Link to="/manifesto">
                <Button
                  variant="outline"
                  size="sm"
                  className="group font-medium"
                >
                  Ler o manifesto completo
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Document footer */}
          <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/40 tracking-wide">
              Documento de princípios e visão
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);
