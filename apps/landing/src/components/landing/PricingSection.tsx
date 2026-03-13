import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanComparisonModal } from "./PlanComparisonModal";

const plans = [
  {
    name: "Free",
    subtitle: "Plano gratuito com funcionalidades básicas",
    price: null,
    priceLabel: "Grátis",
    cta: "Criar conta grátis",
    ctaHref: "https://app.rxfin.com.br/cadastro",
    featured: false,
    badge: null,
    features: [
      "8 módulos inclusos",
      "Simuladores gratuitos",
      "Dashboard básico",
      "Suporte por e-mail",
    ],
  },
  {
    name: "RX Starter",
    subtitle: "Plano inicial com mais recursos",
    price: "14,90",
    period: "/mês",
    billing: "12x de R$ 14,90 — cobrado R$ 178,80/ano",
    saving: "Economize 25%",
    cta: "Começar 7 dias grátis",
    ctaHref: "https://app.rxfin.com.br/cadastro",
    featured: false,
    badge: "Oferta de lançamento",
    features: [
      "11 módulos inclusos",
      "Open Finance — bancos conectados",
      "Categorização automática com IA",
      "Planejamento anual",
      "Relatório de IR",
      "7 dias de teste grátis",
    ],
  },
  {
    name: "RX Pro",
    subtitle: "Plano completo com todas as funcionalidades",
    price: "19,90",
    period: "/mês",
    billing: "12x de R$ 19,90 — cobrado R$ 238,80/ano",
    saving: "Economize 20%",
    cta: "Começar 7 dias grátis",
    ctaHref: "https://app.rxfin.com.br/cadastro",
    featured: true,
    badge: "Oferta de lançamento",
    features: [
      "Acesso completo a tudo",
      "Cibélia IA ilimitada",
      "Patrimônio e investimentos",
      "Simulação de aposentadoria",
      "Suporte prioritário",
      "7 dias de teste grátis",
    ],
  },
];

export function PricingSection() {
  const [compareOpen, setCompareOpen] = useState(false);
  return (
    <section className="py-20 px-4 bg-gray-50" id="precos">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-2 block">
            Planos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Escolha o plano ideal para você
          </h2>
          <p className="text-muted-foreground text-lg">
            Comece grátis e faça upgrade quando precisar.{" "}
            <span className="font-medium text-foreground">
              Todos os planos incluem 7 dias de teste.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border flex flex-col ${
                plan.featured
                  ? "border-primary shadow-xl shadow-primary/10 bg-white"
                  : "border-border bg-white"
              }`}
            >
              {plan.badge && (
                <div className="bg-orange-400 text-white text-xs font-semibold text-center py-2 rounded-t-2xl">
                  🔥 {plan.badge}
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                </div>

                <div className="mb-6">
                  {plan.price ? (
                    <>
                      {plan.saving && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded mb-2">
                          {plan.saving}
                        </span>
                      )}
                      <div className="flex items-end gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className="text-4xl font-black text-foreground leading-none">
                          {plan.price}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.billing}</p>
                    </>
                  ) : (
                    <div className="text-4xl font-black text-foreground">Grátis</div>
                  )}
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full ${
                    plan.featured
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border border-primary text-primary bg-transparent hover:bg-primary/5"
                  }`}
                  variant={plan.featured ? "default" : "outline"}
                >
                  <a href={plan.ctaHref}>{plan.cta}</a>
                </Button>
                {plan.price && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    ★ 7 dias grátis para testar
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
          >
            Comparar todos os recursos →
          </button>
        </div>

        <PlanComparisonModal open={compareOpen} onClose={() => setCompareOpen(false)} />

        <p className="text-center text-sm text-muted-foreground mt-8">
          +500 usuários já estão organizando suas finanças com RXFin •{" "}
          <span className="font-medium">Cancele quando quiser</span>
        </p>
      </div>
    </section>
  );
}
