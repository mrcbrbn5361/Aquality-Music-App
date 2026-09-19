import { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { YouTubeAPI } from './api/innertube';
import { StoreManager, StoreData } from './utils/store';

/**
 * Renderer'dan gelen store yazmalarını tip ve aralık doğrulamasından geçirir.
 * Bozuk/şişirilmiş değerlerin kalıcı depolamayı bozması engellenir.
 */
function isValidStoreValue(key: string, value: unknown): boolean {
  switch (key) {
    case 'theme':
      return value === 'dark' || value === 'light' || value === 'system';
    case 'language':
      return value === 'tr' || value === 'en' || value === undefined;
    case 'quality':
      return value === 'low' || value === 'medium' || value === 'high';
    case 'repeat':
      return value === 'off' || value === 'all' || value === 'one';
    case 'volume':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
    case 'queueIndex':
      return typeof value === 'number' && Number.isInteger(value) && value >= -1 && value <= 10000;
    case 'shuffle':
    case 'autoPlay':
    case 'discordEnabled':
    case 'discordButtons':
    case 'discordThumbnails':
      return typeof value === 'boolean';
    case 'queue':
    case 'recentlyPlayed':
      return Array.isArray(value) && value.length <= 1000;
    case 'likedSongs':
      return Array.isArray(value) && value.length <= 10000;
    case 'playlists':
      return Array.isArray(value) && value.length <= 500;
    case 'discordBotToken':
      return typeof value === 'string' && value.length <= 200;
    default:
      return false;
  }
}
import { DiscordRPC } from './utils/discord';
import { DiscordOAuth } from './auth/discord-oauth';
import { GoogleOAuth } from './auth/google-oauth';
import { MusicAuth, CHROME_UA } from './auth/music-auth';
import { StreamResolver } from './api/stream-resolver';
import { authProvider } from './providers/auth-provider';
import { volumeRatioProvider } from './providers/volume-ratio';
import { lyricsProvider } from './providers/lyrics-provider';
import { autoUpdater } from 'electron-updater';
import { BotServer } from './api/bot-server';

// Google oturum açma sayfasının 'Bu tarayıcı veya uygulama güvenli olmayabilir' hatası vermemesi için
// Chromium otomasyon bayraklarını ve webdriver tespitini devre dışı bırak
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
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
let botServer: BotServer;

// Discord Bot Çalıştırıcı (scripts/discord-bot) State
let discordBotProcess: child_process.ChildProcess | null = null;
let discordBotLogs: string[] = [];
let discordBotStatus: 'stopped' | 'running' | 'starting' | 'error' = 'stopped';
let discordBotError: string | null = null;
// Bot log tamponu üst sınırı — stdout fırtınalarında bellek şişmesini önler
const MAX_BOT_LOGS = 60;

function pushBotLog(line: string): void {
  discordBotLogs.push(line);
  while (discordBotLogs.length > MAX_BOT_LOGS) discordBotLogs.shift();
  mainWindow?.webContents.send('bot-server:log', line);
}

function findBotDir(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'discord-bot'),
    path.resolve(__dirname, '../../../scripts/discord-bot'),
    path.resolve(__dirname, '../../../../scripts/discord-bot'),
    path.resolve(process.cwd(), 'scripts/discord-bot'),
    path.resolve(process.cwd(), '../scripts/discord-bot'),
    path.resolve(app.getAppPath(), '../scripts/discord-bot'),
    path.resolve(app.getAppPath(), '../../scripts/discord-bot'),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.js'))) {
        return dir;
      }
    } catch (e) {
      // Directory check failed, continue
    }
  }
  return null;
}

const isDev = !app.isPackaged;

