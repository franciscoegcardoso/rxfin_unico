/**
 * Formatação de datas e status para a tela de Conexões bancárias (sync Open Finance).
 */

export type ConnectionStatusColor = 'green' | 'yellow' | 'red' | 'gray';

export interface ConnectionStatusConfig {
  label: string;
  color: ConnectionStatusColor;
  icon: 'check' | 'clock' | 'alert' | 'refresh';
}

/**
 * Última atualização em tempo relativo.
 * - null → "Nunca sincronizado"
 * - < 1 min → "Agora mesmo"
 * - < 60 min → "há X minutos"
 * - < 24h → "há X horas"
 * - < 7 dias → "há X dias"
 * - else → "em DD/MM/YYYY"
 */
export function formatLastSync(date: string | null): string {
  if (!date) return 'Nunca sincronizado';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return diffDays === 1 ? 'há 1 dia' : `há ${diffDays} dias`;
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `em ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Próxima sincronização formatada. Retorna null se não exibir.
 * - null → null
 * - hoje → "hoje às HH:mm"
 * - amanhã → "amanhã às HH:mm"
 * - else → "DD/MM às HH:mm"
 */
export function formatNextSync(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `hoje às ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `amanhã às ${time}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${time}`;
}

/**
 * Configuração visual do badge de status da conexão.
 * Considera schema novo (status + error_type) e legado (status = LOGIN_ERROR / OUTDATED).
 */
export function getConnectionStatusConfig(
  status: string,
  errorType: string | null
): ConnectionStatusConfig {
  // Legado: status antigo da Pluggy
  if (status === 'LOGIN_ERROR' || status === 'OUTDATED') {
    return { label: 'Reconexão necessária', color: 'red', icon: 'alert' };
  }
  // Schema novo
  switch (status) {
    case 'UPDATED':
      return { label: 'Sincronizado', color: 'green', icon: 'check' };
    case 'WAITING_USER_INPUT':
      return { label: 'Aguardando', color: 'yellow', icon: 'clock' };
    case 'ERROR':
      if (errorType === 'LOGIN_ERROR') {
        return { label: 'Reconexão necessária', color: 'red', icon: 'alert' };
      }
      return { label: 'Instabilidade temporária', color: 'yellow', icon: 'refresh' };
    case 'PENDING':
      return { label: 'Conectando...', color: 'gray', icon: 'clock' };
    default:
      return { label: status || '—', color: 'gray', icon: 'clock' };
  }
}

/** Dias até o consentimento expirar; null se não aplicável. */
export function getConsentExpiryDays(consentExpiresAt: string | null): number | null {
  if (!consentExpiresAt) return null;
  const days = Math.ceil(
    (new Date(consentExpiresAt).getTime() - Date.now()) / 86400000
  );
  return days;
}
