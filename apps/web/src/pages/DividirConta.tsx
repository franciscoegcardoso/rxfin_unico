import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scissors, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillSplitWizard } from '@/components/billsplit/BillSplitWizard';
import { BillSplitHistory } from '@/components/billsplit/BillSplitHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/core/hooks/useProfile';

const DividirConta: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const [showWizard, setShowWizard] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const currentUserName = profile?.full_name || user?.email?.split('@')[0] || 'Você';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showWizard ? (
        <BillSplitWizard
          isOpen={showWizard}
          onClose={() => navigate(-1)}
          currentUserName={currentUserName}
        />
      ) : showHistory ? (
        <BillSplitHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
          <Scissors className="w-16 h-16 text-primary/30" />
          <h1 className="text-xl font-bold">Dividir Conta</h1>
          <div className="flex gap-3">
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Scissors className="w-4 h-4" /> Nova Divisão
            </Button>
            <Button variant="outline" onClick={() => setShowHistory(true)} className="gap-2">
              <History className="w-4 h-4" /> Histórico
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DividirConta;
