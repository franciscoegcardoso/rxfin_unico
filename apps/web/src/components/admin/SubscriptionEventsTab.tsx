import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CreditCard, 
  RefreshCw, 
  XCircle, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  Receipt,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionEvents, type SubscriptionEvent } from '@/hooks/useSubscriptionEvents';

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  venda_aprovada: { label: 'Venda Aprovada', icon: CheckCircle2, color: 'text-green-600' },
  venda_confirmada: { label: 'Venda Confirmada', icon: CheckCircle2, color: 'text-green-600' },
  assinatura_ativa: { label: 'Assinatura Ativa', icon: CheckCircle2, color: 'text-green-600' },
  assinatura_renovada: { label: 'Renovação', icon: RefreshCw, color: 'text-blue-600' },
  assinatura_cancelada: { label: 'Cancelamento', icon: XCircle, color: 'text-red-600' },
  assinatura_atrasada: { label: 'Atrasada', icon: AlertTriangle, color: 'text-amber-600' },
  reembolso: { label: 'Reembolso', icon: XCircle, color: 'text-red-600' },
  chargeback: { label: 'Chargeback', icon: XCircle, color: 'text-red-600' },
  estorno: { label: 'Estorno', icon: XCircle, color: 'text-red-600' },
};

const ROLE_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  pro: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  premium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function EventRow({ event }: { event: SubscriptionEvent }) {
  const [expanded, setExpanded] = useState(false);
  
  const config = EVENT_TYPE_CONFIG[event.event_type] || {
    label: event.event_type,
    icon: Receipt,
    color: 'text-muted-foreground',
  };
  
  const Icon = config.icon;
  
  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <TableRow className="group">
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="font-medium">{config.label}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm">
            {format(new Date(event.processed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </TableCell>
        <TableCell>
          <div className="text-sm truncate max-w-[180px]" title={event.contact_email || undefined}>
            {event.contact_email || '-'}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {event.role_before && (
              <Badge variant="secondary" className={ROLE_COLORS[event.role_before] || ''}>
                {event.role_before}
              </Badge>
            )}
            {event.role_before && event.role_after && event.role_before !== event.role_after && (
              <>
                <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                <Badge variant="secondary" className={ROLE_COLORS[event.role_after || ''] || ''}>
                  {event.role_after}
                </Badge>
              </>
            )}
            {!event.role_before && event.role_after && (
              <Badge variant="secondary" className={ROLE_COLORS[event.role_after] || ''}>
                {event.role_after}
              </Badge>
            )}
            {!event.role_before && !event.role_after && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className="font-medium">
            {formatCurrency(event.amount, event.currency)}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {event.payment_method || '-'}
          </span>
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7}>
            <div className="py-3 px-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">ID Transação Guru</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {event.transaction_id || '-'}
                    </code>
                    {event.transaction_id && <CopyButton text={event.transaction_id} />}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">ID Pagar.me</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {event.pagarme_transaction_id || '-'}
                    </code>
                    {event.pagarme_transaction_id && <CopyButton text={event.pagarme_transaction_id} />}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">ID Assinatura</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {event.subscription_id || '-'}
                    </code>
                    {event.subscription_id && <CopyButton text={event.subscription_id} />}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Status</span>
                  <Badge variant="outline">{event.event_status || '-'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Produto</span>
                  <span>{event.product_name || '-'}</span>
                  {event.product_id && (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-2">
                      {event.product_id}
                    </code>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">User ID</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {event.user_id}
                    </code>
                    <CopyButton text={event.user_id} />
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubscriptionEventsTab() {
  const [search, setSearch] = useState('');
  const { data: events, isLoading, refetch, isRefetching } = useSubscriptionEvents();

  const filteredEvents = events?.filter(event => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      event.contact_email?.toLowerCase().includes(searchLower) ||
      event.transaction_id?.toLowerCase().includes(searchLower) ||
      event.pagarme_transaction_id?.toLowerCase().includes(searchLower) ||
      event.event_type.toLowerCase().includes(searchLower) ||
      event.product_name?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, ID da transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{filteredEvents.length}</span> eventos
        </span>
        {events && events.length > 0 && (
          <span>
            Último evento: {format(new Date(events[0].processed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[180px]">Evento</TableHead>
              <TableHead className="w-[150px]">Data</TableHead>
              <TableHead className="w-[200px]">Email</TableHead>
              <TableHead className="w-[180px]">Mudança de Plano</TableHead>
              <TableHead className="w-[100px]">Valor</TableHead>
              <TableHead className="w-[100px]">Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Nenhum evento encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        {search 
                          ? 'Tente ajustar sua busca.'
                          : 'Os eventos de assinatura do Guru aparecerão aqui.'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
