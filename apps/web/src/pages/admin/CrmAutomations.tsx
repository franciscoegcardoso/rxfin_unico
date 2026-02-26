import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Mail, Bell, Shield, Zap, Clock, Plus, Edit2, Trash2, Save,
  UserPlus, Compass, Plug, TrendingUp, AlertTriangle, RefreshCw, Globe,
  Link2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCrmAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  type CrmAutomation,
} from '@/hooks/useCrmAutomations';

/* ── Icon registry ── */
const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, Compass, Plug, TrendingUp, AlertTriangle, RefreshCw, Globe, Zap, Mail, Bell, Shield,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const CHANNEL_OPTIONS = ['Email', 'Push', 'Admin Alert', 'API'] as const;
type Channel = typeof CHANNEL_OPTIONS[number];

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Email: Mail,
  Push: Bell,
  'Admin Alert': Shield,
  API: Zap,
};

const TRIGGER_OPTIONS = [
  { value: 'status_change:lead', label: 'Mudança de status → Lead' },
  { value: 'status_change:ativo', label: 'Mudança de status → Ativo' },
  { value: 'status_change:migrado', label: 'Mudança de status → Migrado' },
  { value: 'status_change:power_user', label: 'Mudança de status → Power User' },
  { value: 'status_change:churn', label: 'Mudança de status → Churn' },
  { value: 'status_change:inativo', label: 'Mudança de status → Inativo' },
  { value: 'event:signup', label: 'Novo cadastro' },
  { value: 'event:purchase', label: 'Nova assinatura (compra)' },
  { value: 'event:subscription_cancelled', label: 'Cancelamento de assinatura' },
  { value: 'event:plan_expired', label: 'Plano expirado' },
  { value: 'inactivity:7d', label: 'Inatividade — 7 dias sem login' },
  { value: 'inactivity:14d', label: 'Inatividade — 14 dias sem login' },
  { value: 'inactivity:30d', label: 'Inatividade — 30 dias sem login' },
  { value: 'event:first_transaction', label: 'Primeiro lançamento registrado' },
  { value: 'event:first_bank_connected', label: 'Primeira instituição financeira conectada' },
] as const;

const DELAY_OPTIONS = [
  { value: 'Imediato', label: 'Imediato' },
  { value: '1h', label: '1 hora' },
  { value: '6h', label: '6 horas' },
  { value: '12h', label: '12 horas' },
  { value: '1d', label: '1 dia' },
  { value: '2d', label: '2 dias' },
  { value: '3d', label: '3 dias' },
  { value: '5d', label: '5 dias' },
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
] as const;

const ICON_COLOR_OPTIONS = [
  { label: 'Primary', value: 'text-primary' },
  { label: 'Amber', value: 'text-amber-500' },
  { label: 'Emerald', value: 'text-emerald-500' },
  { label: 'Blue', value: 'text-blue-500' },
  { label: 'Orange', value: 'text-orange-500' },
  { label: 'Teal', value: 'text-teal-500' },
  { label: 'Muted', value: 'text-muted-foreground' },
];

type EditForm = {
  name: string;
  trigger_description: string;
  action_description: string;
  delay: string;
  channels: string[];
  icon_name: string;
  icon_color: string;
  n8n_workflow_id: string;
  n8n_workflow_name: string;
};

const emptyForm: EditForm = {
  name: '',
  trigger_description: '',
  action_description: '',
  delay: 'Imediato',
  channels: ['Email'],
  icon_name: 'Zap',
  icon_color: 'text-primary',
  n8n_workflow_id: '',
  n8n_workflow_name: '',
};

