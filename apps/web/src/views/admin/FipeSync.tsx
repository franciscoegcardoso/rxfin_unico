import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, RotateCcw, RefreshCw, Loader2, Zap, Clock, CheckCircle2, XCircle, BarChart3, Activity } from "lucide-react";
import { toast } from "sonner";

interface RunnerState {
  status: "idle" | "running" | "paused" | "completed";
  phase: number;
  iteration: number;
  totals: {
    catalogInserted: number;
    pricesInserted: number;
    unavailable424: number;
  };
  phase0VehicleTypeIndex: number;
  phase0LastBrandId: number | null;
  phase0LastModelId: number | null;
  lastRunAt: string | null;
  nextCallScheduled: boolean;
  lastError: string | null;
}

interface Phase3State {
  status?: string;
  iteration?: number;
  inserted?: number;
  unavailable?: number;
  lastRunAt?: string | null;
}

interface RefProgress {
  reference_code: number;
  slug: string;
  done: number;
  pending: number;
  unavailable: number;
  total: number;
}

interface RecentPrice {
  fipe_code: string;
  brand_name: string;
  model_name: string;
  model_year: number;
  reference_month: number;
  reference_year: number;
  price: number;
  fetched_at: string;
}

const PHASE_LABELS = [
  "Fase 0 — Catálogo completo",
  "Fase 1 — Expandir 0km",
  "Fase 2 — Histórico faltante",
  "Fase 3 — Histórico esparso",
];

