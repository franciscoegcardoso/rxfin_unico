import React, { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Fuel, Wrench, Receipt, Filter, Pencil, Trash2, X, Calendar, Gauge, User } from 'lucide-react';
import { useGestaoVeiculos } from '@/contexts/GestaoVeiculosContext';
import { useVisibility } from '@/contexts/VisibilityContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  vehicleExpenseCategoryLabels,
  vehicleServiceTypeLabels,
  vehicleFuelTypeLabels,
  vehicleRecordTypeLabels,
  VehicleRecord,
} from '@/types/vehicle';

const getRecordIcon = (type: string) => {
  switch (type) {
    case 'expense': return <Receipt className="h-4 w-4" />;
    case 'fuel': return <Fuel className="h-4 w-4" />;
    case 'service': return <Wrench className="h-4 w-4" />;
    default: return <Car className="h-4 w-4" />;
  }
};

const getRecordDetails = (record: VehicleRecord): string => {
  if (record.type === 'expense') return vehicleExpenseCategoryLabels[record.category];
  if (record.type === 'fuel') return `${vehicleFuelTypeLabels[record.fuelType]} - ${record.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${record.unit === 'liter' ? 'L' : 'm³'}`;
  if (record.type === 'service') return vehicleServiceTypeLabels[record.serviceType];
  return '';
};

const getRecordAmount = (record: VehicleRecord): number => {
  if (record.type === 'fuel') return record.totalAmount;
  return record.amount;
};

const RegistrosTab: React.FC = () => {
  const { vehicles, vehicleRecords, openRecordDialog, handleDeleteRecord } = useGestaoVeiculos();
  const { formatValue } = useVisibility();
  const isMobile = useIsMobile();

  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const recordDrivers = [...new Set(vehicleRecords.map(r => r.driverName))];
  const expenseCategories = [...new Set(vehicleRecords.filter(r => r.type === 'expense').map(r => r.category))];
  const serviceTypes = [...new Set(vehicleRecords.filter(r => r.type === 'service').map(r => r.serviceType))];

  const filteredRecords = vehicleRecords.filter(r => {
    if (filterVehicle !== 'all' && r.vehicleId !== filterVehicle) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterDriver !== 'all' && r.driverName !== filterDriver) return false;
    if (filterCategory !== 'all') {
      if (r.type === 'expense' && r.category !== filterCategory) return false;
      if (r.type === 'service' && r.serviceType !== filterCategory) return false;
      if (r.type === 'fuel') return false;
    }
    return true;
  });

  const hasActiveFilters = filterVehicle !== 'all' || filterType !== 'all' || filterDriver !== 'all' || filterCategory !== 'all';

  return (
    <div className="space-y-4">
      {/* Records Header with Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Registros</h2>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {filteredRecords.length}
          </span>
          {hasActiveFilters && (
            <div className="flex items-center gap-1 ml-2">
              {filterVehicle !== 'all' && (
                <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                  {vehicles.find(v => v.id === filterVehicle)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterVehicle('all')} />
                </Badge>
              )}
              {filterType !== 'all' && (
                <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                  {filterType === 'expense' ? 'Despesas' : filterType === 'fuel' ? 'Abastecimentos' : 'Serviços'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterType('all'); setFilterCategory('all'); }} />
                </Badge>
              )}
              {filterDriver !== 'all' && (
                <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                  {filterDriver}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterDriver('all')} />
                </Badge>
              )}
            </div>
          )}
        </div>
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={hasActiveFilters ? "border-primary text-primary" : ""}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Veículo</label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os veículos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os veículos</SelectItem>
                    {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterCategory('all'); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                    <SelectItem value="fuel">Abastecimentos</SelectItem>
                    <SelectItem value="service">Serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Motorista</label>
                <Select value={filterDriver} onValueChange={setFilterDriver}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os motoristas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motoristas</SelectItem>
                    {recordDrivers.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {filterType === 'expense' && expenseCategories.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {expenseCategories.map((c) => <SelectItem key={c} value={c}>{vehicleExpenseCategoryLabels[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {filterType === 'service' && serviceTypes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Serviço</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os serviços" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os serviços</SelectItem>
                      {serviceTypes.map((s) => <SelectItem key={s} value={s}>{vehicleServiceTypeLabels[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilterVehicle('all'); setFilterType('all'); setFilterDriver('all'); setFilterCategory('all');
                }}>
                  Limpar filtros
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={<Car className="h-6 w-6 text-muted-foreground" />}
          description="Nenhum registro encontrado"
          actionLabel="Adicionar primeiro registro"
          onAction={() => openRecordDialog()}
        />
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) =>
            isMobile ? (
              <div key={record.id} className="p-3 rounded-lg bg-muted/20 border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {getRecordIcon(record.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded inline-block">
                        {vehicleRecordTypeLabels[record.type]}
                      </span>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{record.vehicleName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-expense">
                      R$ {getRecordAmount(record).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {record.type === 'fuel' && (
                      <p className="text-[10px] text-muted-foreground">
                        R$ {record.pricePerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{record.unit === 'liter' ? 'L' : 'm³'}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{getRecordDetails(record)}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{record.odometer.toLocaleString('pt-BR')} km</span>
                  <span className="flex items-center gap-1 truncate"><User className="h-3 w-3" /><span className="truncate max-w-[100px]">{record.driverName}</span></span>
                </div>
                <div className="flex justify-end gap-1 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary" onClick={() => openRecordDialog(record)}>
                    <Pencil className="h-3 w-3 mr-1" />Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-expense" onClick={() => handleDeleteRecord(record.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />Excluir
                  </Button>
                </div>
              </div>
            ) : (
              <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {getRecordIcon(record.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                        {vehicleRecordTypeLabels[record.type]}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">{record.vehicleName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{getRecordDetails(record)}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{record.odometer.toLocaleString('pt-BR')} km</span>
                      <span>•</span>
                      <span className="truncate">{record.driverName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm text-expense">
                      R$ {getRecordAmount(record).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {record.type === 'fuel' && (
                      <p className="text-[10px] text-muted-foreground">
                        R$ {record.pricePerUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{record.unit === 'liter' ? 'L' : 'm³'}
                      </p>
                    )}
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openRecordDialog(record)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-expense" onClick={() => handleDeleteRecord(record.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default RegistrosTab;
