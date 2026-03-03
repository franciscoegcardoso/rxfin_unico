import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemedLogo } from '@/components/ui/themed-logo';

export const PublicSimuladoresHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 sm:h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="RXFin - Início">
          <ThemedLogo className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="sm:size-default" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button size="sm" className="sm:size-default" asChild>
            <Link to="/signup">Criar conta grátis</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};
