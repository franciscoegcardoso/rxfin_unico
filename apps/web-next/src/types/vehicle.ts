// Tipos de registro para veículos
// Driver interface for vehicle management
export interface Driver {
  id: string;
  name: string;
  email?: string;
}

export type VehicleRecordType = 'expense' | 'fuel' | 'service';

// Categorias de despesas de veículos
export type VehicleExpenseCategory = 
  | 'estacionamento'
  | 'financiamento'
  | 'impostos' // IPVA/DPVAT
  | 'lava_rapido'
  | 'licenciamento'
  | 'multa'
  | 'pedagio'
  | 'reembolso'
  | 'seguro';

// Tipos de serviços de veículos
export type VehicleServiceType =
  | 'nao_especificar'
  | 'sinistro_seguro'
  | 'ar_condicionado'
  | 'bateria'
  | 'bomba_combustivel'
  | 'buzina'
  | 'carroceria_chassi'
  | 'cinto'
  | 'correias'
  | 'direcao_hidraulica'
  | 'direcao_eletrica'
  | 'filtro_ar'
  | 'filtro_ar_cabine'
  | 'filtro_combustivel'
  | 'filtro_oleo'
  | 'fluido_embreagem'
  | 'fluido_transmissao'
  | 'fluido_freio'
  | 'inspecao_tecnica'
  | 'limpadores_parabrisa'
  | 'luzes'
  | 'mao_de_obra'
  | 'pastilha_freio'
  | 'pneus_alinhamento_balanceamento'
  | 'pneus_calibragem'
  | 'pneus_rodizio'
  | 'radiador'
  | 'reparo_motor'
  | 'revisao'
  | 'sistema_aquecimento'
  | 'sistema_embreagem'
  | 'sistema_refrigeracao'
  | 'suspensao_amortecedores'
  | 'troca_freio'
  | 'troca_oleo'
  | 'velas_ignicao'
  | 'vidros_espelhos';

// Tipos de combustível
export type VehicleFuelType = 
  | 'diesel'
  | 'gasolina_comum'
  | 'gasolina_aditivada'
  | 'eletrico'
  | 'etanol'
  | 'gnv';

// Tipos de unidade de combustível
export type VehicleFuelUnit = 'liter' | 'cubic_meter' | 'kwh';

// Mapeamento automático de tipo de combustível para unidade
export const fuelTypeToUnit: Record<VehicleFuelType, VehicleFuelUnit> = {
  diesel: 'liter',
  gasolina_comum: 'liter',
  gasolina_aditivada: 'liter',
  etanol: 'liter',
  gnv: 'cubic_meter',
  eletrico: 'kwh',
};

// Labels para unidades
export const fuelUnitLabels: Record<VehicleFuelUnit, string> = {
  liter: 'Litros',
  cubic_meter: 'Metros cúbicos (m³)',
  kwh: 'Quilowatt (kWh)',
};

// Labels para preço por unidade
export const fuelUnitPriceLabels: Record<VehicleFuelUnit, string> = {
  liter: 'R$/litro',
  cubic_meter: 'R$/m³',
  kwh: 'R$/kWh',
};

// Interface base para registros de veículos
export interface VehicleRecordBase {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  odometer: number;
  driverName: string;
  notes?: string;
  createdAt: string;
}

// Registro de despesa
export interface VehicleExpenseRecord extends VehicleRecordBase {
  type: 'expense';
  category: VehicleExpenseCategory;
  amount: number;
}

// Registro de abastecimento
export interface VehicleFuelRecord extends VehicleRecordBase {
  type: 'fuel';
  fuelType: VehicleFuelType;
  pricePerUnit: number; // R$/litro ou R$/m³
  totalAmount: number; // Valor total
  quantity: number; // Litros ou m³
  isFullTank: boolean;
  unit: VehicleFuelUnit;
}

// Registro de serviço
export interface VehicleServiceRecord extends VehicleRecordBase {
  type: 'service';
  serviceType: VehicleServiceType;
  amount: number;
  provider?: string;
}

export type VehicleRecord = VehicleExpenseRecord | VehicleFuelRecord | VehicleServiceRecord;

// Labels para exibição
export const vehicleExpenseCategoryLabels: Record<VehicleExpenseCategory, string> = {
  estacionamento: 'Estacionamento',
  financiamento: 'Financiamento',
  impostos: 'Impostos (IPVA/DPVAT)',
  lava_rapido: 'Lava-rápido',
  licenciamento: 'Licenciamento',
  multa: 'Multa',
  pedagio: 'Pedágio',
  reembolso: 'Reembolso',
  seguro: 'Seguro',
};

export const vehicleServiceTypeLabels: Record<VehicleServiceType, string> = {
  nao_especificar: 'Não especificar',
  sinistro_seguro: 'Sinistro do seguro',
  ar_condicionado: 'Ar condicionado',
  bateria: 'Bateria',
  bomba_combustivel: 'Bomba de combustível',
  buzina: 'Buzina',
  carroceria_chassi: 'Carroceria/Chassi',
  cinto: 'Cinto',
  correias: 'Correias',
  direcao_hidraulica: 'Direção Hidráulica',
  direcao_eletrica: 'Direção Elétrica',
  filtro_ar: 'Filtro de ar',
  filtro_ar_cabine: 'Filtro de ar da cabine',
  filtro_combustivel: 'Filtro de combustível',
  filtro_oleo: 'Filtro de óleo',
  fluido_embreagem: 'Fluido da embreagem',
  fluido_transmissao: 'Fluido da transmissão',
  fluido_freio: 'Fluido de freio',
  inspecao_tecnica: 'Inspeção técnica',
  limpadores_parabrisa: 'Limpadores de para-brisa',
  luzes: 'Luzes',
  mao_de_obra: 'Mão de obra',
  pastilha_freio: 'Pastilha de freio',
  pneus_alinhamento_balanceamento: 'Pneus - Alinhamento e balanceamento',
  pneus_calibragem: 'Pneus - Calibragem',
  pneus_rodizio: 'Pneus - Rodízio',
  radiador: 'Radiador',
  reparo_motor: 'Reparo no motor',
  revisao: 'Revisão',
  sistema_aquecimento: 'Sistema de aquecimento',
  sistema_embreagem: 'Sistema de embreagem',
  sistema_refrigeracao: 'Sistema de refrigeração',
  suspensao_amortecedores: 'Suspensão/Amortecedores',
  troca_freio: 'Troca de freio',
  troca_oleo: 'Troca de óleo',
  velas_ignicao: 'Velas de ignição',
  vidros_espelhos: 'Vidros/Espelhos',
};

export const vehicleFuelTypeLabels: Record<VehicleFuelType, string> = {
  diesel: 'Diesel',
  gasolina_comum: 'Gasolina Comum',
  gasolina_aditivada: 'Gasolina Aditivada',
  eletrico: 'Elétrico',
  etanol: 'Etanol',
  gnv: 'GNV',
};

export const vehicleRecordTypeLabels: Record<VehicleRecordType, string> = {
  expense: 'Despesa',
  fuel: 'Abastecimento',
  service: 'Serviço',
};
