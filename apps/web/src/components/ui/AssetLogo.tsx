import React, { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CRYPTO_LOGO_MAP } from '@/lib/crypto-logo-map';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: { box: 24, text: 9 },
  md: { box: 32, text: 11 },
  lg: { box: 40, text: 13 },
  xl: { box: 56, text: 16 },
} as const;

/** Tipos com ícone público em icons.brapi.dev (SVG, sem token). */
const BRAPI_TYPES_UPPER = new Set(['STOCK', 'REAL_ESTATE_FUND', 'ETF', 'BDR']);
const BRAPI_TYPES_RAW = new Set(['stock_br', 'fii', 'etf_br', 'bdr']);

/** Tickers típicos B3 (ações, FII, BDR) para tentar icons.brapi.dev mesmo com tipo Pluggy "EQUITY". */
function isLikelyBrazilianListingTicker(ticker: string): boolean {
  const s = ticker.trim().toUpperCase();
  if (s.length < 4 || s.length > 9) return false;
  if (s.endsWith('11') && /^[A-Z0-9]+$/.test(s)) return true;
  return /^[A-Z][A-Z0-9]*\d{1,2}$/.test(s);
}

function isBrapiTickerType(assetType: string, ticker?: string | null): boolean {
  if (!assetType) return false;
  if (BRAPI_TYPES_RAW.has(assetType)) return true;
  const u = assetType.toUpperCase();
  if (BRAPI_TYPES_UPPER.has(u)) return true;
  if (u === 'EQUITY' && ticker && isLikelyBrazilianListingTicker(ticker)) return true;
  return false;
}

function getAvatarColor(seed: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const idx = seed.charCodeAt(0) % colors.length;
  return colors[idx];
}

function getInitials(ticker?: string | null, name?: string | null): string {
  if (ticker && ticker.length >= 2) {
    return ticker.slice(0, 2).toUpperCase();
  }
  if (name && name.trim()) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return '??';
}

export interface AssetLogoProps {
  ticker?: string | null;
  assetType: string;
  logoUrl?: string | null;
  companyDomain?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

export function AssetLogo({
  ticker,
  assetType,
  logoUrl,
  companyDomain,
  name,
  size = 'md',
  className,
  showTooltip = false,
}: AssetLogoProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const typeUpper = (assetType || '').toUpperCase();
  const isCrypto = typeUpper === 'CRYPTO' || assetType === 'crypto';
  const useBrapi = isBrapiTickerType(assetType, ticker);
  const logodevToken = typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOGODEV_TOKEN;

  const fallbackUrls = useMemo(() => {
    const list: string[] = [];
    if (logoUrl?.trim()) list.push(logoUrl.trim());
    // 1. Brapi CDN — ações, FIIs, ETFs, BDRs BR (SVG público)
    if (useBrapi && ticker?.trim()) {
      list.push(`https://icons.brapi.dev/icons/${ticker.trim().toUpperCase()}.svg`);
    }
    // 2. Cripto — mapa local
    if (isCrypto && ticker) {
      const url = CRYPTO_LOGO_MAP[ticker.toUpperCase()];
      if (url) list.push(url);
    }
    // 3. Logo.dev + 4. Clearbit
    if (companyDomain?.trim()) {
      const domain = companyDomain.trim().replace(/^https?:\/\//, '').split('/')[0];
      if (domain) {
        if (logodevToken) {
          list.push(`https://img.logo.dev/${domain}?token=${logodevToken}&size=64`);
        }
        list.push(`https://logo.clearbit.com/${domain}`);
      }
    }
    return list;
  }, [logoUrl, isCrypto, ticker, useBrapi, companyDomain, logodevToken]);

  const currentUrl = fallbackUrls[fallbackIndex];
  const failed = fallbackIndex >= fallbackUrls.length;
  const initials = getInitials(ticker, name);
  const { box, text } = SIZE_MAP[size];
  const avatarColor = getAvatarColor(ticker || name || 'x');

  const handleError = () => {
    setFallbackIndex((i) => Math.min(i + 1, fallbackUrls.length));
  };

  const content = (
    <>
      {!failed && currentUrl ? (
        <img
          src={currentUrl}
          alt=""
          width={box}
          height={box}
          className={cn('rounded-full object-contain bg-white flex-shrink-0', className)}
          onError={handleError}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center flex-shrink-0',
            avatarColor,
            className
          )}
          style={{ width: box, height: box, fontSize: text }}
        >
          {initials}
        </div>
      )}
    </>
  );

  if (showTooltip && (name || ticker)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{content}</span>
          </TooltipTrigger>
          <TooltipContent>
            {name || ticker || ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
