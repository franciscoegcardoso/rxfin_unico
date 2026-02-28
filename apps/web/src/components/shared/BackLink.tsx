import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackLinkProps {
  to: string;
  label: string;
  className?: string;
}

export const BackLink: React.FC<BackLinkProps> = ({ to, label, className }) => {
  return (
    <Link to={to} className={cn("inline-flex", className)}>
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </Button>
    </Link>
  );
};
