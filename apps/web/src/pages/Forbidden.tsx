import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Forbidden: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive" />
      <h1 className="text-2xl font-bold">Acesso restrito</h1>
      <p className="text-muted-foreground max-w-md">
        Você não tem permissão para acessar esta área.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
};

export default Forbidden;
