import React from 'react';
import { Separator } from '@/components/ui/separator';

export const MethodologyFooter: React.FC = () => (
  <section className="pt-4">
    <Separator className="mb-6" />
    <div className="max-w-2xl">
      <h3 className="text-sm font-semibold text-foreground mb-2">Sobre a metodologia</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        O RXFin foi estruturado por Francisco Cardoso, engenheiro de produção com experiência em
        planejamento comercial, pricing e gestão financeira em empresas como Stone e Kraft Heinz.
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
        As ferramentas seguem princípios de previsibilidade financeira, análise de viabilidade e
        controle de margem utilizados em ambientes corporativos.
      </p>
    </div>
  </section>
);
