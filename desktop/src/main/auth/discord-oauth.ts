import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';
import * as http from 'http';
import { URL } from 'url';
import Store from 'electron-store';
import { DISCORD_APP_ID } from '../utils/discord';
import { base64url } from '../utils/crypto-util';
import { decryptJSON, encryptJSON } from '../utils/secure-store';

export interface DiscordUser {
  id: string;
  name: string;
  username: string;
  email: string;
  picture: string;
  provider: 'discord';
}

interface DiscordTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

interface DiscordStore {
  // Şifreli (string) veya eski düz metin (DiscordTokens) formatında olabilir
  discordTokens: DiscordTokens | string | null;
  discordUser: DiscordUser | null;
}

// ── Discord OAuth (resmi Authorization Code + PKCE) ──
// Kullanıcı tokeni yapıştırma YOK — kullanıcı Discord'un kendi ekranında
// "Yetkilendir"e basar. Secret gömülü değil (PKCE), desktop için doğru kalıp.
// PORTAL GEREKSİNİMİ: Discord Developer Portal → OAuth2 → Redirects altına
// http://127.0.0.1:65432/callback eklenmeli, yoksa "Invalid redirect_uri" hatası verir.
const DISCORD_AUTH_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const DISCORD_SCOPES = ['identify', 'email'];
const OAUTH_PORT = 65432;
const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/callback`;

function avatarUrl(id: string, avatar: string | null): string {
  if (!avatar) return '';
  const ext = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
}

const SUCCESS_HTML = (name: string) => `
  <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center">
      <h1 style="color:#2ecc71">Giris basarili!</h1>
      <p>Giris basariyla tamamlandi.</p>
      <p style="color:#666;font-size:12px;margin-top:16px">Bu pencere otomatik kapanacak...</p>
    </div>
  </body></html>`;
const ERROR_HTML = (msg: string) => `
  <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center">
      <h1 style="color:#e8364e">Giris basarisiz</h1>
      <p>Giris sirasinda bir hata olustu.</p>
      <p style="color:#666;font-size:12px;margin-top:16px">Bu pencereyi kapatabilirsiniz.</p>
    </div>
  </body></html>`;

export class DiscordOAuth {
  private store: Store<DiscordStore>;

  constructor() {
    this.store = new Store<DiscordStore>({
      name: 'aquality-music-auth',
      defaults: { discordTokens: null, discordUser: null }
    });
  }

  getDiscordUser(): DiscordUser | null {
    return this.store.get('discordUser');
  }

  /** Şifreli saklanan token'ları okur (eski düz metin kayıtlarla uyumlu). */
  getDiscordTokens(): DiscordTokens | null {
    try {
      const raw = this.store.get('discordTokens');
      if (!raw) return null;
      if (typeof raw !== 'string') return raw;
      return decryptJSON<DiscordTokens>(raw);
    } catch (e) {
      console.warn('[Discord OAuth] Token okunamadı:', e);
      return null;
    }
  }

  isDiscordAuthenticated(): boolean {
    return this.store.get('discordUser') !== null;
  }

  async logoutDiscord(): Promise<void> {
    this.store.set('discordTokens', null);
    this.store.set('discordUser', null);
  }

  async loginDiscord(parentWindow: BrowserWindow): Promise<{ success: boolean; user?: DiscordUser; error?: string }> {
    return new Promise((resolve) => {
      let server: http.Server;
      let authWindow: BrowserWindow | null = null;
      let callbackHandled = false;
      let timeoutId: NodeJS.Timeout | null = null;

      // PKCE: secret'sız desktop akışı
      const verifier = base64url(crypto.randomBytes(64));
      const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
      const state = crypto.randomBytes(32).toString('hex');

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.close();
          authWindow = null;
        }
        if (server) {
          try { server.close(); } catch (e) { /* OAuth callback sunucusu zaten kapalı */ }
        }
      };

      const finishError = (msg: string) => {
        if (callbackHandled) return;
        callbackHandled = true;
        cleanup();
        resolve({ success: false, error: msg });
      };

      // 5 dakikalık zaman aşımı
      timeoutId = setTimeout(() => {
        finishError('Giriş işlemi zaman aşımına uğradı (5 dakika).');
      }, 5 * 60 * 1000);

      const exchangeAndFetchUser = async (code: string): Promise<void> => {
        if (callbackHandled) return;
        callbackHandled = true;
        try {
          const tokenRes = await fetch(DISCORD_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: REDIRECT_URI,
              client_id: DISCORD_APP_ID,
              code_verifier: verifier
            }).toString()
          });
          const tokenData = await tokenRes.json() as any;
          if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token alınamadı');
          }
          const tokens: DiscordTokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + ((tokenData.expires_in || 3600) * 1000),
            token_type: tokenData.token_type || 'Bearer'
          };
          // Token'lar OS anahtarlığı ile şifreli saklanır
          this.store.set('discordTokens', encryptJSON(tokens));

          const userRes = await fetch(DISCORD_USER_URL, {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          });
          if (!userRes.ok) throw new Error('Discord kullanıcı bilgisi alınamadı');
          const ud = await userRes.json() as any;
          const user: DiscordUser = {
            id: String(ud.id || ''),
            name: (ud.global_name || ud.username || '').trim(),
            username: String(ud.username || ''),
            email: String(ud.email || ''),
            picture: avatarUrl(String(ud.id || ''), ud.avatar || null),
            provider: 'discord'
          };
          this.store.set('discordUser', user);
          console.log('[Discord OAuth] Başarılı:', user.name);
          cleanup();
          resolve({ success: true, user });
        } catch (err: any) {
          console.error('[Discord OAuth] Hata:', err?.message || err);
          cleanup();
          resolve({ success: false, error: err?.message || 'Giriş başarısız' });
        }
      };

      server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const returnedState = url.searchParams.get('state');
        if (!returnedState || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(ERROR_HTML('Güvenlik doğrulaması başarısız (Geçersiz CSRF State).'));
          finishError('Geçersiz OAuth State parametresi.');
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (error || !code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(ERROR_HTML(error === 'access_denied' ? 'Giriş iptal edildi.' : error || 'Kod alınamadı'));
          finishError(error || 'Authorization code alınamadı');
          return;
        }
        // Başarı sayfasını hemen göster, token işlemini arka planda yap
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(SUCCESS_HTML('Discord'));
        await exchangeAndFetchUser(code);
      });

      server.on('error', (err: any) => {
        if (err?.code === 'EADDRINUSE') {
          finishError(`Port ${OAUTH_PORT} kullanımda. Diğer Aquality Music penceresini kapatıp tekrar deneyin.`);
        } else {
          finishError(`Sunucu hatası: ${err?.message || err}`);
        }
      });

      server.listen(OAUTH_PORT, '127.0.0.1', () => {
        const authUrl = `${DISCORD_AUTH_URL}?${new URLSearchParams({
          client_id: DISCORD_APP_ID,
          redirect_uri: REDIRECT_URI,
          response_type: 'code',
          scope: DISCORD_SCOPES.join(' '),
          state,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          prompt: 'consent'
        }).toString()}`;

        authWindow = new BrowserWindow({
          width: 500,
          height: 720,
          parent: parentWindow,
          modal: true,
          title: 'Discord ile Giriş Yap',
          backgroundColor: '#0a0a0a',
          webPreferences: { nodeIntegration: false, contextIsolation: true },
          autoHideMenuBar: true
        });

        authWindow.loadURL(authUrl);

        authWindow.on('closed', () => {
          authWindow = null;
          finishError('Pencere kapatıldı');
        });
      });
    });
  }
}
