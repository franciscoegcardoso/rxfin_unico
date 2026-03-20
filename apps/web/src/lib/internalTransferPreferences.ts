/** Preferência: quando `true`, a listagem inclui transferências internas (badge cinza). Default no storage = não mostrar. */
export const LS_SHOW_INTERNAL_TRANSFERS = 'rxfin:show_internal_transfers';

/** `true` = ocultar transferências internas da lista (comportamento padrão). */
export function readHideInternalTransfers(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(LS_SHOW_INTERNAL_TRANSFERS) !== 'true';
}

export function writeShowInternalTransfers(show: boolean): void {
  try {
    localStorage.setItem(LS_SHOW_INTERNAL_TRANSFERS, show ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}
