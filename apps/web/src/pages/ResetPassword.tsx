import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { CibeliaAuthWidget } from '@/components/auth/CibeliaAuthWidget';

const emailSchema = z.string().email('Email inválido');

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <CibeliaAuthWidget />
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Verifique seu Email</h2>
            <p className="text-muted-foreground mb-2">
              Se existe uma conta com o email <strong className="text-foreground">{email}</strong>, você receberá as instruções para redefinir sua senha.
            </p>
            <div className="mt-6 space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Dicas importantes:</p>
                <ul className="list-disc list-inside space-y-0.5 text-left">
                  <li>O link expira em 1 hora</li>
                  <li>Verifique também a pasta de spam</li>
                  <li>Aguarde alguns minutos antes de solicitar novamente</li>
                </ul>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <CibeliaAuthWidget />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ThemedLogo className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Mail className="h-5 w-5" />
            Recuperar Senha
          </CardTitle>
          <CardDescription>
            Digite seu e-mail para receber o link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </Button>

            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                Voltar ao Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