function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(String(url));
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return true;
    if (u.protocol !== 'https:') return false;
    const allowed = ['music.youtube.com', 'youtube.com', 'www.youtube.com', 'github.com', 'accounts.google.com', 'discord.gg', 'discord.com', 'ytimg.com', 'vercel.app'];
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
    backgroundMaterial: 'mica',
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
    cleanupResources();
    if (process.platform !== 'darwin') app.quit();
  });

  mainWindow.on('close', () => {
    // Pencere konumunu kaydet (sonraki açılışta geri yüklenir)
    try {
      if (mainWindow && !mainWindow.isMaximized()) {
        const b = mainWindow.getBounds();
        storeManager?.saveWindowBounds(b);
      }
    } catch (e) {
      console.warn('[Main] Pencere konumu kaydedilemedi:', e);
    }
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
              message: `Aquality Music v${app.getVersion()}`,
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

  // Bot REST API (Port 9863) & Discord Bot Runner IPC
  // NOT: update-state BotServer.sanitizeStateUpdate ile şema doğrulamalıdır —
  // renderer'dan gelen keyfi alanlar sessizce atılır.
  ipcMain.handle('bot-server:get-state', () => botServer?.getState());
  ipcMain.handle('bot-server:update-state', (_, partial: unknown) => {
    botServer?.updateState(partial);
    return botServer?.getState();
  });
  ipcMain.handle('bot-server:is-running', () => botServer?.isRunning());

  ipcMain.handle('bot-server:open-bot-folder', async () => {
    const botDir = findBotDir();
    if (botDir && fs.existsSync(botDir)) {
      shell.openPath(botDir);
      return { success: true, path: botDir };
    }
    return { success: false, error: 'Bot klasörü bulunamadı.' };
  });

  ipcMain.handle('bot-server:get-bot-status', () => {
    return {
      status: discordBotStatus,
      isRunning: !!discordBotProcess && !discordBotProcess.killed,
      error: discordBotError,
      logs: discordBotLogs
    };
  });

  ipcMain.handle('bot-server:stop-bot', async () => {
    if (discordBotProcess) {
      try {
        discordBotProcess.kill();
        discordBotProcess = null;
        discordBotStatus = 'stopped';
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
      }
    }
    discordBotStatus = 'stopped';
    return { success: true };
  });

  ipcMain.handle('bot-server:start-bot', async (_, customToken?: string) => {
    if (discordBotProcess && !discordBotProcess.killed) {
      return { success: true, message: 'Bot zaten çalışıyor.' };
    }

    const botDir = findBotDir();
    if (!botDir) {
      discordBotStatus = 'error';
      discordBotError = 'Bot script dosyaları (scripts/discord-bot) bulunamadı.';
      return { success: false, error: discordBotError };
    }

    const scriptPath = path.join(botDir, 'index.js');
    if (!fs.existsSync(scriptPath)) {
      discordBotStatus = 'error';
      discordBotError = 'index.js bulunamadı.';
      return { success: false, error: discordBotError };
    }

    let token = (customToken || '').trim();
    if (!token && storeManager) {
      try {
        const stored = storeManager.getSecret('discordBotToken');
        if (stored) token = stored.trim();
      } catch (e) {
        console.warn('[Main] Kayıtlı bot token okunamadı:', e);
      }
    }
    if (!token && process.env.DISCORD_TOKEN) {
      token = process.env.DISCORD_TOKEN.trim();
    }

    // Enjeksiyon koruması: gerçek token'lar en az 20 karakterdir ve
    // boşluk/kontrol karakteri içermez.
    if (!token || token.length < 20 || /[\s\x00-\x1f]/.test(token)) {
      discordBotStatus = 'error';
      discordBotError = 'Discord Bot Token girilmedi veya geçersiz. Lütfen Ayarlar > Discord Bot bölümünden token girin.';
      return { success: false, error: discordBotError };
    }

    try {
      discordBotStatus = 'starting';
      discordBotError = null;
      discordBotLogs = [`[${new Date().toLocaleTimeString()}] Bot başlatılıyor...`];

      let cmd = 'node';
      const extraEnv: Record<string, string> = {};
      try {
        child_process.execSync('node -v', { stdio: 'ignore' });
        cmd = 'node';
      } catch {
        cmd = process.execPath;
        extraEnv['ELECTRON_RUN_AS_NODE'] = '1';
      }

      const env = {
        ...process.env,
        DISCORD_TOKEN: token,
        BOT_SERVER_TOKEN: botServer.getApiToken(),
        ...extraEnv
      };

      discordBotProcess = child_process.spawn(cmd, [scriptPath], {
        cwd: botDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      discordBotStatus = 'running';

      discordBotProcess.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
          pushBotLog(line);
        }
      });

      discordBotProcess.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
          pushBotLog(`[Hata] ${line}`);
        }
      });

      discordBotProcess.on('exit', (code, signal) => {
        discordBotStatus = 'stopped';
        const msg = `[${new Date().toLocaleTimeString()}] Bot durdu (Kod: ${code ?? 'yok'}, Sinyal: ${signal ?? 'yok'})`;
        discordBotLogs.push(msg);
        mainWindow?.webContents.send('bot-server:status-changed', { status: 'stopped', code });
        discordBotProcess = null;
      });

      discordBotProcess.on('error', (err) => {
        discordBotStatus = 'error';
        discordBotError = err.message;
        const msg = `[${new Date().toLocaleTimeString()}] Bot hatası: ${err.message}`;
        discordBotLogs.push(msg);
        mainWindow?.webContents.send('bot-server:status-changed', { status: 'error', error: err.message });
        discordBotProcess = null;
      });

      return { success: true };
    } catch (err: any) {
      discordBotStatus = 'error';
      discordBotError = err?.message || String(err);
      return { success: false, error: discordBotError };
    }
  });

  // YouTube API
  const SEARCH_FILTERS = new Set(['all', 'songs', 'videos', 'albums', 'artists', 'playlists']);
  ipcMain.handle('yt:search', async (_, query: string, filter?: string) => {
    try {
      const safeQuery = typeof query === 'string' ? query.slice(0, 200) : '';
      const safeFilter = typeof filter === 'string' && SEARCH_FILTERS.has(filter) ? filter : 'all';
      if (!safeQuery.trim()) {
        return { songs: [], videos: [], albums: [], artists: [], playlists: [] };
      }
      const result = await youtubeAPI.search(safeQuery, safeFilter);
      if (isDev) {
        console.log('[Main] Search:', safeQuery, 'songs:', result.songs?.length || 0, 'videos:', result.videos?.length || 0, 'albums:', result.albums?.length || 0, 'artists:', result.artists?.length || 0);
      }
      return result;
    } catch (err) {
      console.error('[Main] Search error:', err);
      return { songs: [], videos: [], albums: [], artists: [], playlists: [] };
    }
  });
  ipcMain.handle('yt:player', async (_, videoId: string) => {
    // Girişli veya misafir modda gizli pencerede şarkıyı oynat
    const safeVideoId = typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
    if (!safeVideoId) {
      return { error: 'invalid_id', id: '' };
    }
    // Oynatmayı başlat (fire & forget — ana pencere state'i update event'iyle alır)
    streamResolver.play(safeVideoId).catch((err) => console.error('[Player] play error:', err));
    return { id: safeVideoId, playing: true };
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
      if (isDev) {
        console.log('[Main] Home items:', result.items?.length || 0);
      }
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
    try {
      if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return { items: [], currentIndex: 0 };
      }
      return await youtubeAPI.getNext(videoId, playlistId);
    } catch (e) {
      console.warn('[Main] Next error:', e);
      return { items: [], currentIndex: 0 };
    }
  });
  ipcMain.handle('yt:suggestions', async (_, input: string) => {
    try {
      const safeInput = typeof input === 'string' ? input.slice(0, 100) : '';
      if (!safeInput.trim()) return [];
      return await youtubeAPI.getSearchSuggestions(safeInput);
    } catch (e) {
      console.warn('[Main] Suggestions error:', e);
      return [];
    }
  });
  ipcMain.handle('yt:lyrics', async (_, videoId: string) => {
    try {
      if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
      return await lyricsProvider.fetch(videoId, youtubeAPI);
    } catch (e) {
      console.warn('[Main] Lyrics error:', e);
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

  // Store — renderer yalnızca kullanıcı ayarlarını okuyup yazabilir.
  // Gizli anahtarlar (OAuth token'ları, client secret'lar) bu kanaldan
  // ASLA geçmez; bot token'ı şifreli katman üzerinden taşınır.
  const STORE_READ_KEYS = new Set([
    'theme', 'language', 'volume', 'quality', 'autoPlay', 'recentlyPlayed',
    'likedSongs', 'queue', 'queueIndex', 'playlists', 'shuffle', 'repeat',
    'discordEnabled', 'discordButtons', 'discordThumbnails', 'discordBotToken'
  ]);
  const STORE_WRITE_KEYS = new Set([...STORE_READ_KEYS]);
  ipcMain.handle('store:get', (_, key: string) => {
    if (typeof key !== 'string' || !STORE_READ_KEYS.has(key)) return undefined;
    try {
      if (key === 'discordBotToken') return storeManager.getSecret('discordBotToken');
      return storeManager.get(key as keyof StoreData);
    } catch (e) {
      console.warn('[Main] store:get hatası:', key, e);
      return undefined;
    }
  });
  ipcMain.handle('store:set', (_, key: string, value: unknown) => {
    if (typeof key !== 'string' || !STORE_WRITE_KEYS.has(key)) return;
    try {
      if (!isValidStoreValue(key, value)) {
        console.warn('[Main] store:set geçersiz değer reddedildi:', key);
        return;
      }
      if (key === 'discordBotToken') {
        storeManager.setSecret('discordBotToken', value as string);
        return;
      }
      storeManager.set(key as keyof StoreData, value as never);
    } catch (e) {
      console.warn('[Main] store:set hatası:', key, e);
    }
  });
  ipcMain.handle('shell:openExternal', (_, url: string) => {
    try {
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      } else {
        console.warn('[Main] Güvensiz harici URL engellendi:', String(url).slice(0, 120));
      }
    } catch (e) {
      console.warn('[Main] Harici URL açılamadı:', e);
    }
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
  ipcMain.handle('auth:openSystemBrowserLogin', async () => {
    return await musicAuth.openSystemBrowserLogin();
  });
  ipcMain.handle('auth:importFromChrome', async () => {
    let result = await musicAuth.importFromChrome();
    if (!result.success) {
      const target = await musicAuth.findYouTubeMusicTarget().catch((e) => {
        console.warn('[Main] YouTube Music hedefi bulunamadı:', e);
        return null;
      });
      if (target) {
        const ext = await musicAuth.importFromExternalChrome(target.id).catch((e) => {
          console.warn('[Main] Harici Chrome aktarımı başarısız:', e);
          return null;
        });
        if (ext && ext.success) result = ext as typeof result;
      }
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
            provider: 'youtube-music',
            handle: existing?.handle
          });
        }
      } catch (e) {
        console.warn('[Main] Chrome aktarımı sonrası profil alınamadı:', e);
      }
      return { success: true, cookies: result.cookies, user: musicAuth.getUser() };
    }
    return result;
  });
  ipcMain.handle('auth:importFromCookieString', async (_, cookieString: string) => {
    return await musicAuth.importFromCookieString(cookieString);
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
    try { await discordRPC.connect(); } catch (e) { console.warn('[Main] Discord bağlanma hatası:', e); }
    return discordRPC.isReady();
  }
  ipcMain.handle('discord:getAppId', () => discordRPC.getAppId());
  ipcMain.handle('discord:isReady', () => discordRPC.isReady());
  ipcMain.handle('discord:reconnect', async () => {
    lastDiscordReconnectAt = Date.now();
    try { await discordRPC.connect(); } catch (e) { console.warn('[Main] Discord yeniden bağlanma hatası:', e); }
    return discordRPC.isReady();
  });
  ipcMain.handle('discord:setActivity', async (_, data: unknown) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const activity = data as Record<string, unknown>;
    const enabled = storeManager.get('discordEnabled');
    if (enabled === false) return;
    const showButtons = storeManager.get('discordButtons');
    const showThumbs = storeManager.get('discordThumbnails');
    if (showButtons === false) delete activity.buttons;
    if (showThumbs === false) { delete activity.coverUrl; delete activity.largeImageText; }
    if (await ensureDiscordConnected()) {
      await discordRPC.setActivity(activity as Parameters<DiscordRPC['setActivity']>[0]);
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
  app.userAgentFallback = CHROME_UA;
  // Protokol kaydı ready içinde (Windows'ta ready öncesi kayıt tutarsız olur)
  try {
    if (!app.isDefaultProtocolClient('aquality-music')) app.setAsDefaultProtocolClient('aquality-music');
  } catch (e) {
    // Protocol registration failed
  }
  storeManager = new StoreManager();
  googleAuth = new GoogleOAuth();
  musicAuth = new MusicAuth();
  streamResolver = new StreamResolver();
  youtubeAPI = new YouTubeAPI();
  discordRPC = new DiscordRPC();
  discordOAuth = new DiscordOAuth();
  botServer = new BotServer(9863);
  botServer.start();

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
  if (process.env.GH_TOKEN || fs.existsSync(path.join(__dirname, '../release'))) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => {
      console.warn('[Auto] Update check failed:', e);
    });
  } else if (isDev) {
    console.log('[Auto] Update check disabled - no releases');
  }

  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * Tüm kaynakları tek noktadan ve tekrar-güvenli (idempotent) şekilde temizler.
 * 'closed', 'window-all-closed' ve 'before-quit' olaylarının her biri farklı
 * platform akışlarında tetiklenebilir — çift temizlik korumalıdır.
 */
let resourcesCleanedUp = false;
function cleanupResources(): void {
  if (resourcesCleanedUp) return;
  resourcesCleanedUp = true;
  // Bekleyen debounce yazmalarını diske yaz (kapanışta veri kaybı olmasın)
  try { storeManager?.flush(); } catch (e) { console.warn('[Main] Store flush hatası:', e); }
  try { streamResolver?.destroy(); } catch (e) { console.warn('[Main] StreamResolver destroy hatası:', e); }
  try { discordRPC?.disconnect(); } catch (e) { console.warn('[Main] Discord disconnect hatası:', e); }
  try {
    const result = botServer?.stop();
    if (result && typeof result.catch === 'function') {
      result.catch((e: unknown) => console.warn('[Main] BotServer stop hatası:', e));
    }
  } catch (e) { console.warn('[Main] BotServer stop hatası:', e); }
  if (discordBotProcess) {
    try { discordBotProcess.kill(); } catch (e) { console.warn('[Main] Bot process kill hatası:', e); }
    discordBotProcess = null;
  }
}

app.on('window-all-closed', () => {
  cleanupResources();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  cleanupResources();
  for (const win of BrowserWindow.getAllWindows()) {
    try { win.destroy(); } catch (e) { console.warn('[Main] Pencere destroy hatası:', e); }
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
