import React from 'react';
import {
  Home, Car, TrendingUp, Building2, Gem, FileCode2,
  Scale, CreditCard, ShieldCheck, LayoutDashboard,
  Briefcase, Landmark, Package, FileBarChart
} from 'lucide-react';

// ─── Grupos ─────────────────────────────────────────────────────────────────

export const ASSET_GROUPS = {
  real:       { label: 'Patrimônio Real',  color: 'blue'   },
  financial:  { label: 'Financeiro',        color: 'green'  },
  intangible: { label: 'Intangível',        color: 'purple' },
  liability:  { label: 'Passivos',          color: 'red'    },
} as const;

export type AssetGroup = keyof typeof ASSET_GROUPS;

// ─── Tipos de ativo ──────────────────────────────────────────────────────────

export const ASSET_TYPES = {
  property:          { label: 'Imóvel',                 icon: Home,        group: 'real'       as AssetGroup, color: 'blue'    },
  vehicle:           { label: 'Veículo',                 icon: Car,         group: 'real'       as AssetGroup, color: 'sky'     },
  valuables:         { label: 'Objetos de Valor',        icon: Gem,         group: 'real'       as AssetGroup, color: 'amber'   },
  equipment:         { label: 'Equipamento',             icon: Package,     group: 'real'       as AssetGroup, color: 'slate'   },
  investment:        { label: 'Investimento',            icon: TrendingUp,  group: 'financial'  as AssetGroup, color: 'green'   },
  company_stake:     { label: 'Participação Societária', icon: Building2,   group: 'financial'  as AssetGroup, color: 'emerald' },
  receivable:        { label: 'Direitos e Recebíveis',   icon: Landmark,    group: 'financial'  as AssetGroup, color: 'teal'    },
  intellectual_property: { label: 'Prop. Intelectual',  icon: Briefcase,   group: 'intangible' as AssetGroup, color: 'violet'  },
  license:           { label: 'Licença / Software',      icon: FileCode2,   group: 'intangible' as AssetGroup, color: 'indigo'  },
  contract_right:    { label: 'Direito Contratual',      icon: Scale,       group: 'intangible' as AssetGroup, color: 'purple'  },
  financing:         { label: 'Financiamento',           icon: CreditCard,  group: 'liability'  as AssetGroup, color: 'red'     },
  consortium:        { label: 'Consórcio',               icon: CreditCard,  group: 'liability'  as AssetGroup, color: 'orange'  },
  debt:              { label: 'Dívida / Obrigação',      icon: Scale,       group: 'liability'  as AssetGroup, color: 'rose'    },
  other:             { label: 'Outro',                    icon: Package,     group: 'real'       as AssetGroup, color: 'slate'   },
} as const;

export type NewAssetType = keyof typeof ASSET_TYPES;

// ─── Tabs ────────────────────────────────────────────────────────────────────

export const TABS = [
  { id: 'consolidado',   label: 'Visão Geral',    icon: LayoutDashboard },
  { id: 'patrimonio',    label: 'Patrimônio Real', icon: Home            },
  { id: 'investimentos', label: 'Investimentos',   icon: TrendingUp      },
  { id: 'participacoes', label: 'Participações',   icon: Building2       },
  { id: 'intangiveis',   label: 'Intangíveis',     icon: Briefcase       },
  { id: 'passivos',      label: 'Passivos',        icon: CreditCard      },
  { id: 'seguros',       label: 'Seguros',         icon: ShieldCheck     },
  { id: 'historico-ir',  label: 'Histórico IR',    icon: FileBarChart    },
] as const;

export type BensTab = typeof TABS[number]['id'];

// Mapeamento tab → asset_types que ela exibe
export const TAB_ASSET_TYPES: Record<BensTab, NewAssetType[]> = {
  'consolidado':   [],
  'patrimonio':    ['property', 'vehicle', 'valuables', 'equipment', 'other'],
  'investimentos': ['investment', 'receivable'],
  'participacoes': ['company_stake'],
  'intangiveis':   ['intellectual_property', 'license', 'contract_right'],
  'passivos':      ['financing', 'consortium', 'debt'],
  'seguros':       [],
  'historico-ir':  [],
};

// ─── Compatibilidade retroativa (mantém exportações usadas por outros arquivos) ──

/** @deprecated use ASSET_TYPES */
export const assetIcons: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(ASSET_TYPES).map(([k, v]) => [k, React.createElement(v.icon, { className: 'h-5 w-5' })])
);

export const VALID_TABS = TABS.map(t => t.id) as unknown as readonly BensTab[];

export const formatCurrencyBase = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);

export const propertyAdjustmentOptions = [
  { value: 'igpm',         label: 'IGP-M',              description: 'Índice Geral de Preços do Mercado' },
  { value: 'ipca',         label: 'IPCA',               description: 'Índice Nacional de Preços ao Consumidor Amplo' },
  { value: 'minimum_wage', label: '% Salário Mínimo',   description: 'Percentual do salário mínimo' },
  { value: 'none',         label: 'Sem reajuste',       description: 'Valor fixo sem correção' },
  { value: 'custom',       label: 'Curva personalizada', description: 'Definir valor inicial e final' },
];

export const monthOptions = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },   { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },    { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },   { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro'}, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro'}, { value: 12, label: 'Dezembro' },
];

export interface AssetDependencies {
  hasDependencies: boolean;
  vehicleRecords: number;
  linkedExpenses: number;
  linkedIncome: boolean;
  monthlyEntries: number;
  assetName: string;
  assetType: string;
}