export default function CrmAutomations() {
  const { data: automations, isLoading } = useCrmAutomations();
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: CrmAutomation) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      trigger_description: a.trigger_description,
      action_description: a.action_description,
      delay: a.delay,
      channels: a.channels,
      icon_name: a.icon_name,
      icon_color: a.icon_color,
      n8n_workflow_id: a.n8n_workflow_id ?? '',
      n8n_workflow_name: a.n8n_workflow_name ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.trigger_description || !form.action_description) {
      toast.error('Preencha nome, trigger e ação');
      return;
    }
    try {
      const payload = {
        name: form.name,
        trigger_description: form.trigger_description,
        action_description: form.action_description,
        delay: form.delay,
        channels: form.channels,
        icon_name: form.icon_name,
        icon_color: form.icon_color,
        n8n_workflow_id: form.n8n_workflow_id || null,
        n8n_workflow_name: form.n8n_workflow_name || null,
      };
      if (editingId) {
        await updateAutomation.mutateAsync({ id: editingId, updates: payload });
        toast.success('Automação atualizada');
      } else {
        await createAutomation.mutateAsync({
          ...payload,
          is_active: false,
          sort_order: (automations?.length ?? 0) + 1,
        });
        toast.success('Automação criada');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover automação?')) return;
    try {
      await deleteAutomation.mutateAsync(id);
      toast.success('Automação removida');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleToggle = async (id: string, val: boolean) => {
    await updateAutomation.mutateAsync({ id, updates: { is_active: val } });
  };

  const toggleChannel = (ch: string) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  const activeCount = automations?.filter(a => a.is_active).length ?? 0;
  const n8nCount = automations?.filter(a => a.n8n_workflow_id).length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Automações CRM" description="Carregando..." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="py-8"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automações CRM"
        description={`${activeCount} réguas ativas · ${n8nCount} integradas com n8n`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/crm"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Kanban</Link>
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />Nova Automação
            </Button>
          </div>
        }
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/admin/crm" className="hover:text-foreground transition-colors">CRM</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Automações</span>
      </nav>

      {/* Rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations?.map(rule => {
          const Icon = ICON_MAP[rule.icon_name] ?? Zap;
          const enabled = rule.is_active;

          return (
            <Card key={rule.id} className={cn(
              'border-border transition-all',
              !enabled && 'opacity-60',
            )}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', enabled ? 'bg-primary/10' : 'bg-muted')}>
                      <Icon className={cn('h-5 w-5', rule.icon_color)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {enabled ? (
                          <Badge variant="default" className="text-2xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-2xs">Inativo</Badge>
                        )}
                        {rule.n8n_workflow_id && (
                          <Badge variant="outline" className="text-2xs gap-1">
                            <Link2 className="h-2.5 w-2.5" />n8n
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Switch
                      checked={enabled}
                      onCheckedChange={v => handleToggle(rule.id, v)}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 shrink-0 font-medium">Trigger</span>
                    <span className="text-foreground">{TRIGGER_OPTIONS.find(t => t.value === rule.trigger_description)?.label ?? rule.trigger_description}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 shrink-0 font-medium">Ação</span>
                    <span className="text-foreground">{rule.action_description}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-14 shrink-0 font-medium">Delay</span>
                    <span className="text-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />{DELAY_OPTIONS.find(d => d.value === rule.delay)?.label ?? rule.delay}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-muted-foreground w-14 shrink-0 font-medium">Canal</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {rule.channels.map(ch => {
                        const ChIcon = CHANNEL_ICONS[ch] ?? Zap;
                        return (
                          <Badge key={ch} variant="outline" className="text-2xs gap-1">
                            <ChIcon className="h-3 w-3" />{ch}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  {rule.n8n_workflow_id && (
                    <div className="flex gap-2 items-center pt-1 border-t border-border mt-2">
                      <span className="text-muted-foreground w-14 shrink-0 font-medium">n8n</span>
                      <span className="text-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        {rule.n8n_workflow_name || rule.n8n_workflow_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {automations?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma automação configurada</p>
            <Button size="sm" className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />Criar primeira automação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Edit/Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Boas-vindas" />
            </div>

            <div className="space-y-2">
              <Label>Trigger (condição de disparo)</Label>
              <Select value={form.trigger_description} onValueChange={v => setForm(p => ({ ...p, trigger_description: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o trigger" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ação</Label>
              <Input value={form.action_description} onChange={e => setForm(p => ({ ...p, action_description: e.target.value }))} placeholder="Ex: Enviar email de boas-vindas" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delay</Label>
                <Select value={form.delay} onValueChange={v => setForm(p => ({ ...p, delay: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o delay" /></SelectTrigger>
                  <SelectContent>
                    {DELAY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={form.icon_name} onValueChange={v => setForm(p => ({ ...p, icon_name: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => {
                      const IC = ICON_MAP[icon];
                      return (
                        <SelectItem key={icon} value={icon}>
                          <span className="flex items-center gap-2"><IC className="h-3.5 w-3.5" />{icon}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canais</Label>
              <div className="flex gap-2 flex-wrap">
                {CHANNEL_OPTIONS.map(ch => {
                  const ChIcon = CHANNEL_ICONS[ch];
                  const selected = form.channels.includes(ch);
                  return (
                    <Badge
                      key={ch}
                      variant={selected ? 'default' : 'outline'}
                      className={cn('cursor-pointer gap-1 select-none', selected && 'bg-primary')}
                      onClick={() => toggleChannel(ch)}
                    >
                      <ChIcon className="h-3 w-3" />{ch}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Integração n8n (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Workflow ID</Label>
                  <Input
                    value={form.n8n_workflow_id}
                    onChange={e => setForm(p => ({ ...p, n8n_workflow_id: e.target.value }))}
                    placeholder="Ex: abc123"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Workflow Name</Label>
                  <Input
                    value={form.n8n_workflow_name}
                    onChange={e => setForm(p => ({ ...p, n8n_workflow_name: e.target.value }))}
                    placeholder="Ex: Welcome Email"
                    className="text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Vincule um workflow do n8n para execução automática quando o trigger for ativado.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cor do ícone</Label>
              <Select value={form.icon_color} onValueChange={v => setForm(p => ({ ...p, icon_color: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_COLOR_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-3 w-3 rounded-full', c.value.replace('text-', 'bg-'))} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createAutomation.isPending || updateAutomation.isPending}>
              <Save className="h-4 w-4 mr-1" />Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
