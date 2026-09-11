import { BrowserWindow, session } from 'electron';
import { MUSIC_PARTITION, CHROME_UA } from '../auth/music-auth';

// ── Gizli oynatıcı (artık tüm playback buradan) ─
// YouTube Music watch sayfasını gizli bir pencerede açarız.
// Ana renderer'ın <audio> elementi yok — sadece metadata + kontrol IPC'si.
// Reklamlar: ağ seviyesinde bloklanır, kaçan olursa sessize alınıp anında geçilir.

const WATCH_URL = 'https://music.youtube.com/watch?v=';
const POLL_MS = 800;

// Reklam/takipçi domainleri — ağ seviyesinde iptal edilir (oynatma/API etkilenmez)
const AD_BLOCK_PATTERNS = [
  '*://*.doubleclick.net/*',
  '*://*.googleadservices.com/*',
  '*://*.googlesyndication.com/*',
  '*://*.googletagservices.com/*',
  '*://*.2mdn.net/*',
  '*://*.moatads.com/*',
  '*://adservice.google.*/*',
  '*://*.youtube-nocookie.com/*',
  '*://*.youtube.com/pagead/*',
  '*://music.youtube.com/pagead/*',
  '*://*.youtube.com/api/stats/ads*',
  '*://*.youtube.com/api/stats/qoe*adformat*',
  '*://*.youtube.com/api/stats/atr*',
  '*://*.youtube.com/get_midroll_info*',
  '*://*.youtube.com/ptracking*',
  '*://static.doubleclick.net/*',
  '*://pagead2.googlesyndication.com/*',
  '*://ad.doubleclick.net/*',
  '*://*.google.com/pagead/*',
  '*://*.youtube.com/youtubei/v1/att/get*'
];

