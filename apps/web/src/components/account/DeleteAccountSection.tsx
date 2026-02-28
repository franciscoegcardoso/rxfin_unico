import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle, Loader2, Eye, EyeOff, ShieldAlert, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const DeleteAccountSection: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const provider = user?.app_metadata?.provider || 'email';
  const isEmailProvider = provider === 'email';

  // Fetch active plan info
  const { data: workspace } = useQuery({
    queryKey: ['delete-account-plan-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id, plan_id, plan_expires_at, subscription_plans:plan_id(name, price_monthly)')
        .eq('owner_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const planName = (workspace?.subscription_plans as any)?.name || null;
  const planPrice = (workspace?.subscription_plans as any)?.price_monthly || 0;
  const expiresAt = workspace?.plan_expires_at ? new Date(workspace.plan_expires_at) : null;
  const daysRemaining = expiresAt ? Math.max(0, differenceInDays(expiresAt, new Date())) : 0;
  const hasActivePlan = planPrice > 0 && daysRemaining > 0;

  const handleDeleteAccount = async () => {
    if (isEmailProvider && password.length < 6) {
      toast.error('Digite sua senha para confirmar');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://kneaniaifzgqibpajyji.supabase.co/functions/v1/delete-own-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E',
          },
          body: JSON.stringify({ password: isEmailProvider ? password : undefined }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Erro ao excluir conta');
        setLoading(false);
        return;
      }

      toast.success('Sua conta foi excluída com sucesso.');
      
      // Clear everything and redirect
      setTimeout(async () => {
        await signOut();
        navigate('/auth');
      }, 1500);
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    setShowConfirmStep(false);
    setPassword('');
  };

  return (
    <>
      <div className="pt-4 border-t border-border/40">
        <button
          onClick={handleOpenDialog}
          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors underline-offset-2 hover:underline"
        >
          Excluir minha conta
        </button>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-md">
          {!showConfirmStep ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Excluir conta
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Ao prosseguir, sua conta será permanentemente excluída. Todos os seus dados 
                      pessoais identificáveis serão anonimizados conforme a Lei Geral de Proteção 
                      de Dados (LGPD – Lei nº 13.709/2018).
                    </p>

                    {hasActivePlan && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex gap-2">
                          <Calendar className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                              Plano {planName} ativo
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                              Você ainda possui <strong>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</strong> restantes 
                              no seu plano{expiresAt && <>, válido até {format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</>}. 
                              Conforme os termos de uso, a exclusão da conta não gera direito a reembolso 
                              proporcional do período não utilizado.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] space-y-1.5 pt-1">
                      <p className="font-medium text-foreground/80">O que acontecerá:</p>
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                        <li>Seus dados pessoais (nome, e-mail, CPF) serão anonimizados</li>
                        <li>Suas credenciais de acesso serão removidas</li>
                        <li>Registros financeiros serão desvinculados da sua identidade</li>
                        <li>Convites pendentes serão cancelados</li>
                      </ul>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowConfirmStep(true)}
                >
                  Continuar com a exclusão
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Confirmação final
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isEmailProvider
                    ? 'Digite sua senha para confirmar a exclusão definitiva da sua conta.'
                    : 'Confirme que deseja excluir permanentemente sua conta.'}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {isEmailProvider && (
                <div className="space-y-1.5 py-2">
                  <Label htmlFor="delete-password" className="text-xs text-muted-foreground">
                    Sua senha atual
                  </Label>
                  <div className="relative">
                    <Input
                      id="delete-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9 text-sm pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setShowConfirmStep(false);
                    setPassword('');
                  }}
                  disabled={loading}
                >
                  Voltar
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={loading || (isEmailProvider && password.length < 6)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Excluir minha conta
                    </>
                  )}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
