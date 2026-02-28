import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UsersRound, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PeopleTab } from '@/components/rxsplit/PeopleTab';
import { GroupsTab } from '@/components/rxsplit/GroupsTab';
import { ExpensesTab } from '@/components/rxsplit/ExpensesTab';
import { BalanceTab } from '@/components/rxsplit/BalanceTab';

type Tab = 'people' | 'groups' | 'expenses' | 'balance';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'groups', label: 'Grupos', icon: UsersRound },
  { id: 'expenses', label: 'Despesas', icon: Receipt },
  { id: 'balance', label: 'Saldos', icon: Wallet },
];

const RXSplit: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('people');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">RX Split</h1>
            <p className="text-xs text-primary-foreground/70">Divisão de despesas entre grupos</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-primary-foreground/10 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary-foreground text-primary shadow-sm'
                  : 'text-primary-foreground/70 hover:text-primary-foreground'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'balance' && <BalanceTab />}
      </div>
    </div>
  );
};

export default RXSplit;
