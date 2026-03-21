import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UsersRound, Receipt, Wallet, Sparkles, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PeopleTab } from '@/components/rxsplit/PeopleTab';
import { GroupsTab } from '@/components/rxsplit/GroupsTab';
import { ExpensesTab } from '@/components/rxsplit/ExpensesTab';
import { BalanceTab } from '@/components/rxsplit/BalanceTab';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

type Tab = 'people' | 'groups' | 'expenses' | 'balance';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'groups', label: 'Grupos', icon: UsersRound },
  { id: 'expenses', label: 'Despesas', icon: Receipt },
  { id: 'balance', label: 'Saldos', icon: Wallet },
];

const RXSplit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('people');
  const [showIntro, setShowIntro] = useState(true);

  return (
    
      <div className="flex flex-col min-h-full w-full max-w-full overflow-x-hidden">
        <PageHeader
          icon={UsersRound}
          title="RX Split"
          subtitle="Divisão de despesas entre grupos e pessoas"
        />

        {showIntro ? (
          <Card className="rounded-[14px] border border-border/80 bg-gradient-to-b from-primary/[0.03] to-transparent">
            <CardContent className="flex flex-col items-center justify-center gap-6 p-8 sm:p-12">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
              >
                <UsersRound className="h-7 w-7 text-primary" aria-hidden />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="text-center space-y-2"
              >
                <h2 className="text-2xl font-semibold text-foreground">Controle total da divisao em grupo</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Cadastre pessoas, monte grupos, lance despesas e veja os acertos automaticamente.
                  Tudo em um fluxo simples e transparente.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { icon: ArrowRightLeft, label: 'Rateio inteligente' },
                  { icon: ShieldCheck, label: 'Historico confiavel' },
                  { icon: Sparkles, label: 'Saldos em tempo real' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/70 px-3 py-2 text-center">
                    <item.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
              >
                <Button onClick={() => setShowIntro(false)} className="gap-2">
                  Entrar no RX Split
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50 border border-border rounded-lg">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-md transition-colors',
                      'data-[state=inactive]:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="people" className="mt-4 focus-visible:outline-none">
              <PeopleTab />
            </TabsContent>
            <TabsContent value="groups" className="mt-4 focus-visible:outline-none">
              <GroupsTab />
            </TabsContent>
            <TabsContent value="expenses" className="mt-4 focus-visible:outline-none">
              <ExpensesTab />
            </TabsContent>
            <TabsContent value="balance" className="mt-4 focus-visible:outline-none">
              <BalanceTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    
  );
};

export default RXSplit;
