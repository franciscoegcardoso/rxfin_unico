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

const FIXED_INCOME_TYPES = new Set([
  'FIXED_INCOME',
  'TREASURE_DIRECT',
  'MUTUAL_FUND',
  'PENSION_VGBL',
  'PENSION_PGBL',
]);

function getInitials(
  name?: string | null,
  ticker?: string | null,
  assetType?: string
): string {
  const typeUpper = (assetType ?? '').toUpperCase();
  if (assetType && FIXED_INCOME_TYPES.has(typeUpper) && name?.trim()) {
    const afterDash = name.split(' - ')[1];
    if (afterDash) {
      const cleaned = afterDash
        .replace(/BANCO |S\.A\.|SA|LTDA|S\/A/gi, '')
        .trim();
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase();
      }
    }
  }
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
  const logodevToken = typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOGODEV_TOKEN;

  const fallbackUrls = useMemo(() => {
    const list: string[] = [];
    if (logoUrl?.trim()) list.push(logoUrl.trim());
    const t = ticker?.trim();
    // Só tenta CDNs de bolsa (brapi, etc.) para tipos com ticker real (ações, FII, ETF, BDR).
    // FIXED_INCOME, MUTUAL_FUND, PENSION_* usam apenas logo_url do banco e companyDomain (Clearbit).
    const isTickerType = isBrapiTickerType(assetType, ticker);
    if (isTickerType && t) {
      list.push(`https://icons.brapi.dev/icons/${t}.svg`);
      list.push(`https://icons.brapi.dev/logos/${t}.png`);
      list.push(`https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${t}.png`);
      list.push(`https://raw.githubusercontent.com/nancydotso/logos/main/${t}.png`);
    }
    if (isCrypto && ticker) {
      const url = CRYPTO_LOGO_MAP[ticker.toUpperCase()];
      if (url) list.push(url);
    }
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
  }, [logoUrl, isCrypto, ticker, typeUpper, companyDomain, logodevToken]);

  const currentUrl = fallbackUrls[fallbackIndex];
  const failed = fallbackIndex >= fallbackUrls.length;
  const initials = getInitials(name, ticker, assetType);
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
