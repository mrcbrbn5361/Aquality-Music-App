/**
 * Paylaşılan kriptografi ve kodlama yardımcıları.
 * (Önceden discord-oauth.ts ve google-oauth.ts içinde kopyalanmıştı.)
 */

/** Standart base64'ü URL-güvenli base64url formatına çevirir (PKCE için). */
export function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Kullanıcı kontrollü metni HTML bağlamına güvenli şekilde yerleştirir. */
export function escapeHtml(str: unknown): string {
  if (typeof str !== 'string' || !str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** CSS url("...") bağlamı için kaçış — url() dışına çıkışı engeller. */
export function escapeCssUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) return '';
  // Parantez kapatma, ters bölü, tırnak ve kontrol karakterlerini etkisizleştir
  return url.replace(/["'()\\\n\r\t\f\v]/g, (ch) => `\\${ch}`);
}
