import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { User, Mail, Calendar, Pencil, Save, X, Shield, Loader2, Phone } from 'lucide-react';
import { RXFinLoadingSpinner } from '@/components/shared/RXFinLoadingSpinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GoogleIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
}

export const ProfileTab: React.FC = () => {
  const { user } = useAuth();
  const { config, updateUserProfile } = useFinancial();
  const { userProfile } = config;
  const { registerDirty, unregisterDirty } = useAccountPendingChanges();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    email: userProfile.email,
    birthDate: userProfile.birthDate,
    phone: '',
  });

  // Fetch profile from Supabase
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, birth_date')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as ProfileData | null;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Perfil atualizado com sucesso');
      setIsEditing(false);
      unregisterDirty('profile');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });

  const userMetadata = user?.user_metadata || {};
  const appMetadata = user?.app_metadata || {};
  const provider = appMetadata.provider || 'email';
  const fullName = profile?.full_name || userMetadata.full_name || userMetadata.name || 'Usuário';
  const email = profile?.email || user?.email || '';
  const avatarUrl = userMetadata.avatar_url || userMetadata.picture || '';

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getProviderInfo = (p: string) => {
    switch (p) {
      case 'google': return { label: 'Google', icon: <GoogleIcon />, color: 'bg-white border border-border text-foreground' };
      case 'facebook': return { label: 'Facebook', icon: <FacebookIcon />, color: 'bg-[#1877F2] text-white' };
      default: return { label: 'E-mail', icon: <Mail className="h-3.5 w-3.5" />, color: 'bg-primary text-primary-foreground' };
    }
  };
  const providerInfo = getProviderInfo(provider);

  const handleEdit = () => {
    const nameParts = fullName.split(' ');
    setEditData({
      firstName: nameParts[0] || userProfile.firstName,
      lastName: nameParts.slice(1).join(' ') || userProfile.lastName,
      email: email || userProfile.email,
      birthDate: profile?.birth_date || '',
      phone: profile?.phone || '',
    });
    setIsEditing(true);
  };

  // Register dirty when editing and data changed
  const doSave = useCallback(async () => {
    if (!editData.firstName.trim()) {
      toast.error('Preencha o nome');
      throw new Error('Missing name');
    }
    const newFullName = `${editData.firstName.trim()} ${editData.lastName.trim()}`.trim();
    updateUserProfile({
      firstName: editData.firstName.trim(),
      lastName: editData.lastName.trim(),
      email: editData.email.trim(),
      birthDate: editData.birthDate,
    });
    await new Promise<void>((resolve, reject) => {
      updateProfileMutation.mutate({
        full_name: newFullName,
        email: editData.email.trim() || null,
        phone: editData.phone.trim() || null,
        birth_date: editData.birthDate || null,
      }, { onSuccess: () => resolve(), onError: (err) => reject(err) });
    });
  }, [editData, updateUserProfile, updateProfileMutation]);

  const doCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (isEditing) {
      registerDirty('profile', doSave, doCancel);
    } else {
      unregisterDirty('profile');
    }
  }, [isEditing, doSave, doCancel, registerDirty, unregisterDirty]);

  const handleSave = () => {
    doSave().catch(() => {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    unregisterDirty('profile');
  };

  if (loadingProfile) {
    return <RXFinLoadingSpinner height="py-12" />;
  }

  const firstName = fullName.split(' ')[0] || fullName;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Profile Header + Auth */}
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/80 to-primary/40" />
          <div className="relative px-5 pb-5">
            <div className="flex flex-col items-center -mt-10">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg shrink-0">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mt-3">
                <h2 className="text-lg font-semibold">{firstName}</h2>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                <Badge className={`${providerInfo.color} gap-1 text-[10px] h-5 mt-2`}>
                  {providerInfo.icon}
                  {providerInfo.label}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Autenticação
            </CardTitle>
            <CardDescription className="text-xs">Método de login da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                {providerInfo.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{providerInfo.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {provider === 'email' ? 'Login com e-mail e senha' : `Conectado via ${providerInfo.label}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Personal Info */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription className="text-xs">Suas informações pessoais</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="h-8 text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs text-muted-foreground">Primeiro Nome</Label>
                {isEditing ? (
                  <Input id="firstName" placeholder="Digite seu primeiro nome" value={editData.firstName}
                    onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))} className="h-9 text-sm" />
                ) : (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-lg border min-h-[36px]">{fullName.split(' ')[0] || '-'}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs text-muted-foreground">Sobrenome</Label>
                {isEditing ? (
                  <Input id="lastName" placeholder="Digite seu sobrenome" value={editData.lastName}
                    onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))} className="h-9 text-sm" />
                ) : (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-lg border min-h-[36px]">{fullName.split(' ').slice(1).join(' ') || '-'}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> Email
              </Label>
              {isEditing ? (
                <Input id="email" type="email" placeholder="seu@email.com" value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-lg border min-h-[36px]">{email || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                {isEditing ? (
                  <Input id="phone" type="tel" placeholder="(00) 00000-0000" value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} className="h-9 text-sm" />
                ) : (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-lg border min-h-[36px]">{profile?.phone || '-'}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Data de Nascimento
                </Label>
                {isEditing ? (
                  <Input id="birthDate" type="date" value={editData.birthDate}
                    onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))} className="h-9 text-sm" />
                ) : (
                  <p className="text-sm font-medium py-2 px-3 bg-muted/30 rounded-lg border min-h-[36px]">
                    {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR') : '-'}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1 h-9">
                  <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} className="flex-1 h-9" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
