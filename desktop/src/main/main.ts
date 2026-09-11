import { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { YouTubeAPI } from './api/innertube';
import { StoreManager } from './utils/store';
import { DiscordRPC } from './utils/discord';
import { DiscordOAuth } from './auth/discord-oauth';
import { GoogleOAuth } from './auth/google-oauth';
import { MusicAuth } from './auth/music-auth';
import { StreamResolver } from './api/stream-resolver';
import { authProvider } from './providers/auth-provider';
import { volumeRatioProvider } from './providers/volume-ratio';
import { lyricsProvider } from './providers/lyrics-provider';
import { autoUpdater } from 'electron-updater';

// Gizli çözücü penceresinde otomatik oynatmaya izin ver (kullanıcı hareketi gerekmesin)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Google girişi için Client Hints desteği (mevcut enable-features değerini koru)
const existingFeatures = app.commandLine.getSwitchValue('enable-features');
app.commandLine.appendSwitch('enable-features', existingFeatures ? `${existingFeatures},ClientHints,UserAgentClientHint` : 'ClientHints,UserAgentClientHint');

// Portable mod kontrolü (electron-builder portable çalıştırıldığında PORTABLE_EXECUTABLE_DIR atanır)
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
let userData: string;

if (portableDir) {
  userData = path.join(portableDir, 'data');
  if (!fs.existsSync(userData)) {
    try {
      fs.mkdirSync(userData, { recursive: true });
    } catch (e) {
      console.error('[Main] Portable data klasörü oluşturulamadı, appData fallback:', e);
      userData = path.join(app.getPath('appData'), 'Aquality Music');
    }
  }
} else {
  // Standart kurulum modu: Electron'un kendi gizli User Data klasörünü kullan (Chrome ile çakışmasın)
  userData = path.join(app.getPath('appData'), 'Aquality Music');
}
app.setPath('userData', userData);

let mainWindow: BrowserWindow | null = null;
let youtubeAPI: YouTubeAPI;
let storeManager: StoreManager;
let discordRPC: DiscordRPC;
let discordOAuth: DiscordOAuth;
let googleAuth: GoogleOAuth;
let musicAuth: MusicAuth;
let streamResolver: StreamResolver;

const isDev = !app.isPackaged;

function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(String(url));
    if (u.protocol !== 'https:') return false;
    const allowed = ['music.youtube.com', 'youtube.com', 'www.youtube.com', 'github.com', 'accounts.google.com', 'discord.gg', 'discord.com', 'ytimg.com'];
    return allowed.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

function createWindow(): void {
  // Kaydedilmiş pencere konumu varsa ve ekran üzerinde görünür durumdaysa geri yükle
  const saved = storeManager?.getWindowBounds();
  let bounds: { x?: number; y?: number; width: number; height: number } = { width: 1280, height: 820 };

  if (saved && saved.width >= 800 && saved.height >= 500) {
    if (typeof saved.x === 'number' && typeof saved.y === 'number') {
      const displays = screen.getAllDisplays();
      const isVisible = displays.some(d => {
        const b = d.bounds;
        return (
          saved.x! >= b.x - 50 &&
          saved.x! + saved.width <= b.x + b.width + 50 &&
          saved.y! >= b.y - 50 &&
          saved.y! + saved.height <= b.y + b.height + 50
        );
      });
      if (isVisible) {
        bounds = { x: saved.x, y: saved.y, width: saved.width, height: saved.height };
      } else {
        bounds = { width: saved.width, height: saved.height };
      }
    } else {
      bounds = { width: saved.width, height: saved.height };
    }
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#121212',
    backgroundMaterial: 'mica' as any,
    show: false,
    roundedCorners: true,
    thickFrame: true,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Gizli oynatıcı penceresi window-all-closed'ı engeller — burada kapat
    try { streamResolver?.destroy(); } catch {}
    try { discordRPC?.disconnect(); } catch {}
    if (process.platform !== 'darwin') app.quit();
  });

  mainWindow.on('close', () => {
    // Pencere konumunu kaydet (sonraki açılışta geri yüklenir)
    try {
      if (mainWindow && !mainWindow.isMaximized()) {
        const b = mainWindow.getBounds();
        storeManager?.saveWindowBounds(b);
      }
    } catch {}
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('win:maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('win:maximized', false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  buildMenu();

  // Production'da F12 ve Ctrl+Shift+I dev tools'u engelle
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault();
      }
    });
  }
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Çıkış', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Düzenle',
      submenu: [
        { label: 'Geri Al', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Yinele', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Kes', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Kopyala', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Yapıştır', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Yeniden Yükle', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Geliştirici Araçları', accelerator: 'F12', role: 'toggleDevTools', visible: isDev },
        { type: 'separator' },
        { label: 'Tam Ekran', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Aquality Music Hakkında',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Aquality Music',
              message: 'Aquality Music v1.0.0',
              detail: 'Premium müzik deneyimi.\n\n© 2026 Aquality Music Team. Tüm hakları saklıdır.',
              buttons: ['Tamam']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIPC(): void {
  ipcMain.on('win:minimize', () => mainWindow?.minimize());
  ipcMain.on('win:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('win:fullscreen', () => {
    if (mainWindow?.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow?.setFullScreen(true);
    }
  });
  ipcMain.on('win:close', () => mainWindow?.close());
  ipcMain.handle('win:isMaximized', () => mainWindow?.isMaximized() ?? false);

  // ── Renderer log köprüsü (arayüzden gelen debug mesajları) ──
  ipcMain.on('debug:log', (_, msg: string) => {
    console.log('[UI]', msg);
  });

  // Central StreamResolver update listener to ensure UI stays in sync
  streamResolver.onUpdate((u) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player:update', u);
    }
  });

  // YouTube API
  ipcMain.handle('yt:search', async (_, query: string, filter?: string) => {
    try {
      const result = await youtubeAPI.search(query, filter || 'all');
      console.log('[Main] Search:', query, 'songs:', result.songs?.length || 0, 'videos:', result.videos?.length || 0, 'albums:', result.albums?.length || 0, 'artists:', result.artists?.length || 0);
      return result;
    } catch (err) {
      console.error('[Main] Search error:', err);
      return { songs: [], videos: [], albums: [], artists: [], playlists: [] };
    }
  });
  ipcMain.handle('yt:player', async (_, videoId: string) => {
    // Girişli session ile gizli pencerede şarkıyı oynat
    if (!(await musicAuth.isAuthenticated())) {
      return { error: 'not_authenticated', id: videoId };
    }
    // Oynatmayı başlat (fire & forget — ana pencere state'i update event'iyle alır)
    streamResolver.play(videoId).catch((err) => console.error('[Player] play error:', err));
    return { id: videoId, playing: true };
  });

  ipcMain.handle('player:pause', async () => {
    await streamResolver.pause();
    return true;
  });
  ipcMain.handle('player:resume', async () => {
    await streamResolver.resume();
    return true;
  });
  ipcMain.handle('player:seek', async (_, seconds: number) => {
    const safeSec = Math.max(0, Number(seconds) || 0);
    await streamResolver.seek(safeSec);
    return true;
  });
  ipcMain.handle('player:setVolume', async (_, vol: number) => {
    const raw = Number(vol) || 0;
    let normalized = raw > 1 ? raw / 100 : raw;
    normalized = Math.max(0, Math.min(1, normalized));
    if (volumeRatioProvider.isEnabled()) {
      normalized = Math.max(0, Math.min(1, normalized * volumeRatioProvider.getRatio()));
    }
    await streamResolver.setVolume(normalized);
    return true;
  });
  ipcMain.handle('player:next', async () => {
    await streamResolver.next();
    return true;
  });
  ipcMain.handle('player:prev', async () => {
    await streamResolver.prev();
    return true;
  });
  ipcMain.handle('player:skipAd', async () => {
    await streamResolver.skipAd();
    return true;
  });
  ipcMain.handle('yt:home', async () => {
    try {
      const result = await youtubeAPI.getHome();
      console.log('[Main] Home items:', result.items?.length || 0);
      return result;
    } catch (err) {
      console.error('[Main] Home error:', err);
      return { items: [] };
    }
  });
  ipcMain.handle('yt:browse', async (_, browseId: string, params?: string) => {
    try { 
      const result = await youtubeAPI.browse(browseId, params);
      return result; 
    } catch (err) { 
      console.error('[Main] Browse error:', browseId, err);
      return { title: '', items: [] }; 
    }
  });
  ipcMain.handle('yt:next', async (_, videoId: string, playlistId?: string) => {
    try { return await youtubeAPI.getNext(videoId, playlistId); } catch { return { items: [], currentIndex: 0 }; }
  });
  ipcMain.handle('yt:suggestions', async (_, input: string) => {
    try { return await youtubeAPI.getSearchSuggestions(input); } catch { return []; }
  });
  ipcMain.handle('yt:lyrics', async (_, videoId: string) => {
    try {
      if (!lyricsProvider.isEnabled()) return null;
      return await youtubeAPI.getLyrics(videoId);
    } catch {
      return null;
    }
  });
  ipcMain.handle('yt:libraryPlaylists', async () => {
    try { return await youtubeAPI.getLibraryPlaylists(); } catch { return []; }
  });
  ipcMain.handle('yt:likedSongs', async () => {
    try { return await youtubeAPI.getLikedSongs(); } catch { return []; }
  });
  ipcMain.handle('yt:libraryArtists', async () => {
    try { return await youtubeAPI.getLibraryArtists(); } catch { return []; }
  });
  ipcMain.handle('yt:libraryAlbums', async () => {
    try { return await youtubeAPI.getLibraryAlbums(); } catch { return []; }
  });

  // Store
  ipcMain.handle('store:get', (_, key: string) => storeManager.get(key as any));
  ipcMain.handle('store:set', (_, key: string, value: unknown) => { storeManager.set(key as any, value); });
  ipcMain.handle('shell:openExternal', (_, url: string) => {
    try {
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
    } catch {}
  });

  // ── Auth IPC ─────────────────────────────────
  ipcMain.handle('auth:loginGoogle', async () => {
    if (!mainWindow) return { success: false, error: 'Pencere bulunamadı' };
    const config = googleAuth.getGoogleConfig();
    if (!config.clientId || !config.clientSecret) {
      return { success: false, error: 'Google bilgileri eksik (uygulama paketi hatalı).' };
    }
    const result = await googleAuth.loginGoogle(mainWindow, config.clientId, config.clientSecret);
    if (result.success) {
      youtubeAPI.setAccessToken(googleAuth.getGoogleAccessToken());
    }
    return result;
  });

  ipcMain.handle('auth:logoutGoogle', async () => {
    await googleAuth.logoutGoogle();
    youtubeAPI.setAccessToken(null);
    return { success: true };
  });

  ipcMain.handle('auth:isGoogleAuthenticated', () => googleAuth.isGoogleAuthenticated());
  ipcMain.handle('auth:getGoogleUser', () => googleAuth.getGoogleUser());

  // ── YouTube Music cookie girişi IPC ──────────
  ipcMain.handle('auth:openChromeLogin', async () => {
    return await musicAuth.openChromeLogin();
  });
  ipcMain.handle('auth:importFromChrome', async () => {
    let result = await musicAuth.importFromChrome();
    if (!result.success) {
      const target = await musicAuth.findYouTubeMusicTarget().catch(()=>null);
      const ext = await musicAuth.importFromExternalChrome(target?.id).catch(()=>null);
      if (ext && ext.success) result = ext as any;
    }
    if (result.success) {
      // importFromChrome zaten profili kaydetti. Ek olarak streamResolver'dan da dene
      // ama sadece mevcut verileri GÜNCELLE — boş alanları eski veriyle doldur
      try {
        const prof = await streamResolver.fetchAccountProfile();
        if (prof && prof.name && prof.name !== 'Guide' && prof.name.length > 1) {
          const existing = musicAuth.getUser();
          musicAuth.setUser({
            id: 'ytmusic',
            name: prof.name || existing?.name || '',
            email: prof.email || existing?.email || '',
            picture: prof.picture || existing?.picture || '',
            provider: 'youtube-music'
          });
        }
      } catch {}
      // En son kaydedilen kullanıcıyı dön (importFromChrome zaten kaydetti)
      return { success: true, cookies: result.cookies, user: musicAuth.getUser() };
    }
    return result;
  });
  ipcMain.handle('auth:logoutMusic', async () => {
    await musicAuth.logout();
    return { success: true };
  });
  ipcMain.handle('auth:logoutMusicCompletely', async () => {
    await musicAuth.logoutCompletely();
    return { success: true };
  });
  ipcMain.handle('auth:isMusicAuthenticated', () => musicAuth.isAuthenticated());
  ipcMain.handle('auth:getMusicUser', () => musicAuth.getUser());

  // ── Discord Rich Presence IPC (yalnızca resmi RPC/IPC yolu — token yok) ──
  // Discord geç açılırsa sessizce yeniden bağlan (throttle'lı — spam yok)
  let lastDiscordReconnectAt = 0;
  async function ensureDiscordConnected(): Promise<boolean> {
    if (discordRPC.isReady()) return true;
    const now = Date.now();
    if (now - lastDiscordReconnectAt < 45000) return false;
    lastDiscordReconnectAt = now;
    try { await discordRPC.connect(); } catch {}
    return discordRPC.isReady();
  }
  ipcMain.handle('discord:getAppId', () => discordRPC.getAppId());
  ipcMain.handle('discord:isReady', () => discordRPC.isReady());
  ipcMain.handle('discord:reconnect', async () => {
    lastDiscordReconnectAt = Date.now();
    try { await discordRPC.connect(); } catch {}
    return discordRPC.isReady();
  });
  ipcMain.handle('discord:setActivity', async (_, data) => {
    const enabled = storeManager.get('discordEnabled' as any);
    if (enabled === false) return;
    const showButtons = storeManager.get('discordButtons' as any);
    const showThumbs = storeManager.get('discordThumbnails' as any);
    if (showButtons === false) delete (data as any).buttons;
    if (showThumbs === false) { delete (data as any).coverUrl; delete (data as any).largeImageText; }
    if (await ensureDiscordConnected()) {
      await discordRPC.setActivity(data);
    }
  });
  ipcMain.handle('discord:clearActivity', async () => {
    await discordRPC.clearActivity();
  });

  // ── Discord OAuth girişi (resmi Authorization Code + PKCE — kullanıcı tokeni yok) ──
  ipcMain.handle('discord:login', async () => {
    if (!mainWindow) return { success: false, error: 'Pencere bulunamadı' };
    return await discordOAuth.loginDiscord(mainWindow);
  });
  ipcMain.handle('discord:logout', async () => {
    await discordOAuth.logoutDiscord();
    return true;
  });
  ipcMain.handle('discord:getUser', () => discordOAuth.getDiscordUser());

  // ── Auth clients (ytmdesktop2 auth) ───────
  ipcMain.handle('auth:clients', () => authProvider.listClients());
  ipcMain.handle('auth:createClient', (_, d:{appId:string;appName:string}) => authProvider.createManual(d));
  ipcMain.handle('auth:revokeClient', (_, appId:string) => authProvider.revoke(appId));
  // ── VolumeRatio ───────────────────────────
  ipcMain.handle('volumeRatio:isEnabled', () => volumeRatioProvider.isEnabled());
  ipcMain.handle('volumeRatio:setEnabled', (_, v:boolean) => volumeRatioProvider.setEnabled(v));
  // ── Lyrics ────────────────────────────────
  ipcMain.handle('lyrics:isEnabled', () => lyricsProvider.isEnabled());
  ipcMain.handle('lyrics:setEnabled', (_, v:boolean) => lyricsProvider.setEnabled(v));

  // ── Auto-update ─────────────────────────────
  ipcMain.handle('auto:checkForUpdates', async () => {
    try {
      const r: any = await autoUpdater.checkForUpdates();
      const info: any = r?.updateInfo || {};
      return { status: 'checked', version: info.version || null, releaseNotes: info.releaseNotes || null };
    } catch (err: any) {
      return { status: 'error', error: err?.message || String(err) };
    }
  });

  ipcMain.handle('auto:getUpdateStatus', () => {
    return {
      version: app.getVersion(),
      releaseNotes: null,
      releaseDate: null,
      forced: false
    };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.exit(0);
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  // Protokol kaydı ready içinde (Windows'ta ready öncesi kayıt tutarsız olur)
  try {
    if (!app.isDefaultProtocolClient('aquality-music')) app.setAsDefaultProtocolClient('aquality-music');
  } catch {}
  storeManager = new StoreManager();
  googleAuth = new GoogleOAuth();
  musicAuth = new MusicAuth();
  streamResolver = new StreamResolver();
  youtubeAPI = new YouTubeAPI();
  discordRPC = new DiscordRPC();
  discordOAuth = new DiscordOAuth();

  // Load Google auth token if available
  if (googleAuth.isGoogleAuthenticated()) {
    const token = googleAuth.getGoogleAccessToken();
    if (token) youtubeAPI.setAccessToken(token);
  }

  await discordRPC.connect();

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('error', (err: any) => { console.warn('[Auto] Update check skipped:', err?.message||err); });
  // GitHub'da release yokken hata popup'ı gösterme
  if (process.env.GH_TOKEN || require('fs').existsSync(require('path').join(__dirname,'../release'))) {
    autoUpdater.checkForUpdatesAndNotify().catch(()=>{});
  } else {
    console.log('[Auto] Update check disabled - no releases');
  }

  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try { streamResolver?.destroy(); } catch {}
  try { discordRPC?.disconnect(); } catch {}
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try { streamResolver?.destroy(); } catch {}
  try { discordRPC?.disconnect(); } catch {}
  for (const win of BrowserWindow.getAllWindows()) {
    try { win.destroy(); } catch {}
  }
});

app.on('second-instance', (_e, argv) => {
  const deeplink = argv.find(a => a.startsWith('aquality-music://'));
  if (deeplink && mainWindow) mainWindow.webContents.send('auth:deeplink', deeplink);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
app.on('open-url', (_e, url) => {
  if (mainWindow) mainWindow.webContents.send('auth:deeplink', url);
});
