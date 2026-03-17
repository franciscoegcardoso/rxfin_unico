import React from 'react';
import type { OnboardingStatus } from '@/types/investments';

const ONBOARDING_ITEMS = [
  { ok: true, text: 'Ações, FIIs, ETFs e BDRs' },
  { ok: true, text: 'Fundos de Investimento' },
  { ok: true, text: 'Renda Fixa (CDB, LCI, LCA, Tesouro)' },
  { ok: true, text: 'Dados consolidados em ~24h' },
  { ok: false, text: 'Previdência PGBL e VGBL' },
  { ok: false, text: 'Proventos e dividendos acumulados' },
] as const;

export interface InvestmentOnboardingCardProps {
  onboarding: OnboardingStatus;
  onDismiss: () => void | Promise<void>;
}

export function InvestmentOnboardingCard({ onboarding, onDismiss }: InvestmentOnboardingCardProps) {
  const connectorName = onboarding.newest_connector_name ?? 'conta';

  const handleDismiss = async () => {
    await onDismiss();
  };

  return (
    <div
      style={{
        background: 'var(--color-background-subtle, rgba(0,0,0,0.03))',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--border-radius-md, 0.375rem)',
        padding: '14px 16px',
        marginBottom: '12px',
        fontSize: '13px',
        color: 'var(--color-text-primary)',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '10px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: '16px',
        }}
        aria-label="Fechar"
      >
        ✕
      </button>

      <div style={{ fontWeight: 600, marginBottom: '10px', fontSize: '14px' }}>
        🏦 Seus investimentos estão sendo sincronizados
      </div>

      <p style={{ margin: '0 0 10px 0', color: 'var(--color-text-secondary)' }}>
        Conectamos sua <strong>{connectorName}</strong>! Veja o que é e o que não é sincronizado
        automaticamente:
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 12px',
          marginBottom: '12px',
        }}
      >
        {ONBOARDING_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: item.ok
                ? 'var(--color-text-success, #16a34a)'
                : 'var(--color-text-secondary)',
            }}
          >
            <span>{item.ok ? '✓' : '✗'}</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{item.text}</span>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: '0 0 12px 0',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
        }}
      >
        Para Previdência e Proventos, use <strong>&quot;+ Adicionar manual&quot;</strong> na tela
        acima.
      </p>

      <div style={{ textAlign: 'right' }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            fontSize: '12px',
            padding: '5px 12px',
            borderRadius: 'var(--border-radius-sm, 0.25rem)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          Entendi, não mostrar mais
        </button>
      </div>
    </div>
  );
}
