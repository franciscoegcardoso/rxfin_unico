import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scissors, History } from 'lucide-react';
import { BillSplitWizard } from '@/components/billsplit/BillSplitWizard';
import { BillSplitHistory } from '@/components/billsplit/BillSplitHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/core/hooks/useProfile';

const DividirConta: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

        {!showWizard && !showHistory && (
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
