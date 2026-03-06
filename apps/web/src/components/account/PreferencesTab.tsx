import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Palette, Bell, Moon, Sun, Monitor, Check, Loader2, Lock, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useAccountPendingChanges } from '@/contexts/AccountPendingChangesContext';
import { toast } from 'sonner';

// Theme Preview Component
const ThemePreview: React.FC<{ 
  variant: 'light' | 'dark'; 
  isSelected: boolean;
  onClick: () => void;
  isSaving: boolean;
}> = ({ variant, isSelected, onClick, isSaving }) => {
  const isLight = variant === 'light';
  
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className={cn(
        "relative flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all duration-200 group",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Mini Preview Card */}
      <div 
        className={cn(
          "relative w-full aspect-[4/3] rounded-lg overflow-hidden border shadow-sm",
          isLight ? "bg-card border-border" : "bg-muted border-border"
        )}
      >
        <div className={cn("h-3 flex items-center gap-1 px-1.5", isLight ? "bg-gray-100" : "bg-gray-800")}>
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          </div>
        </div>
        <div className="p-1.5 space-y-1">
          <div className="flex gap-1">
            <div className={cn("w-4 h-8 rounded-sm", isLight ? "bg-gray-100" : "bg-gray-800")} />
            <div className="flex-1 space-y-1">
              <div className={cn("h-2 rounded-sm w-3/4", isLight ? "bg-muted" : "bg-muted")} />
              <div className={cn("h-4 rounded-sm", isLight ? "bg-blue-100" : "bg-blue-900/50")} />
            </div>
          </div>
          <div className="flex gap-1">
            <div className={cn("flex-1 h-3 rounded-sm", isLight ? "bg-emerald-100" : "bg-emerald-900/50")} />
            <div className={cn("flex-1 h-3 rounded-sm", isLight ? "bg-amber-100" : "bg-amber-900/50")} />
          </div>
        </div>
        {isSelected && (
          <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
            {isSaving ? <Loader2 className="h-2.5 w-2.5 text-primary-foreground animate-spin" /> : <Check className="h-2.5 w-2.5 text-primary-foreground" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {isLight ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
        <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-foreground")}>
          {isLight ? 'Claro' : 'Escuro'}
        </span>
      </div>
    </button>
  );
};

export const PreferencesTab: React.FC = () => {
  const { theme, resolvedTheme, setTheme, isSaving } = useThemePreference();
  const { settings } = useAppSettings();
  const { preferences, updatePreference } = useNotificationPreferences();
  const { registerDirty, unregisterDirty } = useAccountPendingChanges();

  const isNotificationsEnabled = settings?.notifications_enabled ?? false;

  // Edit mode for notifications
  const [isEditingNotif, setIsEditingNotif] = useState(false);
  const [localNotif, setLocalNotif] = useState({
    notify_due_dates: preferences.notify_due_dates,
    notify_weekly_summary: preferences.notify_weekly_summary,
    notify_news: preferences.notify_news,
  });

  // Sync local state when preferences load/change and not editing
  useEffect(() => {
    if (!isEditingNotif) {
      setLocalNotif({
        notify_due_dates: preferences.notify_due_dates,
        notify_weekly_summary: preferences.notify_weekly_summary,
        notify_news: preferences.notify_news,
      });
    }
  }, [preferences, isEditingNotif]);

  const hasNotifChanges = isEditingNotif && (
    localNotif.notify_due_dates !== preferences.notify_due_dates ||
    localNotif.notify_weekly_summary !== preferences.notify_weekly_summary ||
    localNotif.notify_news !== preferences.notify_news
  );

  const doSaveNotif = useCallback(async () => {
    const keys: (keyof typeof localNotif)[] = ['notify_due_dates', 'notify_weekly_summary', 'notify_news'];
    for (const key of keys) {
      if (localNotif[key] !== preferences[key]) {
        updatePreference({ key, value: localNotif[key] });
      }
    }
    setIsEditingNotif(false);
    toast.success('Preferências de notificação salvas');
  }, [localNotif, preferences, updatePreference]);

  const doCancelNotif = useCallback(() => {
    setLocalNotif({
      notify_due_dates: preferences.notify_due_dates,
      notify_weekly_summary: preferences.notify_weekly_summary,
      notify_news: preferences.notify_news,
    });
    setIsEditingNotif(false);
  }, [preferences]);

  useEffect(() => {
    if (hasNotifChanges) {
      registerDirty('preferences', doSaveNotif, doCancelNotif);
    } else {
      unregisterDirty('preferences');
    }
  }, [hasNotifChanges, doSaveNotif, doCancelNotif, registerDirty, unregisterDirty]);

  const handleSaveNotif = () => {
    doSaveNotif();
    unregisterDirty('preferences');
  };

  const handleCancelNotif = () => {
    doCancelNotif();
    unregisterDirty('preferences');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Theme Card - auto-save kept */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Aparência</CardTitle>
                <CardDescription className="text-xs">Personalize o visual da aplicação</CardDescription>
              </div>
            </div>
            {isSaving && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
              </Badge>
            )}
          </div>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ThemePreview variant="light" isSelected={theme === 'light'} onClick={() => setTheme('light')} isSaving={isSaving} />
            <ThemePreview variant="dark" isSelected={theme === 'dark'} onClick={() => setTheme('dark')} isSaving={isSaving} />
          </div>
          <button onClick={() => setTheme('system')} disabled={isSaving}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200",
              theme === 'system' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
              theme === 'system' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              <Monitor className="h-5 w-5" />
            </div>
            <div className="text-left flex-1">
              <p className={cn("text-sm font-medium", theme === 'system' ? "text-primary" : "text-foreground")}>
                Automático (Sistema)
              </p>
              <p className="text-[10px] text-muted-foreground">
                Segue as configurações do seu dispositivo
                {theme === 'system' && resolvedTheme && <span className="ml-1">• Atual: {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}</span>}
              </p>
            </div>
            {theme === 'system' && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                {isSaving ? <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" /> : <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Sua preferência é salva automaticamente e sincronizada entre dispositivos
          </p>
        </CardContent>
      </Card>

      {/* Notifications Card - edit/save mode */}
      <Card className={cn(!isNotificationsEnabled && "opacity-60")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Notificações
                  {!isNotificationsEnabled && (
                    <Badge variant="secondary" className="text-[9px] gap-1 bg-muted-foreground/10 text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" /> Em breve
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isNotificationsEnabled ? 'Configure como você deseja receber alertas' : 'Esta funcionalidade estará disponível em breve'}
                </CardDescription>
              </div>
            </div>
            {isNotificationsEnabled && !isEditingNotif && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingNotif(true)} className="h-8 text-xs">
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator className="mb-4" />
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="space-y-0.5 flex-1 min-w-0 pr-3">
              <Label className="text-xs font-medium">Alertas de vencimento</Label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Lembrete quando contas estiverem próximas do vencimento
              </p>
            </div>
            <Switch 
              disabled={!isNotificationsEnabled || !isEditingNotif} 
              checked={localNotif.notify_due_dates} 
              onCheckedChange={(checked) => setLocalNotif(prev => ({ ...prev, notify_due_dates: checked }))}
              className="shrink-0" 
            />
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="space-y-0.5 flex-1 min-w-0 pr-3">
              <Label className="text-xs font-medium">Resumo semanal</Label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Resumo semanal das suas finanças por e-mail
              </p>
            </div>
            <Switch 
              disabled={!isNotificationsEnabled || !isEditingNotif} 
              checked={localNotif.notify_weekly_summary} 
              onCheckedChange={(checked) => setLocalNotif(prev => ({ ...prev, notify_weekly_summary: checked }))}
              className="shrink-0" 
            />
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="space-y-0.5 flex-1 min-w-0 pr-3">
              <Label className="text-xs font-medium">Novidades</Label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Ser informado sobre novas funcionalidades
              </p>
            </div>
            <Switch 
              disabled={!isNotificationsEnabled || !isEditingNotif} 
              checked={localNotif.notify_news} 
              onCheckedChange={(checked) => setLocalNotif(prev => ({ ...prev, notify_news: checked }))}
              className="shrink-0" 
            />
          </div>

          {isEditingNotif && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancelNotif} className="flex-1 h-9">
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveNotif} className="flex-1 h-9">
                <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
