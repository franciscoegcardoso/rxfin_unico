import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '+300',  label: 'Bancos e fintechs\nconectados' },
  { value: '9',     label: 'Simuladores\ndisponíveis' },
  { value: '1,8M+', label: 'Registros FIPE\nindexados' },
  { value: '100%',  label: 'Gratuito\npara começar' },
  { value: 'IA',    label: 'Insights sobre\nsua vida financeira' },
];

export const SocialProofBar: React.FC = () => (
  <div className="border-y border-border bg-background py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
    <div className="max-w-5xl mx-auto">

      {/* Desktop e tablet: linha horizontal com separadores */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {stats.map((stat, i) => (
          <React.Fragment key={stat.value}>
            <motion.div
              className="flex flex-col items-center gap-1 text-center flex-1"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <span className="text-3xl lg:text-4xl font-bold text-primary tracking-tight leading-none">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground leading-snug whitespace-pre-line mt-1">
                {stat.label}
              </span>
            </motion.div>
            {i < stats.length - 1 && (
              <div className="w-px h-10 bg-border shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile: grid 2 colunas + último centrado */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
          {stats.slice(0, 4).map((stat, i) => (
            <motion.div
              key={stat.value}
              className="flex flex-col items-center gap-1 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <span className="text-3xl font-bold text-primary tracking-tight leading-none">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground leading-snug whitespace-pre-line mt-0.5">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
        {/* Quinto item centralizado */}
        <motion.div
          className="flex flex-col items-center gap-1 text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.32, duration: 0.4 }}
        >
          <span className="text-3xl font-bold text-primary tracking-tight leading-none">
            {stats[4].value}
          </span>
          <span className="text-xs text-muted-foreground leading-snug whitespace-pre-line mt-0.5">
            {stats[4].label}
          </span>
        </motion.div>
      </div>

    </div>
  </div>
);
