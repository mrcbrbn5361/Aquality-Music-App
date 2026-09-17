import { BrowserWindow, shell } from 'electron';
import * as crypto from 'crypto';
import * as http from 'http';
import { URL } from 'url';
import Store from 'electron-store';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './google-credentials';
import { base64url, escapeHtml } from '../utils/crypto-util';
import { decryptJSON, decryptString, encryptJSON, encryptString } from '../utils/secure-store';

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
  scope?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  picture: string;
  provider: 'google' | 'discord';
}

interface TokenStore {
  // Şifreli (string) veya eski düz metin (OAuthTokens) formatında olabilir
  googleTokens: OAuthTokens | string | null;
  googleUser: UserData | null;
  googleClientId?: string;
  googleClientSecret?: string;
}

// ── Google OAuth ──────────────────────────────
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

export class GoogleOAuth {
  private store: Store<TokenStore>;
  private authWindow: BrowserWindow | null = null;

  constructor() {
    this.store = new Store<TokenStore>({
      name: 'aquality-music-auth',
      defaults: {
        googleTokens: null,
        googleUser: null,
        googleClientId: '',
        googleClientSecret: ''
      }
    });
  }

  getGoogleTokens(): OAuthTokens | null {
    try {
      const raw = this.store.get('googleTokens');
      if (!raw) return null;
      if (typeof raw !== 'string') return raw;
      return decryptJSON<OAuthTokens>(raw);
    } catch (e) {
      console.warn('[Google OAuth] Token okunamadı:', e);
      return null;
    }
  }

  async refreshIfNeeded(): Promise<void> {
    const tokens = this.getGoogleTokens();
    if (tokens && Date.now() >= tokens.expires_at - 60000) {
      await this.refreshGoogleToken(tokens);
    }
  }

  getGoogleUser(): UserData | null {
    return this.store.get('googleUser');
  }

  isGoogleAuthenticated(): boolean {
    const tokens = this.getGoogleTokens();
    if (tokens && tokens.access_token && Date.now() < tokens.expires_at - 60000) {
      return true;
    }
    // Check if we have a refresh token
    return tokens !== null && tokens.refresh_token !== undefined && tokens.refresh_token !== '';
  }

