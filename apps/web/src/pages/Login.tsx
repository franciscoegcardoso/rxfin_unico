import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, Lock, ArrowLeft } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { z } from 'zod';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;
  const { user, signIn, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const state = location.state as { error?: string; message?: string } | null;
    if (state?.error) {
      toast.error(state.error);
      window.history.replaceState({}, document.title);
    }
    if (state?.message) {
      toast.success(state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { targetRoute, isLoading: redirectLoading } = useAuthRedirect();

  useEffect(() => {
    if (user && !redirectLoading) {
      const destination = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : targetRoute;
      navigate(destination, { replace: true });
    }
  }, [user, navigate, targetRoute, redirectLoading, redirect]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch {
      newErrors.email = 'Email inválido';
    }
    
    try {
      passwordSchema.parse(password);
    } catch {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu email antes de fazer login');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-6">
      {/* Back Button - touch-friendly */}
      <a 
        href="https://rxfin.com.br" 
        className="absolute top-4 left-4 flex items-center gap-2 text-sm min-h-[44px] min-w-[44px] touch-manipulation text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sm:inline">Voltar</span>
      </a>

      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header - typography responsiva */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <ThemedLogo className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">RXFin</h1>
          <p className="text-sm text-muted-foreground min-h-[14px]">Seu Raio-X Financeiro completo</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center text-sm">
              Acesse sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`pl-10 min-h-[44px] w-full touch-manipulation ${errors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label htmlFor="password" className="text-sm">Senha</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto min-h-[44px] font-normal text-sm text-muted-foreground hover:text-primary touch-manipulation"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={`pl-10 min-h-[44px] w-full touch-manipulation ${errors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              
              <Button type="submit" className="w-full min-h-[44px] text-sm sm:text-base" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Entrar
              </Button>

              <div className="mt-6">
                <SocialLoginButtons disabled={isLoading} />
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link 
                to="/signup" 
                className="text-primary font-medium hover:underline touch-manipulation"
              >
                Criar conta
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ao continuar, você concorda com nossos{' '}
          <Link to="/termos-de-uso" className="underline hover:text-foreground">
            Termos de Uso
          </Link>{' '}
          e{' '}
          <Link to="/politica-privacidade" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>
        </p>
      </div>
      
      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Login;
