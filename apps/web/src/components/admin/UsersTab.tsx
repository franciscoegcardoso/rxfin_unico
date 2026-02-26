import { useState, useEffect, useMemo } from 'react';
import { Pencil, UserCheck, UserX, Mail, Phone, Shield, Crown, Users, UserPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { UserEditDialog } from '@/components/admin/UserEditDialog';
import { UserFilters } from '@/components/admin/UserFilters';
import { UsersPagination } from '@/components/admin/UsersPagination';
import { AddGuestDialog } from '@/components/admin/AddGuestDialog';
import { UserDeleteDialog } from '@/components/admin/UserDeleteDialog';
import { useAdminUsers, type UserProfile, type UserProfileUpdate, type UserFilters as UserFiltersType } from '@/hooks/useAdminUsers';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAdminDeferredMutations } from '@/hooks/useAdminDeferredMutations';

// Color mapping for plan badges
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  pro: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  premium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const PAGE_SIZE = 20;

export function UsersTab() {
  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    subscriptionRole: 'all',
    isActive: 'all',
    lastAccessPeriod: 'all',
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [addGuestDialogOpen, setAddGuestDialogOpen] = useState(false);
  const [selectedPrincipal, setSelectedPrincipal] = useState<UserProfile | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch dynamic plans from database (include private plans for admin)
  const { data: plans } = useSubscriptionPlans(true);
  
  // Build subscription roles from database plans
  const subscriptionRoles = useMemo(() => {
    return plans?.map(plan => ({
      value: plan.slug,
      label: plan.name,
      color: PLAN_COLORS[plan.slug] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    })) || [];
  }, [plans]);

  const {
    users,
    totalCount,
    totalPages,
    isLoading,
    isProtectedAdmin,
  } = useAdminUsers(debouncedFilters, { page: currentPage, pageSize: PAGE_SIZE });

  const {
    deferToggleUserActive,
    deferUpdateSubscriptionRole,
    deferGrantAdmin,
    deferRevokeAdmin,
    deferUpdateUser,
  } = useAdminDeferredMutations();

  const handleToggleAdmin = (userId: string, userName: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      deferRevokeAdmin(userId, userName || 'Sem nome');
    } else {
      deferGrantAdmin(userId, userName || 'Sem nome');
    }
    toast.info('Alteração adicionada para revisão');
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveUser = (id: string, data: UserProfileUpdate) => {
    deferUpdateUser(id, data, editingUser?.full_name || 'Sem nome');
    toast.info('Alteração adicionada para revisão');
    setEditDialogOpen(false);
  };

  const handleRoleChange = (userId: string, userName: string, newRole: string) => {
    deferUpdateSubscriptionRole(userId, userName || 'Sem nome', newRole);
    toast.info('Alteração adicionada para revisão');
  };

  const handleToggleActive = (user: UserProfile) => {
    deferToggleUserActive(user.id, user.full_name || 'Sem nome', user.is_active);
    toast.info('Alteração adicionada para revisão');
  };

  const handleAddGuest = (user: UserProfile) => {
    setSelectedPrincipal(user);
    setAddGuestDialogOpen(true);
  };

  const getRoleConfig = (role: string) => {
    const found = subscriptionRoles.find(r => r.value === role);
    return found || { value: role, label: role, color: PLAN_COLORS.free };
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <UserFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        totalCount={totalCount}
      />

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Admin</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {filters.search || filters.subscriptionRole !== 'all' || filters.isActive !== 'all' || filters.lastAccessPeriod !== 'all'
                    ? 'Nenhum usuário encontrado com os filtros aplicados'
                    : 'Nenhum usuário cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const roleConfig = getRoleConfig(user.plan_slug);
                return (
                  <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.full_name || 'Sem nome'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {user.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.user_type === 'principal' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Crown className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                              {user.guest_count && user.guest_count > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {user.guest_count}/3
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            Usuário principal (titular da conta)
                            {user.guest_count && user.guest_count > 0 && (
                              <span className="block text-xs">
                                {user.guest_count} convidado(s) vinculado(s)
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <Users className="h-3 w-3 mr-1" />
                                  Convidado
                                </Badge>
                                {user.invitation_status === 'pending' && (
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                              {user.principal_user_name && (
                                <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                  → {user.principal_user_name}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>
                              Convidado por: {user.principal_user_name || 'Usuário desconhecido'}
                              {user.invitation_status === 'pending' && (
                                <span className="block text-xs text-orange-400">
                                  Aguardando primeiro acesso
                                </span>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        {!user.email && !user.phone && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.plan_slug}
                        onValueChange={(value) => handleRoleChange(user.id, user.full_name || 'Sem nome', value)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue>
                            <Badge variant="secondary" className={roleConfig.color}>
                              {roleConfig.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionRoles.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              <Badge variant="secondary" className={role.color}>
                                {role.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.is_admin ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center">
                              <Shield className="h-4 w-4 text-amber-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Administrador</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => handleToggleActive(user)}
                            />
                            {user.is_active ? (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <UserX className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user.is_active ? 'Usuário ativo' : 'Usuário inativo'}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {user.last_login_at ? (
                        <span className="text-sm">
                          {format(new Date(user.last_login_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.user_type === 'principal' && (user.guest_count || 0) < 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleAddGuest(user)}
                                title="Adicionar convidado"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Adicionar convidado</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuário"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar usuário</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <UserDeleteDialog
                                userId={user.id}
                                userName={user.full_name}
                                userEmail={user.email}
                                isProtected={isProtectedAdmin(user.id)}
                                isAdmin={user.is_admin || false}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isProtectedAdmin(user.id) ? 'Admin protegido' : 'Excluir usuário'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <UsersPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Edit Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={editingUser}
        onSave={handleSaveUser}
        onToggleAdmin={(userId, isCurrentlyAdmin) => handleToggleAdmin(userId, editingUser?.full_name || 'Sem nome', isCurrentlyAdmin)}
        isProtectedAdmin={isProtectedAdmin}
        isLoading={false}
        isTogglingAdmin={false}
      />

      {/* Add Guest Dialog */}
      {selectedPrincipal && (
        <AddGuestDialog
          open={addGuestDialogOpen}
          onOpenChange={setAddGuestDialogOpen}
          principalUserId={selectedPrincipal.id}
          principalUserName={selectedPrincipal.full_name || 'Usuário'}
          currentGuestCount={selectedPrincipal.guest_count || 0}
        />
      )}
    </div>
  );
}
