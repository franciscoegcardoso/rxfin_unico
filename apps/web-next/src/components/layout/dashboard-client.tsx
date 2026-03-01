'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardClientProps {
  user: User;
  children: React.ReactNode;
}

export function DashboardClient({ user, children }: DashboardClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
