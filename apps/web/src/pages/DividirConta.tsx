import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scissors, History, Sparkles, Users, Wallet } from 'lucide-react';
import { BillSplitWizard } from '@/components/billsplit/BillSplitWizard';
import { BillSplitHistory } from '@/components/billsplit/BillSplitHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/core/hooks/useProfile';
import { motion } from 'framer-motion';

const DividirConta: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const currentUserName = profile?.full_name || user?.email?.split('@')[0] || 'Você';

  return (
    <AppLayout>
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <PageHeader
          icon={Scissors}
          title="Dividir Conta"
          subtitle="Divida contas entre amigos e acompanhe quem deve quanto"
        />

        {showWizard && (
          <BillSplitWizard
            isOpen={showWizard}
            onClose={() => setShowWizard(false)}
            currentUserName={currentUserName}
          />
        )}
        {showHistory && (
          <BillSplitHistory
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        {!showWizard && !showHistory && showIntro && (
          <Card className="rounded-[14px] border border-border/80 bg-gradient-to-b from-primary/[0.03] to-transparent">
            <CardContent className="flex flex-col items-center justify-center gap-6 p-8 sm:p-12">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
              >
                <Scissors className="h-7 w-7 text-primary" aria-hidden />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="text-center space-y-2"
              >
                <h2 className="text-2xl font-semibold text-foreground">
                  Divida contas sem friccao
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Organize quem pagou, quem deve e quanto falta receber em poucos cliques.
                  A RXFin calcula automaticamente os saldos para voce.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { icon: Users, label: 'Participantes' },
                  { icon: Wallet, label: 'Saldos' },
                  { icon: Sparkles, label: 'Calculo automatico' },
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
                  <Scissors className="h-4 w-4" aria-hidden />
                  Comecar agora
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        )}

        {!showWizard && !showHistory && !showIntro && (
          <Card className="rounded-[14px] border border-border/80">
            <CardContent className="flex flex-col items-center justify-center gap-6 p-8 sm:p-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Scissors className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Nova divisão ou histórico</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Inicie uma nova divisão de conta ou consulte as divisões anteriores.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => setShowWizard(true)} className="gap-2">
                  <Scissors className="h-4 w-4" aria-hidden />
                  Nova Divisão
                </Button>
                <Button variant="outline" onClick={() => setShowHistory(true)} className="gap-2">
                  <History className="h-4 w-4" aria-hidden />
                  Histórico
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default DividirConta;
