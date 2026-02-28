import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Users, Trash2, User, Mail, Check, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { useFinancial } from '@/contexts/FinancialContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingLayout } from './OnboardingLayout';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SharedPersonForm {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export const OnboardingSharedPeople: React.FC = () => {
  const { config, addSharedPerson, removeSharedPerson, updateSharedPerson, setCurrentStep } = useFinancial();
  
  // Get non-owner shared people
  const sharedPeople = config.sharedWith.filter(p => !p.isOwner);
  
  const [newPerson, setNewPerson] = useState<SharedPersonForm>({
    id: '',
    name: '',
    phone: '',
    email: '',
  });
  const [isAddingNew, setIsAddingNew] = useState(sharedPeople.length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNoAccessDialog, setShowNoAccessDialog] = useState(false);
  const [pendingContinue, setPendingContinue] = useState(false);

  const validatePerson = (person: SharedPersonForm) => {
    const newErrors: Record<string, string> = {};
    
    if (!person.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) {
      newErrors.email = 'Email inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPerson = () => {
    if (!validatePerson(newPerson)) return;

    addSharedPerson(
      newPerson.name.trim(),
      newPerson.email.trim() || undefined
    );

    setNewPerson({ id: '', name: '', phone: '', email: '' });
    setIsAddingNew(false);
  };

  const handleRemovePerson = (id: string) => {
    removeSharedPerson(id);
  };

  // Check if any person lacks contact info (no email AND no phone)
  const checkForMissingAccess = (): string[] => {
    const peopleWithoutAccess: string[] = [];
    
    // Check existing people
    sharedPeople.forEach(person => {
      if (!person.email) {
        peopleWithoutAccess.push(person.name);
      }
    });
    
    // Check new person being added
    if (isAddingNew && newPerson.name.trim() && !newPerson.email.trim() && !newPerson.phone.trim()) {
      peopleWithoutAccess.push(newPerson.name);
    }
    
    return peopleWithoutAccess;
  };

  const handleContinue = () => {
    // First, add any pending person
    if (sharedPeople.length === 0 && isAddingNew) {
      if (!validatePerson(newPerson)) return;
    }

    const peopleWithoutAccess = checkForMissingAccess();
    
    if (peopleWithoutAccess.length > 0) {
      setShowNoAccessDialog(true);
      setPendingContinue(true);
      return;
    }
    
    proceedToNext();
  };

  const proceedToNext = () => {
    if (sharedPeople.length === 0 && isAddingNew && newPerson.name.trim()) {
      handleAddPerson();
    }
    setCurrentStep(3); // Go to Vehicles
  };

  const handleConfirmNoAccess = () => {
    setShowNoAccessDialog(false);
    setPendingContinue(false);
    
    // Add person if pending
    if (sharedPeople.length === 0 && isAddingNew && newPerson.name.trim()) {
      handleAddPerson();
    }
    
    setCurrentStep(3); // Go to Vehicles
  };

  const handleBack = () => {
    setCurrentStep(1); // Back to Personal Info
  };

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              <Check className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground">Setup</span>
          </div>
          <div className="h-0.5 w-8 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              <Check className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground">Dados</span>
          </div>
          <div className="h-0.5 w-8 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="text-sm font-medium text-foreground">Pessoas</span>
          </div>
          <div className="h-0.5 w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
              4
            </div>
            <span className="text-sm text-muted-foreground">Veículos</span>
          </div>
          <div className="h-0.5 w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
              5
            </div>
            <span className="text-sm text-muted-foreground">Motoristas</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pessoas que Compartilham</h1>
            <p className="text-muted-foreground">Adicione as pessoas que compartilham as finanças com você</p>
          </div>
        </div>

        {/* Explanatory Note */}
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong className="text-foreground">Como funciona o acesso compartilhado?</strong>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Com email preenchido:</strong> Enviaremos um convite para a pessoa criar sua própria conta e visualizar as finanças compartilhadas.
              </li>
              <li>
                <strong>Sem email:</strong> A pessoa será registrada apenas para organização interna (ex: dividir despesas), mas <strong>não terá acesso</strong> ao RXFin.
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Existing People */}
        {sharedPeople.length > 0 && (
          <div className="space-y-3 mb-6">
            {sharedPeople.map((person) => (
              <Card key={person.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{person.name}</p>
                        {person.email ? (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {person.email}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sem acesso ao app
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemovePerson(person.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add New Person Form */}
        {isAddingNew ? (
          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Nova Pessoa</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <PhoneInput
                  id="phone"
                  value={newPerson.phone}
                  onChange={(value) => setNewPerson(prev => ({ ...prev, phone: value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  Email
                  <span className="text-xs text-muted-foreground font-normal">(necessário para dar acesso ao app)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson(prev => ({ ...prev, email: e.target.value }))}
                    className={cn("pl-10", errors.email && "border-destructive")}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                {sharedPeople.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewPerson({ id: '', name: '', phone: '', email: '' });
                      setErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleAddPerson}
                  disabled={!newPerson.name.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full py-6 border-dashed"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Pessoa
          </Button>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="hero"
            onClick={handleContinue}
            disabled={sharedPeople.length === 0 && !newPerson.name.trim()}
          >
            Próximo: Veículos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for No Access */}
      <AlertDialog open={showNoAccessDialog} onOpenChange={setShowNoAccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Pessoa sem acesso ao RXFin</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Você não preencheu o email de uma ou mais pessoas. Isso significa que:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Elas <strong>não receberão</strong> convite para criar conta</li>
                  <li>Elas <strong>não poderão</strong> acessar o app ou visualizar as finanças</li>
                  <li>Serão usadas apenas para organização interna (ex: dividir despesas)</li>
                </ul>
                <p className="text-foreground font-medium">
                  Deseja continuar assim mesmo?
                </p>
                <p className="text-xs text-muted-foreground italic">
                  💡 Você poderá adicionar o email dessas pessoas depois, nas configurações do app.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e preencher email</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNoAccess} className="bg-primary hover:bg-primary/90">
              Continuar sem acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OnboardingLayout>
  );
};
