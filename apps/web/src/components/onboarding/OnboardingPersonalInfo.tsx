import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowLeft, User, Mail, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingLayout } from './OnboardingLayout';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const OnboardingPersonalInfo: React.FC = () => {
  const { config, updateUserProfile, setCurrentStep } = useFinancial();
  const { user } = useAuth();
  const { userProfile } = config;
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasPreFilled, setHasPreFilled] = useState(false);

  // Date picker state
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');

  // Pre-fill from auth user data on mount
  useEffect(() => {
    if (user && !hasPreFilled) {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const email = user.email || '';

      // Always update if we have data from auth
      if (firstName || email) {
        updateUserProfile({
          firstName: firstName || userProfile.firstName,
          lastName: lastName || userProfile.lastName,
          email: email || userProfile.email,
        });
        setHasPreFilled(true);
      }
    }
  }, [user, hasPreFilled, updateUserProfile, userProfile.firstName, userProfile.lastName, userProfile.email]);

  // Parse existing birthDate into components
  useEffect(() => {
    if (userProfile.birthDate && !birthDay && !birthMonth && !birthYear) {
      const [year, month, day] = userProfile.birthDate.split('-');
      if (year && month && day) {
        setBirthYear(year);
        setBirthMonth(month);
        setBirthDay(day);
      }
    }
  }, [userProfile.birthDate, birthDay, birthMonth, birthYear]);

  // Update birthDate when components change
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const formattedDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      if (formattedDate !== userProfile.birthDate) {
        updateUserProfile({ birthDate: formattedDate });
        if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: '' }));
      }
    }
  }, [birthYear, birthMonth, birthDay, updateUserProfile, userProfile.birthDate, errors.birthDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!userProfile.firstName.trim()) {
      newErrors.firstName = 'Primeiro nome é obrigatório';
    }
    
    if (!userProfile.lastName.trim()) {
      newErrors.lastName = 'Último nome é obrigatório';
    }
    
    if (!userProfile.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userProfile.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!birthYear || !birthMonth || !birthDay) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    } else {
      const year = parseInt(birthYear);
      const month = parseInt(birthMonth);
      const day = parseInt(birthDay);
      const currentYear = new Date().getFullYear();
      
      if (year < 1900 || year > currentYear) {
        newErrors.birthDate = 'Ano inválido';
      } else if (month < 1 || month > 12) {
        newErrors.birthDate = 'Mês inválido';
      } else if (day < 1 || day > 31) {
        newErrors.birthDate = 'Dia inválido';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // Both shared and individual go to step 2
      // Shared: goes to shared people config
      // Individual: goes to drivers (OnboardingDrivers handles both)
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

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

  return (
    <OnboardingLayout variant="form">
      <div className="w-full max-w-xl mx-auto animate-slide-up">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 w-12 rounded-full transition-colors ${
                step <= 1 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-4 mx-auto">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
            <CardDescription>
              Preencha seus dados para personalizar sua experiência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Primeiro Nome *</Label>
                <Input
                  id="firstName"
                  placeholder="Digite seu primeiro nome"
                  value={userProfile.firstName}
                  onChange={(e) => {
                    updateUserProfile({ firstName: e.target.value });
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
                  value={userProfile.lastName}
                  onChange={(e) => {
                    updateUserProfile({ lastName: e.target.value });
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

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={userProfile.email}
                onChange={(e) => {
                  updateUserProfile({ email: e.target.value });
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Nascimento *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {/* Day Select with Search */}
                <SearchableSelect
                  options={dayOptions}
                  value={birthDay}
                  onValueChange={setBirthDay}
                  placeholder="Dia"
                  searchPlaceholder="Buscar dia..."
                  emptyMessage="Dia não encontrado"
                  error={!!errors.birthDate}
                />

                {/* Month Select with Search */}
                <SearchableSelect
                  options={monthOptions}
                  value={birthMonth}
                  onValueChange={setBirthMonth}
                  placeholder="Mês"
                  searchPlaceholder="Buscar mês..."
                  emptyMessage="Mês não encontrado"
                  error={!!errors.birthDate}
                />

                {/* Year Select with Search */}
                <SearchableSelect
                  options={yearOptions}
                  value={birthYear}
                  onValueChange={setBirthYear}
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

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleContinue}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  );
};
