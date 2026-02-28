import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Activity, Award, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { INDICATOR_EDUCATION, CATEGORY_INFO } from './educationalContent';
import { cn } from '@/lib/utils';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const metricsHelp = [
  {
    Icon: TrendingUp,
    title: 'Retorno Total',
    description: 'Quanto sua carteira teria crescido desde o início do período. Um retorno de 200% significa que R$1.000 virou R$3.000.',
    example: 'Se você investiu R$10.000 e o retorno total foi 150%, você teria R$25.000 hoje.',
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  {
    Icon: Activity,
    title: 'Volatilidade',
    description: 'Mede o quanto o valor da carteira oscila. Alta volatilidade = mais risco, mas também mais oportunidade.',
    example: 'Volatilidade de 5% ao mês significa que é "normal" variar ±5% a cada mês.',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-500',
  },
  {
    Icon: Award,
    title: 'Melhor / Pior Mês',
    description: 'Mostra os extremos da carteira. Ajuda a entender os cenários de maior ganho e maior perda possíveis.',
    example: 'Se o pior mês foi -15%, você precisa estar preparado emocionalmente para ver isso acontecer.',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-500',
  },
];

const conceptsHelp = [
  {
    term: 'Base 100',
    explanation: 'Técnica para comparar ativos de valores diferentes. Todos começam em 100, facilitando ver qual cresceu mais em %.',
  },
  {
    term: 'Benchmark',
    explanation: 'Referência de comparação. Ex: Se sua carteira rendeu 50% e o CDI rendeu 40%, você "bateu o benchmark".',
  },
  {
    term: 'Diversificação',
    explanation: 'Não colocar todos os ovos na mesma cesta. Misturar ativos diferentes reduz o risco total.',
  },
  {
    term: 'Risco vs Retorno',
    explanation: 'Geralmente, maior potencial de ganho = maior risco de perda. Não existe almoço grátis.',
  },
  {
    term: 'Juros Compostos',
    explanation: 'Ganhar juros sobre juros anteriores. Faz o dinheiro crescer exponencialmente no longo prazo.',
  },
];

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('indicators');
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-2xl shadow-xl border max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Central de Ajuda
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Aprenda a interpretar os dados
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList>
                <TabsTrigger value="indicators">
                  Indicadores
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  Métricas
                </TabsTrigger>
                <TabsTrigger value="concepts">
                  Conceitos
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1">
                <TabsContent value="indicators" className="p-6 mt-0 space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Passe o mouse sobre qualquer indicador na barra lateral para ver detalhes. Aqui está um resumo rápido:
                  </p>
                  {Object.entries(INDICATOR_EDUCATION).map(([key, edu]) => {
                    const cat = CATEGORY_INFO[edu.category];
                    return (
                      <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className="text-2xl shrink-0">{edu.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{edu.shortName}</span>
                            <Badge variant="outline" className={cn("text-[10px]", cat.color)}>
                              {cat.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {edu.whatIs}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
                
                <TabsContent value="metrics" className="p-6 mt-0 space-y-4">
                  {metricsHelp.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-xl bg-muted/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          item.bgClass
                        )}>
                          <item.Icon className={cn("w-6 h-6", item.textClass)} />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground mb-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{item.example}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
                
                <TabsContent value="concepts" className="p-6 mt-0 space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Termos importantes para entender seus investimentos:
                  </p>
                  {conceptsHelp.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30"
                    >
                      <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{item.term}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
            
            {/* Footer */}
            <div className="p-4 border-t bg-muted/30">
              <Button onClick={onClose} className="w-full">
                Entendi!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
