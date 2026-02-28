import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Car, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingLayout } from './OnboardingLayout';
import { OnboardingProgress } from './OnboardingProgress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_VEHICLES = 5;

interface VehicleForm {
  name: string;
  plate: string;
  year: string;
  fuelType: string;
}

const fuelTypeOptions = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'flex', label: 'Flex (Gasolina/Etanol)' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gnv', label: 'GNV' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const OnboardingVehicles: React.FC = () => {
  const { config, addAsset, removeAsset, setCurrentStep } = useFinancial();
  
  const vehicles = config.assets.filter(a => a.type === 'vehicle');
  
  const [newVehicle, setNewVehicle] = useState<VehicleForm>({
    name: '',
    plate: '',
    year: new Date().getFullYear().toString(),
    fuelType: 'flex',
  });
  const [isAddingNew, setIsAddingNew] = useState(vehicles.length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSharedAccount = config.accountType === 'shared';

  const validateVehicle = (vehicle: VehicleForm) => {
    const newErrors: Record<string, string> = {};
    
    if (!vehicle.name.trim()) {
      newErrors.name = 'Nome do veículo é obrigatório';
    }
    
    if (vehicle.year && (isNaN(Number(vehicle.year)) || Number(vehicle.year) < 1900 || Number(vehicle.year) > new Date().getFullYear() + 1)) {
      newErrors.year = 'Ano inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddVehicle = () => {
    if (!validateVehicle(newVehicle)) return;

    // Get owner as default main driver
    const ownerEmail = config.userProfile.email;
    const ownerDriver = config.drivers.find(d => d.isOwner || d.email === ownerEmail);
    
    addAsset({
      type: 'vehicle',
      name: newVehicle.name.trim(),
      value: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseValue: 0,
      fipeFullName: newVehicle.name.trim(),
      vehicleState: 'SP',
      fuelType: newVehicle.fuelType as any,
      mainDriverId: ownerDriver?.id,
    });

    setNewVehicle({ name: '', plate: '', year: new Date().getFullYear().toString(), fuelType: 'flex' });
    setIsAddingNew(false);
  };

  const handleRemoveVehicle = (id: string) => {
    removeAsset(id);
  };

  const getNextStep = () => {
    if (isSharedAccount) {
      return 4; // Go to Drivers
    }
    return 3; // Go to Drivers for individual
  };

  const getPreviousStep = () => {
    if (isSharedAccount) {
      return 2; // Go back to Shared People
    }
    return 1; // Go back to Personal Info for individual
  };

  const getSteps = () => {
    if (isSharedAccount) {
      return ['Setup', 'Dados', 'Pessoas', 'Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir'];
    }
    return ['Setup', 'Dados', 'Veículos', 'Motoristas', 'Receitas', 'Despesas', 'Sonhos', 'Concluir'];
  };

  const getCurrentStepIndex = () => {
    return isSharedAccount ? 3 : 2; // Veículos step
  };

  const steps = getSteps();
  const currentStepIndex = getCurrentStepIndex();

  const progressSteps = steps.map((label, index) => ({
    label,
    isComplete: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));

  const canAddMore = vehicles.length < MAX_VEHICLES;

  return (
    <OnboardingLayout variant="form">
      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Progress */}
        <OnboardingProgress steps={progressSteps} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Veículos da Família</h1>
              <p className="text-muted-foreground">Cadastre os veículos para acompanhar custos e manutenções</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {vehicles.length}/{MAX_VEHICLES}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-accent/50 border border-border rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Os veículos cadastrados permitirão o controle de abastecimentos, manutenções e despesas associadas.
            Você poderá complementar os dados depois.
          </p>
        </div>

        {/* Vehicles List */}
        <div className="space-y-3 mb-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{vehicle.name}</p>
                      {vehicle.fuelType && (
                        <p className="text-sm text-muted-foreground">
                          {fuelTypeOptions.find(f => f.value === vehicle.fuelType)?.label || vehicle.fuelType}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveVehicle(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add New Vehicle Form */}
        {isAddingNew ? (
          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Novo Veículo</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-name">Nome do Veículo *</Label>
                <Input
                  id="vehicle-name"
                  placeholder="Ex: Gol 2020, Honda Civic, etc."
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-year">Ano</Label>
                  <Input
                    id="vehicle-year"
                    type="number"
                    placeholder={new Date().getFullYear().toString()}
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, year: e.target.value }))}
                    className={cn(errors.year && "border-destructive")}
                  />
                  {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-fuel">Combustível</Label>
                  <Select
                    value={newVehicle.fuelType}
                    onValueChange={(value) => setNewVehicle(prev => ({ ...prev, fuelType: value }))}
                  >
                    <SelectTrigger id="vehicle-fuel">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {vehicles.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewVehicle({ name: '', plate: '', year: new Date().getFullYear().toString(), fuelType: 'flex' });
                      setErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleAddVehicle}
                  disabled={!newVehicle.name.trim()}
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
            Adicionar Veículo
          </Button>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Limite máximo de veículos atingido
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setCurrentStep(getPreviousStep())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="hero" onClick={() => setCurrentStep(getNextStep())}>
            Próximo: Motoristas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
};