// Gizli pencerede reklam overlay'lerini ve promosyon pencerelerini gizle
const ADHIDE_CSS = `
  .ytp-ad-player-overlay,
  .ytp-ad-text,
  .ytp-ad-skip-button-container,
  .ytp-ad-message-container,
  .ytp-ad-image-overlay,
  #player-ads,
  .ytp-ad-module,
  .ytp-ad-overlay-container,
  ytmusic-mealbar-promo-renderer,
  ytmusic-upsell-dialog-renderer,
  .mealbar-promo-renderer,
  ytmusic-statement-banner-renderer {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

// YouTube Music AdBlocker: /youtubei/v1/player JSON cevabındaki adPlacements'i silerek reklamsız müzik sağlar
const ADBLOCK_INJECTION_JS = `(() => {
  try {
    if (window.__aquality_adblock_active) return;
    window.__aquality_adblock_active = true;

    const cleanPlayerResponse = (data) => {
      if (!data || typeof data !== 'object') return;
      try {
        if (data.adPlacements) delete data.adPlacements;
        if (data.playerAds) delete data.playerAds;
        if (data.adSlots) delete data.adSlots;
      } catch {}
    };

    if (window.ytInitialPlayerResponse) {
      cleanPlayerResponse(window.ytInitialPlayerResponse);
    }
    let _origInit = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() { return _origInit; },
      set(v) { cleanPlayerResponse(v); _origInit = v; },
      configurable: true
    });

    // Fetch API üzerinden gelen reklam verilerini filtrele
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
          const clone = response.clone();
          const json = await clone.json();
          cleanPlayerResponse(json);
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch {}
      return response;
    };

    // Reklam butonlarını ve reklam video süresini anında geçme nöbetçisi
    setInterval(() => {
      try {
        const mp = document.getElementById('movie_player');
        if (mp && typeof mp.skipAd === 'function') {
          try { mp.skipAd(); } catch {}
        }
        const sel = [
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          '.ytp-skip-ad-button',
          '.ytp-ad-skip-button-slot button',
          'button.ytp-ad-skip-button'
        ];
        for (const s of sel) {
          for (const b of document.querySelectorAll(s)) {
            try { b.click(); } catch {}
          }
        }
        const isAd = (mp && typeof mp.getAdState === 'function' && mp.getAdState() === 1)
          || (mp && mp.classList && (mp.classList.contains('ad-showing') || mp.classList.contains('ad-interrupting')));
        if (isAd) {
          const v = document.querySelector('video');
          if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
            v.muted = true;
            v.currentTime = v.duration;
          }
        }
      } catch {}
    }, 250);
  } catch (e) {}
})();`;

interface PlaybackUpdate {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  isAd: boolean;
  src: string;
  // YT player durumu: -1 başlamadı, 0 bitti, 1 oynuyor, 2 duraklatıldı, 3 tamponlanıyor
  playerState?: number;
}

type UpdateListener = (u: PlaybackUpdate) => void;

// Shadow DOM derin araması + video element bulma + metadata.
// ÖNCE YouTube'un resmi movie_player API'si denenir (en güvenilir yol),
// bulunamazsa Shadow DOM içindeki <video> elementine düşülür.
const RESOLVE_MEDIA_JS = `(() => {
  try {
    const findPlayer = () => {
      if (window.__hmp && window.__hmp.isConnected) return window.__hmp;
      let mp = null;
      try { mp = document.getElementById('movie_player'); } catch {}
      if (!mp) {
        try { mp = document.querySelector('ytmusic-player-bar')?.querySelector('#movie_player') || document.querySelector('ytmusic-player #movie_player'); } catch {}
      }
      if (!mp) {
        const walk = (root, depth = 0) => {
          if (depth > 4) return null;
          try { const m = root.getElementById('movie_player'); if (m) return m; } catch {}
          for (const el of root.children || []) {
            if (el.shadowRoot) { const r = walk(el.shadowRoot, depth + 1); if (r) return r; }
          }
          return null;
        };
        mp = walk(document);
      }
      if (mp) window.__hmp = mp;
      return mp;
    };
    const mp = findPlayer();
    const hasApi = !!(mp && typeof mp.getPlayerState === 'function');

    // --- 1) movie_player API yolu (tercih edilen) ---
    if (hasApi) {
      let isAd = false;
      try { if (typeof mp.getAdState === 'function' && mp.getAdState() === 1) isAd = true; } catch {}
      if (!isAd && mp.classList && mp.classList.contains('ad-showing')) isAd = true;
      let vd = null;
      try { vd = mp.getVideoData ? mp.getVideoData() : null; } catch {}
      let cur = 0, dur = 0, pstate = -1;
      try { cur = mp.getCurrentTime ? mp.getCurrentTime() : 0; } catch {}
      try { dur = mp.getDuration ? mp.getDuration() : 0; } catch {}
      try { pstate = mp.getPlayerState ? mp.getPlayerState() : -1; } catch {}
      let src = '';
      try {
        const el = mp.querySelector('video') || mp.querySelector('audio');
        if (el) src = el.currentSrc || el.src || '';
      } catch {}

      // Video ID: URL birincil kaynak (autoplay geçişlerinde getVideoData eski ID döndürebilir)
      let urlVid = '';
      try { urlVid = new URLSearchParams(window.location.search).get('v') || ''; } catch {}
      const apiVid = (vd && vd.video_id) || '';
      const vid = urlVid || apiVid;

      // Başlık ve sanatçı: çok katmanlı fallback
      // 1. getVideoData() (ama stale olabilir — apiVid ile urlVid eşleşiyorsa güvenilir)
      let title = '';
      let artist = '';
      const apiDataFresh = !urlVid || !apiVid || urlVid === apiVid;
      if (apiDataFresh && vd) {
        title = vd.title || '';
        artist = vd.author || '';
      }

      // 2. document.title parse (YT Music her zaman güncel tutar)
      if (!title) {
        try {
          const dt = (document.title || '').trim();
          // Format: "Şarkı Adı - Sanatçı - YouTube Music" veya "Şarkı • Sanatçı • Albüm - YouTube Music"
          let cleaned = dt.replace(/\\s*[|\\-–]\\s*YouTube Music\\s*$/i, '').trim();
          if (cleaned && cleaned !== 'YouTube Music') {
            const dashIdx = cleaned.indexOf(' - ');
            if (dashIdx > 0 && dashIdx < cleaned.length - 3) {
              // "Sanatçı - Şarkı" veya "Şarkı - Sanatçı" formatı
              // YouTube Music genellikle: "Şarkı - Sanatçı"
              const beforeDash = cleaned.substring(0, dashIdx).trim();
              const afterDash = cleaned.substring(dashIdx + 3).trim();
              // Sondaki kanal/albüm/izlenme bilgisini temizle
              const afterParts = afterDash.split(/\\s*[|,•·]\\s*/);
              title = beforeDash;
              if (!artist) artist = afterParts[0] || '';
            } else {
              const parts = cleaned.split(/\\s*[•·]\\s*/).filter(Boolean);
              if (parts.length >= 2) {
                title = parts[0];
                if (!artist) artist = parts[1];
              } else {
                title = cleaned;
              }
            }
          }
        } catch {}
      }

      // 3. ytmusic-player-bar DOM (en son başvuru)
      if (!title || !artist) {
        try {
          const pb = document.querySelector('ytmusic-player-bar');
          if (pb) {
            const tEl = pb.querySelector('.title, .byline + .title');
            const bEl = pb.querySelector('.byline');
            if (!title && tEl) title = (tEl.textContent || '').trim();
            if (!artist && bEl) {
              const t = (bEl.textContent || '').trim();
              const parts = t.split(/[•·]/).map((s) => s.trim());
              artist = parts[0] || t;
            }
          }
        } catch {}
      }

      return {
        ok: true, via: 'api',
        currentTime: cur || 0,
        duration: dur || 0,
        paused: pstate !== 1,
        playerState: pstate,
        isAd,
        src,
        title,
        artist,
        thumbnail: vid ? ('https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg') : '',
        videoId: vid
      };
    }

    // --- 2) Yedek: Shadow DOM <video> taraması ---
    const getMedia = () => {
      if (window.__hmedia && window.__hmedia.isConnected) return window.__hmedia;
      let el = mp ? (mp.querySelector('video') || mp.querySelector('audio')) : null;
      if (!el) {
        const walkM = (root) => {
          for (const tag of ['video', 'audio']) {
            const list = root.querySelectorAll(tag);
            if (list.length) return list[0];
          }
          for (const e of root.querySelectorAll('*')) {
            if (e.shadowRoot) { const r = walkM(e.shadowRoot); if (r) return r; }
          }
          return null;
        };
        el = walkM(document);
      }
      if (el) window.__hmedia = el;
      return el;
    };
    const el = getMedia();
    if (!el) return { ok: false };
    let isAd = false;
    if (mp && mp.classList && mp.classList.contains('ad-showing')) isAd = true;

    // Metadata: önce ytmusic-player-bar dene, sonra document.title parse
    let title = '', artist = '', thumbnail = '';
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar) {
      const tEl = playerBar.querySelector('.title, .byline + .title');
      const bEl = playerBar.querySelector('.byline');
      const imgEl = playerBar.querySelector('img.thumb, .thumbnail img, img');
      if (tEl) title = (tEl.textContent || '').trim();
      if (bEl) {
        const t = (bEl.textContent || '').trim();
        const parts = t.split(/[•·]/).map((s) => s.trim());
        artist = parts[0] || t;
      }
      if (imgEl) thumbnail = imgEl.currentSrc || imgEl.src || '';
    }
    // Yedek: document.title'dan parse et ("Şarkı - Sanatçı | YouTube Music" veya "Şarkı | Sanatçı, Kanal, 100 Mn kez dinlendi - YouTube Music")
    if (!title || !artist) {
      const docTitle = (document.title || '').trim();
      // Sondaki " - YouTube Music" veya " | YouTube Music" kaldır
      let cleaned = docTitle.replace(/\s*[|\-–]\s*YouTube Music\s*$/i, '').trim();
      // Sık formatlar:
      //   "Şarkı Adı • Sanatçı • Albüm"
      //   "Şarkı Adı | Sanatçı, Kanal, 100 Mn kez dinlendi"
      //   "Sanatçı - Şarkı"
      let parts = cleaned.split(/\s*[|•]\s*/).map((s) => s.trim()).filter(Boolean);
      // Sondaki "X Mn/B kez dinlendi" veya "X views" gibi metadata'ları at
      parts = parts.filter((p) => !/kez dinlen|views|görüntüleme|izlenme|abone|subscribe/i.test(p));
      if (parts.length >= 2) {
        // Eğer ilk parça kısa (< 30) ve "single word" ise muhtemelen sanatçı
        // Genelde YT Music'te format: "Sanatçı - Şarkı"
        const dashIdx = cleaned.indexOf(' - ');
        if (dashIdx > 0) {
          artist = cleaned.substring(0, dashIdx).trim();
          title = cleaned.substring(dashIdx + 3).trim();
          // title'da kanal/izlenme varsa ayır
          const titleParts = title.split(/\s*[|,]\s*/);
          title = titleParts[0].trim();
        } else {
          title = parts[0];
          artist = parts[1];
        }
      } else if (parts.length === 1) {
        title = parts[0];
      }
    }
    if (!thumbnail && el.poster) thumbnail = el.poster;
    if (!thumbnail) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.content) thumbnail = ogImg.content;
    }

    let fallbackVid = '';
    try {
      const u = new URL(location.href);
      fallbackVid = u.searchParams.get('v') || '';
    } catch {}

    let isVideo = false;
    try {
      const toggle = document.querySelector('#song-video-toggle');
      if (toggle) {
        const activeBtn = toggle.querySelector('[aria-selected="true"], .selected, [active]');
        if (activeBtn && /video/i.test(activeBtn.textContent || activeBtn.getAttribute('aria-label') || '')) {
          isVideo = true;
        }
      }
      const playerPage = document.querySelector('ytmusic-player-page, #player-page, ytmusic-player');
      if (playerPage && (playerPage.hasAttribute('video-mode_') || playerPage.classList.contains('video-mode'))) {
        isVideo = true;
      }
      if (el.videoWidth > 0 && el.videoHeight > 0 && Math.abs(el.videoWidth - el.videoHeight) > 40) {
        isVideo = true;
      }
    } catch {}

    return {
      ok: true,
      currentTime: el.currentTime || 0,
      duration: el.duration || 0,
      paused: el.paused,
      isAd,
      src: el.currentSrc || el.src || '',
      title,
      artist,
      thumbnail,
      videoId: fallbackVid,
      isVideo
    };
  } catch (e) { return { ok: false, err: String(e) }; }
})()`;

export class StreamResolver {
  private win: BrowserWindow | null = null;
  private queue: Promise<void> = Promise.resolve();
  private currentVideoId = '';
  private pollTimer: any = null;
  private listeners: Set<UpdateListener> = new Set();
  private volume = 0.5;
  private _loggedNoMedia = false;
  // YT Music bazen otomatik resume ediyor — kullanıcı isteğini hatırla
  private userWantsPaused = false;
  private _pauseEnforceInterval: any = null;
  // Reklam öncesi konum korunması
  private _adPosition = 0;
  private _wasAd = false;
  private _destroyed = false;
  private adCssHookedWindows = new WeakSet<BrowserWindow>();

  constructor() {
    this.installAdblock();
  }

  // Reklam domainlerini session seviyesinde engelle (login/gizli pencere dahil hepsi etkilenir)
  private adblockInstalled = false;
  private installAdblock(): void {
    if (this.adblockInstalled) return;
    this.adblockInstalled = true;
    try {
      const ses = session.fromPartition(MUSIC_PARTITION);
      ses.webRequest.onBeforeRequest({ urls: AD_BLOCK_PATTERNS }, (_details, cb) => cb({ cancel: true }));
      console.log('[Adblock] Reklam domain blokajı aktif');
    } catch (e: any) {
      console.error('[Adblock] Kurulum hatası:', e?.message || e);
    }
  }

  // Pencereyi oluştur veya var olanı döndür
  private ensureWindow(): BrowserWindow {
    if (this._destroyed) throw new Error('StreamResolver has been destroyed');
    if (this.win && !this.win.isDestroyed()) return this.win;
    this.win = new BrowserWindow({
      width: 800,
      height: 500,
      show: false,
      autoHideMenuBar: true,
      title: 'Aquality Music Player',
      webPreferences: {
        partition: MUSIC_PARTITION,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        autoplayPolicy: 'no-user-gesture-required'
      }
    });
    this.win.webContents.setAudioMuted(false);
    this.win.webContents.setUserAgent(CHROME_UA);
    this.win.webContents.on('before-input-event', (e) => e.preventDefault());
    // Reklam engelleme CSS ve Script enjeksiyonu (pencere başına bir kez hook)
    if (!this.adCssHookedWindows.has(this.win)) {
      this.adCssHookedWindows.add(this.win);
      this.win.webContents.on('did-start-navigation', () => {
        try { this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
      });
      this.win.webContents.on('dom-ready', () => {
        try { this.win?.webContents.insertCSS(ADHIDE_CSS).catch(() => {}); } catch {}
        try { this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
      });
    }
    // Yükleme bitince metadata çekmeyi dene
    this.win.webContents.on('did-finish-load', () => {
      try { this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
      setTimeout(() => this.pollOnce(), 500);
    });
    // İlk yükleme: ana sayfa
    if (!this.win.webContents.getURL() || this.win.webContents.getURL() === 'about:blank') {
      this.win.loadURL('https://music.youtube.com/').catch(() => {});
    }
    return this.win;
  }

  onUpdate(cb: UpdateListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(u: PlaybackUpdate) {
    // Reklam algılama: başlayınca sessize al + anında geç, bitince sesi geri aç
    if (u.isAd) {
      if (!this._wasAd) {
        this._wasAd = true;
        this._adPosition = u.currentTime || 0;
        this.onAdStart();
      }
    } else if (this._wasAd) {
      this._wasAd = false;
      this._adPosition = 0;
      this.onAdEnd();
    }
    for (const cb of this.listeners) {
      try { cb(u); } catch {}
    }
  }

  // Reklam başladı: kullanıcı hiçbir şey duymadan/görmeden geç
  // Reklam başladı: kullanıcı hiçbir şey duymadan sessize al ve güvenle atla
  private onAdStart(): void {
    try { this.win?.webContents.setAudioMuted(true); } catch {}
    this.skipAd().catch(() => {});
  }

  // Reklam bitti: sesi aç ve oynatma hızını kesin olarak 1x yap
  private onAdEnd(): void {
    try { this.win?.webContents.setAudioMuted(false); } catch {}
    this.execCmd('volume', String(this.volume)).catch(() => {});
    try {
      this.win?.webContents.executeJavaScript(
        `(() => {
          try {
            const v = document.querySelector('video');
            if (v) {
              v.playbackRate = 1;
              v.muted = false;
            }
            const mp = document.getElementById('movie_player');
            if (mp && typeof mp.setPlaybackRate === 'function') {
              mp.setPlaybackRate(1);
            }
          } catch {}
          return true;
        })()`,
        true
      ).catch(() => {});
    } catch {}
  }

  // Periyodik metadata çekme
  private stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private async pollOnce() {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    try {
      const st: any = await win.webContents.executeJavaScript(RESOLVE_MEDIA_JS, true);
      if (st && st.ok) {
        // Gerçek çalan id (autoplay/geçiş takibi için) — yoksa istenen id
        const actualId: string = st.videoId || this.currentVideoId;
        // Emit on paused/time/title/isAd/videoId/playerState change — metadata ve bitiş gecikmesin
        const lastEmitted = this.lastEmittedState;
        if (!lastEmitted || lastEmitted.paused !== st.paused || lastEmitted.currentTime !== st.currentTime || lastEmitted.title !== st.title || lastEmitted.isAd !== st.isAd || lastEmitted.duration !== st.duration || lastEmitted.videoId !== actualId || lastEmitted.playerState !== st.playerState) {
          this.lastEmittedState = { ...st, videoId: actualId };
          if (this.userWantsPaused && !st.paused) {
            try {
              await this.execCmd('pause');
              st.paused = true;
            } catch {}
          }
          this.emit({
            videoId: actualId,
            title: st.title || '',
            artist: st.artist || '',
            thumbnail: st.thumbnail || '',
            currentTime: st.currentTime || 0,
            duration: st.duration || 0,
            paused: !!st.paused,
            isAd: !!st.isAd,
            src: st.src || '',
            playerState: typeof st.playerState === 'number' ? st.playerState : undefined
          });
        }
      }
    } catch {}
  }

  private lastEmittedState: PlaybackUpdate | null = null;

  private startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_MS);
  }

  // Girişli session ile hesap profilini çek (ayarlar/kullanıcı kartı için).
  // account_menu API'si en güvenilir yol — DOM scraping yerine kullanılır.
  async fetchAccountProfile(): Promise<{ name: string; email: string; picture: string } | null> {
    const win = this.ensureWindow();
    try {
      // Session'dan cookie'leri al ve account_menu API'sine istek at
      const { session } = await import('electron');
      const ses = session.fromPartition('persist:aquality-music');
      const cookies = await ses.cookies.get({ url: 'https://music.youtube.com' });
      if (!cookies.length) {
        console.error('[Auth] profil: cookie yok');
        return null;
      }
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      const res = await fetch('https://music.youtube.com/youtubei/v1/account/account_menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'Origin': 'https://music.youtube.com',
          'Referer': 'https://music.youtube.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          context: { client: { hl: 'tr', gl: 'TR', clientName: 'WEB_REMIX', clientVersion: '1.20250801.00.00' } }
        })
      });
      if (!res.ok) {
        console.error('[Auth] profil API HTTP:', res.status);
        return null;
      }
      const data: any = await res.json();
      // account_menu response'unda hesap bilgileri traverse et
      const findAccount = (node: any): any => {
        if (!node || typeof node !== 'object') return null;
        if (Array.isArray(node)) {
          for (const el of node) { const f = findAccount(el); if (f) return f; }
          return null;
        }
        if (node.accountName && (node.accountPhoto || node.accountBylineText || node.accountEmail)) return node;
        for (const k of Object.keys(node)) { const f = findAccount(node[k]); if (f) return f; }
        return null;
      };
      const runsText = (t: any): string => {
        if (!t) return '';
        if (typeof t === 'string') return t;
        if (typeof t.simpleText === 'string') return t.simpleText;
        if (Array.isArray(t.runs)) return t.runs.map((r: any) => r?.text || '').join('');
        return '';
      };
      const item = findAccount(data);
      if (item) {
        const name = runsText(item.accountName);
        const picture = item.accountPhoto?.thumbnails?.slice(-1)?.[0]?.url || '';
        const email = runsText(item.accountBylineText) || runsText(item.accountEmail) || '';
        // "Guide" gibi geçersiz isimleri filtrele
        if (name && name !== 'Guide' && name.length > 1 && !/^guide|hamburger|menu$/i.test(name)) {
          console.log('[Auth] profil bulundu:', name || email);
          return { name, email, picture };
        }
        if (email) {
          console.log('[Auth] profil bulundu (email):', email);
          return { name: '', email, picture };
        }
      }
      // Yedek: ham regex
      const raw = JSON.stringify(data);
      const nm = raw.match(/"accountName":\s*\{\s*"simpleText":\s*"((?:[^"\\]|\\.)*)"/)
        || raw.match(/"accountName":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"((?:[^"\\]|\\.)*)"/);
      const name = nm ? nm[1] : '';
      const emailMatch = raw.match(/"accountEmail":\s*\{\s*"simpleText":\s*"((?:[^"\\]|\\.)*)"/);
      const email = emailMatch ? emailMatch[1] : '';
      if ((name && name !== 'Guide' && name.length > 1) || email) {
        console.log('[Auth] profil bulundu (regex):', name || email);
        return { name: (name === 'Guide') ? '' : name, email, picture: '' };
      }
      console.error('[Auth] profil bulunamadı');
      return null;
    } catch (e: any) {
      console.error('[Auth] profil hatası:', e?.message || e);
      return null;
    }
  }

  // Şarkıyı oynat — sıralı kuyruk + nesil iptali:
  // yeni play isteği gelirse eski doPlay erken durur (hızlı şarkı geçişlerinde
  // eski şarkının yüklenip çalmaya devam etmesi / kuyruk birikmesi önlenir)
  private playGen = 0;
  play(videoId: string): Promise<void> {
    const gen = ++this.playGen;
    this.queue = this.queue.then(() => {
      if (gen !== this.playGen) return;
      return this.doPlay(videoId, gen);
    }).catch((e) => {
      console.error('[Player] play kuyruk hatası:', e?.message || e);
    });
    return this.queue;
  }

  private async doPlay(videoId: string, gen: number): Promise<void> {
    if (!videoId) return;
    this.currentVideoId = videoId;
    this.userWantsPaused = false;
    if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
    let win: BrowserWindow;
    try {
      win = this.ensureWindow();
      // Yeni şarkı yüklenirken eski şarkıyı duraklat ve sesini kıs
      try {
        await win.webContents.executeJavaScript(`(() => {
          try {
            const mp = document.getElementById('movie_player');
            if (mp && typeof mp.pauseVideo === 'function') mp.pauseVideo();
            for (const v of document.querySelectorAll('video, audio')) { v.pause(); }
          } catch {}
        })()`, true).catch(() => {});
      } catch {}
    } catch {
      return;
    }
    let loaded = false;
    for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
      // Daha yeni bir play isteği varsa bu yüklemeyi bırak
      if (gen !== this.playGen || this.currentVideoId !== videoId) return;
      try {
        await win.loadURL(`${WATCH_URL}${encodeURIComponent(videoId)}`);
        loaded = true;
      } catch (err: any) {
        if (win.isDestroyed()) return;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (!loaded) return;
    try { await win.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
    // Ses seviyesini sayfa yüklenir yüklenmez YouTube Music'e uygula (Chromium'un %100 varsayılanını engelle)
    await this.execCmd('volume', String(this.volume)).catch(() => {});
    this.startPolling();
    // İlk birkaç saniye boyunca play tetikle (autoplay bazen bloklanır)
    // Ama video zaten oynuyorsa (state=1) hemen dur
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (win.isDestroyed()) return;
      // Araya daha yeni bir play girdiyse eski şarkıyı kurcalama (kuyruk çakışması)
      if (this.currentVideoId !== videoId || gen !== this.playGen) return;
      if (this.userWantsPaused) break;
      // Sesi her kontrolde tekrar garantiye al
      await this.execCmd('volume', String(this.volume)).catch(() => {});
      try {
        const alreadyPlaying = await win.webContents.executeJavaScript(
          `(() => {
            const walkMp = (root) => {
              try { const m = root.getElementById('movie_player'); if (m && typeof m.getPlayerState === 'function') return m; } catch {}
              for (const el of root.querySelectorAll('*')) {
                if (el.shadowRoot) { const r = walkMp(el.shadowRoot); if (r) return r; }
              }
              return null;
            };
            const mp = walkMp(document);
            if (mp && typeof mp.getPlayerState === 'function') {
              return mp.getPlayerState() === 1;
            }
            return false;
          })()`,
          true
        );
        if (alreadyPlaying) break; // video zaten oynuyor, autoplay gereksiz
        await win.webContents.executeJavaScript(
          `(() => {
            const walkMp = (root) => {
              try { const m = root.getElementById('movie_player'); if (m && typeof m.getPlayerState === 'function') return m; } catch {}
              for (const el of root.querySelectorAll('*')) {
                if (el.shadowRoot) { const r = walkMp(el.shadowRoot); if (r) return r; }
              }
              return null;
            };
            const mp = walkMp(document);
            if (mp) {
              const s = mp.getPlayerState();
              if (s !== 1 && typeof mp.playVideo === 'function') mp.playVideo();
            } else {
              const walkV = (root) => {
                for (const el of root.querySelectorAll('video, audio')) {
                  if (el.paused) el.play().catch(() => {});
                  return el;
                }
                for (const e of root.querySelectorAll('*')) {
                  if (e.shadowRoot) { const r = walkV(e.shadowRoot); if (r) return r; }
                }
                return null;
              };
              walkV(document);
            }
          })()`,
          true
        );
      } catch {}
    }
    await this.pollOnce();
  }

  // Kontroller
  async pause(): Promise<void> {
    this.userWantsPaused = true;
    await this.execCmd('pause');
    // Eski interval varsa temizle (çift çağrı hatasını önle)
    if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
    // Agresif pause: YT Music bazen otomatik resume eder — daha az sık kontrol et (1sn)
    this._pauseEnforceInterval = setInterval(async () => {
      if (!this.userWantsPaused) {
        if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
        return;
      }
      try {
        const win = this.win;
        if (!win || win.isDestroyed()) return;
        const st: any = await win.webContents.executeJavaScript(
          `(() => { const mp = document.getElementById('movie_player'); if (mp && typeof mp.getPlayerState === 'function') return { paused: mp.getPlayerState() !== 1 }; const v = document.querySelector('video'); return v ? { paused: v.paused } : null; })()`,
          true
        );
        if (st && !st.paused) {
          await this.execCmd('pause');
        }
      } catch {}
    }, 1000);
  }
  async resume(): Promise<void> {
    this.userWantsPaused = false;
    if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
    await this.execCmd('play');
  }
  async seek(seconds: number): Promise<void> {
    await this.execCmd('seek', String(seconds));
  }
  async setVolume(vol: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, vol));
    await this.execCmd('volume', String(this.volume));
  }

  private async execCmd(cmd: string, val: string = ''): Promise<boolean> {
    const win = this.win;
    if (!win || win.isDestroyed()) return false;
    const code = `(async () => {
      try {
        const findMp = () => {
          if (window.__hmp && window.__hmp.isConnected) return window.__hmp;
          let mp = null;
          try { mp = document.getElementById('movie_player'); } catch {}
          if (!mp) {
            const walk = (root) => {
              try { const m = root.getElementById('movie_player'); if (m) return m; } catch {}
              for (const el of root.querySelectorAll('*')) {
                if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
              }
              return null;
            };
            mp = walk(document);
          }
          if (mp) window.__hmp = mp;
          return mp;
        };
        const mp = findMp();
        const c = ${JSON.stringify(cmd)};
        const v = ${JSON.stringify(val)};

        // Volume helper: movie_player + tüm video/audio elementlerine uygula
        const applyVolume = (n) => {
          if (mp && typeof mp.setVolume === 'function') {
            mp.setVolume(n);
            if (n > 0 && typeof mp.unMute === 'function') try { mp.unMute(); } catch {}
            else if (n === 0 && typeof mp.mute === 'function') try { mp.mute(); } catch {}
          }
          const applyToAll = (root) => {
            for (const tag of ['video', 'audio']) {
              for (const e of root.querySelectorAll(tag)) {
                try {
                  e.volume = n / 100;
                  e.muted = (n === 0);
                } catch {}
              }
            }
            for (const el of root.querySelectorAll('*')) {
              if (el.shadowRoot) applyToAll(el.shadowRoot);
            }
          };
          applyToAll(document);
        };

        if (mp && typeof mp.getPlayerState === 'function') {
          try {
            if (c === 'play') { mp.playVideo(); }
            else if (c === 'pause') { mp.pauseVideo(); }
            else if (c === 'seek') { mp.seekTo(Number(v) || 0, true); }
            else if (c === 'volume') {
              const n = Math.max(0, Math.min(100, Math.round(Number(v) * 100)));
              applyVolume(n);
            }
            let st = -1;
            try { st = mp.getPlayerState(); } catch {}
            return { ok: true, via: 'api', playerState: st };
          } catch (e) { return { ok: false, why: 'api:' + String(e) }; }
        }

        // Yedek: Shadow DOM <video> elementi
        const findMedia = () => {
          if (window.__hmedia && window.__hmedia.isConnected) return window.__hmedia;
          const walk = (root) => {
            for (const tag of ['video', 'audio']) {
              const list = root.querySelectorAll(tag);
              if (list.length) { const m = list[0]; window.__hmedia = m; return m; }
            }
            for (const el of root.querySelectorAll('*')) {
              if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
            }
            return null;
          };
          return walk(document);
        };
        const el = findMedia();
        if (!el) return { ok: false, why: 'no-media' };
        if (c === 'play' && el.paused) { el.play().catch(() => {}); }
        else if (c === 'pause' && !el.paused) { el.pause(); }
        else if (c === 'seek') { try { el.currentTime = Number(v) || 0; } catch {} }
        else if (c === 'volume') {
          const n = Math.max(0, Math.min(1, Number(v)));
          el.volume = n;
          el.muted = (n === 0);
        }
        return { ok: true, via: 'el', paused: el.paused, volume: el.volume, muted: el.muted, currentTime: el.currentTime };
      } catch (e) { return { ok: false, why: String(e) }; }
    })()`;
    try {
      const r: any = await win.webContents.executeJavaScript(code, true);
      if (!r?.ok) console.error('[Player] execCmd', cmd, 'başarısız:', r?.why || 'unknown');
      return !!(r && r.ok);
    } catch {
      return false;
    }
  }

  // Kuyruktaki sonraki şarkıya geç (YT Music autoplay kullanır)
  async next(): Promise<void> {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    try {
      await win.webContents.executeJavaScript(
        `(() => { const b = document.querySelector('.next-button, ytmusic-player-bar [aria-label*="Next" i], ytmusic-player-bar [aria-label*="Sonraki" i]'); if (b) { b.click(); const e = new Event('click'); b.dispatchEvent(e); } })()`,
        true
      );
    } catch {}
  }

  // Reklamı atla — buton varsa tıkla, yalnızca reklam oynuyorsa sona sar (asıl şarkıya asla dokunma)
  async skipAd(): Promise<void> {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    try {
      await win.webContents.executeJavaScript(
        `(() => {
          try {
            const mp = document.getElementById('movie_player');
            // 1) movie_player resmi skipAd API
            if (mp && typeof mp.skipAd === 'function') {
              try { mp.skipAd(); return true; } catch {}
            }

            // 2) Shadow DOM derin buton tıklama
            const clickSkip = (root) => {
              const selectors = [
                '.ytp-ad-skip-button',
                '.ytp-ad-skip-button-modern',
                '.ytp-skip-ad-button',
                '.ytp-ad-skip-button-slot button',
                'button.ytp-ad-skip-button',
                '[class*="skip-button"]',
                '[aria-label*="Skip" i]',
                '[aria-label*="Geç" i]',
                '[aria-label*="Atla" i]'
              ];
              for (const s of selectors) {
                const list = root.querySelectorAll(s);
                for (const b of list) {
                  try {
                    b.click();
                    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    return true;
                  } catch {}
                }
              }
              for (const el of root.querySelectorAll('*')) {
                if (el.shadowRoot && clickSkip(el.shadowRoot)) return true;
              }
              return false;
            };
            if (clickSkip(document)) return true;

            // 3) KESİN KONTROL: Sadece reklam oynuyorsa süreyi sona sar
            const isAd = (mp && typeof mp.getAdState === 'function' && mp.getAdState() === 1)
              || (mp && mp.classList && (mp.classList.contains('ad-showing') || mp.classList.contains('ad-interrupting')))
              || !!document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');

            if (isAd) {
              const v = document.querySelector('video');
              if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
                v.muted = true;
                v.currentTime = v.duration;
                // Butonu tekrar dene
                setTimeout(() => clickSkip(document), 100);
                return true;
              }
            } else {
              // Reklam yoksa video hızını ve sesini normale döndür
              const v = document.querySelector('video');
              if (v) {
                if (v.playbackRate !== 1) v.playbackRate = 1;
                v.muted = false;
              }
            }
          } catch {}
          return false;
        })()`,
        true
      );
    } catch {}
  }

  async prev(): Promise<void> {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    try {
      await win.webContents.executeJavaScript(
        `(() => { const b = document.querySelector('.previous-button, ytmusic-player-bar [aria-label*="Previous" i], ytmusic-player-bar [aria-label*="Önceki" i]'); if (b) { b.click(); const e = new Event('click'); b.dispatchEvent(e); } })()`,
        true
      );
    } catch {}
  }

  destroy(): void {
    this._destroyed = true;
    this.stopPolling();
    this.listeners.clear();
    if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
    try { this.win?.destroy(); } catch {}
    this.win = null;
  }
}
