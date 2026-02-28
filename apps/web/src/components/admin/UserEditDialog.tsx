import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldOff, Crown, Users, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { UserProfile, UserProfileUpdate } from '@/hooks/useAdminUsers';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSave: (id: string, data: UserProfileUpdate) => void;
  onToggleAdmin?: (userId: string, isCurrentlyAdmin: boolean) => void;
  isProtectedAdmin?: (userId: string) => boolean;
  isLoading?: boolean;
  isTogglingAdmin?: boolean;
}

// Plan roles are now derived from subscription_plans via workspace

const USER_TYPES = [
  { value: 'principal', label: 'Principal', icon: Crown, description: 'Titular da conta (paga)' },
  { value: 'convidado', label: 'Convidado', icon: Users, description: 'Conta compartilhada' },
];

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSave,
  onToggleAdmin,
  isProtectedAdmin,
  isLoading,
  isTogglingAdmin,
}: UserEditDialogProps) {
  const [formData, setFormData] = useState<UserProfileUpdate>({
    full_name: '',
    email: '',
    phone: '',
    is_active: true,
    admin_notes: '',
    user_type: 'principal',
    principal_user_id: null,
  });
  const [principalSearch, setPrincipalSearch] = useState('');

  // Fetch principal users for the dropdown (only when user_type is 'convidado')
  const { data: principalUsers = [] } = useQuery({
    queryKey: ['principal-users', principalSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_type', 'principal')
        .limit(20);
      
      if (principalSearch) {
        query = query.or(`full_name.ilike.%${principalSearch}%,email.ilike.%${principalSearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: formData.user_type === 'convidado',
  });

  // Fetch guests linked to this user (if principal)
  const { data: linkedGuests = [] } = useQuery({
    queryKey: ['linked-guests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('principal_user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && user?.user_type === 'principal',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        is_active: user.is_active ?? true,
        admin_notes: user.admin_notes || '',
        user_type: user.user_type || 'principal',
        principal_user_id: user.principal_user_id || null,
      });
      setPrincipalSearch('');
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave(user.id, formData);
    }
  };

  const isUserProtected = user ? isProtectedAdmin?.(user.id) : false;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Nome do usuário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <PhoneInput
              id="phone"
              value={formData.phone || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            />
          </div>

          {/* Plan is managed via UsersTab Select dropdown (updates workspace) */}
          <div className="space-y-2">
            <Label>Plano Atual</Label>
            <div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
              {user.plan_name || 'Free'} <span className="text-xs">({user.plan_slug || 'free'})</span>
              <p className="text-xs mt-1">O plano é alterado diretamente na tabela de usuários.</p>
            </div>
          </div>

          {/* User Type Section */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tipo de Usuário
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              {USER_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = formData.user_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      user_type: type.value as 'principal' | 'convidado',
                      principal_user_id: type.value === 'principal' ? null : prev.principal_user_id
                    }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Principal User Selection (for guests) */}
            {formData.user_type === 'convidado' && (
              <div className="space-y-2 mt-3">
                <Label>Vinculado ao Principal</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário principal..."
                    value={principalSearch}
                    onChange={(e) => setPrincipalSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={formData.principal_user_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, principal_user_id: value || null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {principalUsers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col">
                          <span>{p.full_name || 'Sem nome'}</span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {principalUsers.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum usuário principal encontrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Linked Guests (for principal users) */}
            {formData.user_type === 'principal' && linkedGuests.length > 0 && (
              <div className="space-y-2 mt-3">
                <Label className="text-sm text-muted-foreground">
                  Convidados Vinculados ({linkedGuests.length}/3)
                </Label>
                <div className="space-y-1">
                  {linkedGuests.map(guest => (
                    <div key={guest.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{guest.full_name || 'Sem nome'}</span>
                      <span className="text-xs text-muted-foreground">({guest.email})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_notes">Notas do Admin</Label>
            <Textarea
              id="admin_notes"
              value={formData.admin_notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}
              placeholder="Notas internas sobre o usuário..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Usuário Ativo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_active: checked }))
              }
            />
          </div>

          {/* Admin toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <Label>Privilégios de Admin</Label>
              {isUserProtected && (
                <Badge variant="outline" className="text-xs">Protegido</Badge>
              )}
            </div>
            {isUserProtected ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <span>Admin permanente</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Este usuário não pode ter os privilégios de admin removidos
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant={user.is_admin ? "destructive" : "outline"}
                size="sm"
                onClick={() => onToggleAdmin?.(user.id, !!user.is_admin)}
                disabled={isTogglingAdmin}
              >
                {user.is_admin ? (
                  <>
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Remover Admin
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    Tornar Admin
                  </>
                )}
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
