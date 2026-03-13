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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0d2b20]" id="precos">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-2 block">
            Planos
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            Escolha o plano ideal para você
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando precisar.{" "}
            <span className="font-medium text-white/90">
              Todos os planos incluem 7 dias de teste.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                plan.featured
                  ? "bg-white shadow-[0_0_40px_rgba(255,255,255,0.15)] ring-2 ring-white/30 scale-[1.02] md:scale-105"
                  : "bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.08]"
              }`}
            >
              {plan.badge && (
                <div className={plan.featured ? "bg-primary text-white text-xs font-semibold text-center py-2" : "bg-white/10 text-white/90 text-xs font-semibold text-center py-2"}>
                  {plan.badge}
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <h3 className={`text-xl font-bold ${plan.featured ? "text-[#0d2b20]" : "text-white"}`}>{plan.name}</h3>
                  <p className={`text-sm mt-1 ${plan.featured ? "text-[#0d2b20]/70" : "text-white/70"}`}>{plan.subtitle}</p>
                </div>

                <div className="mb-6">
                  {plan.price ? (
                    <>
                      {plan.saving && (
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mb-2 ${plan.featured ? "bg-primary/15 text-primary" : "bg-white/15 text-white/90"}`}>
                          {plan.saving}
                        </span>
                      )}
                      <div className="flex items-end gap-1">
                        <span className={`text-sm mb-1 ${plan.featured ? "text-[#0d2b20]/60" : "text-white/60"}`}>R$</span>
                        <span className={`text-4xl font-black leading-none ${plan.featured ? "text-[#0d2b20]" : "text-white"}`}>
                          {plan.price}
                        </span>
                        <span className={`text-sm mb-1 ${plan.featured ? "text-[#0d2b20]/60" : "text-white/60"}`}>{plan.period}</span>
                      </div>
                      <p className={`text-xs mt-1 ${plan.featured ? "text-[#0d2b20]/60" : "text-white/50"}`}>{plan.billing}</p>
                    </>
                  ) : (
                    <div className={`text-4xl font-black ${plan.featured ? "text-[#0d2b20]" : "text-white"}`}>Grátis</div>
                  )}
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-[#0d2b20]/80" : "text-white/80"}`}>
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? "text-primary" : "text-white/90"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full font-semibold transition-all duration-300 ${
                    plan.featured
                      ? "bg-[hsl(161,79%,25%)] hover:bg-[hsl(161,79%,22%)] text-white shadow-lg hover:shadow-xl"
                      : "border border-white/40 text-white bg-transparent hover:bg-white/10"
                  }`}
                  variant={plan.featured ? "default" : "outline"}
                >
                  <a href={plan.ctaHref}>{plan.cta}</a>
                </Button>
                {plan.price && (
                  <p className={`text-xs text-center mt-2 ${plan.featured ? "text-[#0d2b20]/60" : "text-white/50"}`}>
                    7 dias grátis para testar
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
            className="text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors"
          >
            Comparar todos os recursos →
          </button>
        </div>

        <PlanComparisonModal open={compareOpen} onClose={() => setCompareOpen(false)} />

        <p className="text-center text-sm text-white/50 mt-8">
          +500 usuários já estão organizando suas finanças com RXFin ·{" "}
          <span className="font-medium text-white/70">Cancele quando quiser</span>
        </p>
      </div>
    </section>
  );
}
