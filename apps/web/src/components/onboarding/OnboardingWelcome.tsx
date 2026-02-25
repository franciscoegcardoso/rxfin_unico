import React from 'react';
import { ArrowRight, Users, User, Target, TrendingUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinancial } from '@/contexts/FinancialContext';
import { cn } from '@/lib/utils';
import { OnboardingWhiteLogo } from './OnboardingLayout';
import { OnboardingProfileMenu } from './OnboardingProfileMenu';

export const OnboardingWelcome: React.FC = () => {
  const { config, setAccountType, setCurrentStep } = useFinancial();

  const handleContinue = () => {
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative">
      {/* Profile menu for account switching */}
      <OnboardingProfileMenu variant="dark" />
      <div className="w-full max-w-2xl animate-slide-up">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-glow mb-6 animate-pulse-glow">
            <OnboardingWhiteLogo className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Bem-vindo ao RXFin
          </h1>
          <p className="text-lg text-white/80 max-w-md mx-auto">
            Pare de operar no escuro. Tenha a visão completa da sua vida financeira e patrimonial.
          </p>
        </div>

        {/* Features - RXFin Core Values */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { icon: Eye, label: 'Visibilidade Total' },
            { icon: Target, label: 'Diagnóstico Preciso' },
            { icon: TrendingUp, label: 'Projeção Estratégica' },
          ].map((feature, index) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-white/80 text-center">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Account Type Selection */}
        <div className="bg-card rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Como você gerencia suas contas?
          </h2>
          <p className="text-muted-foreground mb-6">
            Escolha a opção que melhor descreve sua situação financeira
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setAccountType('individual')}
              className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all duration-300",
                config.accountType === 'individual'
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                config.accountType === 'individual' ? "bg-primary/20" : "bg-muted"
              )}>
                <User className={cn(
                  "h-8 w-8",
                  config.accountType === 'individual' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Individual</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencio minhas finanças sozinho(a)
                </p>
              </div>
            </button>

            <button
              onClick={() => setAccountType('shared')}
              className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all duration-300",
                config.accountType === 'shared'
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                config.accountType === 'shared' ? "bg-primary/20" : "bg-muted"
              )}>
                <Users className={cn(
                  "h-8 w-8",
                  config.accountType === 'shared' ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Compartilhado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Divido contas com outra pessoa
                </p>
              </div>
            </button>
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleContinue}
          >
            Começar Configuração
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
