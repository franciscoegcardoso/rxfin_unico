/**
 * Generates a stable, deterministic installment_group_id for a purchase.
 * This ensures the same purchase imported across different months receives the same group ID.
 */

// Normalize store name: remove installment pattern (1/12), extra spaces, uppercase
export function normalizeStoreName(name: string): string {
  return name
    .replace(/\s*\d+\s*[\/\\]\s*\d+\s*/g, '') // Remove "1/12", "2 / 12", etc.
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Reconstruct the estimated purchase date from a transaction.
//
// IMPORTANT: Some statement exports keep the ORIGINAL purchase date for all installments
// (e.g., 29/11/2024 for 4/12). Others use the statement/bill month as the date.
// When billDueDate is provided, we detect which case we're in.
export function getPurchaseDate(
  transactionDate: string,
  installmentCurrent: number,
  billDueDate?: string | null
): string {
  const safeInstallment = Math.max(1, installmentCurrent || 1);

  // If we don't know the bill month, keep legacy behavior (assumes transactionDate is the bill month)
  if (!billDueDate) {
    const txDate = new Date(transactionDate);
    const purchaseDate = new Date(txDate);
    purchaseDate.setMonth(purchaseDate.getMonth() - (safeInstallment - 1));

    const year = purchaseDate.getFullYear();
    const month = String(purchaseDate.getMonth() + 1).padStart(2, '0');
    const day = String(purchaseDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // If bill month is >= (installmentCurrent-1) months AFTER the transaction month,
  // transactionDate is already the ORIGINAL purchase date.
  const txMonth = transactionDate.substring(0, 7);
  const billMonth = billDueDate.substring(0, 7);

  const monthIndex = (m: string) => {
    const [y, mm] = m.split('-');
    return Number(y) * 12 + (Number(mm) - 1);
  };

  const diffMonths = monthIndex(billMonth) - monthIndex(txMonth);
  if (diffMonths >= safeInstallment - 1) {
    return transactionDate;
  }

  // Otherwise, transactionDate is likely in the bill month; reconstruct purchase date.
  const txDate = new Date(transactionDate);
  const purchaseDate = new Date(txDate);
  purchaseDate.setMonth(purchaseDate.getMonth() - (safeInstallment - 1));

  const year = purchaseDate.getFullYear();
  const month = String(purchaseDate.getMonth() + 1).padStart(2, '0');
  const day = String(purchaseDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Build a unique purchase key combining all identifying factors
// NOTE: We intentionally EXCLUDE installmentValue from the key because
// installment values can vary slightly between parcels (e.g., 1540.87 vs 1540.83)
// due to rounding differences in the first/last installments.
export function buildPurchaseKey(
  userId: string,
  cardId: string | null,
  storeName: string,
  installmentTotal: number,
  purchaseDate: string,
  _installmentValue?: number // Kept for API compatibility but not used
): string {
  const normalizedName = normalizeStoreName(storeName);
  const cardKey = cardId || 'no-card';
  
  return `${userId}::${cardKey}::${normalizedName}::${installmentTotal}::${purchaseDate}`;
}

// Generate SHA-256 hash and format as UUID v5-like
async function sha256ToUuid(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Convert first 16 bytes to UUID format
  // Set version 5 bits (name-based SHA) and variant bits
  hashArray[6] = (hashArray[6] & 0x0f) | 0x50; // Version 5
  hashArray[8] = (hashArray[8] & 0x3f) | 0x80; // Variant
  
  const hex = Array.from(hashArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Generate a stable installment group ID for a purchase
export async function generateStableInstallmentGroupId(
  userId: string,
  cardId: string | null,
  storeName: string,
  installmentTotal: number,
  transactionDate: string,
  installmentCurrent: number,
  installmentValue: number,
  billDueDate?: string | null
): Promise<string> {
  const purchaseDate = getPurchaseDate(transactionDate, installmentCurrent, billDueDate);
  const purchaseKey = buildPurchaseKey(
    userId,
    cardId,
    storeName,
    installmentTotal,
    purchaseDate,
    installmentValue
  );

  return sha256ToUuid(purchaseKey);
}

// Synchronous version using simple hash (for cases where async is not possible)
export function generateStableInstallmentGroupIdSync(
  userId: string,
  cardId: string | null,
  storeName: string,
  installmentTotal: number,
  transactionDate: string,
  installmentCurrent: number,
  installmentValue: number,
  billDueDate?: string | null
): string {
  const purchaseDate = getPurchaseDate(transactionDate, installmentCurrent, billDueDate);
  const purchaseKey = buildPurchaseKey(
    userId,
    cardId,
    storeName,
    installmentTotal,
    purchaseDate,
    installmentValue
  );

  // Simple hash function for sync usage (djb2)
  let hash = 5381;
  for (let i = 0; i < purchaseKey.length; i++) {
    hash = ((hash << 5) + hash) + purchaseKey.charCodeAt(i);
  }

  // Convert to UUID-like format
  const hex = Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// =====================================================================
// Group merging: consolidate fragmented group IDs
// =====================================================================

/**
 * Determine if two installment groups should be merged.
 * Criteria: same normalized store name, same cardId, same total,
 * and purchase dates within maxDaysDiff days of each other.
 */
export function shouldMergeGroups(
  groupA: { storeName: string; cardId: string | null; total: number; purchaseDate: string },
  groupB: { storeName: string; cardId: string | null; total: number; purchaseDate: string },
  maxDaysDiff: number = 3
): boolean {
  if (normalizeStoreName(groupA.storeName) !== normalizeStoreName(groupB.storeName)) return false;
  if (groupA.cardId !== groupB.cardId) return false;
  if (groupA.total !== groupB.total) return false;

  // Compare purchase dates
  const dateA = new Date(groupA.purchaseDate + 'T00:00:00');
  const dateB = new Date(groupB.purchaseDate + 'T00:00:00');
  const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= maxDaysDiff;
}

/**
 * Given a map of groupId -> group metadata, find pairs that should be merged
 * and return a mapping of old groupId -> canonical groupId (the one to keep).
 */
export function buildMergeMap(
  groups: Map<string, { storeName: string; cardId: string | null; total: number; purchaseDate: string }>
): Map<string, string> {
  const mergeMap = new Map<string, string>();
  const entries = Array.from(groups.entries());

  for (let i = 0; i < entries.length; i++) {
    const [idA, gA] = entries[i];
    // Skip if already merged into something
    if (mergeMap.has(idA)) continue;

    for (let j = i + 1; j < entries.length; j++) {
      const [idB, gB] = entries[j];
      if (mergeMap.has(idB)) continue;

      if (shouldMergeGroups(gA, gB)) {
        // Keep the one with the earlier purchase date as canonical
        const canonical = gA.purchaseDate <= gB.purchaseDate ? idA : idB;
        const merged = canonical === idA ? idB : idA;
        mergeMap.set(merged, canonical);
      }
    }
  }

  return mergeMap;
}

// =====================================================================
// Installment detection + sibling detection (kept here to avoid dependency
// on a separate file that may not be present in synced GitHub deployments).
// =====================================================================

const INSTALLMENT_REGEX = /(\d{1,2})\s*[/\\]\s*(\d{1,2})/;
const MAX_INSTALLMENTS = 48;

export interface DetectedInstallment {
  current: number;
  total: number;
  source: 'metadata' | 'regex';
}

function fromMetadata(metadata: unknown): DetectedInstallment | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const m = metadata as Record<string, unknown>;
  const current = Number(m.installmentNumber ?? m.installment_number);
  const total = Number(m.totalInstallments ?? m.total_installments);

  if (!isValidInstallment(current, total)) return null;
  return { current, total, source: 'metadata' };
}

function fromStoreName(storeName: string): DetectedInstallment | null {
  const match = storeName.match(INSTALLMENT_REGEX);
  if (!match) return null;

  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);

  if (!isValidInstallment(current, total)) return null;
  return { current, total, source: 'regex' };
}

function isValidInstallment(current: number, total: number): boolean {
  return (
    Number.isFinite(current) &&
    Number.isFinite(total) &&
    current >= 1 &&
    total > 1 &&
    current <= total &&
    total <= MAX_INSTALLMENTS
  );
}

export function detectInstallment(
  storeName: string,
  metadata?: unknown
): DetectedInstallment | null {
  const fromMeta = fromMetadata(metadata);
  if (fromMeta) return fromMeta;

  return fromStoreName(storeName);
}

export interface DetectedSibling {
  current: number;
  total: number;
  groupId: string;
  source: 'sibling';
}

export interface KnownInstallmentGroup {
  normalizedName: string;
  cardId: string | null;
  installmentTotal: number;
  value: number;
  purchaseDate: string;
  groupId: string;
  existingCurrentNumbers: Set<number>;
  existingPluggyIds: Set<string>;
}

export const normalizeForSibling = normalizeStoreName;

function diffCalendarMonths(dateA: string, dateB: string): number {
  const [yA, mA] = dateA.substring(0, 7).split('-').map(Number);
  const [yB, mB] = dateB.substring(0, 7).split('-').map(Number);
  return (yA * 12 + (mA - 1)) - (yB * 12 + (mB - 1));
}

function dayOfMonth(dateStr: string): number {
  return parseInt(dateStr.substring(8, 10), 10);
}

export function detectSiblingInstallment(
  tx: {
    store_name: string;
    card_id: string | null;
    value: number;
    transaction_date: string;
    pluggy_transaction_id?: string | null;
  },
  knownGroups: KnownInstallmentGroup[],
  toleranceDays: number = 5
): DetectedSibling | null {
  const txNorm = normalizeForSibling(tx.store_name);

  for (const group of knownGroups) {
    if (group.cardId !== tx.card_id) continue;
    if (group.normalizedName !== txNorm) continue;
    if (Math.abs(group.value - tx.value) > 0.02) continue;

    if (tx.pluggy_transaction_id && group.existingPluggyIds.has(tx.pluggy_transaction_id)) {
      return null;
    }

    const offsetMonths = diffCalendarMonths(tx.transaction_date, group.purchaseDate);
    const inferredCurrent = offsetMonths + 1;

    if (inferredCurrent < 1 || inferredCurrent > group.installmentTotal) continue;
    if (group.existingCurrentNumbers.has(inferredCurrent)) continue;

    const txDay = dayOfMonth(tx.transaction_date);
    const anchorDay = dayOfMonth(group.purchaseDate);
    if (Math.abs(txDay - anchorDay) > toleranceDays) continue;

    return {
      current: inferredCurrent,
      total: group.installmentTotal,
      groupId: group.groupId,
      source: 'sibling',
    };
  }

  return null;
}
// sync
