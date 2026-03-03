import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail, Lock, User, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { z } from 'zod';
import { ThemedLogo } from '@/components/ui/themed-logo';
import { InternationalPhoneInput, Country } from '@/components/ui/international-phone-input';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter letra maiúscula')
  .regex(/[a-z]/, 'Deve conter letra minúscula')
  .regex(/[0-9]/, 'Deve conter número');

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    if (user && !signupSuccess) {
      navigate('/inicio');
    }
  }, [user, signupSuccess, navigate]);

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter no mínimo 3 caracteres';
    }
    
    try {
      emailSchema.parse(email);
    } catch {
      newErrors.email = 'Email inválido';
    }
    
    // Phone validation - must have at least the minimum digits for the country
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 8) {
      newErrors.phone = 'Telefone inválido';
    }
    
    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.password = err.errors[0].message;
      }
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os termos de uso e política de privacidade');
      return;
    }

    setIsLoading(true);
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          full_name: name.trim(),
          phone: phone,
        }
      }
    });
    
    if (error) {
      setIsLoading(false);
      if (error.message.includes('User already registered')) {
        toast.error(
          <div className="space-y-1">
            <p>Este email já está cadastrado.</p>
            <button 
              onClick={() => setShowForgotPassword(true)}
              className="text-primary underline hover:no-underline text-sm"
            >
              Recuperar senha?
            </button>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error('Erro ao criar conta: ' + error.message);
      }
      return;
    }

    // Update profile with phone number and record consent (ignore 401 errors)
    if (data?.user) {
      try {
        await supabase
          .from('profiles')
          .update({ 
            phone: phone,
            status: 'pending'
          })
          .eq('id', data.user.id);

        // Record consent - ignore 401 errors silently
        try {
          const { data: docs } = await supabase
            .from('legal_documents')
            .select('slug, version')
            .in('slug', ['termos-de-uso', 'politica-privacidade']);

          const consents = (docs || []).map((doc) => ({
            user_id: data.user!.id,
            document_slug: doc.slug,
            document_version: doc.version,
            user_agent: navigator.userAgent,
          }));

          if (consents.length > 0) {
            await supabase.from('user_consents').insert(consents);
          }
        } catch (consentError: any) {
          // Silently ignore 401 Unauthorized errors on user_consents
          if (consentError?.status !== 401 && !consentError?.message?.includes('401')) {
            console.error('Error recording consent:', consentError);
          }
        }
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Trigger n8n webhook for signup email
      try {
        await supabase.functions.invoke('send-email-n8n', {
          body: {
            type: 'welcome',
            email: email,
            userName: name.trim(),
            templateSlug: 'signup-welcome',
            variables: {
              userName: name.trim(),
            }
          }
        });
      } catch (webhookError) {
        console.error('Error triggering signup webhook:', webhookError);
        // Don't block signup flow if webhook fails
      }
    }

    setIsLoading(false);
    
    // Show success screen instead of redirecting to OTP page
    setSignupSuccess(true);
  };

  const handlePhoneChange = (value: string, country: Country) => {
    setPhone(value);
    setPhoneCountry(country);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RXFinLoadingSpinner size={56} />
      </div>
    );
  }

  // Success screen after signup
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <ThemedLogo className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-primary">RXFin</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Conta Criada!</h2>
                <p className="text-muted-foreground text-lg">
                  Verifique seu e-mail para acessar
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enviamos um link de confirmação para:
                </p>
                <p className="font-medium text-foreground">{email}</p>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Não recebeu? Verifique sua pasta de spam.</p>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <Link to={`/verificar-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name.trim())}`}>
                  <Button className="w-full">
                    Inserir código de verificação
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 py-8">
      {/* Back Button */}
      <a 
        href="https://rxfin.com.br" 
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </a>

      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <ThemedLogo className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-primary">RXFin</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              Preencha seus dados para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <InternationalPhoneInput
                  value={phone}
                  onChange={handlePhoneChange}
                  defaultCountry="BR"
                  error={errors.phone}
                  disabled={isLoading}
                />
              </div>
              
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crie uma senha forte"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                
                {/* Password strength indicators */}
                {password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength >= level
                              ? passwordStrength <= 2
                                ? 'bg-destructive'
                                : passwordStrength === 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="h-3 w-3" /> 8+ caracteres
                      </div>
                      <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="h-3 w-3" /> Maiúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="h-3 w-3" /> Minúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                        <CheckCircle2 className="h-3 w-3" /> Número
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                {confirmPassword && password === confirmPassword && !errors.confirmPassword && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Senhas coincidem
                  </p>
                )}
              </div>
              
              {/* Terms */}
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  Li e aceito os{' '}
                  <Link to="/termos-de-uso" target="_blank" className="text-primary hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/politica-privacidade" target="_blank" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Criar Conta
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link 
                to="/login" 
                className="text-primary font-medium hover:underline"
              >
                Entrar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Signup;
