import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Mail, Bell, Shield, Zap, Clock, Send,
  UserPlus, Compass, Plug, TrendingUp, AlertTriangle, RefreshCw, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleStatus = 'active' | 'pending';
type Channel = 'Email' | 'Push' | 'Admin Alert' | 'API';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  delay: string;
  channels: Channel[];
  status: RuleStatus;
  icon: React.ElementType;
  iconColor: string;
}

const RULES: AutomationRule[] = [
  {
    id: 'boas-vindas',
    name: 'Boas-vindas',
    trigger: "Novo cadastro (status = 'lead')",
    action: 'Enviar email de boas-vindas',
    delay: 'Imediato',
    channels: ['Email'],
    status: 'active',
    icon: UserPlus,
    iconColor: 'text-primary',
  },
  {
    id: 'nudge-onboarding',
    name: 'Nudge Onboarding',
    trigger: "Status = 'onboarding' há mais de 3 dias",
    action: 'Enviar email "Complete seu perfil"',
    delay: '3 dias',
    channels: ['Email', 'Push'],
    status: 'active',
    icon: Compass,
    iconColor: 'text-amber-500',
  },
  {
    id: 'ativacao-pluggy',
    name: 'Ativação Pluggy',
    trigger: "Status = 'ativo' sem contas Pluggy conectadas",
    action: 'Enviar email "Conecte seu banco"',
    delay: '1 dia após ativação',
    channels: ['Email'],
    status: 'active',
    icon: Plug,
    iconColor: 'text-emerald-500',
  },
  {
    id: 'upgrade-trial',
    name: 'Upgrade Trial',
    trigger: "Status = 'trial' há mais de 7 dias + score > 30",
    action: 'Enviar oferta de upgrade',
    delay: '7 dias',
    channels: ['Email'],
    status: 'active',
    icon: TrendingUp,
    iconColor: 'text-blue-500',
  },
  {
    id: 'alerta-risco',
    name: 'Alerta de Risco',
    trigger: 'Sem login há 14 dias',
    action: 'Enviar email "Sentimos sua falta" + Notificar admin',
    delay: '14 dias sem login',
    channels: ['Email', 'Push', 'Admin Alert'],
    status: 'active',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  {
    id: 'reconquista',
    name: 'Reconquista',
    trigger: "Status = 'churned' há mais de 30 dias",
    action: 'Enviar oferta especial de retorno',
    delay: '30 dias',
    channels: ['Email'],
    status: 'active',
    icon: RefreshCw,
    iconColor: 'text-teal-500',
  },
  {
    id: 'google-ads-conversion',
    name: 'Google Ads Conversion',
    trigger: 'Usuário com gclid faz upgrade para plano pago',
    action: 'Enviar offline conversion para Google Ads',
    delay: 'Imediato',
    channels: ['API'],
    status: 'pending',
    icon: Globe,
    iconColor: 'text-muted-foreground',
  },
  {
    id: 'meta-capi-conversion',
    name: 'Meta CAPI Conversion',
    trigger: 'Usuário com fbclid faz upgrade para plano pago',
    action: 'Enviar purchase event para Meta Conversions API',
    delay: 'Imediato',
    channels: ['API'],
    status: 'pending',
    icon: Globe,
    iconColor: 'text-muted-foreground',
  },
];

const CHANNEL_ICONS: Record<Channel, React.ElementType> = {
  Email: Mail,
  Push: Bell,
  'Admin Alert': Shield,
  API: Zap,
};

const LS_KEY = 'crm_automation_toggles';

function loadToggles(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch { return {}; }
}

export default function CrmAutomations() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(loadToggles);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(toggles));
  }, [toggles]);

  const isEnabled = (rule: AutomationRule) => {
    if (rule.status === 'pending') return false;
    return toggles[rule.id] ?? true; // default on for active rules
  };

  const handleToggle = (id: string, val: boolean) => {
    setToggles(prev => ({ ...prev, [id]: val }));
  };

  const activeCount = RULES.filter(r => r.status === 'active' && isEnabled(r)).length;
  const pendingCount = RULES.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        <AdminPageHeader
          title="Automações CRM"
          description={`${activeCount} réguas ativas · ${pendingCount} pendentes de integração`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/crm"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Voltar ao Kanban</Link>
            </Button>
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
          {RULES.map(rule => {
            const Icon = rule.icon;
            const enabled = isEnabled(rule);
            const isPending = rule.status === 'pending';

            return (
              <Card key={rule.id} className={cn(
                'border-border transition-all',
                !enabled && !isPending && 'opacity-60',
              )}>
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', isPending ? 'bg-muted' : 'bg-primary/10')}>
                        <Icon className={cn('h-5 w-5', rule.iconColor)} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isPending ? (
                            <Badge variant="warning" className="text-2xs">⏳ Pendente Integração</Badge>
                          ) : enabled ? (
                            <Badge variant="success" className="text-2xs">✅ Ativo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-2xs">Inativo</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={v => handleToggle(rule.id, v)}
                      disabled={isPending}
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Trigger</span>
                      <span className="text-foreground">{rule.trigger}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Ação</span>
                      <span className="text-foreground">{rule.action}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Delay</span>
                      <span className="text-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />{rule.delay}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-muted-foreground w-14 shrink-0">Canal</span>
                      <div className="flex gap-1.5">
                        {rule.channels.map(ch => {
                          const ChIcon = CHANNEL_ICONS[ch];
                          return (
                            <Badge key={ch} variant="outline" className="text-2xs gap-1">
                              <ChIcon className="h-3 w-3" />{ch}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
