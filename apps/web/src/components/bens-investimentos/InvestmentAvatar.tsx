import React, { useEffect, useState } from 'react';
import { AssetLogo } from '@/components/ui/AssetLogo';

function useLogoBoxPx(): number {
  const [px, setPx] = useState(36);
  useEffect(() => {
    const u = () => {
      const w = window.innerWidth;
      setPx(w >= 1024 ? 40 : w >= 768 ? 36 : 32);
    };
    u();
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);
  return px;
}

export function InvestmentAvatar({
  logoUrl,
  ticker,
  type,
  displayName,
  companyDomain,
}: {
  logoUrl: string | null;
  ticker: string | null;
  type: string;
  /** Para iniciais quando não há logo */
  displayName?: string;
  /** Domínio para fallback Clearbit (ex.: renda fixa) */
  companyDomain?: string | null;
}) {
  const box = useLogoBoxPx();
  const scale = box / 40;

  return (
    <div
      className="shrink-0 flex items-center justify-center overflow-hidden rounded-full"
      style={{ width: box, height: box }}
    >
      <div
        className="flex items-center justify-center origin-center"
        style={{ width: 40, height: 40, transform: `scale(${scale})` }}
      >
        <AssetLogo
          logoUrl={logoUrl ?? undefined}
          ticker={ticker ?? undefined}
          assetType={type}
          size="lg"
          name={displayName ?? ticker ?? undefined}
          companyDomain={companyDomain ?? undefined}
        />
      </div>
    </div>
  );
}
