import React from 'react';

const stats = [
  { value: '+300',  label: 'Bancos e fintechs\nconectados' },
  { value: '9',     label: 'Simuladores\ndisponíveis' },
  { value: '1,8M+', label: 'Registros FIPE\nindexados' },
  { value: '100%',  label: 'Gratuito\npara começar' },
];

export const SocialProofBar: React.FC = () => (
  <div className="border-y border-border bg-background py-5 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto flex items-center justify-center gap-8 sm:gap-14 flex-wrap">
      {stats.map((stat, i) => (
        <React.Fragment key={stat.value}>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-2xl font-bold text-primary tracking-tight leading-none">
              {stat.value}
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug whitespace-pre-line">
              {stat.label}
            </span>
          </div>
          {i < stats.length - 1 && (
            <div className="hidden sm:block w-px h-8 bg-border" />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);
