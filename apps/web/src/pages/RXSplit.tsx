import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UsersRound, Receipt, Wallet } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<Tab>('people');

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full w-full max-w-full overflow-x-hidden">
        <PageHeader
          icon={UsersRound}
          title="RX Split"
          subtitle="Divisão de despesas entre grupos e pessoas"
        />

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
      </div>
    </AppLayout>
  );
};

export default RXSplit;
