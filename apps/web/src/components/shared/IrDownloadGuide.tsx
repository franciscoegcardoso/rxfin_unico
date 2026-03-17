import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronRight, Monitor, FileText, Download, CheckCircle2 } from 'lucide-react';

const PORTAL_URL = 'https://mir.receita.fazenda.gov.br/portalmir/listar-documentos/';

const steps = [
  {
    number: 1,
    title: 'Acesse o Portal Meu Imposto de Renda',
    description: 'Entre no site da Receita Federal usando sua conta Gov.br',
    icon: Monitor,
    detail: 'Faça login com sua conta Gov.br (nível prata ou ouro) para acessar seus documentos.',
  },
  {
    number: 2,
    title: 'Selecione o Ano de Exercício',
    description: 'Escolha o ano da declaração que deseja baixar',
    icon: FileText,
    detail: 'No campo "Exercício", selecione o ano correspondente à declaração desejada (ex: 2025 para declaração de 2024).',
  },
  {
    number: 3,
    title: 'Baixe a "Cópia da Declaração"',
    description: 'Clique no ícone de download ao lado do documento',
    icon: Download,
    detail: 'Localize o documento "Cópia da Declaração" na lista e clique no ícone de PDF para baixar.',
  },
  {
    number: 4,
    title: 'Importe no Sistema',
    description: 'Use o arquivo PDF baixado para importar aqui',
    icon: CheckCircle2,
    detail: 'Com o PDF em mãos, clique em "Importar Declaração" e selecione o arquivo baixado.',
  },
];

/**
 * Conteúdo reutilizável do passo a passo "Como baixar sua declaração do IR".
 * Usado no modal de Meu IR e no step de IR do onboarding.
 */
export const IrDownloadGuideContent: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
        <div
          className="absolute left-6 top-8 w-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ height: `${(activeStep / (steps.length - 1)) * 100}%`, maxHeight: 'calc(100% - 64px)' }}
        />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;

            return (
              <div
                key={step.number}
                className={`relative flex gap-4 cursor-pointer transition-all duration-300 ${
                  isActive ? 'scale-[1.02]' : 'opacity-70 hover:opacity-100'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground scale-110'
                      : isCompleted
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-muted-foreground/30 bg-background text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                <div className={`flex-1 pb-4 transition-all duration-300 ${isActive ? 'translate-x-1' : ''}`}>
                  <span className="text-xs font-medium text-muted-foreground">Passo {step.number}</span>
                  <h4 className={`font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isActive ? 'max-h-24 mt-2 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
        >
          Anterior
        </Button>
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeStep ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
        >
          Próximo
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Acesse o Portal Meu Imposto de Renda</p>
            <p className="text-xs text-muted-foreground mt-1">
              mir.receita.fazenda.gov.br/portalmir/listar-documentos
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => window.open(PORTAL_URL, '_blank')}
          >
            Acessar Portal
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { PORTAL_URL };
