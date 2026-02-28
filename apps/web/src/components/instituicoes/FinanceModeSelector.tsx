import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, CheckCircle2, Zap, FileUp, Clock, Lock, Sparkles, 
  AlertTriangle, Eye, Keyboard, RefreshCw, Building2 
} from 'lucide-react';
import { FinanceMode } from '@/hooks/useFinanceMode';

interface FinanceModeSelectorProps {
  onSelect: (mode: FinanceMode) => void;
  isLoading?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const iconVariants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: [0, -8, 8, 0], scale: 1.15, transition: { duration: 0.5 } },
};

export const FinanceModeSelector: React.FC<FinanceModeSelectorProps> = ({ onSelect, isLoading }) => {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center space-y-2" variants={headerVariants}>
        <h2 className="text-lg font-semibold text-foreground">Como você quer gerenciar suas finanças?</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Escolha como deseja acompanhar seus gastos, receitas e investimentos. Você pode alterar essa escolha depois.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Open Finance Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          initial="rest"
        >
          <Card
            className="relative border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/70 hover:shadow-xl transition-all cursor-pointer group h-full"
            onClick={() => !isLoading && onSelect('openfinance')}
          >
            <div className="absolute -top-3 left-4">
              <Badge className="bg-primary text-primary-foreground shadow-md gap-1 animate-[pulse_3s_ease-in-out_infinite]">
                <Sparkles className="h-3 w-3" />
                Recomendado
              </Badge>
            </div>
            <CardContent className="p-6 pt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <motion.div variants={iconVariants} whileHover="hover">
                    <Zap className="h-6 w-6 text-primary" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Open Finance</h3>
                  <p className="text-xs text-muted-foreground">Tudo automático e integrado</p>
                </div>
              </div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Como funciona</p>
                <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
                  {[
                    'Conecte seu banco pelo ambiente seguro',
                    'Autorize o compartilhamento de dados',
                    'Seus dados sincronizam automaticamente',
                  ].map((text, i) => (
                    <motion.li key={i} className="flex items-start gap-2" variants={listItemVariants}>
                      <span className="shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Benefícios</p>
                <ul className="space-y-1.5 text-sm">
                  {[
                    'Saldos, faturas e extratos atualizados automaticamente',
                    'Categorização inteligente por IA sem esforço manual',
                    'Visão consolidada de todos os bancos em um só lugar',
                  ].map((text, i) => (
                    <motion.li key={i} className="flex items-start gap-2" variants={listItemVariants}>
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Pontos de atenção</p>
                <div className="space-y-2">
                  {[
                    { Icon: Clock, text: <>Os bancos podem levar de <strong className="text-foreground">1 a 6 dias</strong> para enviar novos dados. Esse delay é padrão do sistema bancário brasileiro.</> },
                    { Icon: RefreshCw, text: <>O consentimento tem <strong className="text-foreground">validade limitada</strong> e precisará ser renovado periodicamente.</> },
                    { Icon: Building2, text: <>Alguns bancos podem não suportar todos os produtos (ex: investimentos).</> },
                  ].map(({ Icon, text }, i) => (
                    <motion.div key={i} className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2.5 flex items-start gap-2" variants={listItemVariants}>
                      <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <Shield className="h-3 w-3" /> Banco Central
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" /> LGPD
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <Shield className="h-3 w-3" /> Criptografado
                </Badge>
              </div>

              <Button className="w-full" disabled={isLoading}>
                Conectar via Open Finance
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Manual Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          initial="rest"
        >
          <Card
            className="border hover:border-muted-foreground/30 hover:shadow-xl transition-all cursor-pointer group h-full"
            onClick={() => !isLoading && onSelect('manual')}
          >
            <CardContent className="p-6 pt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                  <motion.div variants={iconVariants} whileHover="hover">
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Manualmática</h3>
                  <p className="text-xs text-muted-foreground">Controle manual completo</p>
                </div>
              </div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Como funciona</p>
                <ol className="space-y-1.5 text-sm text-muted-foreground list-none">
                  {[
                    'Cadastre suas instituições financeiras',
                    'Importe faturas por arquivo ou lance manualmente',
                    'Acompanhe tudo no painel de controle',
                  ].map((text, i) => (
                    <motion.li key={i} className="flex items-start gap-2" variants={listItemVariants}>
                      <span className="shrink-0 h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Benefícios</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {[
                    'Controle total sobre cada lançamento',
                    'Importação de faturas via arquivo (CSV/OFX)',
                    'Sem necessidade de compartilhar dados bancários',
                  ].map((text, i) => (
                    <motion.li key={i} className="flex items-start gap-2" variants={listItemVariants}>
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Pontos de atenção</p>
                <div className="space-y-2">
                  {[
                    { Icon: AlertTriangle, text: <>Requer <strong className="text-foreground">disciplina</strong> para manter os dados atualizados.</> },
                    { Icon: Keyboard, text: <>Lançamentos manuais estão sujeitos a <strong className="text-foreground">erros de digitação</strong>.</> },
                    { Icon: Eye, text: <>Categorização deve ser feita <strong className="text-foreground">manualmente</strong> (sem IA automática).</> },
                  ].map(({ Icon, text }, i) => (
                    <motion.div key={i} className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2.5 flex items-start gap-2" variants={listItemVariants}>
                      <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <Button variant="outline" className="w-full" disabled={isLoading}>
                Usar modo manual
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
