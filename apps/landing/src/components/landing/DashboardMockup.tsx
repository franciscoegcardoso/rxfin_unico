import React from 'react';

/**
 * Mockup visual do dashboard RXFin para o hero da landing.
 * Apenas divs + Tailwind, ~600px de largura, text-[8px]/[10px].
 */
export default function DashboardMockup() {
  return (
    <div className="w-full max-w-[600px] rounded-xl overflow-hidden shadow-2xl border border-border bg-background text-left">
      {/* Topbar vermelha */}
      <div className="bg-red-600 py-1.5 px-3 text-white text-[8px] font-bold tracking-wide flex items-center justify-center gap-1">
        <span>⚠</span>
        <span>DADOS FICTÍCIOS • COMEÇAR RAIO-X →</span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-14 flex-shrink-0 bg-muted/50 border-r border-border py-2 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            R
          </div>
          {['Início', 'Bens', 'Lanç.', 'Plan.', 'Cont.', 'Simul.'].map((label, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-medium ${
                i === 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
              }`}
            >
              {label.slice(0, 2)}
            </div>
          ))}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 p-2">
          {/* Header */}
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                F
              </div>
              <span className="text-[10px] font-semibold text-foreground">Olá, Francisco! 👋</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Março 2026</span>
          </div>

          {/* 4 KPI cards */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {['RECEITAS', 'DESPESAS', 'SALDO', 'LANÇAMENTOS'].map((label, i) => (
              <div
                key={label}
                className="bg-muted/50 border border-border rounded p-1.5 text-center relative"
              >
                <div className="text-[6px] font-bold text-muted-foreground uppercase">{label}</div>
                <div className="text-[10px] font-bold text-foreground tracking-tight">●●●●●</div>
                <span className="absolute top-0.5 right-0.5 text-[6px] px-1 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                  DEMO
                </span>
              </div>
            ))}
          </div>

          {/* Seguros a Vencer */}
          <div className="mb-2">
            <div className="text-[8px] font-bold text-foreground mb-1">Seguros a Vencer</div>
            <div className="space-y-0.5">
              {['Seguro Auto', 'Seguro Residencial'].map((nome, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-[8px]"
                >
                  <span className="text-foreground">{nome}</span>
                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 font-semibold">
                    Vencido
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pacotes Ativos */}
          <div className="mb-2">
            <div className="text-[8px] font-bold text-foreground mb-1">Pacotes Ativos</div>
            <div className="space-y-0.5">
              {['Contas da Casa', 'Alimentação'].map((nome, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-[8px] text-foreground"
                >
                  {nome}
                </div>
              ))}
            </div>
          </div>

          {/* Metas do Mês */}
          <div>
            <div className="text-[8px] font-bold text-foreground mb-1.5">Metas do Mês</div>
            <div className="space-y-1">
              {[
                { label: 'Contas da Casa', pct: 84, cor: 'bg-amber-400' },
                { label: 'Alimentação', pct: 80, cor: 'bg-primary' },
                { label: 'Transporte', pct: 63, cor: 'bg-blue-400' },
                { label: 'Lazer', pct: 100, cor: 'bg-red-500' },
              ].map(({ label, pct, cor }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[7px] text-muted-foreground w-16 truncate">{label}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[7px] w-6 text-right font-medium ${
                      pct === 100 ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
