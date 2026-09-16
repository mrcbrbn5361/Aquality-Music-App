import { safeStorage } from 'electron';

/**
 * Hassas sırlar (OAuth token'ları, bot token'ları, client secret'lar) için
 * işletim sistemi anahtarlığına dayalı şifreli saklama katmanı.
 *
 * - Şifreleme kullanılabilirse AES ile şifreler (`enc1:` ön eki).
 * - Şifreleme kullanılamıyorsa (örn. anahtarlık yoksa) düz metin saklar
 *   ve uyarı verir — böceği gizlemek yerine görünür kılar.
 * - Eski düz metin kayıtlar otomatik olarak okunur (geri uyumluluk);
 *   bir sonraki yazmada şifreli formata yükseltilir.
 */

const ENC_PREFIX = 'enc1:';

export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function encryptString(plain: string): string {
  if (!plain) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64');
    }
  } catch (e) {
    console.warn('[SecureStore] Şifreleme başarısız, düz metin kullanılıyor:', e);
  }
  return plain;
}

/** Şifreli veya eski düz metin kaydı çözer. Başarısızlıkta null döner. */
export function decryptString(stored: unknown): string | null {
  if (typeof stored !== 'string' || stored.length === 0) return null;
  if (!stored.startsWith(ENC_PREFIX)) {
    // Eski düz metin kayıt — geri uyumluluk için aynen döndür
    return stored;
  }
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'));
    }
  } catch (e) {
    console.warn('[SecureStore] Şifre çözme başarısız:', e);
  }
  return null;
}

export function isEncryptedValue(stored: unknown): boolean {
  return typeof stored === 'string' && stored.startsWith(ENC_PREFIX);
}

export function encryptJSON(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJSON<T>(stored: unknown): T | null {
  const raw = decryptString(stored);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('[SecureStore] JSON çözümlenemedi:', e);
    return null;
  }
}
