import { app } from 'electron';

/**
 * Merkezi log yardımcıları.
 * - `debug`: Yalnızca geliştirme modunda (paketlenmemiş) yazılır. Şarkı başına
 *   veya istek başına tetiklenen yüksek frekanslı loglar için kullanılmalıdır.
 * - `info`/`warn`/`error`: Her zaman yazılır (seyrek operasyonel olaylar).
 */

function isDev(): boolean {
  try {
    return !app.isPackaged;
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

export function logDebug(...args: unknown[]): void {
  if (isDev()) {
    console.log(...args);
  }
}

export function logInfo(...args: unknown[]): void {
  console.log(...args);
}

export function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

export function logError(...args: unknown[]): void {
  console.error(...args);
}