const VEHICLE_TYPES = ["", "Carros", "Motos", "Caminhões"];
const RATE_PER_HOUR = 3000;
const REFRESH_INTERVAL = 30_000;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `há ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export default function FipeSync() {
  const navigate = useNavigate();
  const [state, setState] = useState<RunnerState | null>(null);
  const [phase3, setPhase3] = useState<Phase3State | null>(null);
  const [phase3Queue, setPhase3Queue] = useState({ pending: 0, done: 0, unavailable: 0, skip: 0 });
  const [dbTotals, setDbTotals] = useState({ catalogCount: 0, priceHistoryCount: 0, priceRealCount: 0 });
  const [refProgress, setRefProgress] = useState<RefProgress[]>([]);
  const [recentPrices, setRecentPrices] = useState<RecentPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [runnerRes, phase3Res] = await Promise.all([
        supabase.from("app_settings").select("setting_value").eq("setting_key", "fipe_auto_runner_state").maybeSingle(),
        supabase.from("app_settings").select("setting_value").eq("setting_key", "fipe_phase3_state").maybeSingle(),
      ]);

      const raw = runnerRes.data?.setting_value;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed) setState(parsed as RunnerState);

      const p3raw = phase3Res.data?.setting_value;
      const p3parsed = typeof p3raw === "string" ? JSON.parse(p3raw) : p3raw;
      if (p3parsed) setPhase3(p3parsed as Phase3State);

      const [catalogRes, priceRes, priceRealRes, p3PendingRes, p3DoneRes, p3UnavailRes, p3SkipRes] = await Promise.all([
        supabase.from("fipe_catalog").select("*", { count: "exact", head: true }),
        supabase.from("fipe_price_history").select("*", { count: "exact", head: true }),
        supabase.from("fipe_price_history").select("*", { count: "exact", head: true }).gt("price", 0),
        supabase.from("fipe_phase3_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("fipe_phase3_queue").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("fipe_phase3_queue").select("*", { count: "exact", head: true }).eq("status", "unavailable"),
        supabase.from("fipe_phase3_queue").select("*", { count: "exact", head: true }).eq("status", "skip"),
      ]);
      setDbTotals({
        catalogCount: catalogRes.count ?? 0,
        priceHistoryCount: priceRes.count ?? 0,
        priceRealCount: priceRealRes.count ?? 0,
      });
      setPhase3Queue({
        pending: p3PendingRes.count ?? 0,
        done: p3DoneRes.count ?? 0,
        unavailable: p3UnavailRes.count ?? 0,
        skip: p3SkipRes.count ?? 0,
      });

      // Reference progress via RPC
      const { data: refData } = await supabase.rpc("get_phase3_reference_progress", { p_limit: 10 });
      if (refData) setRefProgress(refData as RefProgress[]);

      // Recent prices from fipe_price_history joined with fipe_catalog
      const { data: pricesData } = await supabase
        .from("fipe_price_history")
        .select("fipe_code, model_year, reference_month, reference_year, price, fetched_at")
        .gt("price", 0)
        .lt("price", 15000000)
        .order("fetched_at", { ascending: false })
        .limit(10);

      if (pricesData && pricesData.length > 0) {
        // Fetch catalog info for these fipe_codes
        const codes = [...new Set(pricesData.map((p) => p.fipe_code))];
        const { data: catalogData } = await supabase
          .from("fipe_catalog")
          .select("fipe_code, brand_name, model_name")
          .in("fipe_code", codes);
        const catalogMap = new Map((catalogData ?? []).map((c) => [c.fipe_code, c]));
        setRecentPrices(
          pricesData.map((p) => ({
            ...p,
            brand_name: catalogMap.get(p.fipe_code)?.brand_name ?? "—",
            model_name: catalogMap.get(p.fipe_code)?.model_name ?? "—",
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching status:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const runAction = async (action: string) => {
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("fipe-auto-runner", {
        body: { action },
      });
      if (error) throw error;
      if (data?.state) setState(data.state);
      toast.success(`Ação "${action}" executada`);
      await fetchStatus();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const triggerPhase3 = async () => {
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("fipe-phase3-runner");
      if (error) throw error;
      setTriggerResult(JSON.stringify(data, null, 2));
      toast.success("Phase 3 runner executado");
      await fetchStatus();
    } catch (e) {
      setTriggerResult(`Erro: ${(e as Error).message}`);
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "running": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "paused": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalAtivo = phase3Queue.done + phase3Queue.unavailable + phase3Queue.pending;
  const p3Progress = totalAtivo > 0 ? (phase3Queue.done / totalAtivo) * 100 : 0;
  const hoursLeft = phase3Queue.pending / RATE_PER_HOUR;
  const daysLeft = hoursLeft / 24;
  const conclusao = new Date(Date.now() + hoursLeft * 3600 * 1000);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">FIPE Auto Runner</h1>
            <p className="text-muted-foreground text-sm">Ingestão automatizada do catálogo e histórico FIPE</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchStatus()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar dados
          </Button>
        </div>

        {/* ── SEÇÃO 1: Status geral Phase 3 (cards) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Inseridos</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{(phase3?.inserted ?? 0).toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">Pendentes</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{phase3Queue.pending.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground">Indisponíveis</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{phase3Queue.unavailable.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Progresso</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{p3Progress.toFixed(1)}%</p>
              <Progress value={p3Progress} className="h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Status</span>
              </div>
              <Badge className={statusColor(phase3?.status || "idle")}>
                {phase3?.status?.toUpperCase() || "IDLE"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Última exec.</span>
              </div>
              <p className="text-sm font-semibold">
                {phase3?.lastRunAt ? timeAgo(phase3.lastRunAt) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Previsão de conclusão */}
        {phase3Queue.pending > 0 && (
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">Previsão de conclusão</span>
            <span className="font-semibold tabular-nums">
              ~{daysLeft < 1 ? `${Math.ceil(hoursLeft)}h` : `${Math.ceil(daysLeft)} dias`} ({conclusao.toLocaleDateString("pt-BR")})
            </span>
          </div>
        )}

        {/* ── SEÇÃO 2: Progresso por referência ── */}
        {refProgress.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Progresso por Referência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Referência</th>
                      <th className="text-right py-2 font-medium">Done</th>
                      <th className="text-right py-2 font-medium">Pendente</th>
                      <th className="text-right py-2 font-medium">Indisponível</th>
                      <th className="text-right py-2 font-medium">% concluído</th>
                      <th className="py-2 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {refProgress.map((r) => {
                      const pct = r.total > 0 ? (Number(r.done) / Number(r.total)) * 100 : 0;
                      return (
                        <tr key={r.reference_code} className="border-b border-border/50">
                          <td className="py-2 font-medium">{r.slug}</td>
                          <td className="text-right py-2 tabular-nums text-green-500">{Number(r.done).toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 tabular-nums">{Number(r.pending).toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 tabular-nums text-muted-foreground">{Number(r.unavailable).toLocaleString("pt-BR")}</td>
                          <td className="text-right py-2 tabular-nums font-semibold">{pct.toFixed(1)}%</td>
                          <td className="py-2 pl-3">
                            <Progress value={pct} className="h-1.5" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SEÇÃO 3: Últimas inserções ── */}
        {recentPrices.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Últimas Inserções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentPrices.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">
                        {p.brand_name} {p.model_name} {p.model_year}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right shrink-0">
                      <span className="font-bold text-primary">{formatCurrency(p.price)}</span>
                      <span className="text-muted-foreground text-xs">ref {p.reference_month}/{p.reference_year}</span>
                      <span className="text-muted-foreground text-xs">{timeAgo(p.fetched_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SEÇÃO 4: Controles ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Button onClick={triggerPhase3} disabled={triggerLoading} variant="outline">
                {triggerLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Forçar execução agora
              </Button>
            </div>
            {triggerResult && (
              <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-40">{triggerResult}</pre>
            )}
          </CardContent>
        </Card>

        {/* ── Auto Runner (Fases 0-2) ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Auto Runner (Fases 0-2)</CardTitle>
            <Badge className={statusColor(state?.status || "idle")}>
              {state?.status?.toUpperCase() || "IDLE"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {state?.status === "idle" && (
                <Button onClick={() => runAction("start")} disabled={!!actionLoading}>
                  {actionLoading === "start" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Iniciar
                </Button>
              )}
              {state?.status === "running" && (
                <Button variant="outline" onClick={() => runAction("pause")} disabled={!!actionLoading}>
                  {actionLoading === "pause" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  Pausar
                </Button>
              )}
              {state?.status === "paused" && (
                <Button onClick={() => runAction("resume")} disabled={!!actionLoading}>
                  {actionLoading === "resume" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Retomar
                </Button>
              )}
              {(state?.status === "completed" || state?.status === "paused") && (
                <Button variant="destructive" onClick={() => runAction("reset")} disabled={!!actionLoading}>
                  {actionLoading === "reset" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reset
                </Button>
              )}
            </div>
            {state?.lastError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive mb-4">
                Último erro: {state.lastError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso por Fase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PHASE_LABELS.map((label, idx) => {
              const isCurrent = state?.phase === idx;
              const isDone = (state?.phase ?? 0) > idx || state?.status === "completed";
              const isPhase3 = idx === 3;
              const p3Running = phase3?.status === "running";
              const p3Completed = phase3?.status === "completed";

              let progressValue = isDone ? 100 : isCurrent ? 50 : 0;
              let currentLabel = isCurrent;
              let doneLabel = isDone;

              if (isPhase3) {
                progressValue = p3Completed ? 100 : p3Progress;
                currentLabel = p3Running;
                doneLabel = p3Completed;
              }

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={currentLabel ? "font-semibold text-primary" : doneLabel ? "text-muted-foreground line-through" : "text-muted-foreground"}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      {isPhase3 && p3Running && (
                        <span className="text-xs text-muted-foreground tabular-nums">{p3Progress.toFixed(1)}%</span>
                      )}
                      {currentLabel && <Badge variant="outline" className="text-xs">Em andamento</Badge>}
                      {doneLabel && <Badge variant="secondary" className="text-xs">Concluída</Badge>}
                    </div>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{state?.iteration ?? 0}</p>
              <p className="text-xs text-muted-foreground">Iterações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{state?.totals?.catalogInserted ?? 0}</p>
              <p className="text-xs text-muted-foreground">Catálogo inserido</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{dbTotals.priceRealCount.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Preços reais (price &gt; 0)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{(dbTotals.priceHistoryCount - dbTotals.priceRealCount).toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Sentinelas (price = 0)</p>
            </CardContent>
          </Card>
        </div>

        {/* DB Totals */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{dbTotals.catalogCount.toLocaleString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground">Total fipe_catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-primary">{dbTotals.priceHistoryCount.toLocaleString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground">Total fipe_price_history</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 0 Checkpoint */}
        {state?.phase === 0 && state.status === "running" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checkpoint Fase 0</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Vehicle Type</p>
                  <p className="font-semibold">{VEHICLE_TYPES[state.phase0VehicleTypeIndex + 1] || `Index ${state.phase0VehicleTypeIndex}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última Brand ID</p>
                  <p className="font-semibold">{state.phase0LastBrandId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Último Model ID</p>
                  <p className="font-semibold">{state.phase0LastModelId ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meta */}
        <Card>
          <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
            <p>Última execução: {state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString("pt-BR") : "—"}</p>
            <p>Auto-loop agendado: {state?.nextCallScheduled ? "Sim (pg_net)" : "Não (fallback frontend)"}</p>
            <p className="text-xs opacity-50">Auto-refresh a cada 30s</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
