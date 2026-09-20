/* ============================================
   Aquality Music - Desktop Music Client
   Main Renderer Script
   ============================================ */

(() => {
  'use strict';

  // ── Types ──────────────────────────────────
  interface Song {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    thumbnail: string;
    duration: number;
    album?: string;
    durationText?: string;
    isVideo?: boolean;
  }

  interface QueueItem extends Song {}

  interface QueueContext {
    name: string;
    type: 'playlist' | 'album' | 'search' | 'home' | 'auto';
    songs: QueueItem[];
  }

  // ── State ──────────────────────────────────
  const state = {
    page: 'home',
    currentSong: null as QueueItem | null,
    queue: [] as QueueItem[],
    queueIndex: -1,
    userQueue: [] as QueueItem[],
    contextQueue: [] as QueueItem[],
    contextName: '',
    contextType: 'home' as 'playlist' | 'album' | 'search' | 'home' | 'auto',
    history: [] as QueueItem[],
    playing: false,
    shuffle: false,
    shuffleOrder: [] as number[],
    repeat: 'off' as 'off' | 'all' | 'one',
    volume: 50,
    lastVolume: 50,
    currentTime: 0,
    duration: 0,
    paused: false,
    lastPausedAt: 0,
    liked: new Set<string>(),
    recentlyPlayed: [] as Song[],
    panelOpen: null as 'lyrics' | 'queue' | null,
    lastSearchResults: [] as Song[],
    libraryTab: 'recent' as 'recent' | 'songs' | 'albums' | 'playlists',
    searchFilter: 'all' as 'all' | 'songs' | 'videos' | 'albums' | 'artists',
    navGeneration: 0,
    isLoggedIn: false,
    user: null as { id: string; name: string; email: string; picture: string } | null
  };

  // ── Global Song Cache (tıklanan şarkıların kaybolmaması için) ──
  const songCache = new Map<string, Song>();

  // ── API Bridge ─────────────────────────────
  interface ElectronAPIBridge {
    debugLog: (msg: string) => void;
    [namespace: string]: any;
  }
  const api = (window as unknown as { api?: ElectronAPIBridge }).api as ElectronAPIBridge;

  // Üretimde IPC log trafiği olmasın diye hata ayıklama bayrağı
  // (?debug=1 ile veya AQUALITY_DEBUG=1 localStorage anahtarıyla açılır)
  const DEBUG: boolean = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('debug')) return true;
      return window.localStorage.getItem('AQUALITY_DEBUG') === '1';
    } catch {
      return false;
    }
  })();

  // Logları ana sürece gönder (yalnızca hata ayıklama modunda — stdout'tan izlenebilir)
  function dlog(...args: any[]) {
    if (!DEBUG) return;
    const line = args.map((a) => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    console.log('[Aquality Music]', line);
    try { api.debugLog(line); } catch (e) {
      console.warn('[Aquality Music] debugLog IPC hatası:', e);
    }
  }

  async function ytSearch(query: string, filter?: string) {
    try { 
      const r = await api.youtube.search(query, filter || state.searchFilter || 'all');
      console.log('[Renderer] Search result:', JSON.stringify({ songs: r.songs?.length, videos: r.videos?.length, albums: r.albums?.length, artists: r.artists?.length }));
      return r;
    } catch (e) { 
      console.error('[Renderer] Search error:', e);
      return { songs: [], videos: [], albums: [], artists: [], playlists: [] }; 
    }
  }

  async function ytPlayer(videoId: string) {
    try {
      const r = await api.youtube.player(videoId);
      dlog('Player sonucu:', { streamUrl: !!r?.streamUrl, title: r?.title });
      return r;
    } catch (e) {
      dlog('Player HATASI:', String(e));
      return null;
    }
  }

  async function ytHome() {
    try { 
      const r = await api.youtube.home();
      console.log('[Renderer] Home result:', JSON.stringify({ items: r?.items?.length }));
      return r; 
    } catch (e) { 
      console.error('[Renderer] Home error:', e);
      return { items: [] }; 
    }
  }

  async function ytSuggestions(input: string) {
    try { return await api.youtube.suggestions(input); } catch { return []; }
  }

  async function ytLyrics(videoId: string) {
    try { return await api.youtube.lyrics(videoId); } catch { return null; }
  }

  // ── Helpers ────────────────────────────────
  const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
  const $$ = (sel: string) => document.querySelectorAll(sel);
  /** Null-dönüşlü sorgu — eksik elementte tüm init çökmesin diye. */
  const $opt = (sel: string): HTMLElement | null => document.querySelector(sel) as HTMLElement | null;
  /** Eksik elementi sessizce atlayan güvenli tıklama bağlayıcı. */
  function onClick(sel: string, fn: (e: MouseEvent) => void): boolean {
    const el = $opt(sel);
    if (!el) {
      dlog(`[init] Element bulunamadı, dinleyici atlandı: ${sel}`);
      return false;
    }
    el.addEventListener('click', fn as EventListener);
    return true;
  }

  function escapeHtml(str: string): string {
    if (typeof str !== 'string' || !str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** CSS url("...") bağlamı için kaçış — url() dışına çıkışı engeller. */
  function escapeCssUrl(url: string): string {
    if (typeof url !== 'string' || !url) return '';
    return url.replace(/["'()\\\n\r\t\f\v]/g, (ch) => `\\${ch}`);
  }

  function formatTime(sec: number, placeholder = ''): string {
    if (!sec || isNaN(sec) || sec <= 0) return placeholder;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function FisherYatesShuffle(arr: number[]): number[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rebuildMergedQueue(): QueueItem[] {
    return [...state.userQueue, ...state.contextQueue];
  }

  function renderCard(item: {
    browseId: string;
    title?: string;
    name?: string;
    thumbnail: string;
    artist?: string;
    subtitle?: string;
    type?: string;
  }): string {
    const title = item.title || item.name || '';
    const sub = item.artist || item.subtitle || '';
    return `
      <div class="card" data-browse="${escapeHtml(item.browseId)}" role="button" tabindex="0" aria-label="${escapeHtml(title)} aç">
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="this.style.background='var(--c-bg-3)'">
          <button class="card-play-btn" title="Oynat" data-browse="${escapeHtml(item.browseId)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 19,12 7,20"/></svg>
          </button>
        </div>
        <div class="card-title">${escapeHtml(title)}</div>
        ${sub ? `<div class="card-sub">${escapeHtml(sub)}</div>` : ''}
      </div>`;
  }

  function attachCardEvents(container: HTMLElement, backTarget: 'home' | 'library'): void {
    // Kartın gövdesine tıklama -> listeyi aç
    container.querySelectorAll('.card[data-browse]').forEach((card) => {
      const open = () => {
        const browseId = (card as HTMLElement).dataset.browse;
        if (browseId) openBrowseCard(container, browseId, backTarget);
      };
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.card-play-btn')) return;
        open();
      });
      // Klavye: Enter/Space ile aç
      (card as HTMLElement).addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
    // Yeşil Oynat butonuna tıklama -> doğrudan ilk şarkıyı çal
    container.querySelectorAll('.card-play-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const browseId = (btn as HTMLElement).dataset.browse;
        if (!browseId) return;
        try {
          showToast('İçerik başlatılıyor...', 'info');
          const browseData = await api.youtube.browse(browseId);
          const songs = (browseData.items || []).filter((i: any) => i.id) as Song[];
          if (songs.length) {
            setContext(songs, browseData.title || 'Çalma Listesi', 'playlist');
            playSong(songs[0]);
          } else {
            openBrowseCard(container, browseId, backTarget);
          }
        } catch {
          openBrowseCard(container, browseId, backTarget);
        }
      });
    });
  }

  // ── Browse Card (ortak): albüm/sanatçı/liste tıklama ──
  // Hem arama sonuçlarında hem home hem library kartları için kullanılır.
  async function openBrowseCard(container: HTMLElement, browseId: string, backTarget: 'home' | 'library'): Promise<void> {
    container.innerHTML = '<div class="empty-state"><p class="empty-hint-text">Yükleniyor...</p></div>';
    try {
      const browseData = await (window as any).api.youtube.browse(browseId);
      const items: any[] = browseData.items || [];
      const songs = items.filter((i: any) => i.id) as Song[];
      const title = browseData.title || 'Liste';
      const backBtn = `<button class="btn btn-ghost browse-back" style="margin-bottom:16px">← Geri</button>`;
      let html = backBtn;
      if (songs.length) {
        html += `<div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
          <h2 style="font-size:22px;font-weight:700">${escapeHtml(title)}</h2>
        </div>`;
        html += `<div class="song-list">${songs.map((s, i) => songRow(s, i + 1)).join('')}</div>`;
        setContext(songs, title, 'playlist');
      } else if (items.length) {
        const subcards = items.filter((i: any) => i.browseId);
        if (subcards.length) {
          html += `<div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
            <h2 style="font-size:22px;font-weight:700">${escapeHtml(title)}</h2>
          </div>`;
          html += `<div class="card-grid">${subcards.map((c: any) => renderCard(c)).join('')}</div>`;
        } else {
          html += `<div class="empty-state"><p class="empty-text">İçerik bulunamadı</p></div>`;
        }
      } else {
        html += `<div class="empty-state"><p class="empty-text">İçerik bulunamadı</p></div>`;
      }
      container.innerHTML = html;
      attachSongEvents(container);
      attachCardEvents(container, backTarget);
      // Geri butonu
      container.querySelector('.browse-back')?.addEventListener('click', () => {
        if (backTarget === 'home') loadHome(); else loadLibrary();
      });
    } catch (err) {
      console.error('[Browse] Hata:', browseId, err);
      showToast('İçerik yüklenemedi', 'error');
      container.innerHTML = `<div class="empty-state"><p class="empty-text">İçerik yüklenemedi</p></div><button class="btn btn-ghost browse-back">← Geri</button>`;
      container.querySelector('.browse-back')?.addEventListener('click', () => {
        if (backTarget === 'home') loadHome(); else loadLibrary();
      });
    }
  }

  // Kuyruğu diske yaz (yeniden başlatmada geri yüklenir — debounced)
  let saveQueueTimer: any = null;
  function saveQueue(): void {
    if (saveQueueTimer) clearTimeout(saveQueueTimer);
    saveQueueTimer = setTimeout(() => {
      try {
        api.store.set('queue', state.queue.map((s) => ({
          id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail,
          duration: s.duration || 0, artistId: s.artistId || ''
        })));
        api.store.set('queueIndex', state.queueIndex);
      } catch (e) {
        dlog('Kuyruk kaydedilemedi:', e);
      }
    }, 300);
  }

  // Yalnızca aktif veya önceki satırları güncelle (O(1) DOM erişimi — 100 satırı taramaz)
  function highlightSongRow(activeId: string | null): void {
    $$('.song-row.playing').forEach((r) => {
      if ((r as HTMLElement).dataset.id !== activeId) {
        r.classList.remove('playing');
      }
    });
    if (activeId) {
      try {
        const selector = `.song-row[data-id="${CSS.escape(activeId)}"]`;
        $$(selector).forEach((r) => {
          r.classList.add('playing');
        });
      } catch (e) {
        dlog('Satır vurgulanamadı:', e);
      }
    }
  }

  async function restoreQueue(): Promise<void> {
    try {
      const saved: Array<{ id: string; title: string; artist: string; thumbnail: string; duration?: number; artistId?: string }> =
        await api.store.get('queue') || [];
      if (!saved.length) return;
      state.contextQueue = saved.map((s) => ({ ...s, artistId: s.artistId || '', duration: s.duration || 0 } as QueueItem));
      state.queue = rebuildMergedQueue();
      const savedIdx: number = await api.store.get('queueIndex');
      state.queueIndex = (typeof savedIdx === 'number' && savedIdx >= 0 && savedIdx < state.queue.length)
        ? savedIdx : -1;
    } catch (e) {
      dlog('Kuyruk geri yüklenemedi:', e);
    }
  }

  function addToQueue(song: Song): void {
    state.userQueue.push(song as QueueItem);
    state.queue = rebuildMergedQueue();
    saveQueue();
    showToast(`Sıraya eklendi: ${song.title}`, 'success');
  }

  function playNext(song: Song): void {
    state.userQueue.unshift(song as QueueItem);
    state.queue = rebuildMergedQueue();
    saveQueue();
    showToast(`Önce çalınacak: ${song.title}`, 'success');
  }

  function clearUserQueue(): void {
    state.userQueue = [];
    state.queue = rebuildMergedQueue();
    saveQueue();
    showToast('Sıra temizlendi', 'info');
  }

  function setContext(songs: Song[], name: string, type: QueueContext['type']): void {
    state.contextQueue = songs as QueueItem[];
    state.contextName = name;
    state.contextType = type;
    state.queue = rebuildMergedQueue();
    // Yeni bağlam: eski shuffle sırası geçersiz (Spotify: yeni bağlamda sıra baştan)
    state.shuffleOrder = [];
    // queueIndex'i yeni kuyruğa sabitle (çalan şarkı varsa onun konumu)
    if (state.queue.length === 0) {
      state.queueIndex = -1;
    } else if (state.currentSong) {
      const idx = state.queue.findIndex((s) => s.id === state.currentSong!.id);
      state.queueIndex = idx !== -1 ? idx : Math.min(Math.max(state.queueIndex, 0), state.queue.length - 1);
    } else {
      state.queueIndex = Math.min(Math.max(state.queueIndex, -1), state.queue.length - 1);
    }
    const ctxEl = $('#playerContext');
    if (ctxEl) ctxEl.textContent = name || '';
    saveQueue();
  }

  function show(el: HTMLElement) { el.classList.add('open', 'visible'); }
  function hide(el: HTMLElement) { el.classList.remove('open', 'visible'); }
  function toggle(el: HTMLElement) { el.classList.contains('open') ? hide(el) : show(el); }

  // ── Auth ──────────────────────────────────
  function sanitizeName(name: string | undefined | null): string {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (trimmed.length <= 1) return '';
    if (/^(guide|hamburger|menu|account|hesap|profil|open guide|rehber|kılavuz|youtube music)$/i.test(trimmed)) return '';
    return trimmed;
  }

  async function checkAuthState() {
    try {
      const loggedIn = await api.auth.isMusicAuthenticated();
      state.isLoggedIn = !!loggedIn;

      if (loggedIn) {
        state.user = await api.auth.getMusicUser();
        if (state.user && !sanitizeName(state.user.name) && !(state.user as any).handle) {
          state.user.name = '';
        }
      } else {
        state.user = null;
      }
      updateAuthUI();
    } catch {
      state.isLoggedIn = false;
      state.user = null;
      updateAuthUI();
    }
  }

  function updateAuthUI() {
    const userSection = $('#userSection');
    const loginBtn = $('#btnAuthLogin');
    const userInfo = $('#userInfo');
    const userName = $('#userName');
    const userEmail = $('#userEmail');
    const userAvatar = $('#userAvatar');
    const avatarText = $('#avatarText');

    if (state.isLoggedIn && state.user) {
      if (userSection) userSection.classList.add('logged-in');
      if (loginBtn) loginBtn.style.display = 'none';
      if (userInfo) {
        userInfo.style.display = 'flex';
        const name = (state.user.name && state.user.name.length > 1 && state.user.name !== 'YouTube Music') ? state.user.name : '';
        const handle = (state.user as any).handle || '';
        const email = state.user.email || '';
        const userIdentifier = handle || (email && !email.includes('@') ? `@${email}` : email);

        const displayName = name || userIdentifier || 'YouTube Music';
        if (userName) userName.textContent = displayName;
        if (userEmail) {
          userEmail.textContent = (name && userIdentifier) ? userIdentifier : (email && email !== displayName ? email : '');
        }
        if (userAvatar) {
          if (state.user.picture) {
            const hiRes = state.user.picture.replace(/=s\d+/, '=s200').replace(/=w\d+.*/, '=s200-c-k-c0x00ffffff-no-rj');
            userAvatar.style.backgroundImage = `url("${escapeCssUrl(hiRes)}")`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
            userAvatar.style.backgroundColor = 'transparent';
            userAvatar.textContent = '';
            if (avatarText) avatarText.style.display = 'none';
          } else if (avatarText && displayName) {
            userAvatar.style.backgroundImage = 'none';
            avatarText.style.display = 'block';
            avatarText.textContent = displayName.replace(/^@/, '').charAt(0).toUpperCase();
          }
        }
      }
    } else {
      if (userSection) userSection.classList.remove('logged-in');
      if (loginBtn) loginBtn.style.display = 'flex';
      if (userInfo) userInfo.style.display = 'none';
    }
  }

  function setupAuth() {
    const loginBtn = $('#btnAuthLogin');
    const logoutBtn = $('#btnAuthLogout');
    const openLoginBtn = $('#btnOpenLogin');
    const startWelcomeBtn = $('#btnStartWelcome');

    async function doLoginMusic() {
      showToast('Varsayılan tarayıcınız açılıyor... YouTube Music\'e giriş yapıp buraya dönün.', 'info');
      const opened = await api.auth.loginMusic();
      if (!opened?.opened) {
        showToast(`Tarayıcı açılamadı: ${opened?.error || 'bilinmeyen hata'}`, 'error');
        return;
      }
      showChromeImportPrompt(opened);
    }

    // Her durumda listener ekle — updateAuthUI görünürlüğü yönetir
    if (loginBtn) loginBtn.addEventListener('click', doLoginMusic);
    if (openLoginBtn) openLoginBtn.addEventListener('click', doLoginMusic);
    if (startWelcomeBtn) startWelcomeBtn.addEventListener('click', doLoginMusic);

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api.auth.logoutMusic().catch(()=>{});
        state.isLoggedIn = false;
        state.user = null;
        updateAuthUI();
        showToast('Çıkış yapıldı.', 'info');
      });
    }
  }

  function showChromeImportPrompt(_opened: any) {
    const existing = document.getElementById('chromeImportModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'chromeImportModal';
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <h3>Google ile Giriş Yap</h3>
          <button class="icon-btn" id="closeChromeImport"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-body" style="padding:16px 20px">
          <p style="margin:0 0 12px;color:var(--c-text-1);line-height:1.5">
            Açılan güvenli giriş penceresinde Google hesabınızla oturum açın. Giriş tamamlandığında otomatik olarak algılanacaktır.
          </p>
          <div id="importStatus" style="padding:10px;border-radius:6px;background:var(--c-bg-2);font-size:13px;color:var(--c-text-2);min-height:18px">Giriş bekleniyor... Oturum açtıktan sonra Girişi Aktar'a basın.</div>
          
          <div style="margin-top:12px;border-top:1px solid var(--c-border);padding-top:10px;display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-secondary btn-sm" id="btnOpenSystemBrowser" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Varsayılan Tarayıcıda Aç
            </button>
            <details style="font-size:12px;color:var(--c-text-3);cursor:pointer">
              <summary style="user-select:none">Alternatif: Cookie ile Aktar</summary>
              <div style="margin-top:8px">
                <input type="password" id="customCookieInput" class="modal-input" placeholder="Cookie dizesini buraya yapıştırın (SAPISID=...)" style="width:100%;box-sizing:border-box;margin-bottom:8px">
                <button class="btn btn-ghost btn-sm" id="btnImportCustomCookie" style="width:100%">Cookie ile Giriş Yap</button>
              </div>
            </details>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cancelChromeImport">İptal</button>
          <button class="btn btn-primary" id="doChromeImport">Girişi Aktar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      modal.remove();
    };
    // Escape ile kapatma + arka plana tıklayınca kapatma (erişilebilirlik)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector('#closeChromeImport')?.addEventListener('click', close);
    modal.querySelector('#cancelChromeImport')?.addEventListener('click', close);

    modal.querySelector('#btnOpenSystemBrowser')?.addEventListener('click', async () => {
      await api.auth?.openSystemBrowserLogin?.().catch(() => {});
      const status = modal.querySelector('#importStatus') as HTMLElement;
      if (status) {
        status.textContent = 'Varsayılan tarayıcınız açıldı. Giriş yaptıktan sonra Girişi Aktar butonuna tıklayın.';
        status.style.color = 'var(--c-text-1)';
      }
    });

    modal.querySelector('#doChromeImport')?.addEventListener('click', async () => {
      const status = modal.querySelector('#importStatus') as HTMLElement;
      const btn = modal.querySelector('#doChromeImport') as HTMLButtonElement;
      btn.disabled = true; btn.textContent = 'Aktarılıyor...'; status.textContent = 'Tarayıcı oturumu kontrol ediliyor...';
      try {
        const r = await api.auth.importFromChrome();
        if (r?.success) {
          state.isLoggedIn = true; state.user = await api.auth.getMusicUser(); updateAuthUI();
          status.textContent = `${state.user?.name || 'Giriş'} olarak giriş yapıldı (${r.cookies} çerez)`;
          status.style.color = 'var(--c-success)';
          await checkAuthState(); updateAuthUI(); loadHome();
          setTimeout(close, 1500);
        } else { status.textContent = `Hata: ${r?.error || 'Tarayıcıda giriş tamamlanmamış'}`; status.style.color = 'var(--c-error)'; btn.disabled=false; btn.textContent='Tekrar Dene'; }
      } catch(e:any){ status.textContent=`Hata: ${e?.message||String(e)}`; status.style.color='var(--c-error)'; btn.disabled=false; btn.textContent='Tekrar Dene'; }
    });

    modal.querySelector('#btnImportCustomCookie')?.addEventListener('click', async () => {
      const input = modal.querySelector('#customCookieInput') as HTMLInputElement;
      const status = modal.querySelector('#importStatus') as HTMLElement;
      if (!input?.value?.trim()) {
        status.textContent = 'Lütfen çerez metnini girin.';
        status.style.color = 'var(--c-error)';
        return;
      }
      status.textContent = 'Çerezler işleniyor...';
      try {
        const r = await api.auth.importFromCookieString(input.value.trim());
        if (r?.success) {
          state.isLoggedIn = true;
          state.user = await api.auth.getMusicUser();
          updateAuthUI();
          status.textContent = `${state.user?.name || 'Giriş'} olarak oturum açıldı!`;
          status.style.color = 'var(--c-success)';
          await checkAuthState(); updateAuthUI(); loadHome();
          setTimeout(close, 1500);
        } else {
          status.textContent = `Hata: ${r?.error || 'Çerez geçersiz'}`;
          status.style.color = 'var(--c-error)';
        }
      } catch (e: any) {
        status.textContent = `Hata: ${e?.message || String(e)}`;
        status.style.color = 'var(--c-error)';
      }
    });
  }

  // ── Toast Notification ─────────────────────
  // Aynı mesajın tost duvarı oluşturmasını engellemek için son tost kaydı
  let lastToastMessage = '';
  let lastToastAt = 0;
  const MAX_VISIBLE_TOASTS = 4;

  function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    // Art arda aynı hata mesajı 1.5sn içinde tekrar ederse yoksay (tost duvarı)
    const now = Date.now();
    if (message === lastToastMessage && now - lastToastAt < 1500) return;
    lastToastMessage = message;
    lastToastAt = now;

    // En fazla N tost görünür — eskiler kaldırılır, oyuncu kapanmaz
    const visible = document.querySelectorAll('.toast.show');
    if (visible.length >= MAX_VISIBLE_TOASTS) {
      (visible[0] as HTMLElement).remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.setAttribute('aria-label', 'Bildirimi kapat');
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

    // Stack: position based on existing toasts
    const existing = document.querySelectorAll('.toast.show');
    const offset = existing.length * 60;
    toast.style.bottom = `${100 + offset}px`;

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });
  }

  // ── Navigation ─────────────────────────────
  function navigateTo(page: string) {
    state.page = page;
    state.navGeneration++;
    $$('.nav-link').forEach((l) => {
      l.classList.toggle('active', (l as HTMLElement).dataset.page === page);
    });
    $$('.page').forEach((p) => {
      (p as HTMLElement).classList.toggle('active', (p as HTMLElement).dataset.page === page);
    });
    if (page === 'home') loadHome();
    if (page === 'library') loadLibrary();
    if (page === 'liked') loadLiked();
  }

  function setupNav() {
    $$('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = (link as HTMLElement).dataset.page;
        if (page) navigateTo(page);
      });
    });
  }

  // ── Search ─────────────────────────────────
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSearchQuery = '';

  /** Arama boş durum şablonu (çift bakım önlenir). */
  function renderSearchEmpty(): string {
    return `
      <div class="empty-state">
        <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
        <p class="empty-text">Müzik aramaya başlayın</p>
        <p class="empty-hint-text">Sanatçı, şarkı veya albüm adı yazın</p>
      </div>`;
  }

  function setupSearch() {
    const input = $opt('#searchInput') as HTMLInputElement | null;
    const clear = $opt('#searchClear');
    const dropdown = $opt('#suggestionsDropdown');
    if (!input || !clear || !dropdown) {
      dlog('[init] Arama elementleri eksik, arama kurulumu atlandı');
      return;
    }

    input.addEventListener('input', () => {
      clear.classList.toggle('visible', input.value.length > 0);
      const query = input.value.trim();

      // Anlık arama - tek karakterlik girdiler API'yi yormasın diye 2+ karakter
      if (query.length >= 2) {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
          // Önce önerileri göster
          const suggestions = await ytSuggestions(query);
          if (suggestions.length && document.activeElement === input) {
            dropdown.innerHTML = suggestions.map((s: string) =>
              `<div class="suggestion-item" data-q="${escapeHtml(s)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>${escapeHtml(s)}</span>
              </div>`
            ).join('');
            show(dropdown);
            dropdown.querySelectorAll('.suggestion-item').forEach((item) => {
              item.addEventListener('click', () => {
                input.value = (item as HTMLElement).dataset.q || '';
                hide(dropdown);
                doSearch(input.value);
              });
            });
          }

          // Aynı zamanda doğrudan sonuçları da göster
          if (query.length >= 2) {
            lastSearchQuery = query;
            doSearch(query);
          }
        }, 200); // 200ms debounce
      } else {
        hide(dropdown);
        // Input temizlendiğinde sonuçları da temizle
        if (query.length === 0) {
          const resultsEl = $opt('#searchResults');
          if (resultsEl) resultsEl.innerHTML = renderSearchEmpty();
          lastSearchQuery = '';
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        hide(dropdown);
        lastSearchQuery = '';
        doSearch(input.value);
      }
      if (e.key === 'Escape') {
        hide(dropdown);
        input.blur();
      }
    });

    input.addEventListener('focus', () => {
      const query = input.value.trim();
      if (query.length >= 1 && dropdown.children.length > 0) {
        show(dropdown);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => hide(dropdown), 200);
    });

    clear.addEventListener('click', () => {
      input.value = '';
      clear.classList.remove('visible');
      lastSearchQuery = '';
      const resultsEl = $opt('#searchResults');
      if (resultsEl) resultsEl.innerHTML = renderSearchEmpty();
      input.focus();
    });

    $$('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const chipFilter = (chip as HTMLElement).dataset.filter;
        state.searchFilter = (chipFilter === 'songs' || chipFilter === 'videos' || chipFilter === 'albums' || chipFilter === 'artists') ? chipFilter : 'all';
        lastSearchQuery = '';
        if (input.value) doSearch(input.value);
      });
    });
  }

  async function doSearch(query: string) {
    if (!query.trim()) return;
    const container = $('#searchResults');
    container.innerHTML = '<div class="empty-state"><p class="empty-hint-text">Aranıyor...</p></div>';

    try {
      dlog('doSearch:', query);
      const results = await ytSearch(query);
      // Sonuçları cache'le (tıklama için)
      (results.videos || []).forEach((v: Song) => { v.isVideo = true; });
      state.lastSearchResults = [
        ...(results.songs || []),
        ...(results.videos || [])
      ];

      if (!results.songs?.length && !results.videos?.length && !results.albums?.length && !results.artists?.length && !results.playlists?.length) {
        container.innerHTML = '<div class="empty-state"><p class="empty-text">Sonuç bulunamadı</p></div>';
        return;
      }

      let html = '';
      const filter = state.searchFilter;

      // Şarkılar
      if (results.songs?.length && (filter === 'all' || filter === 'songs')) {
        html += `<div class="song-list">${results.songs.map((s: Song, i: number) => songRow(s, i + 1)).join('')}</div>`;
      }

      // Videolar
      if (results.videos?.length && (filter === 'all' || filter === 'videos')) {
        html += `<div style="margin-top:24px"><h3 style="font-size:16px;margin-bottom:12px;color:var(--c-text-1)">Videolar</h3><div class="song-list">${results.videos.map((s: Song, i: number) => songRow(s, i + 1)).join('')}</div></div>`;
      }

      // Albümler
      if (results.albums?.length && (filter === 'all' || filter === 'albums')) {
        html += `<div style="margin-top:24px"><h3 style="font-size:16px;margin-bottom:12px;color:var(--c-text-1)">Albümler</h3><div class="card-grid">${results.albums.map((a: any) => renderCard(a)).join('')}</div></div>`;
      }

      // Sanatçılar
      if (results.artists?.length && (filter === 'all' || filter === 'artists')) {
        html += `<div style="margin-top:24px"><h3 style="font-size:16px;margin-bottom:12px;color:var(--c-text-1)">Sanatçılar</h3><div class="card-grid">${results.artists.map((a: any) => renderCard(a)).join('')}</div></div>`;
      }

      container.innerHTML = html || '<div class="empty-state"><p class="empty-text">Sonuç bulunamadı</p></div>';
      attachSongEvents(container);
      attachCardEvents(container, 'home');
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><p class="empty-text">Arama hatası</p><p class="empty-hint-text">Lütfen tekrar deneyin</p></div>';
    }
  }

  // ── Song Row HTML ──────────────────────────
  function songRow(song: Song, num?: number): string {
    if (song && song.id) songCache.set(song.id, song);
    const isPlaying = state.currentSong?.id === song.id;
    const isLiked = state.liked.has(song.id);
    const subtitle = song.album ? `${escapeHtml(song.artist)} · ${escapeHtml(song.album)}` : escapeHtml(song.artist);
    return `
      <div class="song-row${isPlaying ? ' playing' : ''}" data-id="${escapeHtml(song.id)}">
        <div class="song-num-col">
          ${num != null ? `<span class="song-num">${num}</span>` : ''}
          <span class="song-play-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
          </span>
          <div class="equalizer-icon"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></div>
        </div>
        <img class="song-thumb" src="${escapeHtml(song.thumbnail)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <div class="song-meta">
          <div class="song-title">${escapeHtml(song.title)}</div>
          <div class="song-artist">${subtitle}</div>
        </div>
        <span class="song-dur">${formatTime(song.duration)}</span>
        <div class="song-actions">
          <button class="icon-btn like-btn${isLiked ? ' active' : ''}" data-id="${escapeHtml(song.id)}" title="${isLiked ? 'Beğenilerden Kaldır' : 'Beğen'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0 7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>`;
  }

  function attachSongEvents(container: HTMLElement) {
    container.querySelectorAll('.song-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.like-btn')) return;
        const id = (row as HTMLElement).dataset.id;
        const song = findSong(id);
        if (song) {
          const isSearchResult = !!container.closest('#searchResults') || state.page === 'search';
          const allRows = container.querySelectorAll('.song-row[data-id]');
          const contextSongs: QueueItem[] = [];
          let clickedIdx = 0;
          allRows.forEach((r) => {
            const s = findSong((r as HTMLElement).dataset.id);
            if (s) {
              if (s.id === id) clickedIdx = contextSongs.length;
              contextSongs.push(s as QueueItem);
            }
          });
          const list = contextSongs.length ? contextSongs : [song as QueueItem];
          const offset = state.userQueue.length;
          setContext(list, isSearchResult ? 'Arama Sonuçları' : '', isSearchResult ? 'search' : 'home');
          state.queueIndex = offset + clickedIdx;
          playSong(song);
        }
      });
      // Sağ tık menüsü
      row.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault();
        const me = e as MouseEvent;
        const id = (row as HTMLElement).dataset.id;
        const song = findSong(id);
        if (song) showContextMenu(me.clientX, me.clientY, song, container);
      });
    });
    container.querySelectorAll('.like-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike((btn as HTMLElement).dataset.id!);
      });
    });
  }

  function findSong(id: string | undefined): Song | QueueItem | undefined {
    if (!id) return undefined;
    if (state.currentSong?.id === id) return state.currentSong;
    const cached = songCache.get(id);
    if (cached) return cached;
    const inQueue = state.queue.find((s) => s.id === id);
    if (inQueue) return inQueue;
    return state.lastSearchResults.find((s) => s.id === id);
  }

  // ── Player State & Poll Değişkenleri (modül kapsamı) ──
  let _lastPollPlaying: boolean | null = null;
  let _pollCount = 0;
  let _mismatchVid = '';
  let _mismatchCount = 0;
  let _endedFor = '';
  let _endStallCount = 0;
  let _skipFor = '';
  let _lastAdSeenAt = 0;
  let _isNavigating = false;
  let _navigatingToId = '';
  let _lastPollDuration = 0; // Son poll'deki süre — şarkı değişimini algılamak için
  let _lastPollTime = 0; // Son poll'deki currentTime

  // ── Player (IPC tabanlı: ses gizli pencereden) ──
  function setupPlayer() {
    // Eksik element tüm arayüzü çökertmesin diye güvenli bağlayıcı kullanılır
    onClick('#btnPlay', togglePlay);
    onClick('#btnNext', nextSong);
    onClick('#btnPrev', prevSong);
    onClick('#btnShuffle', toggleShuffle);
    onClick('#btnRepeat', toggleRepeat);
    onClick('#btnLike', () => {
      if (state.currentSong) toggleLike(state.currentSong.id);
    });

    // Scrubber
    const scrubberOpt = $opt('#scrubber');
    if (!scrubberOpt) {
      dlog('[init] #scrubber bulunamadı, oynatıcı kontrolleri kısmi kuruldu');
      return;
    }
    const scrubber: HTMLElement = scrubberOpt;
    let isDragging = false;

    function seekFromEvent(e: MouseEvent) {
      if (!state.duration) return;
      const rect = scrubber.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = pct * state.duration;
      api.player.seek(t).catch(() => {});
    }

    scrubber.addEventListener('click', (e) => {
      seekFromEvent(e);
    });

    // Hover tooltip: imleçteki zaman
    const scrubTooltip = $opt('#scrubberTooltip');
    scrubber.addEventListener('mousemove', (e) => {
      if (!state.duration || !scrubTooltip) return;
      const rect = scrubber.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      scrubTooltip.textContent = formatTime(pct * state.duration, '0:00');
      scrubTooltip.style.left = `${pct * 100}%`;
    });

    scrubber.addEventListener('mousedown', (e) => {
      isDragging = true;
      seekFromEvent(e);
      const onMove = (ev: MouseEvent) => {
        if (!isDragging || !state.duration) return;
        const rect = scrubber.getBoundingClientRect();
        if (rect.width <= 0) return;
        const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const t = pct * state.duration;
        // Update visual immediately during drag
        const fillEl = $opt('#scrubberFill');
        const thumbEl = $opt('#scrubberThumb');
        const timeEl = $opt('#timeNow');
        if (fillEl) fillEl.style.width = `${pct * 100}%`;
        if (thumbEl) thumbEl.style.left = `${pct * 100}%`;
        if (timeEl) timeEl.textContent = formatTime(t, '0:00');
      };
      const onUp = (ev: MouseEvent) => {
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (state.duration) {
          const rect = scrubber.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
          api.player.seek(pct * state.duration).catch(() => {});
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Volume
    const volSlider = $opt('#volumeSlider') as HTMLInputElement | null;
    if (!volSlider) {
      dlog('[init] #volumeSlider bulunamadı, ses kontrolleri atlandı');
    }
    function updateVolumeSliderBg() {
      if (!volSlider) return;
      volSlider.value = String(state.volume);
      volSlider.style.setProperty('--vol-pct', `${state.volume}%`);
      const btnVol = $opt('#btnVolume');
      if (btnVol) {
        btnVol.innerHTML = volumeIconSvg(state.volume);
      }
    }
    updateVolumeSliderBg();
    volSlider?.addEventListener('input', () => {
      if (!volSlider) return;
      state.volume = parseInt(volSlider.value) || 0;
      if (state.volume > 0) state.lastVolume = state.volume;
      updateVolumeSliderBg();
      api.player.setVolume(state.volume / 100).catch((e: unknown) => dlog('Ses ayarlanamadı:', e));
      api.store.set('volume', state.volume);
    });
    // Volume button: mute toggle
    onClick('#btnVolume', () => {
      if (!volSlider) return;
      if (state.volume > 0) {
        state.lastVolume = state.volume;
        state.volume = 0;
        showToast('Ses kapatıldı', 'info');
      } else {
        state.volume = state.lastVolume || 80;
      }
      volSlider.value = String(state.volume);
      updateVolumeSliderBg();
      api.player.setVolume(state.volume / 100).catch((e: unknown) => dlog('Ses ayarlanamadı:', e));
      api.store.set('volume', state.volume);
    });
    // Volume çift-tık → %50
    volSlider?.addEventListener('dblclick', () => {
      if (!volSlider) return;
      state.volume = 50;
      state.lastVolume = 50;
      volSlider.value = '50';
      updateVolumeSliderBg();
      showToast('Ses %50 olarak ayarlandı', 'info');
      api.player.setVolume(0.5).catch((e: unknown) => dlog('Ses ayarlanamadı:', e));
      api.store.set('volume', 50);
    });
    // state.volume 0-100 aralığında olmalı; initial setVolume
    api.player.setVolume(Math.max(0, Math.min(100, state.volume)) / 100).catch(() => {});

    // Gizli pencereden gelen metadata + playback state
    api.player.onUpdate((u: any) => {
      // Reklam takibi ve otomatik temizlik
      if (u.isAd) {
        _lastAdSeenAt = Date.now();
        _endedFor = '';
        _endStallCount = 0;
        _mismatchCount = 0;
        scheduleAdSkipButton();
        return;
      }
      try {
        hideAdSkipButton();
      } catch (e) {
        dlog('Reklam butonu gizlenemedi:', e);
      }

      // Reklam bittikten sonraki 4 saniye boyunca geçiş/bitiş koruması
      const isJustAfterAd = Date.now() - _lastAdSeenAt < 4000;
      if (isJustAfterAd) {
        _endedFor = '';
        _endStallCount = 0;
        _mismatchCount = 0;
      }

      const pollVid = u.videoId || '';
      const mine = state.currentSong?.id || '';

      // Navigasyon kontrolü: Yeni şarkı başladı mı?
      if (_isNavigating && _navigatingToId) {
        if (pollVid === _navigatingToId && (u.currentTime > 0 || u.playerState === 1)) {
          _isNavigating = false;
        } else if (Date.now() - lastPlayRequestAt > 10000) {
          _isNavigating = false;
        }
      }

      const matchesMine = !pollVid || !mine || pollVid === mine;
      if (!matchesMine) {
        // Kullanıcı az önce yeni parça açtıysa veya navigasyon sürüyorsa eski poll'leri bekle
        if (Date.now() - lastPlayRequestAt < 4000 || _isNavigating) return;

        // Arka planda yeni bir parça çalmaya başladı (YouTube Music autoplay, radyo veya geçiş)!
        // UI'ı HEMEN bu yeni çalan parçayla senkronize et:
        const fallbackThumb = pollVid ? `https://i.ytimg.com/vi/${pollVid}/hqdefault.jpg` : '';
        const newSong: QueueItem = {
          id: pollVid,
          title: u.title || (state.currentSong?.id === pollVid ? (state.currentSong?.title || 'Çalıyor') : 'Çalıyor'),
          artist: u.artist || '',
          artistId: '',
          thumbnail: u.thumbnail || fallbackThumb,
          duration: u.duration || 0
        };

        state.currentSong = newSong;
        state.currentTime = u.currentTime || 0;
        state.duration = u.duration || 0;
        state.playing = !u.paused && !u.isAd;
        state.paused = !state.playing;

        $('#playerTitle').textContent = newSong.title;
        $('#playerArtist').textContent = newSong.artist;
        if (newSong.thumbnail) $('#playerThumb').style.backgroundImage = `url("${escapeCssUrl(newSong.thumbnail)}")`;

        if (state.duration > 0) {
          const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
          $('#scrubberFill').style.width = `${pct}%`;
          $('#scrubberThumb').style.left = `${pct}%`;
          $('#timeNow').textContent = formatTime(state.currentTime, '0:00');
          $('#timeEnd').textContent = formatTime(state.duration, '0:00');
        } else {
          $('#timeNow').textContent = formatTime(state.currentTime, '0:00');
        }

        updatePlayIcon();
        updateLikeBtn();

        // Eğer arama bağlamındaysa, yeni şarkı başladığı için bağlamı radyo moduna geçir
        if (state.contextType === 'search') {
          state.contextType = 'auto';
          state.contextName = 'Radyo';
          state.contextQueue.push(newSong);
          state.queue = rebuildMergedQueue();
          state.queueIndex = state.queue.length - 1;
        }

        highlightSongRow(pollVid);

        saveQueue();

        if (state.playing && u.title && u.artist) {
          updateDiscordForTrack(pollVid, u.title, u.artist, newSong.thumbnail);
        }
        return;
      }
      _mismatchVid = ''; _mismatchCount = 0;

      // ─── Sessiz Şarkı Değişimi Algılama ───
      // getVideoData() autoplay geçişlerinde eski video_id döndürebilir.
      // Eğer süre önemli ölçüde değiştiyse VE currentTime başa döndüyse → yeni şarkı başlamış demektir.
      const incomingDur = u.duration || 0;
      const incomingTime = u.currentTime || 0;
      const durChanged = _lastPollDuration > 10 && incomingDur > 10
        && Math.abs(incomingDur - _lastPollDuration) > 2;
      const timeReset = _lastPollTime > 10 && incomingTime < 5;
      const silentSongChange = durChanged && timeReset && !_isNavigating && !isJustAfterAd;

      _lastPollDuration = incomingDur;
      _lastPollTime = incomingTime;

      if (silentSongChange && u.title && u.title !== state.currentSong?.title) {
        // getVideoData henüz güncellenmemiş ama document.title veya URL'den yeni metadata gelmiş
        dlog('Sessiz şarkı değişimi algılandı:', u.title, '/', u.artist, 'süre:', incomingDur);
        const newVid = pollVid || mine;
        const fallbackThumb = newVid ? `https://i.ytimg.com/vi/${newVid}/hqdefault.jpg` : '';
        const newSong: QueueItem = {
          id: newVid,
          title: u.title,
          artist: u.artist || '',
          artistId: '',
          thumbnail: u.thumbnail || fallbackThumb,
          duration: incomingDur
        };
        state.currentSong = newSong;
        state.currentTime = incomingTime;
        state.duration = incomingDur;
        state.playing = !u.paused && !u.isAd;
        state.paused = !state.playing;
        _endedFor = '';
        _endStallCount = 0;

        $('#playerTitle').textContent = newSong.title;
        $('#playerArtist').textContent = newSong.artist;
        if (newSong.thumbnail) $('#playerThumb').style.backgroundImage = `url("${escapeCssUrl(newSong.thumbnail)}")`;
        if (state.duration > 0) {
          const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
          $('#scrubberFill').style.width = `${pct}%`;
          $('#scrubberThumb').style.left = `${pct}%`;
          $('#timeNow').textContent = formatTime(state.currentTime, '0:00');
          $('#timeEnd').textContent = formatTime(state.duration, '0:00');
        }
        updatePlayIcon();
        updateLikeBtn();
        if (state.contextType === 'search') {
          state.contextType = 'auto';
          state.contextName = 'Radyo';
        }
        saveQueue();
        return;
      }

      // Parça sonu → otomatik sıradaki
      // Navigasyon sürerken, reklam yeni bittiyse veya şarkı 10 saniyeden az çalmışsa bitmiş sayılmaz
      if (mine && (u.duration > 10 || state.duration > 10) && !isJustAfterAd && !_isNavigating) {
        const effectiveDur = u.duration || state.duration;
        const endKey = mine + '|' + Math.round(effectiveDur);
        const nearEnd = (u.currentTime || 0) >= effectiveDur - 1.5;
        const isFinished = (u.playerState === 0 && nearEnd) || ((u.currentTime || 0) >= effectiveDur - 0.5);

        if (isFinished && (u.currentTime || 0) > 10) {
          if (_endedFor !== endKey) {
            _endedFor = endKey;
            handleTrackEnded();
            return;
          }
        } else if ((u.currentTime || 0) < effectiveDur - 2) {
          _endedFor = '';
          _endStallCount = 0;
        }
      } else {
        _endStallCount = 0;
      }

      // Metadata (eşleşen parça) — title/artist değişirse state'i de güncelle
      if (u.title && u.title !== state.currentSong?.title) {
        $('#playerTitle').textContent = u.title;
        if (state.currentSong) state.currentSong.title = u.title;
      }
      if (u.artist && u.artist !== state.currentSong?.artist) {
        $('#playerArtist').textContent = u.artist;
        if (state.currentSong) state.currentSong.artist = u.artist;
      }
      if (u.thumbnail) {
        $('#playerThumb').style.backgroundImage = `url("${escapeCssUrl(u.thumbnail)}")`;
        if (state.currentSong) state.currentSong.thumbnail = u.thumbnail;
      }

      // Süreler — paused iken bile anında gösterilsin
      if (u.currentTime != null) state.currentTime = u.currentTime || 0;
      if (u.duration != null && u.duration > 0) state.duration = u.duration;
      else if (!state.duration && state.currentSong?.duration) state.duration = state.currentSong.duration;

      if (state.duration > 0) {
        const pct = Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
        const scrubFill = $opt('#scrubberFill');
        const scrubThumb = $opt('#scrubberThumb');
        const timeNowEl = $opt('#timeNow');
        const timeEndEl = $opt('#timeEnd');
        if (scrubFill && !document.querySelector('#scrubber:active')) scrubFill.style.width = `${pct}%`;
        if (scrubThumb) scrubThumb.style.left = `${pct}%`;
        if (timeNowEl) timeNowEl.textContent = formatTime(state.currentTime, '0:00');
        if (timeEndEl) timeEndEl.textContent = formatTime(state.duration, '0:00');
        autoScrollLyrics(pct / 100);
        updateActiveLyric(state.currentTime);
      } else {
        const timeNowEl = $opt('#timeNow');
        const timeEndEl = $opt('#timeEnd');
        if (timeNowEl) timeNowEl.textContent = formatTime(state.currentTime, '0:00');
        if (timeEndEl && state.currentSong?.duration) timeEndEl.textContent = formatTime(state.currentSong.duration, '0:00');
      }
      // Play/pause state
      const incomingPlaying = !u.paused && !u.isAd;
      if (state.playing !== incomingPlaying) {
        state.playing = incomingPlaying;
        state.paused = !incomingPlaying;
        updatePlayIcon();
      }
      // Discord: parça değişince güncelle (timer korunur), durunca temizle
      const trackKey = u.videoId || state.currentSong?.id || '';
      const isVideoTrack = !!(u.isVideo || state.currentSong?.isVideo);
      if (!state.playing) {
        if (lastDiscordKey) clearDiscordTrack();
      } else if (u.title && u.artist && trackKey) {
        if (trackKey !== lastDiscordKey) {
          updateDiscordForTrack(trackKey, u.title, u.artist, u.thumbnail, u.album || state.currentSong?.album, false, isVideoTrack);
        } else {
          maybeRefreshDiscord(trackKey, u.title, u.artist, u.thumbnail, u.album || state.currentSong?.album, isVideoTrack);
        }
      }
    });
  }

  async function playSong(song: Song) {
    dlog('playSong çağrıldı:', song.id, song.title);

    // İstek takibi (aynı şarkı tekrarında sıfırlama — retry sayacı korunur)
    const _prevId = state.currentSong?.id;
    if (song.id !== _prevId) {
      _navRetryId = '';
      _prevRequestedId = requestedId;
      requestedId = song.id;
    }

    // Queue index'i hemen güncelle (await öncesi) — sonraki/önceki doğru çalışsın
    const idx = state.queue.findIndex((s) => s.id === song.id);
    if (idx !== -1) state.queueIndex = idx;

    // History'ye ekle (max 50)
    if (state.currentSong && state.currentSong.id !== song.id) {
      state.history = [state.currentSong, ...state.history.filter((s) => s.id !== song.id)].slice(0, 50);
    }

    state.currentSong = song as QueueItem;
    state.currentTime = 0;
    state.duration = song.duration || 0;
    lastPlayRequestAt = Date.now();
    _isNavigating = true;
    _navigatingToId = song.id;
    // Parça-sonu/atlama/eşleşmeme sayaçlarını sıfırla (önceki parçanın poll'leri yeni şarkıyı tetiklemesin)
    _endedFor = '';
    _endStallCount = 0;
    _skipFor = '';
    _mismatchVid = '';
    _mismatchCount = 0;
    _lastPollDuration = 0;
    _lastPollTime = 0;
    saveQueue();

    // Add to recently played
    state.recentlyPlayed = [song, ...state.recentlyPlayed.filter((s) => s.id !== song.id)].slice(0, 100);

    // Update UI (eksik elementte çökme yok)
    const titleEl = $opt('#playerTitle');
    const artistEl = $opt('#playerArtist');
    const thumbEl = $opt('#playerThumb');
    const timeNowEl = $opt('#timeNow');
    const timeEndEl = $opt('#timeEnd');
    const fillEl = $opt('#scrubberFill');
    const thumbDotEl = $opt('#scrubberThumb');
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    if (thumbEl) thumbEl.style.backgroundImage = `url("${escapeCssUrl(song.thumbnail)}")`;
    if (timeNowEl) timeNowEl.textContent = '0:00';
    if (song.duration && timeEndEl) timeEndEl.textContent = formatTime(song.duration, '0:00');
    if (fillEl) fillEl.style.width = '0%';
    if (thumbDotEl) thumbDotEl.style.left = '0%';
    updateLikeBtn();

    // Highlight in lists
    highlightSongRow(song.id);
    // Sıra paneli açıksa yaklaşan listeyi tazele
    if (state.panelOpen === 'queue') renderQueue();

    if (!state.isLoggedIn) {
      dlog('Giriş yok, oynatılamıyor');
      showToast('Şarkı çalmak için sol menüden "Giriş Yap"a tıklayın.', 'warning');
      return;
    }

    // IPC ile gizli pencerede oynat
    dlog('IPC player.play:', song.id);
    state.playing = true;
    state.paused = false;
    updatePlayIcon();
    const res: any = await ytPlayer(song.id);
    // Tek seferlik ses senkronu (gezinti sonrası gizli oynatıcı sıfırlanmış olabilir)
    api.player.setVolume(Math.max(0, Math.min(100, state.volume)) / 100).catch((e: unknown) => dlog('Ses senkronu hatası:', e));
    dlog('IPC player sonucu:', res);
    if (res?.error === 'not_authenticated') {
      showToast('Oturumunuz dolmuş. Lütfen tekrar giriş yapın.', 'error');
      state.isLoggedIn = false;
      state.playing = false;
      updatePlayIcon();
      updateAuthUI();
    } else if (res?.error) {
      showToast(`Çalma hatası: ${res.error}`, 'error');
      state.playing = false;
      updatePlayIcon();
    } else if (!res?.playing) {
      showToast('Bu şarkı şu anda çalınamıyor, başka bir şarkı deneyin.', 'error');
      state.playing = false;
      updatePlayIcon();
    }

    // Discord Rich Presence
    setDiscordActivity(song.title, song.artist, song.thumbnail);

    // Media session metadata güncelle
    updateMediaSessionMetadata();

    // Lyrics panel açıksa şarkı sözlerini yenile
    if (state.panelOpen === 'lyrics') {
      loadLyrics();
    }
  }

  // Metadata IPC'den geldiğinde otomatik çağrılır.
  // Aynı parça için tekrar çağrılmaz (timer sıfırlanmaz); pause/resume'da
  // konum senkronu korunur: startTimestamp = şimdi - konum.
  let lastDiscordKey = '';
  let lastDiscordSentAt = 0;
  // Kullanıcının en son parça açma zamanı — navigasyon bitene kadar stale poll'ler ekranı ezemez
  let lastPlayRequestAt = 0;
  // İstenen / bir önceki istenen parça (navigasyon takılması vs YTM autoplay ayrımı)
  let requestedId = '';
  let _prevRequestedId = '';
  let _navRetryId = '';
  const DISCORD_REFRESH_MS = 30000;
  function updateDiscordForTrack(key: string, title: string, artist: string, coverUrl?: string, album?: string, force = false, isVideo = false) {
    if (!key || !title) return;
    const now = Date.now();
    if (key === lastDiscordKey && !force) {
      // Aynı parça: 30sn'de bir progress tazele (rate limit: 5/dk altında)
      if (now - lastDiscordSentAt < DISCORD_REFRESH_MS) return;
    }
    lastDiscordKey = key;
    lastDiscordSentAt = now;
    const posMs = Math.max(0, Math.round((state.currentTime || 0) * 1000));
    const start = Date.now() - posMs;

    // Video tespiti: parametre, currentSong bayrağı veya başlık analizi
    const isVid = isVideo || !!state.currentSong?.isVideo || /(official\s*(music\s*)?video|video\s*klip|klip|müzik\s*videosu|visualizer)/i.test(title);
    const isEn = (document.getElementById('settingLanguage') as HTMLSelectElement)?.value === 'en';

    const payload: Record<string, unknown> = {
      details: title,
      state: isVid
        ? (artist ? `${artist} • ${isEn ? 'Music Video' : 'Müzik Videosu'}` : (isEn ? 'Music Video' : 'Müzik Videosu'))
        : (artist || ''),
      type: isVid ? 3 : 2, // 3 = Watching (İzliyor), 2 = Listening (Dinliyor)
      startTimestamp: start,
      // Spotify görünümü: küçük rozet = bizim logo, hover = Aquality Music
      smallImageKey: 'logo',
      smallImageText: isVid
        ? (isEn ? 'Watching Music Video • Aquality Music' : 'Müzik Videosu İzliyor • Aquality Music')
        : 'Aquality Music'
    };
    if (state.duration > 0) payload.endTimestamp = start + Math.round(state.duration * 1000);
    if (coverUrl) payload.coverUrl = coverUrl;
    // ytmdesktop2: large_text her zaman album/title olmalı, yoksa hover eski kalıyor
    (payload as any).largeImageText = album
      ? (isVid ? `${album} (${isEn ? 'Video' : 'Video'})` : album)
      : (isVid ? `${title} (${isEn ? 'Music Video' : 'Müzik Videosu'})` : title);

    // Butonlar: YouTube / YouTube Music + Discord Sunucusu (Ayarlar'daki "Butonları Göster"e bağlı, en fazla 2)
    const showButtons = (document.getElementById('discordButtons') as HTMLInputElement)?.checked !== false;
    if (showButtons) {
      const btns: Array<{ label: string; url: string }> = [];
      if (key && key.length === 11) {
        btns.push({
          label: isVid
            ? (isEn ? 'Watch on YouTube' : "YouTube'da İzle")
            : (isEn ? 'Open in YouTube Music' : "YouTube Music'te Aç"),
          url: isVid ? `https://www.youtube.com/watch?v=${key}` : `https://music.youtube.com/watch?v=${key}`
        });
      }
      btns.push({ label: isEn ? 'Discord Server' : 'Discord Sunucusu', url: 'https://discord.gg/aquality' });
      (payload as any).buttons = btns.slice(0, 2);
    }
    api.discord.setActivity(payload).catch((e: any) => dlog('Discord hatası:', String(e)));
    syncBotServer();
  }

  function syncBotServer() {
    if (!api?.botServer?.updateState) return;
    const song = state.currentSong;
    if (!song || !state.playing) {
      api.botServer.updateState({
        status: state.paused ? 'paused' : 'stopped',
        isPlaying: false,
        track: song ? {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || 'Aquality Music',
          thumbnail: song.thumbnail,
          duration: state.duration,
          durationFormatted: formatTime(state.duration),
          currentTime: state.currentTime,
          currentTimeFormatted: formatTime(state.currentTime),
          progress: state.duration > 0 ? state.currentTime / state.duration : 0,
          url: song.id ? `https://music.youtube.com/watch?v=${song.id}` : undefined
        } : null,
        recommendations: []
      }).catch(() => {});
      return;
    }

    const recs: Array<{ id?: string; title: string; artist: string; thumbnail?: string; url?: string }> = [];
    if (state.queue && state.queue.length > 0 && state.queueIndex >= 0) {
      for (let i = state.queueIndex + 1; i < state.queue.length && recs.length < 3; i++) {
        const item = state.queue[i];
        if (item) {
          recs.push({
            id: item.id,
            title: item.title,
            artist: item.artist,
            thumbnail: item.thumbnail,
            url: item.id ? `https://music.youtube.com/watch?v=${item.id}` : undefined
          });
        }
      }
    }

    api.botServer.updateState({
      status: state.playing ? 'playing' : 'paused',
      isPlaying: state.playing,
      track: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || 'Aquality Music',
        thumbnail: song.thumbnail,
        duration: state.duration,
        durationFormatted: formatTime(state.duration),
        currentTime: state.currentTime,
        currentTimeFormatted: formatTime(state.currentTime),
        progress: state.duration > 0 ? state.currentTime / state.duration : 0,
        url: song.id ? `https://music.youtube.com/watch?v=${song.id}` : undefined
      },
      recommendations: recs
    }).catch(() => {});
  }

  function clearDiscordTrack() {
    lastDiscordKey = '';
    lastDiscordSentAt = 0;
    api.discord.clearActivity().catch(() => {});
    syncBotServer();
  }

  function maybeRefreshDiscord(key: string, title: string, artist: string, coverUrl?: string, album?: string, isVideo = false) {
    if (!key || key !== lastDiscordKey || !state.playing) return;
    if (Date.now() - lastDiscordSentAt >= DISCORD_REFRESH_MS) {
      updateDiscordForTrack(key, title, artist, coverUrl, album, true, isVideo);
    }
  }

  function setDiscordActivity(title: string, artist: string, coverUrl?: string) {
    const key = state.currentSong?.id || (title + '|' + artist);
    if (!title && !artist) {
      clearDiscordTrack();
      return;
    }
    updateDiscordForTrack(key, title || 'Çalıyor', artist, coverUrl);
  }

  function togglePlay() {
    if (state.playing) {
      api.player.pause().catch(() => {});
      state.playing = false;
      state.paused = true;
      state.lastPausedAt = Date.now();
      updatePlayIcon();
      // Discord'tan parçayı temizle - 100ms sonra tekrar kontrol et (poll loop'dan kaynaklı çakışma önleme)
      clearDiscordTrack();
      setTimeout(() => { if (!state.playing) clearDiscordTrack(); }, 100);
    } else {
      // Önce şarkı varsa resume et, yoksa sıradakini başlat
      if (state.currentSong) {
        if (state.duration > 0 && state.currentTime >= state.duration - 1.5) {
          api.player.seek(0).catch(() => {});
          state.currentTime = 0;
        }
        api.player.resume().catch(() => {});
        state.playing = true;
        state.paused = false;
        updatePlayIcon();
        updateDiscordForTrack(state.currentSong.id, state.currentSong.title, state.currentSong.artist, state.currentSong.thumbnail);
      } else if (state.queue.length) {
        playSong(state.queue[state.queueIndex >= 0 ? state.queueIndex : 0]);
      }
    }
  }

  function nextSong() {
    if (!state.queue.length) return;

    if (state.shuffle) {
      // Fisher-Yates shuffle order kullan
      if (state.shuffleOrder.length === 0 || state.shuffleOrder.length !== state.queue.length) {
        const indices = state.queue.map((_, i) => i);
        const curIdx = state.queueIndex >= 0 ? state.queueIndex : 0;
        const remaining = indices.filter((i) => i !== curIdx);
        state.shuffleOrder = [curIdx, ...FisherYatesShuffle(remaining)];
      }
      const currentShufflePos = state.shuffleOrder.indexOf(state.queueIndex);
      const nextShufflePos = currentShufflePos + 1;
      if (nextShufflePos < state.shuffleOrder.length) {
        state.queueIndex = state.shuffleOrder[nextShufflePos];
      } else if (state.repeat === 'all') {
        const indices = state.queue.map((_, i) => i);
        state.shuffleOrder = FisherYatesShuffle(indices);
        state.queueIndex = state.shuffleOrder[0];
      } else {
        if (state.queue.length === 1) {
          api.player.seek(0).catch(() => {});
          state.currentTime = 0;
          return;
        }
        showToast('Sıranın sonuna gelindi', 'info');
        state.playing = false;
        updatePlayIcon();
        return;
      }
    } else {
      state.queueIndex = state.queueIndex + 1;
      if (state.queueIndex >= state.queue.length) {
        if (state.repeat === 'all') {
          state.queueIndex = 0;
        } else {
          if (state.queue.length === 1) {
            api.player.seek(0).catch(() => {});
            state.currentTime = 0;
            return;
          }
          showToast('Sıranın sonuna gelindi', 'info');
          state.playing = false;
          updatePlayIcon();
          return;
        }
      }
    }
    const nextTrack = state.queue[state.queueIndex];
    if (nextTrack) {
      playSong(nextTrack);
    }
  }

  function prevSong() {
    if (!state.queue.length) return;
    // Eğer şarkı 3 saniyeden fazla çalmışsa başa sar
    if (state.currentTime > 3) {
      api.player.seek(0).catch(() => {});
      state.currentTime = 0;
      $('#timeNow').textContent = '0:00';
      $('#scrubberFill').style.width = '0%';
      $('#scrubberThumb').style.left = '0%';
      return;
    }

    if (state.shuffle && state.shuffleOrder.length) {
      const currentShufflePos = state.shuffleOrder.indexOf(state.queueIndex);
      if (currentShufflePos > 0) {
        state.queueIndex = state.shuffleOrder[currentShufflePos - 1];
        playSong(state.queue[state.queueIndex]);
        return;
      } else if (state.repeat === 'all') {
        state.queueIndex = state.shuffleOrder[state.shuffleOrder.length - 1];
        playSong(state.queue[state.queueIndex]);
        return;
      } else {
        api.player.seek(0).catch(() => {});
        state.currentTime = 0;
        return;
      }
    }

    // Normal sıra
    if (state.queueIndex <= 0) {
      if (state.repeat === 'all' && state.queue.length > 1) {
        state.queueIndex = state.queue.length - 1;
        playSong(state.queue[state.queueIndex]);
      } else {
        api.player.seek(0).catch(() => {});
        state.currentTime = 0;
      }
      return;
    }
    state.queueIndex = state.queueIndex - 1;
    playSong(state.queue[state.queueIndex]);
  }

  // Parça bitti (Spotify: repeat-one → baştan çal, yoksa sıradakine geç)
  function handleTrackEnded() {
    _mismatchVid = ''; _mismatchCount = 0;
    if (!state.currentSong) return;
    if (state.repeat === 'one') {
      playSong(state.currentSong);
      return;
    }
    // Arama sonuçlarından seçilen şarkı KENDİLİĞİNDEN bittiğinde (kullanıcının eklediği sıra yoksa ve repeat all değilse)
    // arama listesindeki sonraki şarkılara kendiliğinden atlamasın, oynatmayı durdursun.
    if (state.contextType === 'search' && !state.userQueue.length && state.repeat !== 'all') {
      dlog('Arama bağlamındaki şarkı bitti, otomatik geçiş durduruluyor.');
      api.player.pause().catch(() => {});
      state.playing = false;
      state.paused = true;
      state.currentTime = 0;
      updatePlayIcon();
      $('#scrubberFill').style.width = '0%';
      $('#scrubberThumb').style.left = '0%';
      $('#timeNow').textContent = '0:00';
      return;
    }
    nextSong();
  }

  function toggleShuffle() {
    state.shuffle = !state.shuffle;
    if (state.shuffle) {
      const indices = state.queue.map((_, i) => i);
      const curIdx = state.queueIndex >= 0 ? state.queueIndex : 0;
      const remaining = indices.filter((i) => i !== curIdx);
      state.shuffleOrder = [curIdx, ...FisherYatesShuffle(remaining)];
      showToast('Karıştırma açık', 'info');
    } else {
      state.shuffleOrder = [];
      showToast('Karıştırma kapalı', 'info');
    }
    $('#btnShuffle').classList.toggle('active', state.shuffle);
    $('#btnShuffle').title = state.shuffle ? 'Karıştırma: Açık' : 'Karıştırma: Kapalı';
    api.store.set('shuffle', state.shuffle);
  }

  /** Ses düzeyine göre hoparlör simgesi (kurulum + init ortak kullanır). */
  function volumeIconSvg(volume: number): string {
    if (volume === 0) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else if (volume < 50) {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  }

  // Her tekrar modu için görsel olarak ayırt edilebilir simge
  const REPEAT_ICONS = {
    one: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="14" text-anchor="middle" font-size="7" fill="currentColor" stroke="none" font-weight="bold">1</text></svg>',
    all: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.55"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>'
  };

  function toggleRepeat() {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    state.repeat = modes[(modes.indexOf(state.repeat) + 1) % 3];
    const btn = $opt('#btnRepeat');
    if (btn) {
      btn.classList.toggle('active', state.repeat !== 'off');
      if (state.repeat === 'one') {
        btn.title = 'Tekrar: Tek Parça';
        btn.innerHTML = REPEAT_ICONS.one;
        showToast('Tek parça tekrarı açık', 'info');
      } else if (state.repeat === 'all') {
        btn.title = 'Tekrar: Tümü';
        btn.innerHTML = REPEAT_ICONS.all;
        showToast('Tümünü tekrarla açık', 'info');
      } else {
        btn.title = 'Tekrar: Kapalı';
        btn.innerHTML = REPEAT_ICONS.off;
        showToast('Tekrar kapalı', 'info');
      }
    }
    api.store.set('repeat', state.repeat);
  }

  function updatePlayIcon() {
    const playIcon = $opt('#btnPlay .icon-play');
    const pauseIcon = $opt('#btnPlay .icon-pause');
    const isPlaying = state.playing;
    if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
    if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';

    // Spotify ekolayzır animasyonunu şarkı duraklatıldığında dondur / oynatıldığında başlat
    $$('.song-row.playing').forEach((row) => {
      row.classList.toggle('paused', !isPlaying);
    });
  }
  
  // ── Like ───────────────────────────────────
  function toggleLike(id: string) {
    if (!id) return;
    if (state.liked.has(id)) state.liked.delete(id);
    else state.liked.add(id);
    saveLiked();
    updateLikeBtn();
    // Tüm DOM'u taramak yerine doğrudan ilgili butonlar hedeflenir
    let selector = '.like-btn';
    try {
      selector = `.like-btn[data-id="${CSS.escape(id)}"]`;
    } catch { /* CSS.escape yoksa genel seçici */ }
    document.querySelectorAll(selector).forEach((btn) => {
      btn.classList.toggle('active', state.liked.has(id));
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', state.liked.has(id) ? 'currentColor' : 'none');
    });
  }

  function updateLikeBtn() {
    if (!state.currentSong) return;
    const btn = $opt('#btnLike');
    if (!btn) return;
    const liked = state.liked.has(state.currentSong.id);
    btn.classList.toggle('active', liked);
    btn.classList.toggle('liked', liked);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', liked ? 'currentColor' : 'none');
  }

  function saveLiked() {
    api.store.set('likedSongs', Array.from(state.liked));
  }

  // ── Ad Skip Button ─────────────────────────
  // Üst üste yığılan zamanlayıcıları engellemek için tekil bayrak
  let adSkipScheduled = false;
  function scheduleAdSkipButton() {
    if (adSkipScheduled) return;
    adSkipScheduled = true;
    setTimeout(() => {
      adSkipScheduled = false;
      showAdSkipButton();
    }, 3000);
  }
  function showAdSkipButton() {
    let btn = document.getElementById('adSkipBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'adSkipBtn';
      btn.textContent = 'Reklamı Geç';
      btn.className = 'ad-skip-btn';
      btn.setAttribute('aria-label', 'Reklamı geç');
      btn.addEventListener('click', () => {
        api.player.skipAd().catch((e: unknown) => dlog('Reklam geçilemedi:', e));
      });
      document.body.appendChild(btn);
    }
    btn.style.display = 'flex';
  }

  function hideAdSkipButton() {
    const btn = document.getElementById('adSkipBtn');
    if (btn) btn.style.display = 'none';
  }

  // ── Panels ─────────────────────────────────
  function setupPanels() {
    const lyricsPanel = $opt('#lyricsPanel');
    const queuePanel = $opt('#queuePanel');
    const backdrop = $opt('#panelBackdrop');
    if (!lyricsPanel || !queuePanel) {
      dlog('[init] Panel elementleri eksik, panel kurulumu atlandı');
      return;
    }

    onClick('#btnLyrics', () => {
      if (state.panelOpen === 'lyrics') { closePanels(); return; }
      closePanels();
      state.panelOpen = 'lyrics';
      show(lyricsPanel);
      if (backdrop) show(backdrop);
      $opt('#btnLyrics')?.classList.add('active');
      // Klavye kullanıcıları için odağı panele taşı
      const heading = lyricsPanel.querySelector('h3, h2, [tabindex]') as HTMLElement | null;
      if (heading) heading.focus();
      if (state.currentSong) loadLyrics();
    });

    onClick('#btnQueue', () => {
      if (state.panelOpen === 'queue') { closePanels(); return; }
      closePanels();
      state.panelOpen = 'queue';
      show(queuePanel);
      if (backdrop) show(backdrop);
      $opt('#btnQueue')?.classList.add('active');
      renderQueue();
    });

    onClick('#closeLyrics', closePanels);
    onClick('#closeQueue', closePanels);
    backdrop?.addEventListener('click', closePanels);
  }

  function closePanels() {
    state.panelOpen = null;
    $$('.panel').forEach((p) => hide(p as HTMLElement));
    hide($('#panelBackdrop'));
    $('#btnLyrics')?.classList.remove('active');
    $('#btnQueue')?.classList.remove('active');
  }

  // ── Context Menu ────────────────────────────
  let activeContextMenu: HTMLElement | null = null;
  let onDocClickDismiss: ((e: MouseEvent) => void) | null = null;

  function closeContextMenu() {
    if (onDocClickDismiss) {
      document.removeEventListener('click', onDocClickDismiss);
      onDocClickDismiss = null;
    }
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
  }

  function showContextMenu(x: number, y: number, song: Song, parentList?: HTMLElement | null) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', `${song.title} seçenekleri`);
    const isLiked = state.liked.has(song.id);
    menu.innerHTML = `
      <div class="ctx-item" role="menuitem" tabindex="0" data-action="play">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Şimdi Çal</span>
      </div>
      <div class="ctx-item" role="menuitem" tabindex="0" data-action="playNext">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
        <span>Önce Çal</span>
      </div>
      <div class="ctx-item" role="menuitem" tabindex="0" data-action="addToQueue">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span>Sıraya Ekle</span>
      </div>
      <div class="ctx-separator" aria-hidden="true"></div>
      <div class="ctx-item" role="menuitem" tabindex="0" data-action="addToLiked">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span>${isLiked ? 'Beğeniyi Kaldır' : 'Beğeniye Ekle'}</span>
      </div>
      <div class="ctx-separator" aria-hidden="true"></div>
      <div class="ctx-item" role="menuitem" tabindex="0" data-action="copyLink">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span>Bağlantıyı Kopyala</span>
      </div>
    `;

    document.body.appendChild(menu);
    activeContextMenu = menu;

    // Pozisyon ayarla (taşmayı önlemek için eklenen elemanın boyutunu dinamik ölç)
    const rect = menu.getBoundingClientRect();
    const padding = 8;
    const posX = Math.max(padding, Math.min(x, window.innerWidth - rect.width - padding));
    const posY = Math.max(padding, Math.min(y, window.innerHeight - rect.height - padding));
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    menu.addEventListener('click', async (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.ctx-item');
      const action = item?.dataset.action;
      if (!action) return;
      switch (action) {
        case 'play': {
          if (parentList) {
            const allRows = parentList.querySelectorAll('.song-row[data-id]');
            const ctxSongs: QueueItem[] = [];
            let clickedIdx = 0;
            allRows.forEach((r) => {
              const s = findSong((r as HTMLElement).dataset.id);
              if (s) {
                if (s.id === song.id) clickedIdx = ctxSongs.length;
                ctxSongs.push(s as QueueItem);
              }
            });
            if (ctxSongs.length) setContext(ctxSongs, '', 'home');
            state.queueIndex = clickedIdx;
          } else {
            state.queueIndex = state.queue.findIndex((s) => s.id === song.id);
          }
          playSong(song);
          break;
        }
        case 'playNext':
          playNext(song);
          break;
        case 'addToQueue':
          addToQueue(song);
          break;
        case 'addToLiked':
          toggleLike(song.id);
          break;
        case 'copyLink':
          try {
            await navigator.clipboard?.writeText(`https://music.youtube.com/watch?v=${song.id}`);
            showToast('Bağlantı kopyalandı', 'success');
          } catch (e) {
            dlog('Panoya kopyalama başarısız:', e);
            showToast('Kopyalama başarısız oldu.', 'error');
          }
          break;
      }
      closeContextMenu();
    });

    // Klavye desteği: Escape kapatır, ok tuşları gezinir, Enter seçer
    menu.addEventListener('keydown', (e: KeyboardEvent) => {
      const items = Array.from(menu.querySelectorAll<HTMLElement>('.ctx-item'));
      const currentIdx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        closeContextMenu();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(currentIdx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(currentIdx - 1 + items.length) % items.length]?.focus();
      } else if (e.key === 'Enter' && currentIdx >= 0) {
        e.preventDefault();
        items[currentIdx].click();
      }
    });

    // Dışarı tıklayınca kapat (tekil ve sızıntısız dinleyici)
    onDocClickDismiss = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    setTimeout(() => {
      if (onDocClickDismiss) {
        document.addEventListener('click', onDocClickDismiss);
      }
    }, 0);
  }

  // Söz paneli: kullanıcının elle kaydırdığı anı hatırla — 8sn boyunca
  // otomatik kaydırma duraklatılır, sonra kaldığı yerden devam eder.
  let lastLyricsUserScrollAt = 0;
  let lyricsScrollTracked = false;
  function trackLyricsUserScroll() {
    if (lyricsScrollTracked) return;
    const body = $opt('#lyricsBody');
    if (!body) return;
    lyricsScrollTracked = true;
    const mark = () => { lastLyricsUserScrollAt = Date.now(); };
    body.addEventListener('wheel', mark, { passive: true });
    body.addEventListener('touchmove', mark, { passive: true });
    body.addEventListener('keydown', mark);
  }

  interface ParsedLyric {
    time: number;
    text: string;
  }
  let currentParsedLyrics: ParsedLyric[] | null = null;

  /** Şarkı ilerlemesine orantılı söz kaydırma (zaman damgasız sözler için). */
  function autoScrollLyrics(ratio: number) {
    if (state.panelOpen !== 'lyrics' || !state.playing || currentParsedLyrics) return;
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) return;
    if (Date.now() - lastLyricsUserScrollAt < 8000) return;
    const body = $opt('#lyricsBody');
    if (!body) return;
    const maxScroll = body.scrollHeight - body.clientHeight;
    if (maxScroll <= 0) return;
    const target = ratio * maxScroll;
    if (Math.abs(body.scrollTop - target) > 120) {
      try {
        body.scrollTo({ top: target, behavior: 'smooth' });
      } catch {
        body.scrollTop = target;
      }
    }
  }

  /** LRC zaman damgalı sözleri şarkı süresiyle senkronize eder (Spotify Karaoke Modu). */
  function updateActiveLyric(currentTime: number) {
    if (state.panelOpen !== 'lyrics' || !currentParsedLyrics || !currentParsedLyrics.length) return;
    const body = $opt('#lyricsBody');
    if (!body) return;

    let activeIdx = -1;
    for (let i = 0; i < currentParsedLyrics.length; i++) {
      if (currentParsedLyrics[i].time <= currentTime + 0.3) {
        activeIdx = i;
      } else {
        break;
      }
    }

    const lines = body.querySelectorAll('.lyric-line');
    lines.forEach((l, idx) => {
      if (idx === activeIdx) {
        if (!l.classList.contains('active')) {
          l.classList.add('active');
          if (Date.now() - lastLyricsUserScrollAt > 8000) {
            try {
              (l as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch {
              // Smooth scroll fallback
            }
          }
        }
      } else {
        l.classList.remove('active');
      }
    });
  }

  async function loadLyrics() {
    if (!state.currentSong) return;
    const body = $opt('#lyricsBody');
    if (!body) return;
    trackLyricsUserScroll();
    const generation = state.navGeneration;
    const songId = state.currentSong.id;
    body.innerHTML = '<div class="empty-state"><p class="empty-hint-text">Şarkı sözleri yükleniyor...</p></div>';
    currentParsedLyrics = null;

    let rawLyrics: any = null;
    try {
      rawLyrics = await ytLyrics(songId);
    } catch {
      rawLyrics = null;
    }

    if (generation !== state.navGeneration || state.currentSong?.id !== songId) return;

    if (!rawLyrics) {
      body.innerHTML = '<div class="empty-state"><p class="empty-text">Şarkı sözleri bulunamadı</p></div>';
      return;
    }

    const rawStr = typeof rawLyrics === 'string' ? rawLyrics : (rawLyrics.lyrics || '');
    const lines = rawStr.split('\n');
    const lrcRegex = /^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\](.*)$/;
    const parsed: ParsedLyric[] = [];
    let isLrc = false;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(lrcRegex);
      if (match) {
        isLrc = true;
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const time = min * 60 + sec;
        const text = match[3].trim();
        parsed.push({ time, text });
      } else if (trimmed) {
        parsed.push({ time: -1, text: trimmed });
      }
    }

    if (isLrc) {
      currentParsedLyrics = parsed.filter(p => p.time >= 0);
      body.innerHTML = `<div class="lyrics-container">${currentParsedLyrics.map((item, idx) => `
        <div class="lyric-line" data-time="${item.time}" data-idx="${idx}">
          ${escapeHtml(item.text) || '♪'}
        </div>
      `).join('')}</div>`;

      // Spotify tarzı: satıra tıklanınca o saniyeye atla
      body.querySelectorAll('.lyric-line').forEach((el) => {
        el.addEventListener('click', () => {
          const t = parseFloat((el as HTMLElement).dataset.time || '-1');
          if (t >= 0 && Number.isFinite(t)) {
            api.player.seek(t).catch(() => {});
          }
        });
      });
      updateActiveLyric(state.currentTime);
    } else {
      currentParsedLyrics = null;
      body.innerHTML = `<div class="lyrics-container">${lines.map((line: string) =>
        `<div class="lyric-line">${line ? escapeHtml(line) : '&nbsp;'}</div>`
      ).join('')}</div>`;
    }
  }

  function renderQueue() {
    const body = $('#queueBody');
    if (!state.currentSong && !state.userQueue.length && !state.contextQueue.length) {
      body.innerHTML = '<div class="empty-state"><p class="empty-hint-text">Sıra boş</p></div>';
      return;
    }

    let html = '';

    // 1. Şu Anda Çalınan (Now Playing)
    if (state.currentSong) {
      html += `<div class="queue-section">
        <div class="queue-section-title">Şu Anda Çalınan</div>
        <div class="queue-item active" style="cursor:default">
          <img class="queue-thumb" src="${escapeHtml(state.currentSong.thumbnail)}" alt="" onerror="this.style.display='none'">
          <div class="queue-info">
            <div class="queue-title">${escapeHtml(state.currentSong.title)}</div>
            <div class="queue-artist">${escapeHtml(state.currentSong.artist)}</div>
          </div>
          <span class="song-dur" style="font-size:12px;color:var(--c-accent-hover,#1ED760)">Çalıyor</span>
        </div>
      </div>`;
    }

    // 2. Kullanıcının Sıraya Ekledikleri (Next In Queue)
    if (state.userQueue.length) {
      html += `<div class="queue-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="queue-section-title" style="margin-bottom:0">Sıradaki Şarkılar</div>
          <button class="btn btn-ghost" id="clearUserQueue" style="font-size:11px;padding:3px 8px;border-radius:4px;cursor:pointer">Temizle</button>
        </div>
        <div class="song-list">${state.userQueue.map((s, i) => `
          <div class="queue-item" data-type="user" data-idx="${i}">
            <img class="queue-thumb" src="${escapeHtml(s.thumbnail)}" alt="" onerror="this.style.display='none'">
            <div class="queue-info">
              <div class="queue-title">${escapeHtml(s.title)}</div>
              <div class="queue-artist">${escapeHtml(s.artist)}</div>
            </div>
            <span class="song-dur" style="font-size:12px;color:var(--c-text-3);margin-right:8px">${formatTime(s.duration)}</span>
            <button class="queue-remove-btn" data-idx="${i}" title="Sıradan çıkar" aria-label="Sıradan çıkar">✕</button>
          </div>`).join('')}</div>
      </div>`;
    }

    // 3. Bağlamdan Sıradakiler (Upcoming from Context / Playlist / Album)
    if (state.contextQueue.length) {
      const contextLabel = state.contextName ? `${state.contextName} içinden sırada` : 'Sıradaki Parçalar';
      const currentCtxIdx = state.contextQueue.findIndex((s) => s.id === state.currentSong?.id);
      const upcomingCtx = currentCtxIdx >= 0 ? state.contextQueue.slice(currentCtxIdx + 1) : state.contextQueue;
      if (upcomingCtx.length) {
        html += `<div class="queue-section">
          <div class="queue-section-title">${escapeHtml(contextLabel)}</div>
          <div class="song-list">${upcomingCtx.map((s, i) => `
            <div class="queue-item" data-type="context" data-idx="${i}">
              <img class="queue-thumb" src="${escapeHtml(s.thumbnail)}" alt="" onerror="this.style.display='none'">
              <div class="queue-info">
                <div class="queue-title">${escapeHtml(s.title)}</div>
                <div class="queue-artist">${escapeHtml(s.artist)}</div>
              </div>
              <span class="song-dur" style="font-size:12px;color:var(--c-text-3)">${formatTime(s.duration)}</span>
            </div>`).join('')}</div>
        </div>`;
      }
    }

    body.innerHTML = html || '<div class="empty-state"><p class="empty-hint-text">Sıra boş</p></div>';

    // Clear user queue
    const clearBtn = body.querySelector('#clearUserQueue');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearUserQueue();
        renderQueue();
      });
    }

    // Sıradan tek parça çıkarma butonu
    body.querySelectorAll('.queue-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || '-1', 10);
        if (idx >= 0 && idx < state.userQueue.length) {
          state.userQueue.splice(idx, 1);
          state.queue = rebuildMergedQueue();
          saveQueue();
          renderQueue();
        }
      });
    });

    // Queue item click (parçayı hemen çal)
    body.querySelectorAll('.queue-item[data-type]').forEach((item) => {
      item.addEventListener('click', () => {
        const type = (item as HTMLElement).dataset.type;
        const idx = parseInt((item as HTMLElement).dataset.idx || '-1', 10);
        if (type === 'user') {
          const song = state.userQueue[idx];
          if (song) {
            state.userQueue.splice(idx, 1);
            state.queue = rebuildMergedQueue();
            state.queueIndex = idx - 1;
            playSong(song);
          }
        } else if (type === 'context') {
          const currentCtxIdx = state.contextQueue.findIndex((s) => s.id === state.currentSong?.id);
          const upcomingCtx = currentCtxIdx >= 0 ? state.contextQueue.slice(currentCtxIdx + 1) : state.contextQueue;
          const song = upcomingCtx[idx];
          if (song) {
            state.queueIndex = state.queue.findIndex((s) => s.id === song.id);
            playSong(song);
          }
        }
        renderQueue();
      });
    });
  }

  // ── Home ───────────────────────────────────
  async function loadHome() {
    const gen = state.navGeneration;
    const container = $('#homeContent');
    container.innerHTML = '<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';

    try {
    const data = await ytHome();
    if (gen !== state.navGeneration) return; // stale, discard
    dlog('Home data:', { itemCount: data?.items?.length });

    if (!data.items?.length) {
      container.innerHTML = '<div class="empty-state"><p class="empty-text">İçerik yüklenemedi</p><p class="empty-hint-text">Lütfen internet bağlantınızı kontrol edin</p></div>';
      return;
    }

    const songs = data.items.filter((i: any) => i.id) as Song[];
    const cards = data.items.filter((i: any) => i.browseId);

    dlog('Home Songs:', songs.length, 'Cards:', cards.length);

    let html = '';

    if (cards.length) {
      html += `<div style="margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;color:var(--c-text-0)">Keşfet</h2>
        <div class="card-grid">${cards.slice(0, 8).map((c: any) => renderCard(c)).join('')}</div>
      </div>`;
    }

    if (songs.length) {
      html += `<div>
        <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;color:var(--c-text-0)">Önerilen Şarkılar</h2>
        <div class="song-list">${songs.slice(0, 10).map((s: Song, i: number) => songRow(s, i + 1)).join('')}</div>
      </div>`;
    }

    container.innerHTML = html || '<div class="empty-state"><p class="empty-text">İçerik bulunamadı</p></div>';

    // Set queue from songs — sadece şarkı çalmıyorsa VE kuyruk boşsa queue'yu güncelle
    if (songs.length && !state.currentSong && !state.queue.length) {
      setContext(songs.slice(0, 30), 'Önerilen Şarkılar', 'home');
    }

    attachSongEvents(container);
    attachCardEvents(container, 'home');
    } catch (err) {
      console.error('[Aquality Music] loadHome error:', err);
      container.innerHTML = '<div class="empty-state"><p class="empty-text">İçerik yüklenemedi</p><p class="empty-hint-text">Lütfen internet bağlantınızı kontrol edin</p></div>';
    }
  }

  // ── Library ────────────────────────────────
  async function loadLibrary() {
    const gen = state.navGeneration;
    const container = $('#libraryContent');
    container.innerHTML = '<div class="empty-state"><p class="empty-hint-text">Yükleniyor...</p></div>';

    // Yerel olarak dinlenenler
    const localRecent = state.recentlyPlayed;

    // YouTube Music kütüphanesi (giriş yapıldıysa)
    let ytPlaylists: any[] = [];
    let ytArtists: any[] = [];
    let ytAlbums: any[] = [];

    if (state.isLoggedIn) {
      try {
        [ytPlaylists, ytArtists, ytAlbums] = await Promise.all([
          api.youtube.libraryPlaylists().catch((e: unknown) => { dlog('Kütüphane listeleri alınamadı:', e); return []; }),
          api.youtube.libraryArtists().catch((e: unknown) => { dlog('Kütüphane sanatçıları alınamadı:', e); return []; }),
          api.youtube.libraryAlbums().catch((e: unknown) => { dlog('Kütüphane albümleri alınamadı:', e); return []; })
        ]);
      } catch (e) {
        dlog('Kütüphane yüklenemedi:', e);
      }
    }

    if (gen !== state.navGeneration) return; // stale, discard

    let html = '';

    // Son Çalınanlar
    if (localRecent.length) {
      html += `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">Son Çalınanlar</h3>
        <div class="song-list">${localRecent.slice(0, 20).map((s, i) => songRow(s, i + 1)).join('')}</div>
      </div>`;
    }

    // YouTube Music Playlist'leri
    if (ytPlaylists.length) {
      html += `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">Oynatma Listeleri</h3>
        <div class="card-grid">${ytPlaylists.map(pl => renderCard({
          browseId: pl.browseId,
          thumbnail: pl.thumbnail,
          title: pl.title,
          type: 'playlist'
        })).join('')}</div>
      </div>`;
    }

    // Sanatçılar
    if (ytArtists.length) {
      html += `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">Sanatçılar</h3>
        <div class="card-grid">${ytArtists.map(a => renderCard({
          browseId: a.browseId,
          thumbnail: a.thumbnail,
          title: a.name,
          type: 'artist'
        })).join('')}</div>
      </div>`;
    }

    // Albümler
    if (ytAlbums.length) {
      html += `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">Albümler</h3>
        <div class="card-grid">${ytAlbums.map(a => renderCard({
          browseId: a.browseId,
          thumbnail: a.thumbnail,
          title: a.title,
          subtitle: a.artist || '',
          type: 'album'
        })).join('')}</div>
      </div>`;
    }

    if (!html) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <p class="empty-text">Henüz bir şey eklenmemiş</p>
          <p class="empty-hint-text">Giriş yaparak YouTube Music kütüphanenizi görebilir veya yeni müzikler arayabilirsiniz</p>
          <button class="btn btn-secondary btn-sm" id="btnExploreLibrary" style="margin-top:14px">Müzik Aramaya Başla</button>
        </div>`;
      container.querySelector('#btnExploreLibrary')?.addEventListener('click', () => navigateTo('search'));
      return;
    }

    container.innerHTML = html;
    attachSongEvents(container);
    attachCardEvents(container, 'library');
  }

  async function loadLiked() {
    const gen = state.navGeneration;
    const container = $('#likedContent');

    // Yerel beğenenler
    const localLikes = Array.from(state.liked);

    // YouTube Music beğenilenler (giriş yapıldıysa)
    let ytLiked: Song[] = [];
    if (state.isLoggedIn) {
      try {
        ytLiked = await api.youtube.likedSongs();
      } catch (e) {
        dlog('Beğenilenler alınamadı:', e);
      }
    }

    if (gen !== state.navGeneration) return; // stale, discard

    let html = '';

    // YouTube Music beğenilenleri
    if (ytLiked.length) {
      html += `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">YouTube Music Beğenilenler</h3>
        <div class="song-list">${ytLiked.map((s, i) => songRow(s, i + 1)).join('')}</div>
      </div>`;
    }

    // Yerel beğenilenler
    if (localLikes.length) {
      const localSongs = localLikes.map(id => {
        return state.queue.find((s) => s.id === id) || state.recentlyPlayed.find((s) => s.id === id);
      }).filter(Boolean) as Song[];

      if (localSongs.length) {
        html += `<div>
          <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;color:var(--c-text-1)">Yerel Beğeniler</h3>
          <div class="song-list">${localSongs.map((s, i) => songRow(s, i + 1)).join('')}</div>
        </div>`;
      }
    }

    if (!html) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
          <p class="empty-text">Henüz beğeni yok</p>
          <p class="empty-hint-text">Beğendiğiniz şarkılar burada görünecek</p>
          <button class="btn btn-secondary btn-sm" id="btnExploreLiked" style="margin-top:14px">Müzik Keşfet</button>
        </div>`;
      container.querySelector('#btnExploreLiked')?.addEventListener('click', () => navigateTo('home'));
      return;
    }

    container.innerHTML = html;
    attachSongEvents(container);
  }

  // ── Media Session (OS media controls) ──────
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => { if (!state.playing) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (state.playing) togglePlay(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (state.duration) api.player.seek(Math.max(0, state.currentTime - 10)).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (state.duration) api.player.seek(Math.min(state.duration, state.currentTime + 10)).catch(() => {});
    });
  }

  function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator) || !state.currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.currentSong.title,
      artist: state.currentSong.artist,
      artwork: state.currentSong.thumbnail ? [{ src: state.currentSong.thumbnail, sizes: '480x480', type: 'image/jpeg' }] : []
    });
  }

  // ── Keyboard Shortcuts ─────────────────────
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (isCtrlOrMeta) {
            prevSong();
          } else if (state.duration) {
            const step = e.shiftKey ? 10 : 5;
            api.player.seek(Math.max(0, state.currentTime - step)).catch(() => {});
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (isCtrlOrMeta) {
            nextSong();
          } else if (state.duration) {
            const step = e.shiftKey ? 10 : 5;
            api.player.seek(Math.min(state.duration, state.currentTime + step)).catch(() => {});
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.volume = Math.min(100, state.volume + 5);
          if (state.volume > 0) state.lastVolume = state.volume;
          ($('#volumeSlider') as HTMLInputElement).value = String(state.volume);
          ($('#volumeSlider') as HTMLInputElement).style.setProperty('--vol-pct', `${state.volume}%`);
          api.player.setVolume(state.volume / 100).catch(() => {});
          api.store.set('volume', state.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          state.volume = Math.max(0, state.volume - 5);
          if (state.volume > 0) state.lastVolume = state.volume;
          ($('#volumeSlider') as HTMLInputElement).value = String(state.volume);
          ($('#volumeSlider') as HTMLInputElement).style.setProperty('--vol-pct', `${state.volume}%`);
          api.player.setVolume(state.volume / 100).catch(() => {});
          api.store.set('volume', state.volume);
          break;
        case 'KeyM':
          e.preventDefault();
          $('#btnVolume').click();
          break;
        case 'KeyL':
          e.preventDefault();
          $opt('#btnLyrics')?.click();
          break;
        case 'KeyQ':
          e.preventDefault();
          $opt('#btnQueue')?.click();
          break;
        case 'KeyN':
          if (isCtrlOrMeta) {
            e.preventDefault();
            nextSong();
          }
          break;
        case 'KeyP':
          if (isCtrlOrMeta) {
            e.preventDefault();
            prevSong();
          }
          break;
        case 'KeyS':
          e.preventDefault();
          toggleShuffle();
          break;
        case 'KeyR':
          e.preventDefault();
          toggleRepeat();
          break;
        case 'KeyF':
          e.preventDefault();
          api.window.fullscreen();
          break;
        case 'Escape':
          closePanels();
          closeContextMenu();
          break;
      }
    });
  }

  // ── Library Tabs ───────────────────────────
  function setupLibraryTabs() {
    const tabs = document.querySelectorAll('#libraryTabs .tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.libraryTab = (tab as HTMLElement).dataset.tab as any;
        loadLibrary();
      });
    });
  }

  // ── Window Controls ────────────────────────
  function setupWindowControls() {
    $('#tbMinimize').addEventListener('click', () => api.window.minimize());
    $('#tbMaximize').addEventListener('click', () => api.window.maximize());
    $('#tbClose').addEventListener('click', () => api.window.close());
  }

  // ── Playlists ──────────────────────────────
  function setupPlaylists() {
    const modalOpt = $opt('#playlistModal');
    const inputOpt = $opt('#playlistNameInput') as HTMLInputElement | null;
    if (!modalOpt || !inputOpt) {
      dlog('[init] Liste modali eksik, liste kurulumu atlandı');
      return;
    }
    const modal: HTMLElement = modalOpt;
    const input: HTMLInputElement = inputOpt;

    onClick('#btnNewPlaylist', () => {
      input.value = '';
      updatePlaylistCharCount();
      modal.classList.add('visible');
      setTimeout(() => input.focus(), 100);
    });

    onClick('#closePlaylistModal', () => modal.classList.remove('visible'));
    onClick('#cancelPlaylist', () => modal.classList.remove('visible'));

    // Enter ile oluşturma + canlı karakter sayacı (maks 60)
    input.addEventListener('input', updatePlaylistCharCount);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createPlaylistFromInput();
      } else if (e.key === 'Escape') {
        modal.classList.remove('visible');
      }
    });

    function updatePlaylistCharCount() {
      const counter = $opt('#playlistCharCount');
      if (counter) counter.textContent = `${input.value.length}/60`;
    }

    async function createPlaylistFromInput() {
      const name = input.value.trim().slice(0, 60);
      if (!name) {
        showToast('Liste adı boş olamaz', 'warning');
        return;
      }
      const playlists = await api.store.get('playlists') || [];
      const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      playlists.push({ id, name, songs: [], createdAt: Date.now() });
      await api.store.set('playlists', playlists);
      modal.classList.remove('visible');
      showToast(`"${name}" listesi oluşturuldu`, 'success');
      renderPlaylists();
    }

    onClick('#createPlaylist', () => { createPlaylistFromInput(); });

    renderPlaylists();
  }

  async function renderPlaylists() {
    const container = $opt('#playlistsContainer');
    if (!container) return;
    const playlists = await api.store.get('playlists') || [];
    if (!playlists.length) {
      container.innerHTML = '<div class="empty-hint">Henüz liste yok</div>';
      return;
    }
    container.innerHTML = playlists.map((pl: any) => `
      <a class="nav-link" href="#" data-pl="${escapeHtml(pl.id)}" role="button" aria-label="${escapeHtml(pl.name)} listesini aç">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span>${escapeHtml(pl.name)}</span>
      </a>
    `).join('');
    // Oluşturulan listeler tıklanabilir — detay görünümünü açar
    container.querySelectorAll('[data-pl]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const plId = (link as HTMLElement).dataset.pl;
        if (plId) openLocalPlaylist(plId);
      });
    });
  }

  /** Yerel çalma listesinin detay görünümü (şarkılar + toplu oynat). */
  async function openLocalPlaylist(plId: string) {
    const playlists = await api.store.get('playlists') || [];
    const pl = playlists.find((p: any) => p.id === plId);
    if (!pl) {
      showToast('Liste bulunamadı', 'error');
      return;
    }
    navigateTo('library');
    const container = $opt('#libraryContent');
    if (!container) return;
    // Şarkı referansları id veya nesne olabilir — önbellekten çözümlenir
    const songs: Song[] = (pl.songs || []).flatMap((s: any): Song[] => {
      if (!s) return [];
      if (typeof s === 'string') {
        const cached = songCache.get(s);
        return cached ? [cached] : [];
      }
      return [s as Song];
    });
    const backBtn = `<button class="btn btn-ghost browse-back" style="margin-bottom:16px">← Kütüphane</button>`;
    let html = `${backBtn}
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
        <h2 style="font-size:22px;font-weight:700">${escapeHtml(pl.name)}</h2>
        <span style="font-size:12px;color:var(--c-text-2)">${songs.length} parça</span>
      </div>`;
    if (songs.length) {
      html += `<div style="margin-bottom:16px"><button class="btn btn-primary btn-sm" id="btnPlayLocalPlaylist">▶ Tümünü Oynat</button></div>`;
      html += `<div class="song-list">${songs.map((s, i) => songRow(s, i + 1)).join('')}</div>`;
      setContext(songs, pl.name, 'playlist');
    } else {
      html += `<div class="empty-state"><p class="empty-text">Bu liste henüz boş</p><p class="empty-hint-text">Şarkıların ••• menüsünden listeye ekleyin</p></div>`;
    }
    container.innerHTML = html;
    attachSongEvents(container);
    container.querySelector('.browse-back')?.addEventListener('click', () => loadLibrary());
    container.querySelector('#btnPlayLocalPlaylist')?.addEventListener('click', () => {
      if (songs.length) playSong(songs[0]);
    });
  }

  // ── i18n Localization ─────────────────────
  const i18nDict: Record<string, Record<string, string>> = {
    tr: {
      'nav.home': 'Ana Sayfa',
      'nav.search': 'Ara',
      'nav.library': 'Kütüphane',
      'nav.liked': 'Beğenilenler',
      'nav.playlists': 'Oynatma Listeleri',
      'nav.emptyPlaylists': 'Henüz liste yok',
      'nav.login': 'Giriş Yap',
      'nav.settings': 'Ayarlar',
      'settings.languageUpdated': 'Dil Türkçe olarak güncellendi'
    },
    en: {
      'nav.home': 'Home',
      'nav.search': 'Search',
      'nav.library': 'Library',
      'nav.liked': 'Liked Songs',
      'nav.playlists': 'Playlists',
      'nav.emptyPlaylists': 'No playlists yet',
      'nav.login': 'Sign In',
      'nav.settings': 'Settings',
      'settings.languageUpdated': 'Language set to English'
    }
  };

  function applyLanguage(lang: string) {
    const dict = i18nDict[lang] || i18nDict['tr'];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  // ── Settings ───────────────────────────────
  function setupSettings() {
    const themeSelect = $('#settingTheme') as HTMLSelectElement;
    const qualitySelect = $('#settingQuality') as HTMLSelectElement;
    const autoPlay = $('#settingAutoPlay') as HTMLInputElement;
    const langSelect = $('#settingLanguage') as HTMLSelectElement | null;

    api.store.get('theme').then((t: string) => {
      themeSelect.value = t || 'dark';
      applyTheme(t || 'dark');
    });
    api.store.get('quality').then((q: string) => { qualitySelect.value = q || 'high'; });
    api.store.get('autoPlay').then((v: boolean) => { autoPlay.checked = v !== false; });

    if (langSelect) {
      api.store.get('language').then((l: string) => {
        const lang = l || 'tr';
        langSelect.value = lang;
        applyLanguage(lang);
      });
      langSelect.addEventListener('change', () => {
        const selected = langSelect.value || 'tr';
        api.store.set('language', selected);
        applyLanguage(selected);
        const msg = (i18nDict[selected] && i18nDict[selected]['settings.languageUpdated']) || 'Dil güncellendi';
        showToast(msg, 'success');
      });
    }

    themeSelect.addEventListener('change', () => {
      api.store.set('theme', themeSelect.value);
      applyTheme(themeSelect.value);
    });
    qualitySelect.addEventListener('change', () => api.store.set('quality', qualitySelect.value));
    autoPlay.addEventListener('change', () => api.store.set('autoPlay', autoPlay.checked));

    // OAuth settings
    setupOAuthSettings();

    // Dinamik sürüm gösterimi
    const versionEl = document.getElementById('app-version-value');
    if (versionEl) {
      api.autoUpdate?.getUpdateStatus?.().then((res: any) => {
        if (res?.version) {
          versionEl.textContent = `v${res.version}`;
        }
      }).catch(() => {});
    }
  }

  function applyTheme(theme: string) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  async function setupOAuthSettings() {
    try {
      const el = document.getElementById('googleOAuthStatus');
      if (el) el.textContent = 'Yapılandırıldı';
    } catch (e) {
      dlog('Google OAuth durumu okunamadı:', e);
    }
  }

  function setupVolumeLyricsAuthUI(){
    const vr=(document.getElementById('volumeRatioEnabled') as HTMLInputElement); const ly=(document.getElementById('lyricsEnabled') as HTMLInputElement);
    if(vr){ (api as any).volumeRatio.isEnabled().then((v:boolean)=>vr.checked=!!v); vr.addEventListener('change',()=> (api as any).volumeRatio.setEnabled(vr.checked)); }
    if(ly){ (api as any).lyrics.isEnabled().then((v:boolean)=>ly.checked=v!==false); ly.addEventListener('change',()=> (api as any).lyrics.setEnabled(ly.checked)); }
    const listEl=document.getElementById('authClientsList'); const aId=document.getElementById('authAppId') as HTMLInputElement; const aName=document.getElementById('authAppName') as HTMLInputElement; const btn=document.getElementById('authCreateBtn');
    async function refresh(){ if(!listEl) return; const cs:any[]=await (api as any).authClients.list(); listEl.innerHTML= cs.length? cs.map(c=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--c-border)"><span>${escapeHtml(c.appName)} (${escapeHtml(c.appId)})</span><button data-revoke="${escapeHtml(c.appId)}" style="color:var(--c-error)">Sil</button></div>`).join('') : '<em>Henüz bağlı uygulama yok</em>'; listEl.querySelectorAll('[data-revoke]').forEach(b=> b.addEventListener('click', async()=>{ await (api as any).authClients.revoke((b as HTMLElement).dataset.revoke!); refresh(); })); }
    refresh(); btn?.addEventListener('click', async()=>{ const appId=(aId.value||'').trim().slice(0,120); const appName=(aName.value||'').trim().slice(0,60); if(!appId||!appName) return showToast('appId ve ad gerekli','warning'); await (api as any).authClients.create({appId, appName}); aId.value=''; aName.value=''; refresh(); showToast('İstemci eklendi','success'); });
  }
  function setupDiscord() {
    const enabledToggle = $('#discordEnabled') as HTMLInputElement;
    const buttonsToggle = $('#discordButtons') as HTMLInputElement;
    const thumbsToggle = $('#discordThumbnails') as HTMLInputElement;
    const statusEl = $('#discordConnectionStatus');

    // ytmdesktop2 referans: discord.enabled / buttons / thumbnails
    api.store.get('discordEnabled').then((v: any) => { if (v !== undefined) enabledToggle.checked = !!v; });
    api.store.get('discordButtons').then((v: any) => { if (v !== undefined) buttonsToggle.checked = !!v; });
    api.store.get('discordThumbnails').then((v: any) => { if (v !== undefined) thumbsToggle.checked = !!v; });
    enabledToggle.addEventListener('change', () => { api.store.set('discordEnabled', enabledToggle.checked); if (!enabledToggle.checked) { api.discord.clearActivity().catch(()=>{}); statusEl.textContent = 'Kapalı'; } else { (api.discord as any).reconnect?.().catch(()=>{}).finally(() => refreshDiscordStatus()); } });
    buttonsToggle.addEventListener('change', () => api.store.set('discordButtons', buttonsToggle.checked));
    thumbsToggle.addEventListener('change', () => api.store.set('discordThumbnails', thumbsToggle.checked));

    // RPC durumu (tokensuz — Discord masaüstü uygulaması gerekli).
    // Bağlı değilse yeniden bağlanmayı dene (ana süreç 45sn throttle uygular).
    async function refreshDiscordStatus() {
      try {
        let ok = await api.discord.isReady();
        if (!ok && enabledToggle.checked) {
          ok = await (api.discord as any).reconnect?.().catch((e: unknown) => {
            dlog('Discord yeniden bağlanma hatası:', e);
            return false;
          }) ?? false;
        }
        statusEl.textContent = ok ? '✓ Bağlı (RPC)' : 'Discord uygulaması bekleniyor...';
      } catch (e) {
        dlog('Discord durum okunamadı:', e);
        statusEl.textContent = '—';
      }
    }
    refreshDiscordStatus();
    const discordStatusTimer = setInterval(() => { if (enabledToggle.checked) refreshDiscordStatus(); }, 15000);
    // Sayfa kapanırken zamanlayıcıyı temizle (sızıntı önlenir)
    window.addEventListener('pagehide', () => clearInterval(discordStatusTimer), { once: true });

    // Discord hesabı (resmi OAuth2 — token yapıştırma yok)
    const accName = $('#discordAccountName');
    const accAvatar = $('#discordAvatar') as HTMLImageElement;
    const loginBtn = $('#btnDiscordLogin');
    const logoutBtn = $('#btnDiscordLogout');
    async function refreshDiscordAccount() {
      try {
        const u: any = await (api as any).discordAuth.getUser();
        if (u) {
          if (accName) accName.textContent = u.name || u.username || 'Bağlı';
          if (u.picture) {
            accAvatar.src = u.picture;
            accAvatar.alt = `${u.name || u.username || 'Discord'} avatarı`;
            accAvatar.style.display = 'block';
          } else {
            accAvatar.style.display = 'none';
          }
          loginBtn.style.display = 'none';
          logoutBtn.style.display = 'flex';
        } else {
          if (accName) accName.textContent = 'Bağlı değil';
          accAvatar.style.display = 'none';
          loginBtn.style.display = 'flex';
          logoutBtn.style.display = 'none';
        }
      } catch (e) {
        dlog('Discord hesabı okunamadı:', e);
        if (accName) accName.textContent = 'Bağlı değil';
      }
    }
    refreshDiscordAccount();
    loginBtn.addEventListener('click', async () => {
      const r: any = await (api as any).discordAuth.login().catch((e: any) => ({ success: false, error: String(e?.message || e) }));
      if (r?.success) {
        showToast('Discord girişi başarılı.', 'success');
        refreshDiscordAccount();
      } else {
        showToast(r?.error || 'Discord girişi başarısız.', 'error');
      }
    });
    logoutBtn.addEventListener('click', async () => {
      await (api as any).discordAuth.logout().catch((e: unknown) => dlog('Discord çıkışı hatası:', e));
      refreshDiscordAccount();
      showToast('Discord çıkışı yapıldı.', 'info');
    });
    const inviteBtn = $('#btnDiscordInvite');
    inviteBtn?.addEventListener('click', () => {
      api.shell?.openExternal?.('https://discord.gg/aquality');
    });
  }

  function setupDiscordBot() {
    const serverStatusEl = $('#discordBotServerStatus');
    const processStatusEl = $('#discordBotProcessStatus');
    const openUrlBtn = $('#btnOpenBotStateUrl');
    const copyUrlBtn = $('#btnCopyBotStateUrl');
    const startBotBtn = $('#btnStartDiscordBot');
    const stopBotBtn = $('#btnStopDiscordBot');
    const tokenInput = $('#discordBotTokenInput') as HTMLInputElement;
    const logsEl = $('#discordBotLogs');
    const openDocsBtn = $('#btnOpenBotDocs');
    const openFolderBtn = $('#btnOpenBotFolder');

    const STATE_URL = 'http://127.0.0.1:9863/api/v1/state';

    // 1. REST API Durumu
    async function checkServerStatus() {
      try {
        const running = await (api as any).botServer?.isRunning?.();
        if (serverStatusEl) {
          if (running) {
            serverStatusEl.textContent = '● Aktif (Port: 9863)';
            serverStatusEl.style.color = '#10b981';
          } else {
            serverStatusEl.textContent = '○ Kapalı';
            serverStatusEl.style.color = 'var(--c-text-3)';
          }
        }
      } catch (e) {
        dlog('Bot sunucu durumu okunamadı:', e);
      }
    }
    checkServerStatus();

    // 2. Butonlar: URL Aç & Kopyala
    openUrlBtn?.addEventListener('click', () => {
      api.shell?.openExternal?.(STATE_URL);
    });

    copyUrlBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(STATE_URL);
        showToast('REST API adresi panoya kopyalandı!', 'success');
      } catch {
        showToast('Kopyalama başarısız oldu.', 'error');
      }
    });

    // 3. Doküman & Klasör
    openDocsBtn?.addEventListener('click', () => {
      api.shell?.openExternal?.('https://aqualitymusic.vercel.app/bot');
    });

    openFolderBtn?.addEventListener('click', async () => {
      const res = await (api as any).botServer?.openFolder?.();
      if (res?.success) {
        showToast('Bot klasörü açıldı.', 'info');
      } else {
        showToast(res?.error || 'Bot klasörü açılamadı.', 'error');
      }
    });

    // 4. Token Yükleme ve Kaydetme
    api.store.get('discordBotToken').then((val: any) => {
      if (val && typeof val === 'string' && tokenInput) {
        tokenInput.value = val;
      }
    });

    tokenInput?.addEventListener('change', () => {
      api.store.set('discordBotToken', tokenInput.value.trim());
    });

    // 5. Bot Süreci Durum Senkronizasyonu
    function appendLog(line: string) {
      if (!logsEl) return;
      logsEl.style.display = 'block';
      logsEl.textContent = ((logsEl.textContent || '') + '\n' + line).trim().slice(-1500);
      logsEl.scrollTop = logsEl.scrollHeight;
    }

    async function refreshBotProcessStatus() {
      try {
        const info = await (api as any).botServer?.getBotStatus?.();
        if (!info) return;

        if (processStatusEl) {
          if (info.status === 'running' || info.isRunning) {
            processStatusEl.textContent = '● Bot Çalışıyor';
            processStatusEl.style.color = '#10b981';
            if (startBotBtn) startBotBtn.style.display = 'none';
            if (stopBotBtn) stopBotBtn.style.display = 'inline-block';
          } else if (info.status === 'starting') {
            processStatusEl.textContent = '⏳ Başlatılıyor...';
            processStatusEl.style.color = '#f59e0b';
          } else if (info.status === 'error') {
            processStatusEl.textContent = '✕ Hata: ' + (info.error || 'Bilinmiyor');
            processStatusEl.style.color = '#ef4444';
            if (startBotBtn) startBotBtn.style.display = 'inline-block';
            if (stopBotBtn) stopBotBtn.style.display = 'none';
          } else {
            processStatusEl.textContent = 'Durduruldu';
            processStatusEl.style.color = 'var(--c-text-3)';
            if (startBotBtn) startBotBtn.style.display = 'inline-block';
            if (stopBotBtn) stopBotBtn.style.display = 'none';
          }
        }
      } catch (e) {
        dlog('Bot süreç durumu okunamadı:', e);
      }
    }

    refreshBotProcessStatus();

    // Event listener'lar (IPC)
    (api as any).botServer?.onLog?.((log: string) => {
      appendLog(log);
    });

    (api as any).botServer?.onStatusChanged?.(() => {
      refreshBotProcessStatus();
    });

    // Başlat butonu
    startBotBtn?.addEventListener('click', async () => {
      const token = tokenInput?.value?.trim();
      if (!token) {
        showToast('Lütfen geçerli bir Discord Bot Token girin!', 'error');
        tokenInput?.focus();
        return;
      }
      await api.store.set('discordBotToken', token);

      if (processStatusEl) {
        processStatusEl.textContent = '⏳ Başlatılıyor...';
        processStatusEl.style.color = '#f59e0b';
      }
      if (logsEl) {
        logsEl.style.display = 'block';
        logsEl.textContent = 'Bot işlemi başlatılıyor...\n';
      }

      const res = await (api as any).botServer?.startBot?.(token);
      if (res?.success) {
        showToast('Discord botu başarıyla başlatıldı!', 'success');
        refreshBotProcessStatus();
      } else {
        showToast(res?.error || 'Bot başlatılamadı.', 'error');
        refreshBotProcessStatus();
      }
    });

    // Durdur butonu
    stopBotBtn?.addEventListener('click', async () => {
      const res = await (api as any).botServer?.stopBot?.();
      if (res?.success) {
        showToast('Discord botu durduruldu.', 'info');
        refreshBotProcessStatus();
      } else {
        showToast(res?.error || 'Bot durdurulamadı.', 'error');
      }
    });
  }

  // ── Init ───────────────────────────────────
  async function init() {
    console.log('[Renderer] init() starting...');
    
    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('[Renderer] Global error:', e.message, e.filename, e.lineno);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[Renderer] Unhandled rejection:', e.reason);
    });

    setupNav();
    setupSearch();
    setupPlayer();
    setupPanels();
    setupWindowControls();
    setupPlaylists();
    setupSettings();
    setupAuth();
    setupDiscord();
    setupDiscordBot();
    setupVolumeLyricsAuthUI();
    setupKeyboardShortcuts();
    setupMediaSession();
    setupLibraryTabs();

    // Check auth state
    await checkAuthState();

    // Load saved liked songs
    const savedLikes: string[] = await api.store.get('likedSongs') || [];
    savedLikes.forEach((id) => state.liked.add(id));

    // Load saved volume
    const savedVol = await api.store.get('volume');
    if (savedVol != null) {
      // Eski format: 0-1 arası (0.8) → yeni format: 0-100 (80)
      state.volume = savedVol <= 1 ? Math.round(savedVol * 100) : savedVol;
    } else {
      state.volume = 50;
    }
    state.lastVolume = state.volume > 0 ? state.volume : 50;
    const slider = $('#volumeSlider') as HTMLInputElement;
    if (slider) {
      slider.value = String(state.volume);
      slider.style.setProperty('--vol-pct', `${state.volume}%`);
    }
    const btnVol = $opt('#btnVolume');
    if (btnVol) {
      btnVol.innerHTML = volumeIconSvg(state.volume);
    }
    // Başlangıç ses seviyesini hemen player'a aktar
    api.player.setVolume(Math.max(0, Math.min(100, state.volume)) / 100).catch((e: unknown) => dlog('Başlangıç sesi ayarlanamadı:', e));

    // Load saved queue (önceki oturumdan kalan sıra)
    await restoreQueue();

    // Load saved shuffle/repeat
    const savedShuffle = await api.store.get('shuffle');
    if (savedShuffle != null) {
      state.shuffle = !!savedShuffle;
      const shuffleBtn = $opt('#btnShuffle');
      if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', state.shuffle);
        shuffleBtn.title = state.shuffle ? 'Karıştırma: Açık' : 'Karıştırma: Kapalı';
      }
      if (state.shuffle && state.queue.length) {
        const indices = state.queue.map((_, i) => i);
        const curIdx = state.queueIndex >= 0 ? state.queueIndex : 0;
        const remaining = indices.filter((i) => i !== curIdx);
        state.shuffleOrder = [curIdx, ...FisherYatesShuffle(remaining)];
      }
    }
    const savedRepeat = await api.store.get('repeat');
    if (savedRepeat === 'off' || savedRepeat === 'all' || savedRepeat === 'one') {
      state.repeat = savedRepeat;
      const repeatBtn = $opt('#btnRepeat');
      if (repeatBtn) {
        repeatBtn.classList.toggle('active', state.repeat !== 'off');
        if (state.repeat === 'one') {
          repeatBtn.title = 'Tekrar: Tek Parça';
          repeatBtn.innerHTML = REPEAT_ICONS.one;
        } else if (state.repeat === 'all') {
          repeatBtn.title = 'Tekrar: Tümü';
          repeatBtn.innerHTML = REPEAT_ICONS.all;
        } else {
          repeatBtn.title = 'Tekrar: Kapalı';
          repeatBtn.innerHTML = REPEAT_ICONS.off;
        }
      }
    }

    navigateTo('home');
  }

  // ES modülleri ertelenmeli yüklendiği için DOMContentLoaded kaçmış olabilir
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
