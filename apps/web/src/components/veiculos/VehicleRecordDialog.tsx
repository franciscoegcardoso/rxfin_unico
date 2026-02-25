import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useFinancial } from "@/contexts/FinancialContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  VehicleRecord,
  VehicleRecordType,
  VehicleExpenseCategory,
  VehicleServiceType,
  VehicleFuelType,
  VehicleFuelUnit,
  vehicleExpenseCategoryLabels,
  vehicleServiceTypeLabels,
  vehicleFuelTypeLabels,
  fuelTypeToUnit,
  fuelUnitLabels,
  fuelUnitPriceLabels,
} from "@/types/vehicle";
import { Car, Fuel, Wrench, Receipt } from "lucide-react";

interface VehicleRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (record: VehicleRecord) => void;
  editRecord?: VehicleRecord | null;
}

export const VehicleRecordDialog: React.FC<VehicleRecordDialogProps> = ({ open, onOpenChange, onSave, editRecord }) => {
  const { config } = useFinancial();
  const { user } = useAuth();
  const vehicles = config.assets.filter((a) => a.type === "vehicle");
  const activeVehicles = vehicles.filter((v) => !v.isSold);
  const drivers = config.drivers;

  // Get default driver from logged-in user - only return if exists in drivers list
  const getDefaultDriver = () => {
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    // Check if user name matches any driver (exact or partial match)
    const exactMatch = drivers.find(d => d.name.toLowerCase() === userName.toLowerCase());
    if (exactMatch) return exactMatch.name;
    
    // Try partial match (driver name contains user name or vice versa)
    const partialMatch = drivers.find(d => 
      d.name.toLowerCase().includes(userName.toLowerCase()) || 
      userName.toLowerCase().includes(d.name.toLowerCase())
    );
    return partialMatch?.name || null;
  };

  const [recordType, setRecordType] = useState<VehicleRecordType>("fuel");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [odometer, setOdometer] = useState(0);
  const [driverName, setDriverName] = useState("");
  const [customDriverName, setCustomDriverName] = useState("");
  const [useCustomDriver, setUseCustomDriver] = useState(false);
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState(0);

  // Expense specific
  const [expenseCategory, setExpenseCategory] = useState<VehicleExpenseCategory>("estacionamento");

  // Service specific
  const [serviceType, setServiceType] = useState<VehicleServiceType>("nao_especificar");
  const [provider, setProvider] = useState("");

  // Fuel specific
  const [fuelType, setFuelType] = useState<VehicleFuelType>("gasolina_comum");
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [isFullTank, setIsFullTank] = useState(false);
  const [unit, setUnit] = useState<VehicleFuelUnit>("liter");

  // Auto-update unit when fuel type changes
  useEffect(() => {
    setUnit(fuelTypeToUnit[fuelType]);
  }, [fuelType]);

  // Track which field was last modified to control auto-calculation
  const [lastModified, setLastModified] = useState<"price" | "quantity" | "total" | null>(null);

  // Load edit record data
  useEffect(() => {
    if (editRecord && open) {
      setRecordType(editRecord.type);
      setVehicleId(editRecord.vehicleId);
      setDate(editRecord.date);
      setOdometer(editRecord.odometer);
      setNotes(editRecord.notes || "");

      // Check if driver is in the list
      const isKnownDriver = drivers.some((d) => d.name === editRecord.driverName);
      if (isKnownDriver) {
        setDriverName(editRecord.driverName);
        setUseCustomDriver(false);
      } else {
        setUseCustomDriver(true);
        setCustomDriverName(editRecord.driverName);
      }

      if (editRecord.type === "expense") {
        setExpenseCategory(editRecord.category);
        setAmount(editRecord.amount);
      } else if (editRecord.type === "service") {
        setServiceType(editRecord.serviceType);
        setAmount(editRecord.amount);
        setProvider(editRecord.provider || "");
      } else if (editRecord.type === "fuel") {
        setFuelType(editRecord.fuelType);
        setPricePerUnit(editRecord.pricePerUnit);
        setTotalAmount(editRecord.totalAmount);
        setQuantity(editRecord.quantity);
        setIsFullTank(editRecord.isFullTank);
        setUnit(editRecord.unit);
      }
    }
  }, [editRecord, open, drivers]);

  // Auto-calculate third fuel field
  useEffect(() => {
    if (recordType === "fuel" && lastModified) {
      const p = pricePerUnit;
      const q = quantity;
      const t = totalAmount;

      if (lastModified === "price" && p > 0 && q > 0) {
        setTotalAmount(Math.round(p * q * 100) / 100);
      } else if (lastModified === "quantity" && q > 0 && p > 0) {
        setTotalAmount(Math.round(p * q * 100) / 100);
      } else if (lastModified === "total" && t > 0 && q > 0) {
        setPricePerUnit(Math.round((t / q) * 100) / 100);
      } else if (lastModified === "total" && t > 0 && p > 0) {
        setQuantity(Math.round((t / p) * 100) / 100);
      } else if (lastModified === "price" && p > 0 && t > 0) {
        setQuantity(Math.round((t / p) * 100) / 100);
      } else if (lastModified === "quantity" && q > 0 && t > 0) {
        setPricePerUnit(Math.round((t / q) * 100) / 100);
      }
    }
  }, [pricePerUnit, totalAmount, quantity, recordType, lastModified]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const resetForm = () => {
    setRecordType("fuel");
    setVehicleId("");
    setDate(new Date().toISOString().split("T")[0]);
    setOdometer(0);
    const defaultDriver = getDefaultDriver();
    if (defaultDriver) {
      setDriverName(defaultDriver);
      setUseCustomDriver(false);
    } else {
      setDriverName("");
      setUseCustomDriver(false);
    }
    setCustomDriverName("");
    setNotes("");
    setAmount(0);
    setExpenseCategory("estacionamento");
    setServiceType("nao_especificar");
    setProvider("");
    setFuelType("gasolina_comum");
    setPricePerUnit(0);
    setTotalAmount(0);
    setQuantity(0);
    setIsFullTank(false);
    setUnit("liter");
    setLastModified(null);
  };

  // Set default driver and vehicle when dialog opens (not editing)
  useEffect(() => {
    if (open && !editRecord) {
      // Set default driver
      const defaultDriver = getDefaultDriver();
      if (defaultDriver) {
        setDriverName(defaultDriver);
        setUseCustomDriver(false);
        setCustomDriverName("");
      }
      
      // Set default vehicle if only one active vehicle exists
      if (activeVehicles.length === 1) {
        setVehicleId(activeVehicles[0].id);
      }
    }
  }, [open, editRecord, drivers, activeVehicles]);

  const handleSave = () => {
    if (!vehicleId) {
      toast.error("Selecione um veículo");
      return;
    }
    const finalDriverName = useCustomDriver ? customDriverName.trim() : driverName.trim();
    if (!finalDriverName) {
      toast.error("Informe o nome do motorista");
      return;
    }
    if (odometer <= 0) {
      toast.error("Informe a quilometragem");
      return;
    }

    const baseRecord = {
      id: editRecord?.id || crypto.randomUUID(),
      vehicleId,
      vehicleName: selectedVehicle?.name || "",
      date,
      odometer,
      driverName: finalDriverName,
      notes: notes.trim() || undefined,
      createdAt: editRecord?.createdAt || new Date().toISOString(),
    };

    let record: VehicleRecord;

    if (recordType === "expense") {
      if (amount <= 0) {
        toast.error("Informe o valor da despesa");
        return;
      }
      record = {
        ...baseRecord,
        type: "expense",
        category: expenseCategory,
        amount,
      };
    } else if (recordType === "service") {
      if (amount <= 0) {
        toast.error("Informe o valor do serviço");
        return;
      }
      record = {
        ...baseRecord,
        type: "service",
        serviceType,
        amount,
        provider: provider.trim() || undefined,
      };
    } else {
      if (totalAmount <= 0) {
        toast.error("Informe o valor total do abastecimento");
        return;
      }
      record = {
        ...baseRecord,
        type: "fuel",
        fuelType,
        pricePerUnit,
        totalAmount,
        quantity,
        isFullTank,
        unit,
      };
    }

    onSave(record);
    resetForm();
    onOpenChange(false);
    toast.success(editRecord ? "Registro atualizado!" : "Registro salvo com sucesso!");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const unitLabel = fuelUnitLabels[unit].toLowerCase().replace('metros cúbicos (m³)', 'm³').replace('quilowatt (kwh)', 'kWh').replace('litros', 'litros');
  const priceLabel = fuelUnitPriceLabels[unit];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {editRecord ? "Editar Registro" : "Registrar Despesa do Veículo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Seleção de Veículo */}
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Nenhum veículo cadastrado
                  </SelectItem>
                ) : (
                  vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Registro */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Registro</Label>
            <Tabs value={recordType} onValueChange={(v) => setRecordType(v as VehicleRecordType)}>
              <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/80 border border-border rounded-lg">
                <TabsTrigger 
                  value="fuel" 
                  className="flex items-center justify-center gap-2 h-full rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted-foreground/10"
                >
                  <Fuel className="h-4 w-4" />
                  <span>Abastecimento</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="expense" 
                  className="flex items-center justify-center gap-2 h-full rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted-foreground/10"
                >
                  <Receipt className="h-4 w-4" />
                  <span>Despesa</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="service" 
                  className="flex items-center justify-center gap-2 h-full rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted-foreground/10"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Serviço</span>
                </TabsTrigger>
              </TabsList>

            {/* Despesa */}
            <TabsContent value="expense" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as VehicleExpenseCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vehicleExpenseCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor *</Label>
                <CurrencyInput value={amount} onChange={setAmount} />
              </div>
            </TabsContent>

            {/* Abastecimento */}
            <TabsContent value="fuel" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Combustível *</Label>
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as VehicleFuelType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(vehicleFuelTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input 
                  value={fuelUnitLabels[unit]} 
                  disabled 
                  className="bg-muted/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="block">Preço</Label>
                  <span className="text-[10px] text-muted-foreground">{priceLabel}</span>
                  <CurrencyInput
                    value={pricePerUnit}
                    onChange={(v) => {
                      setPricePerUnit(v);
                      setLastModified("price");
                    }}
                    placeholder="0,00"
                    maxDigits={4}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="block">Quantidade</Label>
                  <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
                  <CurrencyInput
                    value={quantity}
                    onChange={(v) => {
                      setQuantity(v);
                      setLastModified("quantity");
                    }}
                    placeholder="0,00"
                    compact
                    maxDigits={8}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="block">Valor Total</Label>
                  <span className="text-[10px] text-muted-foreground">R$</span>
                  <CurrencyInput
                    value={totalAmount}
                    onChange={(v) => {
                      setTotalAmount(v);
                      setLastModified("total");
                    }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Preencha 2 dos 3 campos acima e o terceiro será calculado automaticamente.
              </p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullTank"
                  checked={isFullTank}
                  onCheckedChange={(checked) => setIsFullTank(checked === true)}
                />
                <Label htmlFor="fullTank" className="cursor-pointer">
                  Tanque cheio
                </Label>
              </div>
            </TabsContent>

            {/* Serviço */}
            <TabsContent value="service" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v as VehicleServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(vehicleServiceTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor *</Label>
                <CurrencyInput value={amount} onChange={setAmount} />
              </div>

              <div className="space-y-2">
                <Label>Prestador de Serviço</Label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="Nome da oficina, mecânico..."
                />
              </div>
            </TabsContent>
          </Tabs>
          </div>

          {/* Campos comuns */}
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Odômetro (km) *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={odometer ? odometer.toLocaleString("pt-BR") : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, "");
                    setOdometer(parseInt(val) || 0);
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motorista *</Label>
              {drivers.length > 0 ? (
                <>
                  <Select
                    value={useCustomDriver ? "_other" : driverName}
                    onValueChange={(v) => {
                      if (v === "_other") {
                        setUseCustomDriver(true);
                        setDriverName("");
                      } else {
                        setUseCustomDriver(false);
                        setDriverName(v);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="_other">Outro...</SelectItem>
                    </SelectContent>
                  </Select>
                  {useCustomDriver && (
                    <Input
                      value={customDriverName}
                      onChange={(e) => setCustomDriverName(e.target.value)}
                      placeholder="Digite o nome do motorista"
                      className="mt-2"
                    />
                  )}
                </>
              ) : (
                <Input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nome do motorista"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            {editRecord ? "Atualizar Registro" : "Salvar Registro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
