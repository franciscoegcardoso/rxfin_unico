import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface SecureConnectionBadgeProps {
  className?: string;
}

export const SecureConnectionBadge: React.FC<SecureConnectionBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground/70 select-none ${className}`}>
      <ShieldCheck className="h-3 w-3 text-green-500/80 shrink-0" />
      <span className="truncate">Conexão segura — Dados criptografados</span>
    </div>
  );
};
