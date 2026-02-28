import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Plus, Car, Trash2, User, Mail, Check, Crown, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OnboardingLayout } from './OnboardingLayout';
import { OnboardingProgress } from './OnboardingProgress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_DRIVERS = 5;

interface DriverForm {
  name: string;
  email: string;
}

export const OnboardingDrivers: React.FC = () => {
  const { config, addDriver, removeDriver, updateAsset, setCurrentStep } = useFinancial();
  
  const [newDriver, setNewDriver] = useState<DriverForm>({ name: '', email: '' });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hasInitialized = useRef(false);

  const isSharedAccount = config.accountType === 'shared';
  const vehicles = config.assets.filter(a => a.type === 'vehicle');

  // Initialize drivers from shared people - only once
  useEffect(() => {
    if (hasInitialized.current) return;
    
    // Check if we already have the owner as driver
    const ownerEmail = config.userProfile.email;
    const hasOwnerDriver = config.drivers.some(d => d.isOwner || d.email === ownerEmail);
    
    if (!hasOwnerDriver) {
      // Add owner as first driver
      const ownerName = `${config.userProfile.firstName} ${config.userProfile.lastName}`.trim() || 'Proprietário';
      addDriver(ownerName, ownerEmail, true);
    }

    // Add shared people as drivers if not already added
    const sharedPeople = config.sharedWith.filter(p => !p.isOwner);
    sharedPeople.forEach(person => {
      const alreadyExists = config.drivers.some(
        d => d.name === person.name || (person.email && d.email === person.email)
      );
      if (!alreadyExists && config.drivers.length < MAX_DRIVERS) {
        addDriver(person.name, person.email, false);
      }
    });

    hasInitialized.current = true;
  }, [config.userProfile, config.sharedWith, config.drivers, addDriver]);

  // Set default main driver for vehicles without one
  useEffect(() => {
    const ownerDriver = config.drivers.find(d => d.isOwner);
    if (ownerDriver) {
      vehicles.forEach(vehicle => {
        if (!vehicle.mainDriverId) {
          updateAsset(vehicle.id, { mainDriverId: ownerDriver.id });
        }
      });
    }
  }, [vehicles, config.drivers, updateAsset]);

  const validateDriver = (driver: DriverForm) => {
    const newErrors: Record<string, string> = {};
    
    if (!driver.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (driver.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driver.email)) {
      newErrors.email = 'Email inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddDriver = () => {
    if (!validateDriver(newDriver)) return;

    addDriver(
      newDriver.name.trim(),
      newDriver.email.trim() || undefined,
      false
    );

    setNewDriver({ name: '', email: '' });
    setIsAddingNew(false);
  };

  const handleRemoveDriver = (id: string) => {
    const driver = config.drivers.find(d => d.id === id);
    if (driver?.isOwner) return; // Can't remove owner
    removeDriver(id);
  };

  const handleChangeMainDriver = (vehicleId: string, driverId: string) => {
    updateAsset(vehicleId, { mainDriverId: driverId });
  };

  const getNextStep = () => {
    if (isSharedAccount) {
      return 5; // Go to Income (owner)
    }
    return 4; // Go to Income for individual
  };

  const getPreviousStep = () => {
    if (isSharedAccount) {
      return 3; // Go back to Vehicles
    }
    return 2; // Go back to Vehicles for individual
  };

  const getSteps = () => {
    if (isSharedAccount) {
      return ['Setup', 'Dados', 'Pessoas', 'Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir'];
    }
    return ['Setup', 'Dados', 'Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir'];
  };

  const getCurrentStepIndex = () => {
    return isSharedAccount ? 4 : 3; // Motoristas step (after Veículos)
  };

  const steps = getSteps();
  const currentStepIndex = getCurrentStepIndex();

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  const canAddMore = config.drivers.length < MAX_DRIVERS;

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Progress */}
        <OnboardingProgress steps={progressSteps} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cadastro de Motoristas</h1>
              <p className="text-muted-foreground">Configure quem dirige os veículos da família</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {config.drivers.length}/{MAX_DRIVERS}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-accent/50 border border-border rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Os motoristas cadastrados poderão registrar abastecimentos, manutenções e quilometragem dos veículos.
            Limite de {MAX_DRIVERS} motoristas por conta.
          </p>
        </div>

        {/* Drivers List */}
        <div className="space-y-3 mb-6">
          {config.drivers.map((driver) => (
            <Card key={driver.id} className={cn(
              "border",
              driver.isOwner ? "border-primary/30 bg-primary/5" : "border-border"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      driver.isOwner ? "bg-primary/20" : "bg-muted"
                    )}>
                      {driver.isOwner ? (
                        <Crown className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{driver.name}</p>
                        {driver.isOwner && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Proprietário
                          </Badge>
                        )}
                      </div>
                      {driver.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {driver.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {!driver.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveDriver(driver.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add New Driver Form */}
        {isAddingNew ? (
          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Novo Motorista</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver-name">Nome *</Label>
                <Input
                  id="driver-name"
                  placeholder="Nome completo"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="driver-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, email: e.target.value }))}
                    className={cn("pl-10", errors.email && "border-destructive")}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewDriver({ name: '', email: '' });
                    setErrors({});
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddDriver}
                  disabled={!newDriver.name.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : canAddMore ? (
          <Button
            variant="outline"
            className="w-full py-6 border-dashed"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Motorista
          </Button>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Limite máximo de motoristas atingido
          </div>
        )}

        {/* Vehicle Main Driver Assignment */}
        {vehicles.length > 0 && config.drivers.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Condutor Principal de Cada Veículo
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Defina quem é o motorista principal de cada veículo cadastrado.
            </p>
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-foreground">{vehicle.name}</p>
                      </div>
                      <div className="sm:w-48">
                        <Select
                          value={vehicle.mainDriverId || ''}
                          onValueChange={(value) => handleChangeMainDriver(vehicle.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o motorista" />
                          </SelectTrigger>
                          <SelectContent>
                            {config.drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name} {driver.isOwner && '(Proprietário)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setCurrentStep(getPreviousStep())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="hero" onClick={() => setCurrentStep(getNextStep())}>
            Próximo: Receitas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
};
