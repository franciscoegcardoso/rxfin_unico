import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { supabase } from '@/integrations/supabase/client';
import { Lock, KeyRound, ShieldCheck, Loader2, Eye, EyeOff, LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DeleteAccountSection } from './DeleteAccountSection';

export const SecurityTab: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { registerDirty, unregisterDirty } = useAccountPendingChanges();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

  const provider = user?.app_metadata?.provider || 'email';
  const isEmailProvider = provider === 'email';

  const doSavePassword = useCallback(async () => {
    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      throw new Error('Password too short');
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      throw new Error('Passwords mismatch');
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
    setPasswordLoading(false);
    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
      throw error;
    }
    toast.success('Senha alterada com sucesso!');
    setIsChangingPassword(false);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  }, [passwordData]);

  const doCancelPassword = useCallback(() => {
    setIsChangingPassword(false);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  }, []);

  // Register dirty when password fields have content
  const hasPasswordContent = isChangingPassword && (passwordData.newPassword.length > 0 || passwordData.confirmPassword.length > 0);

  useEffect(() => {
    if (hasPasswordContent) {
      registerDirty('security', doSavePassword, doCancelPassword);
    } else {
      unregisterDirty('security');
    }
    return () => unregisterDirty('security');
  }, [hasPasswordContent, doSavePassword, doCancelPassword, registerDirty, unregisterDirty]);

  const handlePasswordChange = async () => {
    try {
      await doSavePassword();
      unregisterDirty('security');
    } catch {}
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/login');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Password Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Alterar Senha
          </CardTitle>
          <CardDescription className="text-xs">
            {isEmailProvider ? 'Atualize sua senha de acesso ao sistema' : 'Você está autenticado via provedor social'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEmailProvider ? (
            <>
              {!isChangingPassword ? (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Senha de acesso</p>
                      <p className="text-[10px] text-muted-foreground">••••••••••••</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsChangingPassword(true)}>
                    Alterar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs text-muted-foreground">Nova Senha</Label>
                    <div className="relative">
                      <Input id="newPassword" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                        value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="h-9 text-sm pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha"
                        value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-9 text-sm pr-10" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { doCancelPassword(); unregisterDirty('security'); }} className="flex-1 h-9">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handlePasswordChange} disabled={passwordLoading} className="flex-1 h-9">
                      {passwordLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Salvar Senha
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Autenticação Social</p>
                <p className="text-[10px] text-muted-foreground">
                  Conta protegida pelo provedor {provider === 'google' ? 'Google' : 'Facebook'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Status & Active Session */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Segurança da Sessão
          </CardTitle>
          <CardDescription className="text-xs">Status de conexão e acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Encrypted connection status */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Conexão protegida</p>
              <p className="text-[10px] text-muted-foreground">Sua sessão está protegida por criptografia segura.</p>
            </div>
          </div>

          {/* Active session + last login */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Sessão Atual</p>
                <p className="text-[10px] text-muted-foreground">Conectado agora • {user?.email}</p>
                {user?.last_sign_in_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Último login: {new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')} às {new Date(user.last_sign_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <Button variant="destructive" size="sm" className="h-8 text-xs shrink-0" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <DeleteAccountSection />
      </div>
    </div>
  );
};
