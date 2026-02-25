import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, RotateCcw, RefreshCw, Loader2 } from "lucide-react";
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
  lastRunAt?: string | null;
}

const PHASE_LABELS = [
  "Fase 0 — Catálogo completo",
  "Fase 1 — Expandir 0km",
  "Fase 2 — Histórico faltante",
  "Fase 3 — Histórico esparso",
];

const VEHICLE_TYPES = ["", "Carros", "Motos", "Caminhões"];

export default function FipeSync() {
  const navigate = useNavigate();
  const [state, setState] = useState<RunnerState | null>(null);
  const [phase3, setPhase3] = useState<Phase3State | null>(null);
  const [phase3Queue, setPhase3Queue] = useState({ pending: 0, done: 0, unavailable: 0, skip: 0 });
  const [dbTotals, setDbTotals] = useState({ catalogCount: 0, priceHistoryCount: 0, priceRealCount: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      // Lê estado do runner direto do banco
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

      // Lê totais reais direto das tabelas
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
    } catch (e) {
      console.error("Error fetching status:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  // Polling every 8s when running (main runner or phase 3)
  useEffect(() => {
    const isRunning = state?.status === "running" || phase3?.status === "running";
    if (!isRunning) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, [state?.status, phase3?.status, fetchStatus]);

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">FIPE Auto Runner</h1>
            <p className="text-muted-foreground text-sm">Ingestão automatizada do catálogo e histórico FIPE</p>
          </div>
        </div>

        {/* Status + Controls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Status</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusColor(state?.status || "idle")}>
                {state?.status?.toUpperCase() || "IDLE"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => fetchStatus()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
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
              // Phase 3: use real queue data
              const isPhase3 = idx === 3;
              const totalAtivo = phase3Queue.done + phase3Queue.unavailable + phase3Queue.pending;
              const p3Progress = totalAtivo > 0 ? (phase3Queue.done / totalAtivo) * 100 : 0;
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

        {/* Phase 3 Detail Card */}
        {(phase3 || phase3Queue.pending > 0 || phase3Queue.done > 0) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Fase 3 — Histórico Mensal Completo</CardTitle>
              <Badge className={phase3?.status === "running" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground"}>
                {phase3?.status?.toUpperCase() || "—"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-primary">{phase3Queue.done.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Processados com sucesso</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums">{phase3Queue.unavailable.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Sem dados na API</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-muted-foreground">{phase3Queue.skip.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Descartados (pré-2008)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums">{phase3Queue.pending.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-primary/60">~434.000</p>
                  <p className="text-xs text-muted-foreground">Novos preços esperados</p>
                </div>
              </div>

              <div className="space-y-1">
                {(() => {
                  const RATE_PER_HOUR = 3000;
                  const hoursLeft = phase3Queue.pending / RATE_PER_HOUR;
                  const conclusao = new Date(Date.now() + hoursLeft * 3600 * 1000);
                  const conclusaoStr = conclusao.toLocaleDateString("pt-BR");
                  const daysLeft = hoursLeft / 24;
                  const totalAtivo = phase3Queue.done + phase3Queue.unavailable + phase3Queue.pending;
                  const progressoPct = totalAtivo > 0 ? (phase3Queue.done / totalAtivo) * 100 : 0;
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso real</span>
                        <span className="font-semibold tabular-nums">{progressoPct.toFixed(1)}%</span>
                      </div>
                      <Progress value={progressoPct} className="h-2" />
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Previsão de conclusão</span>
                        <span className="font-semibold tabular-nums">
                          ~{daysLeft < 1 ? `${Math.ceil(hoursLeft)}h` : `${Math.ceil(daysLeft)} dias`} ({conclusaoStr})
                        </span>
                      </div>
                    </>
                  );
                })()}
                <p className="text-xs text-muted-foreground mt-1">
                  Última execução: {phase3?.lastRunAt ? new Date(phase3.lastRunAt).toLocaleString("pt-BR") : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
