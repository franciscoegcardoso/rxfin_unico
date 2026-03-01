import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Info,
  AlertCircle,
  Clock,
  User,
  Activity,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAGE_SIZE = 50;

interface AuditLog {
  id: string;
  action: string;
  created_at: string | null;
  severity: string | null;
  user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata: any;
  user_agent: string | null;
  ip_address: unknown;
}

const severityConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/10 text-red-700 border-red-500/30', icon: <AlertCircle className="h-3 w-3" /> },
  warning: { label: 'Aviso', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30', icon: <AlertTriangle className="h-3 w-3" /> },
  info: { label: 'Info', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: <Info className="h-3 w-3" /> },
};

export const AdminAuditDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    const currentOffset = reset ? 0 : offset;

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (severityFilter !== 'all') {
      query = query.eq('severity', severityFilter);
    }
    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }
    if (search) {
      query = query.or(`action.ilike.%${search}%,user_id.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (reset) {
        setLogs(data as AuditLog[]);
        setOffset(PAGE_SIZE);
      } else {
        setLogs(prev => [...prev, ...(data as AuditLog[])]);
        setOffset(prev => prev + PAGE_SIZE);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [offset, severityFilter, actionFilter, search]);

  useEffect(() => {
    fetchLogs(true);
  }, [severityFilter, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetchLogs(true);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Compute stats
  const stats = {
    total: logs.length,
    critical: logs.filter(l => l.severity === 'critical').length,
    warning: logs.filter(l => l.severity === 'warning').length,
    info: logs.filter(l => l.severity === 'info').length,
  };

  // Unique actions for filter dropdown
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Audit Logs</h1>
            <p className="text-xs text-muted-foreground">Registro de atividades do sistema</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchLogs(true)}>
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
              <p className="text-xs text-muted-foreground">Info</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ação ou usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9" onClick={handleSearch}>
          <Search className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Quando</div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Severidade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Ação</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1"><User className="h-3 w-3" /> Usuário</div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const sev = severityConfig[log.severity || 'info'] || severityConfig.info;
                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {log.created_at
                          ? format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${sev.color}`}>
                          {sev.icon}
                          {sev.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">{log.action}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td className="p-3">
                        {log.metadata ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto max-w-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {hasMore && !loading && logs.length > 0 && (
            <div className="flex justify-center p-4 border-t">
              <Button variant="outline" size="sm" onClick={() => fetchLogs(false)} className="gap-2">
                Carregar mais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuditDashboard;
