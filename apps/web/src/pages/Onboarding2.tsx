import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Phone, AlertCircle, Check, ArrowRight, ListChecks, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Onboarding2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Guard: redirect away if onboarding is already completed in Supabase
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .rpc('get_user_profile_settings')
      .then(({ data }) => {
        if (cancelled) return;
        const profile = (data as { profile?: { onboarding_completed?: boolean | null } | null })?.profile;
        if (profile?.onboarding_completed === true) {
          navigate('/simuladores', { replace: true });
        }
      });
    return () => { cancelled = true; };
  }, [user?.id, navigate]);

  // Pre-fill from auth user data
  useEffect(() => {
    if (user) {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const nameParts = fullName.trim().split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [user]);

  // Generate options with memoization
  const currentYear = new Date().getFullYear();
  
  const dayOptions = useMemo(() => 
    Array.from({ length: 31 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return { value: day, label: day };
    }), 
  []);

  const monthOptions = useMemo(() => [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ], []);

  const yearOptions = useMemo(() => 
    Array.from({ length: currentYear - 1900 + 1 }, (_, i) => {
      const year = String(currentYear - i);
      return { value: year, label: year };
    }), 
  [currentYear]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = 'Primeiro nome é obrigatório';
    if (!lastName.trim()) newErrors.lastName = 'Último nome é obrigatório';
    
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!birthYear || !birthMonth || !birthDay) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    } else {
      const year = parseInt(birthYear);
      const month = parseInt(birthMonth);
      const day = parseInt(birthDay);
      if (year < 1900 || year > currentYear) newErrors.birthDate = 'Ano inválido';
      else if (month < 1 || month > 12) newErrors.birthDate = 'Mês inválido';
      else if (day < 1 || day > 31) newErrors.birthDate = 'Dia inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;
    
    setIsSubmitting(true);
    
    try {
      const birthDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const phoneDigits = phone.replace(/\D/g, '') || null;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phoneDigits,
          birth_date: birthDate,
          marketing_opt_in: marketingOptIn,
          onboarding_completed: true,
          status: 'active',
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving onboarding data:', error);
        toast.error('Erro ao salvar seus dados. Tente novamente.');
        return;
      }

      setShowWelcome(true);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Welcome screen after successful registration
  if (showWelcome) {
    return (
      <OnboardingLayout variant="form">
        <div className="w-full max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-card">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4 mx-auto"
                >
                  <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <CardTitle className="text-2xl">
                  Bem-vindo ao RXFin, {firstName}! 🎉
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Seu perfil foi criado com sucesso. Agora vamos configurar sua vida financeira em poucos passos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Next steps preview */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Próximos passos:</p>
                  {[
                    { icon: ListChecks, label: 'Configurar receitas e despesas', desc: 'Defina suas fontes de renda e categorias de gastos' },
                    { icon: CreditCard, label: 'Importar cartão de crédito', desc: 'Importe sua fatura para categorização automática' },
                    { icon: Wallet, label: 'Registrar bens e patrimônio', desc: 'Cadastre veículos, imóveis e bens financeiros' },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.15 }}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3 pt-2">
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => navigate('/inicio')}
                  >
                    Começar Configuração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => navigate('/inicio')}
                  >
                    Explorar primeiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout variant="form">
      <div className="w-full max-w-xl mx-auto animate-slide-up">
        {/* Simple progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="h-2 w-24 rounded-full bg-primary" />
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-4 mx-auto">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Complete seu Perfil</CardTitle>
            <CardDescription>
              Confirme seus dados para começar a usar o RXFin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Primeiro Nome *</Label>
                <Input
                  id="firstName"
                  placeholder="Digite seu primeiro nome"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Último Nome *</Label>
                <Input
                  id="lastName"
                  placeholder="Digite seu último nome"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Opcional - usado apenas para recuperação de conta
              </p>
            </div>

            {/* Birth date field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Nascimento *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <SearchableSelect
                  options={dayOptions}
                  value={birthDay}
                  onValueChange={(val) => {
                    setBirthDay(val);
                    if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: '' }));
                  }}
                  placeholder="Dia"
                  searchPlaceholder="Buscar dia..."
                  emptyMessage="Dia não encontrado"
                  error={!!errors.birthDate}
                />
                <SearchableSelect
                  options={monthOptions}
                  value={birthMonth}
                  onValueChange={(val) => {
                    setBirthMonth(val);
                    if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: '' }));
                  }}
                  placeholder="Mês"
                  searchPlaceholder="Buscar mês..."
                  emptyMessage="Mês não encontrado"
                  error={!!errors.birthDate}
                />
                <SearchableSelect
                  options={yearOptions}
                  value={birthYear}
                  onValueChange={(val) => {
                    setBirthYear(val);
                    if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: '' }));
                  }}
                  placeholder="Ano"
                  searchPlaceholder="Buscar ano..."
                  emptyMessage="Ano não encontrado"
                  error={!!errors.birthDate}
                />
              </div>
              {errors.birthDate && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.birthDate}
                </p>
              )}
            </div>

            {/* Marketing opt-in */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="marketing"
                  checked={marketingOptIn}
                  onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                    Quero receber novidades do RXFin
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Atualizações sobre novos recursos, dicas financeiras e conteúdos exclusivos
                  </p>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              variant="hero"
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Salvando...'
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Concluir e Começar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  );
};

export default Onboarding2;
