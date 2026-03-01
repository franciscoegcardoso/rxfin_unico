import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCTAClick } from '@/lib/tracking';
import logoRxFin from '@/assets/Logo_RXFin-10.png';

const APP_URL = 'https://app.rxfin.com.br';

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const beliefs = [
  'Decisões financeiras exigem contexto, não palpites.',
  'O passado precisa ser organizado para que o presente faça sentido.',
  'O futuro deve ser simulado antes de ser vivido.',
  'Tecnologia só tem valor quando simplifica decisões complexas.',
  'Segurança e privacidade não são diferenciais — são obrigação.',
];

const ManifestoPage: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground">
    {/* Header */}
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(161,79%,12%)] dark:bg-[hsl(161,60%,6%)] backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <a href="/">
            <img src={logoRxFin} alt="RXFin" className="h-8" />
          </a>
          <div className="flex items-center gap-2">
            <a href={`${APP_URL}/login`}>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">Login</Button>
            </a>
            <a href={`${APP_URL}/signup`}>
              <Button size="sm" className="bg-white text-[hsl(161,79%,25%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">Criar conta grátis</Button>
            </a>
          </div>
        </div>
      </div>
    </header>

    {/* Hero — Document header */}
    <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,12%)] dark:bg-[hsl(161,60%,6%)] text-white">
      <motion.div className="max-w-3xl mx-auto text-center" {...fade}>
        <div className="inline-flex items-center gap-2 border border-white/15 rounded-full px-4 py-1.5 mb-8">
          <ScrollText className="h-3.5 w-3.5 text-white/60" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-medium">Manifesto Oficial</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
          Planejamento financeiro<br />não é luxo.
        </h1>
        <p className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-white/50 tracking-tight">
          É método.
        </p>
      </motion.div>
    </section>

    {/* Document body — paper card */}
    <div className="relative bg-muted/40 dark:bg-muted/10">
      {/* Decorative top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          className="bg-card dark:bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Document ribbon */}
          <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">RXFin</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60">v1.0 — 2025</span>
          </div>

          <div className="px-6 sm:px-10 py-10 sm:py-14 space-y-16">

            {/* Abertura */}
            <motion.section {...fade}>
              <p className="text-muted-foreground leading-relaxed">
                Durante muito tempo, planejamento financeiro estruturado foi privilégio de grandes corporações.
                Enquanto empresas contam com times dedicados, sistemas robustos e especialistas para decidir cada centavo,
                pessoas físicas e pequenos empresários tomam decisões financeiras relevantes sem estrutura,
                sem visão de longo prazo e, muitas vezes, no escuro.
              </p>
              <p className="mt-4 text-foreground font-semibold">
                O RXFin existe para mudar essa lógica.
              </p>
            </motion.section>

            <div className="h-px bg-border" />

            {/* O Problema */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                O problema não é falta de dinheiro.<br />
                <span className="text-muted-foreground font-bold">É falta de estrutura.</span>
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>A maioria das decisões financeiras ruins não nasce da irresponsabilidade.</p>
                <p>
                  Nasce da ausência de organização, da falta de simulações confiáveis
                  e da impossibilidade de entender como decisões tomadas hoje impactam o futuro.
                </p>
              </div>
              <p className="mt-5 text-foreground font-semibold leading-relaxed">
                Sem estrutura, o presente vira reação.<br />
                E o futuro vira improviso.
              </p>
            </motion.section>

            <div className="h-px bg-border" />

            {/* Convicção */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                Nossa convicção é simples.
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Se grandes empresas só crescem porque planejam, pessoas também deveriam ter acesso
                  ao mesmo nível de organização financeira.
                </p>
                <p>
                  Planejamento financeiro não deve ser complexo, inacessível ou elitizado.<br />
                  Deve ser claro, estruturado e baseado em dados.
                </p>
              </div>
              <p className="mt-5 text-foreground font-semibold leading-relaxed">
                Não acreditamos em atalhos.<br />
                Acreditamos em método.
              </p>
            </motion.section>

            <div className="h-px bg-border" />

            {/* Crenças */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                No que acreditamos
              </h2>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60 mb-7">Acreditamos que:</p>
              <div className="space-y-5 pl-1">
                {beliefs.map((b, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4 items-start"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                  >
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <p className="text-base leading-relaxed text-foreground">{b}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <div className="h-px bg-border" />

            {/* O que é */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                O que é o RXFin
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>O RXFin é uma plataforma de planejamento financeiro pessoal.</p>
                <p>
                  Ele conecta passado, presente e futuro em um único ambiente estruturado.<br />
                  Integra contas, patrimônio, imposto de renda e simulações.<br />
                  Transforma dados dispersos em visão estratégica.
                </p>
              </div>
              <p className="mt-5 text-foreground font-semibold leading-relaxed">
                O RXFin não promete resultados fáceis.<br />
                Ele oferece estrutura para decisões melhores.
              </p>
            </motion.section>

            <div className="h-px bg-border" />

            {/* O que não é */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                O que o RXFin não é
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  O RXFin não é apenas mais um simulador.<br />
                  Não é entretenimento financeiro.<br />
                  Não é uma coleção de planilhas desconectadas.
                </p>
                <p>
                  Simuladores são apenas o ponto de partida.<br />
                  Planejamento exige continuidade, método e responsabilidade.
                </p>
              </div>
            </motion.section>

            <div className="h-px bg-border" />

            {/* Compromisso técnico */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                Confiança se constrói com responsabilidade técnica
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  O RXFin foi desenvolvido sobre infraestrutura de classe mundial, com criptografia
                  ponta a ponta e conformidade com a LGPD.
                </p>
                <p>Dados financeiros exigem respeito.</p>
              </div>
              <p className="mt-5 text-foreground font-semibold">
                Segurança não é discurso. É arquitetura.
              </p>
            </motion.section>

            <div className="h-px bg-border" />

            {/* Visão */}
            <motion.section {...fade}>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">
                Estamos construindo um padrão
              </h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>O RXFin nasce como ferramenta, mas evolui como referência.</p>
                <p>
                  Nosso objetivo é estabelecer um novo padrão de organização financeira
                  para pessoas físicas e pequenos e médios empresários no Brasil.
                </p>
              </div>
              <p className="mt-5 text-foreground font-semibold leading-relaxed">
                Planejamento financeiro não deveria ser exceção.<br />
                Deveria ser regra.
              </p>
            </motion.section>

          </div>

          {/* Document footer / signature */}
          <div className="px-6 sm:px-10 py-6 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <img src={logoRxFin} alt="RXFin" className="h-5 opacity-40" />
              <p className="text-[10px] text-muted-foreground/50">© {new Date().getFullYear()} RXFin. Todos os direitos reservados.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>

    {/* CTA — fora do "documento" */}
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,12%)] dark:bg-[hsl(161,60%,6%)] text-white">
      <motion.div className="max-w-2xl mx-auto text-center" {...fade}>
        <p className="text-base sm:text-lg leading-relaxed text-white/70 mb-1">
          Se você acredita que decisões financeiras merecem método,
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-white/70 mb-1">
          clareza e visão de longo prazo,
        </p>
        <p className="text-lg sm:text-xl font-semibold text-white mt-2 mb-10">
          então você já entende o que é o RXFin.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href={`${APP_URL}/signup`} onClick={() => trackCTAClick('manifesto_criar_conta', `${APP_URL}/signup`)}>
            <Button size="lg" className="bg-white text-[hsl(161,79%,20%)] hover:bg-white/90 font-semibold px-8 h-12 group">
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
          <a href="/#simuladores">
            <Button variant="ghost" size="lg" className="text-white/70 hover:text-white hover:bg-white/10 h-12 px-8">
              Conhecer os simuladores
            </Button>
          </a>
        </div>
      </motion.div>
    </section>

    {/* Footer mínimo */}
    <footer className="py-6 px-4 bg-[hsl(161,79%,10%)] dark:bg-[hsl(161,60%,4%)] text-center">
      <p className="text-[11px] text-white/40">© {new Date().getFullYear()} RXFin. Todos os direitos reservados.</p>
    </footer>
  </div>
);

export default ManifestoPage;
