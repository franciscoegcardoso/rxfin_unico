import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  Car, 
  TrendingUp, 
  Clock, 
  Shield, 
  Target,
  BarChart3,
  Wallet,
  PiggyBank,
  ChevronRight,
  Sparkles,
  Lock,
  Users,
  Check,
  ArrowRight,
  Rocket,
  Play,
  Zap,
  Eye,
  Info,
  Search,
  Telescope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoHorizontal from '@/assets/Logo_RXFin-10.png';
import { FeaturePreviewDialog } from '@/components/landing/FeaturePreviewDialog';
import { featureContentMap } from '@/components/landing/featureSlideContents';

const LandingPage: React.FC = () => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>('');

  const simulators = [
    {
      icon: Car,
      title: 'Custo do Seu Carro',
      description: 'Descubra quanto realmente custa manter seu veículo por mês',
      path: '/simulador-custo-oportunidade-carro',
      available: true
    },
    {
      icon: Calculator,
      title: 'Custo Real por Hora',
      description: 'Descubra quanto realmente custa seu tempo de trabalho',
      path: '/simulador-custo-hora',
      available: false
    },
    {
      icon: TrendingUp,
      title: 'Valor de mercado (FIPE)',
      description: 'Acesse o histórico completo de preços e projete o custo real de propriedade.',
      path: '/simuladores/veiculos/simulador-fipe',
      available: false
    },
    {
      icon: Target,
      title: 'Comparador: Carro A vs B',
      description: 'Dúvida entre dois modelos? Projete qual deles oferece a melhor eficiência financeira no tempo.',
      path: '/simulador-carro-ab',
      available: false
    },
    {
      icon: Wallet,
      title: 'Mestre da Negociação: Desconto Justo',
      description: 'Calcule o desconto mínimo que você deve exigir para que pagar antecipado seja vantajoso.',
      path: '/simulador-desconto-justo',
      available: false
    },
    {
      icon: BarChart3,
      title: 'Financiamento Vs Consórcio',
      description: 'Compare taxas, CET e veja a composição real das parcelas.',
      path: '/financiamento-consorcio',
      available: false
    }
  ];

  const features = [
    {
      icon: BarChart3,
      title: 'Lançamentos',
      description: 'Gerencie contas a pagar e receber com visão clara'
    },
    {
      icon: Target,
      title: 'Planejamento de Metas',
      description: 'Defina metas e acompanhe seu progresso'
    },
    {
      icon: PiggyBank,
      title: 'Balanço Patrimonial',
      description: 'Todo seu patrimônio consolidado em um lugar'
    },
    {
      icon: Car,
      title: 'Gestão de Veículos',
      description: 'Custos, depreciação e histórico dos veículos'
    },
    {
      icon: Shield,
      title: 'Organização para o IR',
      description: 'Dados organizados para a declaração anual'
    },
    {
      icon: Clock,
      title: 'Projeção de 30 Anos',
      description: 'Cenários baseados em índices econômicos reais'
    }
  ];

  const handleSimulatorClick = (sim: typeof simulators[0], e: React.MouseEvent) => {
    if (!sim.available) {
      e.preventDefault();
      setSelectedFeature(sim.title);
      setPreviewOpen(true);
    }
  };

  const handleFeatureClick = (title: string) => {
    setSelectedFeature(title);
    setPreviewOpen(true);
  };

  // Get content for the selected feature, or create a default one
  const getPreviewContent = () => {
    if (featureContentMap[selectedFeature]) {
      return featureContentMap[selectedFeature];
    }
    // Fallback content
    return {
      featureName: selectedFeature,
      featureIcon: <Rocket className="h-8 w-8" />,
      slides: [
        {
          type: 'intro' as const,
          title: `${selectedFeature} está chegando!`,
          content: 'Esta funcionalidade está em desenvolvimento e será lançada em breve.'
        },
        {
          type: 'cta' as const,
          title: `Receba ${selectedFeature} em primeira mão`,
          content: 'Faça seu cadastro agora e garanta acesso vitalício aos simuladores gratuitos!'
        }
      ]
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Feature Preview Dialog with Slides */}
      <FeaturePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        content={getPreviewContent()}
      />

      {/* Header - Sticky with Dark Green */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(145,30%,15%)] dark:bg-[hsl(145,25%,8%)] backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <img
              src={logoHorizontal}
              alt="RXFin"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              style={{ width: 'auto' }}
            />
            <div className="flex items-center gap-2">
              <Link to="/simuladores/veiculos/simulador-fipe">
                <Button variant="ghost" size="sm" className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10">
                  <Play className="h-3 w-3 mr-1" />
                  Testar Grátis
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-white text-[hsl(145,30%,15%)] hover:bg-white/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                  Acessar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Impactful & Conversion Focused */}
      <section className="relative pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta Exclusivo - Vagas Limitadas
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight tracking-tight">
              Você sabe quanto{' '}
              <span className="text-primary relative">
                realmente custa
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/30" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 7 Q50 0 100 4 Q150 8 200 2" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </span>{' '}
              manter seu carro?
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              A maioria subestima em <strong className="text-foreground">até 40%</strong>. 
              Descubra o valor real em 2 minutos com nosso simulador gratuito.
            </p>

            {/* Primary CTA - Simulator */}
            <div>
              <Link to="/simuladores/veiculos/simulador-fipe">
                <Button 
                  size="lg" 
                  className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 text-base px-8 h-12 group"
                >
                  <Car className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Simular Custo do Meu Carro
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <p className="mt-3 text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                100% gratuito · Sem cadastro
              </p>
            </motion.div>
          </motion.div>

          {/* Social Proof */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background" />
                <div className="w-6 h-6 rounded-full bg-primary/30 border-2 border-background" />
                <div className="w-6 h-6 rounded-full bg-primary/40 border-2 border-background" />
              </div>
              <span>+500 simulações realizadas</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>Desenvolvido por especialistas em finanças corporativas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Simulator Card - Hero Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/simuladores/veiculos/simulador-fipe">
              <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background hover:border-primary/50 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                      <Car className="h-8 w-8 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary text-white">
                          <Zap className="h-3 w-3 mr-1" />
                          Disponível Agora
                        </Badge>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          Gratuito
                        </Badge>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        Simulador: Custo Real do Seu Carro
                      </h2>
                      <p className="text-muted-foreground">
                        Calcule todos os custos: IPVA, seguro, manutenção, combustível, depreciação e custo de oportunidade. 
                        Resultado detalhado em minutos.
                      </p>
                    </div>
                    
                    <Button size="lg" className="gradient-primary text-white shrink-0 group-hover:scale-105 transition-transform">
                      Simular Agora
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Value Proposition - Method Steps */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-secondary">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              Método Comprovado
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Um Sistema que <span className="text-primary">Funciona</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Três pilares para transformar sua relação com o dinheiro de forma definitiva
            </p>
          </motion.div>

          {/* Method Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { 
                step: '01',
                label: 'Entenda o Passado',
                icon: Search, 
                title: 'Diagnóstico Real', 
                desc: 'Identifique para onde seu dinheiro foi e entenda seu real padrão de vida. O primeiro passo para mudar é enxergar a verdade sem filtros.',
                gradient: 'from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5',
                iconBg: 'bg-primary/10 dark:bg-primary/20',
                iconColor: 'text-primary'
              },
              { 
                step: '02',
                label: 'Controle o Presente',
                icon: Shield, 
                title: 'Gestão de Alto Nível', 
                desc: 'Saia do amadorismo. Utilize uma estrutura profissional para organizar suas finanças com o rigor e a precisão que seu patrimônio exige.',
                gradient: 'from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/5',
                iconBg: 'bg-primary/15 dark:bg-primary/25',
                iconColor: 'text-primary'
              },
              { 
                step: '03',
                label: 'Projete o Futuro',
                icon: Telescope, 
                title: 'Visão de Longo Prazo', 
                desc: 'Simule o amanhã hoje. Antecipe o impacto de cada decisão e visualize exatamente como estará sua liberdade financeira daqui a 10 anos.',
                gradient: 'from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5',
                iconBg: 'bg-primary/10 dark:bg-primary/20',
                iconColor: 'text-primary'
              }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                className="group relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                {/* Card */}
                <div className={`relative h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${item.gradient} border border-border/50 hover:border-primary/40 hover:shadow-xl transition-all duration-300`}>
                  {/* Step Number */}
                  <div className="absolute -top-3 left-6 sm:left-8">
                    <span className="px-3 py-1 text-xs font-bold bg-background text-muted-foreground rounded-full border border-border/60 shadow-sm">
                      {item.step}
                    </span>
                  </div>
                  
                  {/* Phase Label */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 mt-2">
                    {item.label}
                  </p>
                  
                  {/* Icon */}
                  <div className={`w-14 h-14 mb-5 rounded-2xl ${item.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`h-7 w-7 ${item.iconColor}`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/login">
              <Button size="lg" className="gradient-primary text-white gap-2 group px-8">
                Garanta Seu Acesso VIP de Lançamento
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Other Simulators - Coming Soon Grid */}
      <section id="simuladores" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-3">
              <Rocket className="h-3 w-3 mr-1" />
              Em Desenvolvimento
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Mais Simuladores em Breve
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Cadastre-se para receber esses simuladores em primeira mão com acesso vitalício gratuito
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulators.filter(s => !s.available).map((sim, i) => (
              <motion.div 
                key={sim.path}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className="h-full hover:shadow-md transition-all duration-300 cursor-pointer border-border/60 hover:border-primary/30 group"
                  onClick={(e) => handleSimulatorClick(sim, e)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <sim.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 text-xs">
                        Em Breve
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {sim.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {sim.description}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      <Info className="h-3 w-3 mr-1" />
                      Saiba mais
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white p-8 sm:p-12 lg:p-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-10 translate-y-10" />
            
            <div className="relative z-10">
              <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/25">
                <Lock className="h-3 w-3 mr-1" />
                Beta Exclusivo - Primeiros 1.000 cadastros
              </Badge>
              
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Quer o Raio-X Financeiro Completo?
              </h2>
              
              <p className="text-white/90 mb-6 max-w-xl mx-auto text-sm sm:text-base">
                Histórico de simulações, planejamento mensal, balanço patrimonial, projeções de longo prazo e muito mais.
                <strong className="block mt-2">Garanta acesso vitalício aos simuladores gratuitos!</strong>
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
                {['Acesso vitalício', 'Novos módulos em primeira mão', 'Projeções 30 anos'].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                    <Check className="h-3.5 w-3.5" />
                    {item}
                  </div>
                ))}
              </div>

              <Link to="/signup">
                <Button size="lg" className="bg-white text-primary hover:bg-white/95 shadow-lg">
                  Criar Minha Conta Grátis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              
              <p className="mt-4 text-xs text-white/70">
                <Users className="h-3 w-3 inline mr-1" />
                Vagas limitadas para o lançamento
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Preview - Compact Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              O que você terá no RXFin
            </h2>
            <p className="text-muted-foreground text-sm">
              Ferramentas completas para sua vida financeira - clique para saber mais
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className="h-full border-border/60 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
                  onClick={() => handleFeatureClick(feature.title)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <feature.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 text-[10px]">
                      Em Breve
                    </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{feature.description}</p>
                    <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      <Info className="h-3 w-3 mr-1" />
                      Saiba mais
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section - Minimal */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.blockquote
            className="text-base sm:text-lg italic text-muted-foreground leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            "Criei a RXFin porque passei uma década otimizando performance de grandes empresas 
            e percebi que pessoas tomavam decisões financeiras no escuro. 
            A RXFin é um <strong className="text-foreground">Raio-X Financeiro completo</strong>."
          </motion.blockquote>
        </div>
      </section>

      {/* Footer - Dark Green — 3 colunas + bottom bar */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-[hsl(145,30%,15%)] dark:bg-[hsl(145,25%,5%)] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12">

            {/* Col 1 — Marca + Redes sociais */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={logoHorizontal}
                  alt="RXFin"
                  width={120}
                  height={32}
                  className="h-8 w-auto object-contain"
                  style={{ width: 'auto' }}
                />
              </div>
              <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                Seu Raio-X Financeiro Completo. Conecte seus bancos e tome decisões com clareza.
              </p>
              <div className="flex items-center gap-4 mt-1">
                <a
                  href="https://instagram.com/rxfin.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="Instagram RXFin"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                </a>
                <a
                  href="mailto:contato@rxfin.com.br"
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label="E-mail RXFin"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2 — Produto */}
            <div>
              <h3 className="text-xs font-semibold text-[#8fb89a] uppercase tracking-wider mb-4">
                Produto
              </h3>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'Início', to: '/inicio' },
                  { label: 'Simuladores', to: '/simuladores' },
                  { label: 'Movimentações', to: '/movimentacoes' },
                  { label: 'Investimentos', to: '/investimentos' },
                  { label: 'Meu IR', to: '/meu-ir' },
                  { label: 'Simulador FIPE', to: '/simuladores/veiculos/simulador-fipe' },
                ].map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-white/60 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Legal */}
            <div>
              <h3 className="text-xs font-semibold text-[#8fb89a] uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'Termos de Uso', to: '/termos-de-uso' },
                  { label: 'Política de Privacidade', to: '/politica-privacidade' },
                  { label: 'Política de Cookies', to: '/politica-cookies' },
                ].map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-white/60 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-[#8fb89a]">
              © 2025 RXFin · Todos os direitos reservados
            </p>
            <p className="text-[11px] text-[#7aa386] text-center sm:text-right">
              Dados protegidos com criptografia bancária via Open Finance regulamentado pelo Banco Central do Brasil.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
