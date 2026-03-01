import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Search, TrendingUp, Shield, Lock, Cloud, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import franciscoPhoto from '@/assets/francisco-cardoso.png';
import logoRxFin from '@/assets/Logo_RXFin-10.png';

const APP_URL = 'https://app.rxfin.com.br';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(161,79%,12%)] backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoRxFin} alt="RXFin" className="h-8" />
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Voltar
                </Button>
              </Link>
              <a href={`${APP_URL}/signup`}>
                <Button size="sm" className="bg-white text-[hsl(161,79%,12%)] hover:bg-white/90">
                  Criar conta grátis
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(161,79%,25%)] via-[hsl(161,70%,22%)] to-[hsl(161,79%,18%)]" />
        <div className="absolute top-10 right-0 w-[400px] h-[400px] bg-white/[0.03] rounded-full blur-[100px]" />

        <div className="relative max-w-3xl mx-auto">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.h1
              variants={fadeUp}
              className="text-2xl sm:text-3xl lg:text-[2.75rem] font-bold text-white leading-[1.2] tracking-tight"
            >
              Troquei uma carreira de liderança em grandes empresas por uma convicção.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-white/75 leading-relaxed max-w-2xl"
            >
              Depois de mais de 10 anos no mundo corporativo de alto nível, ficou claro que enquanto grandes empresas contam com exércitos de especialistas financeiros, pessoas físicas e PMEs operam no escuro.
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="mt-3 text-base sm:text-lg text-white/90 font-medium"
            >
              O RXFin nasce para mudar isso na vida das pessoas.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8">
              <Link to="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-medium group"
                >
                  Conhecer a plataforma
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. O problema */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
              A motivação
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-8">
              O problema que poucos enxergam
            </h2>

            <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
              <p>
                Grandes corporações possuem times dedicados a orçamento, planejamento, pricing, controle de despesas e projeções estratégicas.
              </p>
              <p>
                Já pessoas físicas e pequenos empresários tomam decisões financeiras relevantes <strong className="text-foreground">sem ferramentas estruturadas</strong>.
              </p>
              <p>
                Essa assimetria gera insegurança, decisões reativas e falta de clareza sobre o futuro.
              </p>
              <p className="text-foreground font-medium border-l-2 border-primary pl-5">
                O RXFin foi criado para reduzir essa desigualdade informacional — trazendo método, tecnologia e visão estratégica para quem nunca teve acesso a isso.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Trajetória */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
              Quem está por trás
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-10">
              Formação e Experiência
            </h2>

            <div className="flex flex-col md:flex-row gap-10">
              {/* Photo + Formation */}
              <div className="md:w-1/3 flex flex-col items-center md:items-start gap-5">
                <motion.a
                  href="https://www.linkedin.com/in/franciscoegcardoso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <img
                    src={franciscoPhoto}
                    alt="Francisco Cardoso"
                    className="w-28 h-28 rounded-2xl border-2 border-primary/20 object-cover grayscale-[20%] contrast-[1.05] hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[hsl(210,80%,45%)] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                </motion.a>

                <div>
                  <h3 className="font-semibold text-foreground text-lg">Francisco Cardoso</h3>
                  <p className="text-sm text-muted-foreground mt-1">Fundador do RXFin</p>
                </div>

                <div className="w-full">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">🎓 Formação</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Engenheiro de Produção pela Universidade Federal de Viçosa (UFV), com formação internacional na França. Base sólida em gestão, finanças, estratégia e análise de dados.
                  </p>
                </div>
              </div>

              {/* Experience */}
              <div className="md:w-2/3 space-y-8">
                {/* Stone */}
                <motion.div
                  className="rounded-2xl border border-border/60 bg-card p-6"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <h4 className="font-bold text-foreground text-lg mb-2">Stone</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Liderança em estratégias de Vendas, BI, Pricing e Planejamento. Responsável direto pela gestão do orçamento anual, garantindo alinhamento entre metas comerciais e disciplina financeira.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Gestão de orçamento', 'Estratégia de pricing', 'Planejamento financeiro corporativo'].map((tag) => (
                      <span key={tag} className="text-xs font-medium bg-primary/8 text-primary px-3 py-1.5 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Kraft Heinz */}
                <motion.div
                  className="rounded-2xl border border-border/60 bg-card p-6"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <h4 className="font-bold text-foreground text-lg mb-2">Kraft Heinz</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Gestão de Grandes Contas (Key Accounts) e Distribuidores. Aumento de <strong className="text-foreground">75% na lucratividade</strong>, com crescimento de <strong className="text-foreground">36% em faturamento</strong>, através de gestão estratégica de mix de produtos e canais.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Crescimento com rentabilidade', 'Gestão baseada em dados', 'Eficiência operacional'].map((tag) => (
                      <span key={tag} className="text-xs font-medium bg-primary/8 text-primary px-3 py-1.5 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. A decisão */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
              O ponto de virada
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-8">
              A decisão
            </h2>

            <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
              <p>
                Depois de uma década liderando estratégias financeiras em grandes empresas, ficou evidente:
              </p>
              <p className="text-foreground font-medium text-lg">
                As ferramentas existem. A metodologia existe. A inteligência financeira existe.
              </p>
              <p className="text-foreground font-semibold text-lg">
                O que falta é torná-las acessíveis.
              </p>
              <p>
                Primeiro nasceu a <strong className="text-foreground">Vértice A</strong>, com a missão de democratizar a gestão financeira para pessoas físicas e pequenos e médios empresários.
              </p>
              <p>
                O <strong className="text-primary">RXFin</strong> é a evolução tecnológica dessa missão.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. O que o RXFin representa */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,25%)]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              O que o RXFin representa
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, emoji: '📊', title: 'Estrutura', text: 'Organizar passado e presente com método.' },
              { icon: Search, emoji: '🔎', title: 'Clareza', text: 'Transformar dados financeiros dispersos em decisões conscientes.' },
              { icon: TrendingUp, emoji: '📈', title: 'Projeção', text: 'Planejar o futuro com simulações estruturadas.' },
            ].map((pillar, i) => (
              <motion.div
                key={pillar.title}
                className="rounded-2xl bg-white/[0.08] border border-white/10 p-7 text-center hover:bg-white/[0.12] transition-colors duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                  <pillar.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{pillar.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Segurança */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-4">
              Confiança exige responsabilidade.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
              O RXFin foi construído sobre infraestrutura AWS e tecnologia Supabase, com criptografia ponta a ponta e conformidade com a LGPD.
            </p>
            <p className="text-sm font-semibold text-foreground mb-10">
              Segurança não é diferencial. É premissa.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { icon: Lock, label: 'Criptografia SSL/TLS' },
                { icon: Cloud, label: 'Infraestrutura AWS' },
                { icon: ShieldCheck, label: 'Dados isolados' },
                { icon: Shield, label: 'Conformidade LGPD' },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/80 p-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. Encerramento */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-6">
              Estamos construindo algo maior que um simulador.
            </h2>

            <div className="space-y-4 text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
              <p>
                O RXFin não é apenas uma ferramenta. É a aplicação prática de uma década de gestão estratégica transformada em tecnologia acessível.
              </p>
              <p className="text-foreground font-medium">
                O objetivo é simples: permitir que qualquer pessoa tenha o mesmo nível de organização financeira que uma grande empresa.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={`${APP_URL}/signup`}>
                <Button
                  size="lg"
                  className="gradient-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold group"
                >
                  Criar minha conta gratuita
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <Link to="/#simuladores">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/30 text-primary hover:bg-primary/5 font-medium"
                >
                  Conhecer os simuladores
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer compacto */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8 bg-[hsl(161,79%,12%)] text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoRxFin} alt="RXFin" className="h-6" />
          <p className="text-[11px] text-white/50">© {new Date().getFullYear()} RXFin. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px] text-white/50">
            <a href={`${APP_URL}/termos-de-uso`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Termos de Uso</a>
            <span className="text-white/20">|</span>
            <a href={`${APP_URL}/politica-privacidade`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Política de Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
