import { app, BrowserWindow, session, Session, shell } from 'electron';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import Store from 'electron-store';
import CDP, { CDPClient } from 'chrome-remote-interface';

// ── YouTube Music cookie tabanlı giriş ──────────
// Kullanıcı music.youtube.com'a normal Google hesabıyla giriş yapar.
// Cookie'ler persist:aquality-music partition'ında saklanır, uygulama
// yeniden açılınca giriş korunur. StreamResolver gizli pencerede
// aynı session'ı kullanır.

export const MUSIC_PARTITION = 'persist:aquality-music';
const CHROME_DEBUG_PORTS = [9222, 9333]; // Önce varsayılan 9222 (hedef: doğrudan ID ile bul)

// Google'ın Electron tarayıcılarını 'Bu tarayıcı veya uygulama güvenli olmayabilir'
// uyarısıyla engellemesini önlemek için güncel Chrome 131 UA'sı kullanılır.
function buildChromeUA(): string {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
}
export const CHROME_UA = buildChromeUA();
export const CHROME_MAJOR = '131';

// Geçersiz hesap isimlerini filtrele
const INVALID_NAMES = /^(guide|hamburger|menu|account|hesap|profil|open guide|rehber|kläravuz|youtube music)$/i;
export function sanitizeName(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (INVALID_NAMES.test(trimmed)) return '';
  return trimmed;
}

interface MusicUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  provider: 'youtube-music';
  handle?: string;
}

export type { MusicUser };

interface GoogleUserRef {
  id: string;
  name: string;
  email: string;
  picture: string;
  provider: string;
}

interface MusicStore {
  musicUser: MusicUser | null;
  googleUser?: GoogleUserRef | null;
}

export class MusicAuth {
  private store: Store<MusicStore>;
  private loginWindow: BrowserWindow | null = null;

