import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { cn } from '@/lib/utils';

interface AdminNavItem {
  label: string;
  href: string;
}

const navItems: AdminNavItem[] = [
  { label: 'CRM', href: '/admin/crm' },
  { label: 'Marketing', href: '/admin/marketing' },
  { label: 'AI Métricas', href: '/admin/ai-metrics' },
  { label: 'AI Feedback', href: '/admin/ai-feedback' },
];

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  const location = useLocation();

  return (
    <div className="space-y-4">
      {/* Top bar: logo + back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThemedLogo className="h-8 w-8 object-contain" />
          <div className="h-6 w-px bg-border" />
          <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Admin
          </Link>
        </div>
        {actions}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Sub-navigation */}
      <nav className="flex items-center gap-1 border-b border-border pb-0">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2',
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
