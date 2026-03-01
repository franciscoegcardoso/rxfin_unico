import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Crown,
  Bell,
  BarChart3,
  Settings2,
  Trash2,
  Link as LinkIcon,
  FileText,
  Car,
  Target,
  Package,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const AccountOverviewTab: React.FC = () => {
  const { data, isLoading, error } = useProfileSettings();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const profile = data?.profile;
  const plan = data?.plan;
  const notificationPrefs = data?.notification_prefs;
  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border border-destructive/50 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">Erro ao carregar configurações. Tente novamente.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Perfil */}
      <Card className="rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Nome:</span> {profile?.full_name ?? '—'}</p>
          <p><span className="text-muted-foreground">Email:</span> {profile?.email ?? '—'}</p>
          <p><span className="text-muted-foreground">Telefone:</span> {profile?.phone ?? '—'}</p>
          <p><span className="text-muted-foreground">Data nasc.:</span> {profile?.birth_date ? format(new Date(profile.birth_date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
          <Link to="/minha-conta?tab=perfil">
            <Button variant="outline" size="sm" className="mt-2">Editar perfil</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Card Plano */}
      <Card className="rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm p-6">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            Plano
          </CardTitle>
          {plan?.name && <Badge variant="secondary" className="rounded-full">{plan.name}</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {plan?.price_monthly != null && (
            <p className="text-sm text-muted-foreground">{formatCurrency(plan.price_monthly)}/mês</p>
          )}
          <Link to="/planos">
            <Button variant="outline" size="sm" className="mt-2 gap-1">
              Gerenciar plano
              <LinkIcon className="h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Card Notificações */}
      <Card className="rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {[
            { key: 'notify_due_dates', label: 'Vencimentos', value: notificationPrefs?.notify_due_dates },
            { key: 'notify_weekly_summary', label: 'Resumo semanal', value: notificationPrefs?.notify_weekly_summary },
            { key: 'notify_news', label: 'Novidades', value: notificationPrefs?.notify_news },
            { key: 'push_notifications_enabled', label: 'Push', value: notificationPrefs?.push_notifications_enabled },
          ].map(({ key, label, value }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={!!value} disabled />
            </div>
          ))}
          <Link to="/minha-conta?tab=preferencias">
            <Button variant="outline" size="sm" className="mt-2">Ajustar preferências</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Card Estatísticas */}
      <Card className="rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: FileText, label: 'Lançamentos', value: stats?.total_lancamentos ?? 0 },
              { icon: Car, label: 'Veículos', value: stats?.total_vehicles ?? 0 },
              { icon: Target, label: 'Metas', value: stats?.total_goals ?? 0 },
              { icon: Package, label: 'Assets', value: stats?.total_assets ?? 0 },
              { icon: Calendar, label: 'Dias de membro', value: stats?.member_since_days ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card Preferências */}
      <Card className="rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Preferências
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Tema:</span> {profile?.theme_preference ?? 'auto'}</p>
          <p><span className="text-muted-foreground">Modo financeiro:</span> {profile?.finance_mode ?? '—'}</p>
          <Link to="/minha-conta?tab=preferencias">
            <Button variant="outline" size="sm" className="mt-2">Alterar</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Excluir minha conta */}
      <Card className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <CardContent className="p-0">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir minha conta
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir minha conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                // Placeholder: real implementation would call backend to delete account
                toast.error('Exclusão de conta deve ser feita pelo suporte.');
                setDeleteDialogOpen(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