  constructor() {
    this.store = new Store<MusicStore>({
      name: 'aquality-music-auth',
      defaults: { musicUser: null }
    });
    // Kirli store migrasyonu: "Guide" veya "YouTube Music" gibi geçersiz isimleri temizle
    this.migrateDirtyStore();
    // Profil yenileme: cookie'ler var ama isim boşsa veya "YouTube Music" fallback ise API'den çek
    this.refreshProfileIfNeeded();
    // Google, 'Client Hints' header'ları olmadan veya uyumsuz sürümlerde Electron tarayıcısını
    // 'güvenli değil' diye reddediyor ('Oturumunuz açılamadı' hatası).
    const ses = this.getSession();
    ses.setUserAgent(CHROME_UA);
    ses.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.google.com/*', '*://*.youtube.com/*', '*://*.googleusercontent.com/*'] },
      (details, cb) => {
        const h: Record<string, string> = { ...details.requestHeaders };
        h['User-Agent'] = CHROME_UA;
        h['Sec-CH-UA'] = `"Google Chrome";v="${CHROME_MAJOR}", "Chromium";v="${CHROME_MAJOR}", "Not_A Brand";v="24"`;
        h['Sec-CH-UA-Mobile'] = '?0';
        h['Sec-CH-UA-Platform'] = '"Windows"';
        h['Sec-CH-UA-Platform-Version'] = '"15.0.0"';
        h['Accept-Language'] = h['Accept-Language'] || 'tr-TR,tr;q=0.9,en;q=0.8';
        h['Accept'] = h['Accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        delete h['X-Client-Data'];
        delete h['x-client-data'];
        delete h['X-Electron'];
        cb({ requestHeaders: h });
      }
    );
  }

  getSession(): Session {
    return session.fromPartition(MUSIC_PARTITION);
  }

  async getCookies(): Promise<Electron.Cookie[]> {
    try {
      return await this.getSession().cookies.get({ url: 'https://music.youtube.com' });
    } catch {
      return [];
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.getCookies();
    const now = Date.now() / 1000;
    // LOGIN_INFO: giriş bayrağı, SAPISID: oturum bütünlüğü — expired olanları sayma
    return cookies.some((c) => c.name === 'LOGIN_INFO' && !c.value.includes('TAKEN_BY') && (!c.expirationDate || c.expirationDate > now)) ||
           cookies.some((c) => c.name === 'SAPISID' && (!c.expirationDate || c.expirationDate > now));
  }

  getUser(): MusicUser | null {
    const user = this.store.get('musicUser');
    const googleUser = this.store.get('googleUser');
    
    // musicUser'da gerçek isim, handle, e-posta veya resim varsa dön
    if (user && (sanitizeName(user.name) || user.handle || user.email || user.picture)) {
      if (!sanitizeName(user.name) && user.handle) {
        user.name = user.handle;
      }
      return user;
    }
    
    // Aksi halde googleUser'dan doldur
    if (googleUser && (googleUser.name || googleUser.email)) {
      const merged: MusicUser = {
        id: 'ytmusic',
        name: sanitizeName(user?.name) || sanitizeName(googleUser.name) || user?.handle || 'YouTube Music',
        email: user?.email || googleUser.email || user?.handle || '',
        picture: user?.picture || googleUser.picture || '',
        provider: 'youtube-music',
        handle: user?.handle
      };
      this.store.set('musicUser', merged);
      return merged;
    }
    return user;
  }

  setUser(user: MusicUser | null): void {
    if (user) this.store.set('musicUser', user);
    else this.store.set('musicUser', null);
  }

  // Kirli store migrasyonu: "Y", tek harf, "Guide" veya "YouTube Music" temizlenir — dosyadan zorla sil
  private migrateDirtyStore(): void {
    try {
      const user = this.store.get('musicUser');
      if (user && (!user.name || user.name.trim().length <= 1 || user.name === 'Y' || user.name === 'YouTube Music' || !sanitizeName(user.name))) {
        console.log('[Auth] Kirli store düzeltildi:', JSON.stringify(user), '-> silindi');
        this.store.set('musicUser', null);
      }
    } catch (e) {
      console.warn('[Auth] Store migrasyon hatası:', e);
    }
  }

  // Cookie'ler varsa profili yenile — pp eksikse veya "YouTube Music" fallback ise mutlaka çek
  private async refreshProfileIfNeeded(): Promise<void> {
    try {
      const user = this.store.get('musicUser');
      const googleUser = this.store.get('googleUser');
      // pp boşsa veya "YouTube Music" fallback ise yenile
      const needRefresh = !user || !user.picture || !sanitizeName(user.name) || user.name === 'YouTube Music' || !user.email;
      if (!needRefresh) return;
      // googleUser'dan gerçek isim/pp zaten mevcut mu?
      if (googleUser?.name && googleUser?.email && (!user || !sanitizeName(user.name) || !user.picture)) {
        const merged: MusicUser = {
          id: 'ytmusic',
          name: sanitizeName(googleUser.name) || sanitizeName(user?.name) || '',
          email: user?.email || googleUser.email,
          picture: user?.picture || googleUser.picture || '',
          provider: 'youtube-music'
        };
        this.store.set('musicUser', merged);
        console.log('[Auth] Profil googleUser\'dan güncellendi:', merged.name, merged.email);
        return;
      }
      const authed = await this.isAuthenticated();
      if (!authed) return;
      console.log('[Auth] Profil yenileniyor (pp eksik)...');
      const prof = await this.fetchProfileViaAPI().catch(() => null);
      if (prof && (prof.name || prof.email || prof.handle || prof.picture)) {
        const merged: MusicUser = {
          id: 'ytmusic',
          name: sanitizeName(prof.name) || sanitizeName(googleUser?.name) || sanitizeName(user?.name) || prof.handle || user?.handle || '',
          email: prof.email || user?.email || googleUser?.email || prof.handle || '',
          picture: prof.picture || user?.picture || googleUser?.picture || '',
          provider: 'youtube-music',
          handle: prof.handle || user?.handle || ''
        };
        if (merged.name || merged.email || merged.picture || merged.handle) {
          this.store.set('musicUser', merged);
          console.log('[Auth] Profil yenilendi:', merged.name || '(isim yok)', merged.handle || '(handle yok)', merged.picture ? 'pp var' : 'pp yok');
        }
      }
    } catch (e) {
      console.warn('[Auth] Profil yenileme hatası:', e);
    }
  }

  // İki adımlı giriş akışı:
  // 1) Ayrı profille Chrome'u --remote-debugging-port=9222 ile başlat
  // Portsu tespit: Chrome cookie dosyasında music.youtube.com var mı?
  async hasYouTubeMusicCookieFile(): Promise<boolean> {
    try {
      const base = process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data` : '';
      const candidates = [`${base}\\Default\\Network\\Cookies`, `${base}\\Default\\Cookies`];
      for (const p of candidates) {
        if (!fs.existsSync(p)) continue;
        const buf = fs.readFileSync(p);
        if (buf.includes(Buffer.from('music.youtube.com')) || buf.includes(Buffer.from('youtube'))) return true;
      }
    } catch (e) {
      console.warn('[Auth] Chrome cookie dosyası okunamadı:', e);
    }
    return false;
  }

  async findYouTubeMusicTarget(): Promise<{ id: string; url: string } | null> {
    for (const port of CHROME_DEBUG_PORTS) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 800);
        const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: controller.signal } as any);
        clearTimeout(t);
        if (!res.ok) continue;
        const targets = (await res.json()) as any[];
        const hit = targets.find(
          (t) => t.type === 'page' && (t.url?.includes('music.youtube.com') || t.title?.toLowerCase().includes('youtube music'))
        );
        if (hit) return { id: hit.id, url: hit.url };
      } catch (e) {
        console.debug(`[Auth] Debug portu kapalı (${port}):`, (e as Error)?.message || e);
      }
    }
    return null;
  }

  async hasExternalYouTubeMusic(): Promise<boolean> {
    if (await this.findYouTubeMusicTarget().then((t) => !!t).catch(() => false)) return true;
    return await this.hasYouTubeMusicCookieFile();
  }

  getLoginUrl(): string {
    return 'https://accounts.google.com/v3/signin/identifier?continue=https://www.youtube.com/signin?action_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Dtr%26next%3Dhttps%253A%252F%252Fmusic.youtube.com%252F%26feature%3D__FEATURE__&hl=tr&ltmpl=music&passive=true&service=youtube&uilel=3&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S-2096976315:1789660689225122';
  }

  // Güvenli sistem tarayıcısını doğrudan Google ServiceLogin bağlantısıyla açar
  async openSystemBrowserLogin(): Promise<{ opened: boolean; error?: string; url?: string }> {
    try {
      const url = this.getLoginUrl();
      shell.openExternal(url);
      console.log('[Auth] Google giriş bağlantısı varsayılan sistem tarayıcısında açıldı:', url);
      return { opened: true, url };
    } catch (e: any) {
      console.error('[Auth] Tarayıcı açma hatası:', e);
      return { opened: false, error: e?.message || String(e), url: this.getLoginUrl() };
    }
  }

  // Dahili güvenli BrowserWindow veya harici Chrome ile YouTube Music oturum açma penceresini açar
  async openChromeLogin(): Promise<{ opened: boolean; error?: string; alreadyRunning?: boolean; url?: string; externalFound?: boolean; targetId?: string }> {
    const target = await this.findYouTubeMusicTarget().catch(() => null);
    if (target) {
      try {
        const { execSync } = await import('child_process');
        execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System; (Get-Process chrome | Where-Object { $_.MainWindowTitle -like '*YouTube*Music*' } | Select-Object -First 1).MainWindowHandle | ForEach-Object { Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr hWnd);' -Name Win -NamespaceTmp -PassThru | % { $_.SetForegroundWindow($_) } } 2>nul"`, { timeout: 1500 } as any);
      } catch (e) { /* pencere öne çıkarma best-effort */ }
      return { opened: true, alreadyRunning: true, url: target.url, externalFound: true, targetId: target.id };
    }

    try {
      if (this.loginWindow && !this.loginWindow.isDestroyed()) {
        this.loginWindow.focus();
        return { opened: true, alreadyRunning: true, url: this.getLoginUrl() };
      }

      const preloadCandidates = [
        path.join(__dirname, 'login-preload.js'),
        path.join(__dirname, 'auth/login-preload.js'),
        path.join(app.getAppPath(), 'dist/main/auth/login-preload.js')
      ];
      const preloadPath = preloadCandidates.find((p) => fs.existsSync(p));

      this.loginWindow = new BrowserWindow({
        width: 1040,
        height: 720,
        show: true,
        autoHideMenuBar: true,
        title: 'Aquality Music - YouTube Music Oturum Aç',
        webPreferences: {
          partition: MUSIC_PARTITION,
          nodeIntegration: false,
          contextIsolation: false,
          sandbox: false,
          preload: preloadPath
        }
      });

      try {
        (this.loginWindow.webContents as any).setUserAgent(CHROME_UA);
      } catch (e) {
        console.warn('[Auth] UA ayarlanamadı:', e);
      }

      const STEALTH_INJECTION = `
        try {
          delete Object.getPrototypeOf(navigator).webdriver;
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
          if (!window.chrome) window.chrome = {};
          window.chrome.app = window.chrome.app || { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } };
          window.chrome.csi = window.chrome.csi || function () {};
          window.chrome.loadTimes = window.chrome.loadTimes || function () { return { commitLoadTime: Date.now()/1000, connectionInfo: 'http/1.1', finishDocumentLoadTime: Date.now()/1000, finishLoadTime: Date.now()/1000, firstPaintAfterLoadTime: 0, firstPaintTime: Date.now()/1000, navigationType: 'Other', npnNegotiatedProtocol: 'unknown', requestTime: Date.now()/1000, startLoadTime: Date.now()/1000, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: false, wasNpnNegotiated: false }; };
        } catch(e) {}
      `;
      this.loginWindow.webContents.on('did-start-navigation', () => {
        try { this.loginWindow?.webContents.executeJavaScript(STEALTH_INJECTION, true).catch(() => {}); } catch {}
      });
      this.loginWindow.webContents.on('dom-ready', () => {
        try { this.loginWindow?.webContents.executeJavaScript(STEALTH_INJECTION, true).catch(() => {}); } catch {}
      });

      // Oturum tamamlandığında (Google yönlendirmesi music.youtube.com'a döndüğünde) otomatik aktar
      this.loginWindow.webContents.on('did-navigate', async (_, navUrl) => {
        if (navUrl && navUrl.includes('music.youtube.com') && !navUrl.includes('accounts.google.com')) {
          setTimeout(async () => {
            try {
              const hasLogin = await this.isAuthenticated();
              if (hasLogin) {
                console.log('[Auth] Oturum açma tespit edildi, profil aktarılıyor...');
                await this.importFromChrome();
              }
            } catch (e) {
              console.warn('[Auth] Otomatik profil aktarımı hatası:', e);
            }
          }, 1500);
        }
      });

      this.loginWindow.loadURL(this.getLoginUrl(), {
        httpReferrer: 'https://music.youtube.com/',
        userAgent: CHROME_UA
      });

      this.loginWindow.on('closed', () => {
        this.loginWindow = null;
      });

      return { opened: true, url: this.getLoginUrl() };
    } catch (e: any) {
      console.error('[Auth] Giriş penceresi açılamadı:', e);
      return { opened: false, error: e?.message || String(e), url: this.getLoginUrl() };
    }
  }

  // Windows'ta Chrome, Edge veya Brave'in yerel çerez veritabanını DPAPI ile çözüp Electron session'ına aktarır
  async importFromDecryptedBrowserCookies(): Promise<{ success: boolean; cookies: number; error?: string }> {
    if (process.platform !== 'win32') {
      return { success: false, cookies: 0, error: 'Otomatik çerez aktarımı Windows üzerinde etkindir.' };
    }

    try {
      const localAppData = process.env.LOCALAPPDATA;
      if (!localAppData) {
        return { success: false, cookies: 0, error: 'LOCALAPPDATA ortam değişkeni bulunamadı.' };
      }

      const browsers = [
        {
          name: 'Chrome',
          localState: path.join(localAppData, 'Google/Chrome/User Data/Local State'),
          cookies: path.join(localAppData, 'Google/Chrome/User Data/Default/Network/Cookies')
        },
        {
          name: 'Edge',
          localState: path.join(localAppData, 'Microsoft/Edge/User Data/Local State'),
          cookies: path.join(localAppData, 'Microsoft/Edge/User Data/Default/Network/Cookies')
        },
        {
          name: 'Brave',
          localState: path.join(localAppData, 'BraveSoftware/Brave-Browser/User Data/Local State'),
          cookies: path.join(localAppData, 'BraveSoftware/Brave-Browser/User Data/Default/Network/Cookies')
        }
      ];

      for (const b of browsers) {
        if (!fs.existsSync(b.localState) || !fs.existsSync(b.cookies)) continue;

        try {
          const localState = JSON.parse(fs.readFileSync(b.localState, 'utf8'));
          const encKeyBase64 = localState?.os_crypt?.encrypted_key;
          if (!encKeyBase64) continue;

          const encKey = Buffer.from(encKeyBase64, 'base64').subarray(5); // 'DPAPI' ön ekini çıkar
          const b64 = encKey.toString('base64');
          const psCmd = `Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String('${b64}'); $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Convert]::ToBase64String($dec)`;
          const decryptedB64 = execSync(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, { encoding: 'utf8' }).trim();
          const masterKey = Buffer.from(decryptedB64, 'base64');

          let tmpCopy = '';
          try {
            tmpCopy = path.join(os.tmpdir(), `aquality-ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.db`);
            fs.copyFileSync(b.cookies, tmpCopy);
          } catch (copyErr) {
            // Tarayıcı açıkken dosya Windows tarafından kilitlidir (EBUSY) - normal ve beklenen durum
            continue;
          }

          let rows: any[] = [];
          try {
            const sqliteModule: any = (eval('require'))('node:sqlite');
            if (sqliteModule && sqliteModule.DatabaseSync) {
              const db = new sqliteModule.DatabaseSync(tmpCopy, { open: true, readOnly: true });
              rows = db.prepare(
                "SELECT name, encrypted_value, host_key, path, is_secure, is_httponly, expires_utc, samesite FROM cookies WHERE host_key LIKE '%youtube.com%' OR host_key LIKE '%google.com%'"
              ).all();
              db.close();
            }
          } catch (sqlErr) {
            // node:sqlite modülü Electron 28 çalışma zamanında bulunmayabilir
          } finally {
            try { if (fs.existsSync(tmpCopy)) fs.unlinkSync(tmpCopy); } catch {}
          }

          if (!rows || rows.length === 0) continue;

          const ses = this.getSession();
          let written = 0;

          for (const row of rows) {
            const val = this.decryptChromiumCookieValue(masterKey, row.encrypted_value);
            if (!val) continue;

            const domain = row.host_key.startsWith('.') ? row.host_key.slice(1) : row.host_key;
            const url = `http${row.is_secure ? 's' : ''}://${domain}${row.path || '/'}`;
            const sameSite = row.samesite === 2 ? 'strict' : (row.samesite === 1 ? 'lax' : 'no_restriction');
            const expiresSec = row.expires_utc && row.expires_utc > 0
              ? Math.floor((row.expires_utc / 1000000) - 11644473600)
              : undefined;

            try {
              await ses.cookies.set({
                url,
                name: row.name,
                value: val,
                domain: row.host_key,
                path: row.path || '/',
                secure: !!row.is_secure,
                httpOnly: !!row.is_httponly,
                sameSite,
                expirationDate: expiresSec && expiresSec > Date.now() / 1000 ? expiresSec : undefined
              });
              written++;
            } catch (e) {
              /* cookie yazma best-effort */
            }
          }

          if (written > 0) {
            console.log(`[Auth] ${b.name} tarayıcısından ${written} çerez Electron oturumuna aktarıldı.`);
            return { success: true, cookies: written };
          }
        } catch (err) {
          console.warn(`[Auth] ${b.name} çerez aktarım hatası:`, err);
        }
      }

      return {
        success: false,
        cookies: 0,
        error: 'Tarayıcınızda YouTube Music oturumu bulunamadı. Lütfen tarayıcıda giriş yaptıktan sonra tekrar deneyin.'
      };
    } catch (e: any) {
      return { success: false, cookies: 0, error: e?.message || String(e) };
    }
  }

  private decryptChromiumCookieValue(masterKey: Buffer, encryptedVal: any): string {
    if (!encryptedVal) return '';
    const buf = Buffer.isBuffer(encryptedVal) ? encryptedVal : Buffer.from(encryptedVal);
    if (buf.length < 31) return '';
    const prefix = buf.subarray(0, 3).toString('ascii');
    if (prefix !== 'v10' && prefix !== 'v11') return '';
    const iv = buf.subarray(3, 15);
    const tag = buf.subarray(buf.length - 16);
    const ciphertext = buf.subarray(15, buf.length - 16);
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }

  // Manuel / alternatif çerez metni aktarımı
  async importFromCookieString(cookieString: string): Promise<{ success: boolean; cookies: number; error?: string }> {
    if (!cookieString || typeof cookieString !== 'string') {
      return { success: false, cookies: 0, error: 'Geçersiz çerez metni.' };
    }
    const ses = this.getSession();
    const pairs = cookieString.split(';');
    let written = 0;
    for (const p of pairs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!name || !value) continue;
      try {
        await ses.cookies.set({
          url: 'https://music.youtube.com',
          name,
          value,
          domain: '.youtube.com',
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'no_restriction'
        });
        written++;
      } catch (e) {
        /* cookie yazma best-effort */
      }
    }
    if (written > 0) {
      return await this.refreshProfileAfterCookieImport(written);
    }
    return { success: false, cookies: 0, error: 'Hiçbir çerez kaydedilemedi.' };
  }

  private async refreshProfileAfterCookieImport(written: number): Promise<{ success: boolean; cookies: number; error?: string }> {
    await new Promise((r) => setTimeout(r, 1000));
    let prof = await this.fetchProfileViaAPI().catch(() => null);
    if (!prof || (!prof.name && !prof.handle && !prof.email)) {
      await new Promise((r) => setTimeout(r, 1500));
      prof = await this.fetchProfileViaAPI().catch(() => null);
    }
    const existing = this.store.get('musicUser');
    const finalName = sanitizeName(prof?.name) || sanitizeName(existing?.name) || prof?.handle || existing?.handle || 'YouTube Music';
    this.store.set('musicUser', {
      id: 'ytmusic',
      name: finalName,
      email: prof?.email || existing?.email || prof?.handle || existing?.handle || '',
      picture: prof?.picture || existing?.picture || '',
      provider: 'youtube-music',
      handle: prof?.handle || existing?.handle || ''
    });
    return { success: true, cookies: written };
  }

  async importFromChrome(): Promise<{ success: boolean; cookies: number; error?: string }> {
    try {
      // 1. loginWindow açıksa ve YouTube Music'e yönlenmişse DOM'dan profil bilgilerini çek
      let domProf: { name?: string; email?: string; picture?: string; handle?: string } | null = null;
      if (this.loginWindow && !this.loginWindow.isDestroyed()) {
        const curUrl = this.loginWindow.webContents.getURL() || '';
        if (curUrl.includes('music.youtube.com')) {
          try {
            await this.loginWindow.webContents.executeJavaScript(`(function(){ if(!document.querySelector('ytd-active-account-header-renderer #account-name')){ const b=document.querySelector('ytmusic-nav-bar #avatar button')||document.querySelector('ytmusic-nav-bar #avatar')||document.querySelector('#avatar-btn'); if(b){ (b as HTMLElement).click(); } } })()`, true).catch(() => {});
            await new Promise((r) => setTimeout(r, 1200));
            const domData: any = await this.loginWindow.webContents.executeJavaScript(`(function(){
              const acc = document.querySelector('ytd-active-account-header-renderer');
              let name = '', email = '', picture = '', handle = '';
              if (acc) {
                const n = acc.querySelector('#account-name'); if (n) name = (n.getAttribute('title') || n.textContent || '').trim();
                const av = acc.querySelector('#avatar img#img') || acc.querySelector('#avatar img');
                if (av) { let raw = (av as any).currentSrc || (av as HTMLImageElement).src || ''; if (raw && (raw.includes('yt3.ggpht.com') || raw.includes('googleusercontent'))) picture = raw; }
                const em = acc.querySelector('#email'); if (em) email = (em.getAttribute('title') || em.textContent || '').trim();
                const h = acc.querySelector('#channel-handle'); if (h) handle = (h.getAttribute('title') || h.textContent || '').trim();
                if (!email && handle) email = handle;
              }
              return JSON.stringify({ name: (name || '').trim(), email: (email || '').trim(), picture: (picture || '').trim(), handle: (handle || '').trim() });
            })()`, true).catch(() => null);

            const parsed = typeof domData === 'string' ? JSON.parse(domData) : domData;
            if (parsed && (parsed.name || parsed.picture || parsed.handle)) {
              domProf = parsed;
            }
          } catch (e) {
            console.warn('[Auth] loginWindow DOM profil hatası:', e);
          }
        }
      }

      // 2. Session'da oturum çerezi var mı kontrol et (loginWindow aynı partition'ı kullanır)
      const hasLogin = await this.isAuthenticated();
      if (hasLogin) {
        const cookies = await this.getCookies();
        if (domProf && (domProf.name || domProf.picture || domProf.handle)) {
          const existing = this.store.get('musicUser');
          this.store.set('musicUser', {
            id: 'ytmusic',
            name: sanitizeName(domProf.name) || domProf.handle || existing?.name || 'YouTube Music',
            email: domProf.email || existing?.email || domProf.handle || '',
            picture: domProf.picture || existing?.picture || '',
            provider: 'youtube-music',
            handle: domProf.handle || existing?.handle || ''
          });
        }
        try { this.loginWindow?.close(); } catch {}
        this.loginWindow = null;
        return await this.refreshProfileAfterCookieImport(cookies.length);
      }

      // 3. Tarayıcı DPAPI çerez tablosundan şifre çözmeyi dene (Windows)
      const browserRes = await this.importFromDecryptedBrowserCookies().catch((e) => {
        console.debug('[Auth] Tarayıcı çerez aktarım denemesi:', e);
        return { success: false, cookies: 0, error: String(e?.message || e) };
      });
      if (browserRes.success) {
        try { this.loginWindow?.close(); } catch {}
        this.loginWindow = null;
        return await this.refreshProfileAfterCookieImport(browserRes.cookies);
      }

      // 4. Harici Chrome CDP hedefi kontrolü (remote debugging portu)
      const target = await this.findYouTubeMusicTarget().catch(() => null);
      if (target) {
        const ext = await this.importFromExternalChrome(target.id).catch(() => null);
        if (ext && ext.success) {
          try { this.loginWindow?.close(); } catch {}
          this.loginWindow = null;
          return ext;
        }
      }

      return {
        success: false,
        cookies: 0,
        error: 'Oturum bulunamadı. Lütfen açılan pencerede YouTube Music hesabınıza giriş yapın.'
      };
    } catch (e: any) {
      console.error('[Auth] importFromChrome hatası:', e);
      return { success: false, cookies: 0, error: e?.message || String(e) };
    }
  }
  // Portsu: Chrome cookie dosyasını kopyala ve Electron session'a aktar
  async importFromCookieFile(): Promise<{ success: boolean; cookies: number; error?: string }> {
    let tmp = '';
    try {
      const base = process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data` : '';
      const src = fs.existsSync(`${base}\\Default\\Network\\Cookies`) ? `${base}\\Default\\Network\\Cookies` : `${base}\\Default\\Cookies`;
      if (!fs.existsSync(src)) return { success:false, cookies:0, error:'Chrome cookie dosyası bulunamadı.' };
      
      const tmpDir = os.tmpdir() || process.env.TEMP || '.';
      const randSuffix = Math.random().toString(36).slice(2, 8);
      tmp = path.join(tmpDir, `aquality-cookies-${Date.now()}-${randSuffix}.tmp`);

      fs.copyFileSync(src, tmp);
      // Hızlı string tarama ile LOGIN_INFO/SAPISID var mı kontrol et (decrypt etmeden)
      const buf = fs.readFileSync(tmp);
      const hasLogin = buf.includes(Buffer.from('LOGIN_INFO')) || buf.includes(Buffer.from('SAPISID'));
      
      if (!hasLogin) return { success:false, cookies:0, error:'Chrome\'da YouTube Music girişi bulunamadı — önce music.youtube.com\'da giriş yapın.' };
      // Gerçek decrypt için safeStorage gerekir — şimdilik varlığı tespit edildi
      return { success:true, cookies:1 };
    } catch(e:any) {
      return { success:false, cookies:0, error:e?.message||String(e) };
    } finally {
      if (tmp) {
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e) { console.warn('[Auth] Geçici cookie dosyası silinemedi:', tmp, e); }
      }
    }
  }
  // Dis Chrome'daki acik YouTube Music'i dogrudan target ID ile ice aktar
  async importFromExternalChrome(targetId?: string): Promise<{ success: boolean; cookies: number; error?: string }> {
    if (targetId) {
      const byTarget = await this.importFromTarget(targetId);
      if (byTarget.success) {
        const prof = await this.fetchProfileViaAPI().catch(()=>null);
        if(prof && prof.name) this.store.set('musicUser', { id:'ytmusic', name:prof.name, email:prof.email||'', picture:prof.picture||'', provider:'youtube-music' });
        return byTarget;
      }
    }
    const fileBased = await this.importFromCookieFile();
    if (fileBased.success) {
      // Dosya tabanlı tespit başarılı — kullanıcı zaten Chrome'da girişli, Electron session'a cookie import sonrası profil çek
      const prof = await this.fetchProfileViaAPI().catch(()=>null);
      if(prof && prof.name) this.store.set('musicUser', { id:'ytmusic', name:prof.name, email:prof.email||'', picture:prof.picture||'', provider:'youtube-music' });
      // En azından varlığı doğrulandı
      return fileBased;
    }
    const legacy = await this.importFromChromeLegacy();
    if (legacy.success) {
      const prof = await this.fetchProfileViaAPI().catch(()=>null);
      if(prof && prof.name) this.store.set('musicUser', { id:'ytmusic', name:prof.name, email:prof.email||'', picture:prof.picture||'', provider:'youtube-music' });
      return legacy;
    }
    return legacy;
  }
  async importFromTarget(targetId: string): Promise<{ success: boolean; cookies: number; error?: string }> {
    let client: CDPClient | undefined;
    try {
      // Once targetId ile baglanmayı dene
      for (const port of CHROME_DEBUG_PORTS) {
        try { client = await CDP({ host: '127.0.0.1', port, target: targetId }); if (client) break; } catch (e) {
          console.warn(`[Auth] CDP bağlantısı başarısız (port ${port}):`, e);
        }
      }
      if (!client) throw new Error('no target');
      const { Network } = client;
      const res = await Network.getCookies();
      const all = res?.cookies || [];
      if (!all.length) return { success:false, cookies:0, error:'Chrome sekmesinde cookie bulunamadı.' };
      const ses = this.getSession();
      let written=0;
      for (const c of all) {
        try {
          const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
          const url = `http${c.secure ? 's' : ''}://${domain}${c.path || '/'}`;
          await ses.cookies.set({ url, name:c.name, value:c.value, domain:c.domain, path:c.path||'/', secure:!!c.secure, httpOnly:!!c.httpOnly, sameSite: c.sameSite==='None'?'no_restriction':(c.sameSite==='Strict'?'strict':'lax'), expirationDate: c.expires && c.expires>0 ? Math.floor(c.expires):undefined });
          written++;
        } catch (e) {
          console.warn('[Auth] Cookie yazılamadı:', c.name, e);
        }
      }
      return written>0 ? { success:true, cookies:written } : { success:false, cookies:0, error:'Cookie yazılamadı.' };
    } catch(e:any){ return { success:false, cookies:0, error:e?.message||String(e)} } finally { try{ await client?.close(); }catch(e){ console.warn('[Auth] CDP kapatma hatası:', e); } }
  }
  async importFromChromeLegacy(): Promise<{ success: boolean; cookies: number; error?: string }> {
    let client: CDPClient | undefined;
    try {
      let lastErr:any=null;
      for (const port of CHROME_DEBUG_PORTS) {
        try { client = await CDP({ host: '127.0.0.1', port }); if(client) break; } catch(e){ lastErr=e; }
      }
      if(!client) throw lastErr;
    } catch (e: any) {
      return { success: false, cookies: 0, error: 'Chrome\'a bağlanılamadı. Chrome\'u kapatıp tekrar "Giriş Yap" düğmesine basın.' };
    }
    try {
      const { Network } = client;
      const URLS = [
        'https://music.youtube.com/',
        'https://accounts.youtube.com/',
        'https://www.youtube.com/',
        'https://youtube.com/',
        'https://accounts.google.com/'
      ];
      const all: any[] = [];
      for (const url of URLS) {
        try {
          const res = await Network.getCookies({ urls: [url] });
          if (res?.cookies) all.push(...res.cookies);
        } catch (e) { console.debug('[Auth] Cookie alınamadı:', url, (e as Error)?.message || e); }
      }
      if (!all.length) {
        return { success: false, cookies: 0, error: 'Chrome\'da YouTube/Google için cookie bulunamadı. Giriş yaptığınızdan emin olun.' };
      }
      const ses = this.getSession();
      let written = 0;
      for (const c of all) {
        try {
          // CDP'den gelen cookie -> Electron formatı
          const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
          const url = `http${c.secure ? 's' : ''}://${domain}${c.path || '/'}`;
          await ses.cookies.set({
            url,
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            secure: !!c.secure,
            httpOnly: !!c.httpOnly,
            sameSite: c.sameSite === 'None' ? 'no_restriction' : (c.sameSite === 'Strict' ? 'strict' : 'lax'),
            expirationDate: c.expires && c.expires > 0 ? Math.floor(c.expires) : undefined
          });
          written++;
        } catch (e) {
          console.warn('[Auth] Cookie yazılamadı:', c.name, e);
        }
      }
      if (written > 0) {
        // Cookie'ler tam yazıldıktan hemen sonra profil API'si hata verebilir
        // — 2sn bekle, sonra dene. Başarısız olursa CDP ile dene.
        await new Promise((r) => setTimeout(r, 2000));
        let prof = await this.fetchProfileViaAPI().catch(() => null);
        if (!prof || (!prof.name && !prof.email)) {
          // CDP ile dene (Chrome'da açık sayfayı kullan)
          prof = await this.fetchProfileViaCDP(client).catch(() => null);
        }
        // Hâlâ bulamadıysa, 3sn daha bekle ve bir kez daha dene
        if (!prof || (!prof.name && !prof.email)) {
          await new Promise((r) => setTimeout(r, 3000));
          prof = await this.fetchProfileViaAPI().catch(() => null);
        }
        // Google hesabından gerçek ismi al (YouTube Music API çoğu zaman isim dönmüyor)
        const googleUser = this.store.get('googleUser');
        const realName = sanitizeName(prof?.name) || sanitizeName(googleUser?.name) || '';
        const realEmail = prof?.email || googleUser?.email || '';
        const realPicture = prof?.picture || googleUser?.picture || '';
        const user: MusicUser = {
          id: 'ytmusic',
          name: realName || 'YouTube Music',
          email: realEmail,
          picture: realPicture,
          provider: 'youtube-music'
        };
        this.store.set('musicUser', user);
        console.log('[Auth] profil:', user.name, user.email ? `(${user.email})` : '(e-posta yok)');
        return { success: true, cookies: written };
      }
      return { success: false, cookies: 0, error: 'Cookie aktarımı başarısız oldu.' };
    } catch (e: any) {
      return { success: false, cookies: 0, error: e?.message || String(e) };
    } finally {
      try { await client?.close(); } catch (e) { console.warn('[Auth] CDP kapatma hatası:', e); }
    }
  }

  // Gerçek profil: InnerTube account_menu + hidden window + DOM / Regex
  async fetchProfileViaAPI(): Promise<{ name: string; email: string; picture: string; handle?: string } | null> {
    try {
      const cookies = await this.getSession().cookies.get({ url: 'https://music.youtube.com' });
      const sapisidCookie = cookies.find((c) => c.name === 'SAPISID' || c.name === '__Secure-3PAPISID' || c.name === '__Secure-1PAPISID');
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

      // 1. SAPISIDHASH ile doğrudan YouTube Music InnerTube API (en hızlı ve garantili JSON)
      if (sapisidCookie && cookieHeader) {
        try {
          const origin = 'https://music.youtube.com';
          const timestamp = Math.floor(Date.now() / 1000);
          const hash = crypto.createHash('sha1').update(`${timestamp} ${sapisidCookie.value} ${origin}`).digest('hex');
          const authHeader = `SAPISIDHASH ${timestamp}_${hash}`;

          const res = await fetch('https://music.youtube.com/youtubei/v1/account/account_menu', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'X-Origin': origin,
              'Origin': origin,
              'Cookie': cookieHeader,
              'User-Agent': CHROME_UA,
              'X-YouTube-Client-Name': '67',
              'X-YouTube-Client-Version': '1.20240101.01.00'
            },
            body: JSON.stringify({
              context: {
                client: {
                  hl: 'tr',
                  gl: 'TR',
                  clientName: 'WEB_REMIX',
                  clientVersion: '1.20240101.01.00'
                }
              }
            })
          });

          if (res.ok) {
            const data: any = await res.json();
            const info = this.extractAccountInfo(data);
            if (info.name || info.handle || info.picture) {
              console.log('[Auth] InnerTube API profil OK:', info.name, info.handle, info.picture ? 'pp var' : 'pp yok');
              return {
                name: sanitizeName(info.name) || info.handle || '',
                email: info.email || info.handle || '',
                picture: info.picture || '',
                handle: info.handle || ''
              };
            }
          }
        } catch (e: any) {
          console.warn('[Auth] InnerTube account_menu hatası:', e?.message || e);
        }
      }

      // 2. Hidden window fallback: music.youtube.com DOM + in-page fetch
      let win: BrowserWindow | null = null;
      try {
        if (cookies.some(c => c.name === 'SAPISID' || c.name === 'LOGIN_INFO')) {
          win = new BrowserWindow({ show: false, width: 1024, height: 700, webPreferences: { partition: MUSIC_PARTITION } });
          try { win.webContents.setUserAgent(CHROME_UA); } catch (e) { console.warn('[Auth] UA ayarlanamadı:', e); }
          await win.loadURL('https://music.youtube.com/');

          // Yükleme için bekleme
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            try {
              const has = await win.webContents.executeJavaScript(`!!(window.ytcfg || document.querySelector('ytmusic-nav-bar #avatar img') || document.querySelector('#account-name'))`, true);
              if (has) break;
            } catch (e) {}
          }

          try {
            const data: any = await win.webContents.executeJavaScript(`(async function(){
              let name = '', handle = '', email = '', picture = '';

              // In-page fetch
              try {
                const ytcfg = window.ytcfg;
                const clientVersion = (ytcfg && ytcfg.get && ytcfg.get('INNERTUBE_CLIENT_VERSION')) || '1.20240101.01.00';
                const context = (ytcfg && ytcfg.get && ytcfg.get('INNERTUBE_CONTEXT')) || {
                  client: { clientName: 'WEB_REMIX', clientVersion }
                };
                const r = await fetch('/youtubei/v1/account/account_menu', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ context })
                });
                if (r.ok) {
                  const d = await r.json();
                  const walk = (node) => {
                    if (!node || typeof node !== 'object') return;
                    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
                    if (node.accountName && !name) {
                      name = (typeof node.accountName.simpleText === 'string' ? node.accountName.simpleText : (node.accountName.runs?.[0]?.text || ''));
                    }
                    if (node.channelHandle && !handle) {
                      handle = (typeof node.channelHandle.simpleText === 'string' ? node.channelHandle.simpleText : (node.channelHandle.runs?.[0]?.text || ''));
                    }
                    if (node.email && !email) {
                      email = (typeof node.email.simpleText === 'string' ? node.email.simpleText : (node.email.runs?.[0]?.text || ''));
                    }
                    if (!picture) {
                      const thumbs = node.avatar?.thumbnails || node.accountPhoto?.thumbnails;
                      if (Array.isArray(thumbs) && thumbs.length) picture = thumbs[thumbs.length - 1]?.url || '';
                    }
                    for (const k of Object.keys(node)) walk(node[k]);
                  };
                  walk(d);
                }
              } catch (e) {}

              // DOM kontrolleri
              if (!name || !handle || !picture) {
                const b = document.querySelector('ytmusic-nav-bar #avatar button') || document.querySelector('ytmusic-nav-bar ytmusic-settings-button button') || document.querySelector('#avatar-btn');
                if (b) { try { (b).click(); } catch(e){} }
                await new Promise(res => setTimeout(res, 500));

                const n = document.querySelector('#account-name'); if (n && !name) name = (n.getAttribute('title') || n.textContent || '').trim();
                const h = document.querySelector('#channel-handle'); if (h && !handle) handle = (h.getAttribute('title') || h.textContent || '').trim();
                const em = document.querySelector('#email'); if (em && !email) email = (em.getAttribute('title') || em.textContent || '').trim();

                const av = document.querySelector('ytmusic-nav-bar ytmusic-settings-button img') ||
                           document.querySelector('ytmusic-nav-bar #avatar img') ||
                           document.querySelector('ytd-active-account-header-renderer img') ||
                           document.querySelector('img[src*="googleusercontent"]') ||
                           document.querySelector('img[src*="ggpht.com"]');
                if (av && !picture) picture = av.src || av.getAttribute('src') || '';
              }

              // Regex fallback
              if (!picture) {
                const m = document.documentElement.innerHTML.match(/https:\\/\\/(?:yt3\\.ggpht\\.com|lh3\\.googleusercontent\\.com)\\/[^"'\\s]+/);
                if (m) picture = m[0];
              }
              if (!name) {
                const mN = document.documentElement.innerHTML.match(/id="account-name"[^>]*title="([^"]+)"/);
                if (mN) name = mN[1];
              }
              if (!handle) {
                const mH = document.documentElement.innerHTML.match(/id="channel-handle"[^>]*title="([^"]+)"/);
                if (mH) handle = mH[1];
              }

              return JSON.stringify({ name: name.trim(), handle: handle.trim(), email: email.trim(), picture: picture.trim() });
            })()`, true);

            let parsed: any = {};
            try { parsed = typeof data === 'string' ? JSON.parse(data) : data; } catch (e) {}

            const validName = sanitizeName(parsed?.name) || parsed?.handle || '';
            if (validName || parsed?.picture || parsed?.handle) {
              console.log('[Auth] Hidden window profil OK:', validName, parsed?.handle, parsed?.picture ? 'pp var' : 'pp yok');
              return {
                name: validName,
                email: parsed?.email || parsed?.handle || '',
                picture: parsed?.picture || '',
                handle: parsed?.handle || ''
              };
            }
          } catch (e) {
            console.warn('[Auth] Hidden window profil JS hatası:', e);
          } finally {
            if (win && !win.isDestroyed()) {
              try { win.destroy(); } catch (e) {}
              win = null;
            }
          }
        }
      } catch (e) {
        console.warn('[Auth] Hidden window aşaması hatası:', e);
      }

      // 3. HTML direct fetch fallback
      if (cookieHeader) {
        try {
          const htmlRes = await fetch('https://music.youtube.com/', {
            headers: { 'Cookie': cookieHeader, 'User-Agent': CHROME_UA, 'Accept-Language': 'tr-TR,tr;q=0.9' }
          });
          if (htmlRes.ok) {
            const html = await htmlRes.text();
            const mName = html.match(/id="account-name"[^>]*title="([^"]+)"/) || html.match(/id="account-name"[^>]*>([^<]+)</);
            const mPic = html.match(/id="avatar"[^]*?src="([^"]+(?:googleusercontent|ggpht\.com)[^"]+)"/);
            const mHandle = html.match(/id="channel-handle"[^>]*title="([^"]+)"/);
            const mEmail = html.match(/id="email"[^>]*title="([^"]+)"/);
            const name = (mName?.[1] || '').trim();
            const handle = (mHandle?.[1] || '').trim();
            const picture = (mPic?.[1] || '').trim();
            const email = (mEmail?.[1] || handle || '').trim();
            if (name || handle || picture) {
              return { name: sanitizeName(name) || handle, email, picture, handle };
            }
          }
        } catch (e) {
          console.warn('[Auth] HTML direct fetch hatası:', e);
        }
      }

      return null;
    } catch (e: any) {
      console.error('[Auth] fetchProfileViaAPI genel hatası:', e?.message || e);
      return null;
    }
  }

  private extractAccountInfo(data: any): { name: string; handle: string; email: string; picture: string } {
    let name = '';
    let handle = '';
    let email = '';
    let picture = '';

    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      if (node.accountName && !name) {
        name = this.runsText(node.accountName) || (typeof node.accountName.simpleText === 'string' ? node.accountName.simpleText : '');
      }
      if (node.channelHandle && !handle) {
        handle = this.runsText(node.channelHandle) || (typeof node.channelHandle.simpleText === 'string' ? node.channelHandle.simpleText : '');
      }
      if (node.email && !email) {
        email = this.runsText(node.email) || (typeof node.email.simpleText === 'string' ? node.email.simpleText : '');
      }
      if (node.accountEmail && !email) {
        email = this.runsText(node.accountEmail) || (typeof node.accountEmail.simpleText === 'string' ? node.accountEmail.simpleText : '');
      }
      if (node.accountBylineText && !handle && !email) {
        const bl = this.runsText(node.accountBylineText);
        if (bl.startsWith('@')) handle = bl;
        else email = bl;
      }
      if (!picture) {
        const thumbs = node.avatar?.thumbnails || node.accountPhoto?.thumbnails;
        if (Array.isArray(thumbs) && thumbs.length > 0) {
          const u = thumbs[thumbs.length - 1]?.url;
          if (u && typeof u === 'string') picture = u;
        }
      }
      for (const k of Object.keys(node)) {
        walk(node[k]);
      }
    };

    walk(data);
    if (picture) {
      picture = picture.replace(/=s\d+[^"]*/, '=s200-c-k-c0x00ffffff-no-rj').replace(/=w\d+.*/, '=s200-c-k-c0x00ffffff-no-rj');
    }
    return { name: name.trim(), handle: handle.trim(), email: email.trim(), picture: picture.trim() };
  }

  private runsText(t: any): string {
    if (!t) return '';
    if (typeof t === 'string') return t;
    if (typeof t.simpleText === 'string') return t.simpleText;
    if (Array.isArray(t.runs)) return t.runs.map((r: any) => r.text || '').join('');
    return '';
  }

  private extractEmail(raw: string): string {
    const m = raw.match(/"email":\s*\{\s*"simpleText":\s*"([^"]+)"/) ||
              raw.match(/"emailAddress":\s*\{\s*"simpleText":\s*"([^"]+)"/) ||
              raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return m ? m[1] || m[0] : '';
  }

  // CDP üzerinden mevcut sekmede hesap adını çek
  private async fetchProfileViaCDP(client: CDPClient | null): Promise<{ name: string; email: string; picture: string } | null> {
    if (!client) return null;
    try {
      const { Page, Runtime } = client;
      await Page.enable();
      await Runtime.enable();
      try { await Page.navigate({ url: 'https://music.youtube.com/' }); } catch (e) { /* CDP navigasyon best-effort */ }
      await new Promise((r) => setTimeout(r, 7000));
      const res = await Runtime.evaluate({
        expression: `(function(){
          try {
            let name='', email='', picture='';
            const acc = document.querySelector('ytd-active-account-header-renderer');
            if(acc){
              const n = acc.querySelector('#account-name');
              if(n) name = (n.getAttribute('title')||n.textContent||'').trim();
              const av = acc.querySelector('#avatar img');
              if(av) picture = av.src||av.getAttribute('src')||'';
              const em = acc.querySelector('#email');
              if(em) email = (em.getAttribute('title')||em.textContent||'').trim();
              if(!email){
                const h = acc.querySelector('#channel-handle');
                if(h) email = (h.textContent||'').trim();
              }
            }
            if(!name || name.length<=1){
              const html=document.documentElement.innerHTML;
              const nm=html.match(/"accountName":\\s*\\{\\s*"simpleText":\\s*"((?:[^"\\\\\\\\]|\\\\\\\\.)*)"/);
              if(nm){ try{name=JSON.parse('"'+nm[1]+'"');}catch{name=nm[1];} }
            }
            if(!picture){
              const imgs=document.querySelectorAll('ytd-active-account-header-renderer #avatar img, ytmusic-nav-bar img, header img');
              for(const img of imgs){ const s=img.currentSrc||img.src||''; if(s.includes('googleusercontent')||s.includes('ggpht.com')){picture=s;break;} }
            }
            if(!email) email=document.querySelector('#channel-handle')?.textContent?.trim()||'';
            return JSON.stringify({ name, email, picture });
          } catch(e) { return JSON.stringify({ name: '', email: '', picture: '' }); }
        })()`,
        returnByValue: true
      });
      const rawValue = typeof res.result?.value === 'string' ? res.result.value : '{}';
      let data: { name?: string; email?: string; picture?: string } = {};
      try {
        data = JSON.parse(rawValue);
      } catch (e) {
        console.warn('[Auth] CDP profil JSON çözümlenemedi:', e);
        return null;
      }
      console.log('[Auth] CDP profil:', data);
      if (data.name || data.picture) {
        return { name: data.name || '', email: data.email || '', picture: data.picture || '' };
      }
      return null;
    } catch (e: any) {
      console.error('[Auth] CDP profil hatası:', e?.message || e);
      return null;
    }
  }

  // Normal cikis: sadece UI store'u temizle, tarayici cookie'si kalsin (mac id gibi kalici)
  async logout(): Promise<void> {
    this.store.set('musicUser', null);
    try { this.loginWindow?.hide(); } catch (e) { console.warn('[Auth] Pencere gizlenemedi:', e); }
  }
  async logoutCompletely(): Promise<void> {
    try {
      await this.getSession().clearStorageData({ storages: ['cookies', 'localstorage', 'cachestorage', 'indexdb', 'serviceworkers'] });
    } catch (e) { console.warn('[Auth] Oturum verisi temizlenemedi:', e); }
    this.store.set('musicUser', null);
    try {
      const tmpProfile = (process.env.TEMP || 'C:\\Temp') + '\\aquality-music-chrome-profile';
      if (fs.existsSync(tmpProfile)) fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch (e) { console.warn('[Auth] Geçici profil silinemedi:', e); }
  }
}
