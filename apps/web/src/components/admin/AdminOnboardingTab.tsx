import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingBadge } from './OnboardingBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface UserOnboarding {
  id: string;
  full_name: string | null;
  email: string | null;
  onboarding_phase: string;
  created_at: string;
  phases: PhaseRecord[];
}

interface PhaseRecord {
  phase: string;
  started_at: string;
  ended_at: string | null;
}

export function AdminOnboardingTab() {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-onboarding-users'],
    queryFn: async () => {
      // Fetch users with onboarding info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, onboarding_phase, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all phase history
      const { data: history } = await supabase
        .from('onboarding_phase_history' as any)
        .select('user_id, phase, started_at, ended_at')
        .order('started_at', { ascending: true });

      const historyMap: Record<string, PhaseRecord[]> = {};
      for (const h of (history || []) as any[]) {
        if (!historyMap[h.user_id]) historyMap[h.user_id] = [];
        historyMap[h.user_id].push({
          phase: h.phase,
          started_at: h.started_at,
          ended_at: h.ended_at,
        });
      }

      return (profiles || []).map(p => ({
        ...p,
        onboarding_phase: p.onboarding_phase || 'not_started',
        phases: historyMap[p.id] || [],
      })) as UserOnboarding[];
    },
    staleTime: 0,
  });

  const filtered = useMemo(() => {
    let result = users || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (phaseFilter !== 'all') {
      result = result.filter(u => u.onboarding_phase === phaseFilter);
    }
    return result;
  }, [users, search, phaseFilter]);

  // Stats
  const stats = useMemo(() => {
    const all = users || [];
    const total = all.length;
    const completed = all.filter(u => u.onboarding_phase === 'completed').length;
    const inProgress = all.filter(u => !['not_started', 'completed'].includes(u.onboarding_phase)).length;
    const notStarted = all.filter(u => u.onboarding_phase === 'not_started').length;
    return { total, completed, inProgress, notStarted };
  }, [users]);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR });
  };

  const durationBetween = (start: string, end: string | null) => {
    if (!end) return 'Em andamento';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completo" value={stats.completed} variant="success" />
        <StatCard label="Em andamento" value={stats.inProgress} variant="info" />
        <StatCard label="Não iniciado" value={stats.notStarted} variant="muted" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as fases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="not_started">Não iniciado</SelectItem>
            <SelectItem value="started">Iniciado</SelectItem>
            <SelectItem value="block_a_done">Bloco A</SelectItem>
            <SelectItem value="block_b_done">Bloco B</SelectItem>
            <SelectItem value="block_c_done">Bloco C</SelectItem>
            <SelectItem value="completed">Completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Fase Atual</TableHead>
              <TableHead>Histórico de Fases</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-60" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{user.full_name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OnboardingBadge phase={user.onboarding_phase} />
                  </TableCell>
                  <TableCell>
                    {user.phases.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sem registro</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {user.phases.map((p, i) => (
                          <div key={i} className="flex items-center gap-1">
                            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                            <div className="flex items-center gap-1">
                              <OnboardingBadge phase={p.phase} compact />
                              <span className="text-2xs text-muted-foreground">
                                {formatDate(p.started_at)}
                                {p.ended_at && (
                                  <span className="ml-0.5">({durationBetween(p.started_at, p.ended_at)})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number; variant?: string }) {
  const colorClass = variant === 'success'
    ? 'text-emerald-600'
    : variant === 'info'
      ? 'text-blue-600'
      : variant === 'muted'
        ? 'text-muted-foreground'
        : 'text-foreground';

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
