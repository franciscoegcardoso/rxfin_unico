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

/** Token publishable Logo.dev — override via `VITE_LOGODEV_TOKEN`. */
export const LOGODEV_TOKEN_DEFAULT = 'pk_Dp3UH6feRJSHIK2iM3-Y0g';

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

/**
 * Converte URL legada `logo.clearbit.com/…` para `img.logo.dev` (evita ERR_NAME_NOT_RESOLVED).
 * Não deve existir no banco; defesa em profundidade se cache ou dado antigo ainda vier.
 */
export function normalizeLegacyLogoUrl(url: string, token: string = LOGODEV_TOKEN_DEFAULT): string {
  const trimmed = url.trim();
  if (!trimmed || !/logo\.clearbit\.com/i.test(trimmed)) return trimmed;
  try {
    const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const u = new URL(href);
    if (!/\.clearbit\.com$/i.test(u.hostname)) return trimmed;
    const domain = u.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
    if (!domain) return trimmed;
    return `https://img.logo.dev/${domain}?token=${token}&size=64`;
  } catch {
    const m = trimmed.match(/logo\.clearbit\.com\/([^/?#]+)/i);
    if (m?.[1]) return `https://img.logo.dev/${m[1]}?token=${token}&size=64`;
    return trimmed;
  }
}

/**
 * Cadeia de fallbacks para o avatar — sem uso de domínios descontinuados.
 * FIXED_INCOME / fundos: só `logoUrl` normalizado + Logo.dev por domínio (sem CDNs de ticker B3).
 */
export function buildFallbackChain(
  ticker: string | undefined | null,
  assetType: string,
  logoUrl?: string | null,
  companyDomain?: string | null,
  token: string = LOGODEV_TOKEN_DEFAULT,
): string[] {
  const urls: string[] = [];
  const t = ticker?.trim().toUpperCase() ?? '';

  if (logoUrl?.trim()) {
    urls.push(normalizeLegacyLogoUrl(logoUrl.trim(), token));
  }

  const isTickerType = isBrapiTickerType(assetType, ticker);

  if (isTickerType && t) {
    urls.push(`https://icons.brapi.dev/icons/${t}.svg`);
    urls.push(`https://icons.brapi.dev/logos/${t}.png`);
    urls.push(`https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${t}.png`);
    urls.push(`https://raw.githubusercontent.com/nancydotso/logos/main/${t}.png`);
  }

  const typeUpper = (assetType || '').toUpperCase();
  const isCrypto = typeUpper === 'CRYPTO' || assetType === 'crypto';
  if (isCrypto && t) {
    const cryptoUrl = CRYPTO_LOGO_MAP[t];
    if (cryptoUrl) urls.push(cryptoUrl);
  }

  if (companyDomain?.trim()) {
    const domain = companyDomain.trim().replace(/^https?:\/\//, '').split('/')[0];
    if (domain) {
      urls.push(`https://img.logo.dev/${domain}?token=${token}&size=64`);
    }
  }

  return urls;
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

  const logodevToken =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOGODEV_TOKEN) ||
    LOGODEV_TOKEN_DEFAULT;

  const fallbackUrls = useMemo(
    () => buildFallbackChain(ticker, assetType, logoUrl, companyDomain, logodevToken),
    [logoUrl, ticker, assetType, companyDomain, logodevToken],
  );

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
