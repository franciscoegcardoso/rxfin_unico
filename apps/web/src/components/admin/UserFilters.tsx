import { Search, Filter, X, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserFilters as UserFiltersType } from '@/hooks/useAdminUsers';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
  totalCount: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

const ADMIN_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Admins' },
  { value: 'user', label: 'Usuários' },
];

const ACCESS_PERIOD_OPTIONS = [
  { value: 'all', label: 'Qualquer período' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'never', label: 'Nunca acessou' },
];

export function UserFilters({ filters, onFiltersChange, totalCount }: UserFiltersProps) {
  // Fetch dynamic plans from database (include private plans for admin)
  const { data: plans } = useSubscriptionPlans(true);
  
  // Build subscription roles options from database plans
  const subscriptionRoleOptions = [
    { value: 'all', label: 'Todos os planos' },
    ...(plans?.map(plan => ({
      value: plan.slug,
      label: plan.name,
    })) || []),
  ];

  const activeFiltersCount = [
    filters.subscriptionRole && filters.subscriptionRole !== 'all',
    filters.isActive && filters.isActive !== 'all',
    filters.isAdmin && filters.isAdmin !== 'all',
    filters.lastAccessPeriod && filters.lastAccessPeriod !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search,
      subscriptionRole: 'all',
      isActive: 'all',
      isAdmin: 'all',
      lastAccessPeriod: 'all',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2">
          {/* Subscription Role Filter */}
          <Select
            value={filters.subscriptionRole || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, subscriptionRole: value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              {subscriptionRoleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Admin Filter */}
          <Select
            value={filters.isAdmin || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, isAdmin: value as UserFiltersType['isAdmin'] })}
          >
            <SelectTrigger className="w-[120px]">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <SelectValue placeholder="Tipo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {ADMIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.isActive || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, isActive: value as UserFiltersType['isActive'] })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Last Access Filter */}
          <Select
            value={filters.lastAccessPeriod || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, lastAccessPeriod: value as UserFiltersType['lastAccessPeriod'] })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Último acesso" />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Results Count and Active Filters */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span> usuários encontrados
        </span>
        
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