  // ── Google Login ─────────────────────────────
  async loginGoogle(_parentWindow: BrowserWindow, clientId: string, clientSecret: string): Promise<{ success: boolean; user?: UserData; error?: string }> {
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Google Client ID ve Secret girilmemiş. Ayarlar\'dan girin.' };
    }

    return new Promise((resolve) => {
      let server: http.Server;
      let callbackHandled = false;
      let timeoutTimer: NodeJS.Timeout | null = null;

      // PKCE ve CSRF State
      const verifier = base64url(crypto.randomBytes(64));
      const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
      const expectedState = crypto.randomBytes(32).toString('hex');

      const cleanup = () => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (server) {
          try { server.close(); } catch (e) { /* OAuth callback sunucusu zaten kapalı */ }
        }
      };

      server = http.createServer(async (req, res) => {
        if (callbackHandled) {
          // Çift tıklama/yeniden deneme durumunda istemciyi asılı bırakma
          res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Bu giriş isteği zaten işlendi.');
          return;
        }

        const url = new URL(req.url || '/', 'http://localhost');

        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        callbackHandled = true;

        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        console.log('[Google OAuth] Callback received, code:', code ? 'var' : 'yok', 'error:', error);

        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h1 style="color:#e8364e">Güvenlik Doğrulama Hatası</h1>
                <p>CSRF state parametresi eşleşmedi.</p>
              </div>
            </body></html>
          `);
          cleanup();
          resolve({ success: false, error: 'CSRF state doğrulaması başarısız' });
          return;
        }

        if (error || !code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h1 style="color:#e8364e">Giriş başarısız</h1>
                <p>${error === 'access_denied' ? 'Giriş iptal edildi.' : 'Kod alınamadı'}</p>
                <p style="color:#666;font-size:12px;margin-top:16px">Bu sekmeyi kapatabilirsiniz.</p>
              </div>
            </body></html>
          `);
          cleanup();
          resolve({ success: false, error: error || 'Authorization code alınamadı' });
          return;
        }

        // Token exchange
        try {
          console.log('[Google OAuth] Token exchange başlatılıyor...');
          const addr = server.address();
          const listenPort = addr && typeof addr === 'object' ? addr.port : 0;
          const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: `http://127.0.0.1:${listenPort}/callback`,
              grant_type: 'authorization_code',
              code_verifier: verifier
            }).toString()
          });

          const tokenData = await tokenRes.json() as any;
          console.log('[Google OAuth] Token response:', tokenRes.status, tokenData.error || 'ok');

          if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token exchange başarısız');
          }

          if (!tokenData.expires_in) {
            throw new Error('Token süresi alınamadı');
          }

          const tokens: OAuthTokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            token_type: tokenData.token_type
          };

          // Token'lar OS anahtarlığı ile şifreli saklanır
          this.store.set('googleTokens', encryptJSON(tokens));

          // Kullanıcı bilgisi al
          const userRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          });
          if (!userRes.ok) {
            throw new Error('Kullanıcı bilgisi alınamadı');
          }
          const userData = await userRes.json() as any;
          console.log('[Google OAuth] User:', userData.name, userData.email);

          const user: UserData = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture || '',
            provider: 'google'
          };

          this.store.set('googleUser', user);

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h1 style="color:#2ecc71">Giriş başarılı!</h1>
                <p>${escapeHtml(user.name)} olarak giriş yapıldı.</p>
                <p style="color:#a0a0a0;font-size:14px;margin-top:16px">Bu sekmeyi kapatıp Aquality Music uygulamasına dönebilirsiniz.</p>
              </div>
            </body></html>
          `);

          cleanup();
          resolve({ success: true, user });
        } catch (err: any) {
          console.error('[Google OAuth] Hata:', err.message);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html><body style="font-family:sans-serif;background:#121212;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h1 style="color:#e8364e">Hata</h1>
                <p>Giriş sırasında bir hata oluştu: ${escapeHtml(err.message)}</p>
                <p style="color:#666;font-size:12px;margin-top:16px">Bu sekmeyi kapatabilirsiniz.</p>
              </div>
            </body></html>
          `);
          cleanup();
          resolve({ success: false, error: err.message });
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = addr && typeof addr === 'object' ? addr.port : 0;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        console.log('[Google OAuth] Server port:', port);
        console.log('[Google OAuth] Redirect URI:', redirectUri);

        const authUrl = `${GOOGLE_AUTH_URL}?${new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: GOOGLE_SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state: expectedState
        }).toString()}`;

        // Google'ın disallowed_useragent engelini aşmak için sistem varsayılan tarayıcısını aç
        shell.openExternal(authUrl);

        // 5 dakika zaman aşımı
        timeoutTimer = setTimeout(() => {
          if (!callbackHandled) {
            callbackHandled = true;
            cleanup();
            resolve({ success: false, error: 'Giriş zaman aşımına uğradı (5 dakika).' });
          }
        }, 300000);
      });

      server.on('error', (err) => {
        cleanup();
        resolve({ success: false, error: `Sunucu hatası: ${err.message}` });
      });
    });
  }

  // ── Token Refresh ────────────────────────────
  private async refreshGoogleToken(tokens: OAuthTokens): Promise<void> {
    if (!tokens.refresh_token) return;
    try {
      // Mağazadaki değer boşsa paket varsayılanını kullan (yoksa yenileme sessizce ölür)
      const { clientId, clientSecret } = this.getGoogleConfig();
      if (!clientId || !clientSecret) return;
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token'
        }).toString()
      });
      if (res.ok) {
        const data = await res.json() as any;
        tokens.access_token = data.access_token;
        tokens.expires_at = Date.now() + (data.expires_in * 1000);
        this.store.set('googleTokens', encryptJSON(tokens));
      }
    } catch (e) {
      console.warn('[Google OAuth] Token yenileme hatası:', e);
    }
  }

  // ── Logout ───────────────────────────────────
  async logoutGoogle(): Promise<void> {
    this.store.set('googleTokens', null);
    this.store.set('googleUser', null);
  }

  // ── Config ───────────────────────────────────
  setGoogleConfig(clientId: string, clientSecret: string): void {
    this.store.set('googleClientId', clientId);
    // Client secret hassas veridir — şifreli saklanır
    this.store.set('googleClientSecret', encryptString(clientSecret));
  }

  getGoogleConfig(): { clientId: string; clientSecret: string } {
    const clientId = this.store.get('googleClientId') || GOOGLE_CLIENT_ID;
    const storedSecret = this.store.get('googleClientSecret') || '';
    const clientSecret = decryptString(storedSecret) || GOOGLE_CLIENT_SECRET;
    return {
      clientId,
      clientSecret
    };
  }

  getGoogleAccessToken(): string | null {
    const tokens = this.getGoogleTokens();
    return tokens?.access_token || null;
  }
}
