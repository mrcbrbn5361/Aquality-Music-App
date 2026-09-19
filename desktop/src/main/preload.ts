import { contextBridge, ipcRenderer } from 'electron';

export interface PlayerUpdate {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  currentTime?: number;
  duration?: number;
  playing?: boolean;
  videoMode?: boolean;
  isAd?: boolean;
}

export interface ClientAppInfo {
  appId: string;
  appName: string;
}

const api = {
  debugLog: (msg: string) => ipcRenderer.send('debug:log', msg),

  window: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    fullscreen: () => ipcRenderer.send('win:fullscreen'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
    onMaximized: (cb: (maximized: boolean) => void) => {
      const handler = (_: unknown, maximized: boolean) => cb(maximized);
      ipcRenderer.on('win:maximized', handler);
      return () => ipcRenderer.removeListener('win:maximized', handler);
    }
  },

  youtube: {
    search: (query: string, filter?: string) => ipcRenderer.invoke('yt:search', query, filter),
    player: (videoId: string) => ipcRenderer.invoke('yt:player', videoId),
    home: () => ipcRenderer.invoke('yt:home'),
    browse: (browseId: string, params?: string) => ipcRenderer.invoke('yt:browse', browseId, params),
    next: (videoId: string, playlistId?: string) => ipcRenderer.invoke('yt:next', videoId, playlistId),
    suggestions: (input: string) => ipcRenderer.invoke('yt:suggestions', input),
    lyrics: (videoId: string) => ipcRenderer.invoke('yt:lyrics', videoId),
    libraryPlaylists: () => ipcRenderer.invoke('yt:libraryPlaylists'),
    likedSongs: () => ipcRenderer.invoke('yt:likedSongs'),
    libraryArtists: () => ipcRenderer.invoke('yt:libraryArtists'),
    libraryAlbums: () => ipcRenderer.invoke('yt:libraryAlbums')
  },

  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value)
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },

  auth: {
    loginGoogle: () => ipcRenderer.invoke('auth:loginGoogle'),
    logoutGoogle: () => ipcRenderer.invoke('auth:logoutGoogle'),
    isGoogleAuthenticated: () => ipcRenderer.invoke('auth:isGoogleAuthenticated'),
    getGoogleUser: () => ipcRenderer.invoke('auth:getGoogleUser'),
    loginMusic: () => ipcRenderer.invoke('auth:openChromeLogin'),
    openSystemBrowserLogin: () => ipcRenderer.invoke('auth:openSystemBrowserLogin'),
    importFromChrome: () => ipcRenderer.invoke('auth:importFromChrome'),
    importFromCookieString: (str: string) => ipcRenderer.invoke('auth:importFromCookieString', str),
    logoutMusic: () => ipcRenderer.invoke('auth:logoutMusic'),
    logoutMusicCompletely: () => ipcRenderer.invoke('auth:logoutMusicCompletely'),
    isMusicAuthenticated: () => ipcRenderer.invoke('auth:isMusicAuthenticated'),
    getMusicUser: () => ipcRenderer.invoke('auth:getMusicUser'),
    onDeeplink: (cb: (url: string) => void) => {
      const handler = (_: unknown, url: string) => cb(url);
      ipcRenderer.on('auth:deeplink', handler);
      return () => ipcRenderer.removeListener('auth:deeplink', handler);
    }
  },

  discord: {
    getAppId: () => ipcRenderer.invoke('discord:getAppId'),
    isReady: () => ipcRenderer.invoke('discord:isReady'),
    setActivity: (data: {
      details: string;
      state: string;
      type?: number;
      largeImageKey?: string;
      largeImageText?: string;
      smallImageKey?: string;
      smallImageText?: string;
      startTimestamp?: number;
      endTimestamp?: number;
      coverUrl?: string;
      buttons?: Array<{ label: string; url: string }>;
    }) => ipcRenderer.invoke('discord:setActivity', data),
    clearActivity: () => ipcRenderer.invoke('discord:clearActivity'),
    reconnect: () => ipcRenderer.invoke('discord:reconnect'),
  },

  discordAuth: {
    login: () => ipcRenderer.invoke('discord:login'),
    logout: () => ipcRenderer.invoke('discord:logout'),
    getUser: () => ipcRenderer.invoke('discord:getUser'),
  },

  authClients: {
    list: () => ipcRenderer.invoke('auth:clients'),
    create: (d: ClientAppInfo) => ipcRenderer.invoke('auth:createClient', d),
    revoke: (id: string) => ipcRenderer.invoke('auth:revokeClient', id),
  },
  volumeRatio: { isEnabled: () => ipcRenderer.invoke('volumeRatio:isEnabled'), setEnabled: (v: boolean) => ipcRenderer.invoke('volumeRatio:setEnabled', v) },
  lyrics: { isEnabled: () => ipcRenderer.invoke('lyrics:isEnabled'), setEnabled: (v: boolean) => ipcRenderer.invoke('lyrics:setEnabled', v) },

  autoUpdate: {
    checkForUpdates: () => ipcRenderer.invoke('auto:checkForUpdates'),
    getUpdateStatus: () => ipcRenderer.invoke('auto:getUpdateStatus')
  },

  // Bot REST API (Port 9863) & Discord Bot Runner
  botServer: {
    getState: () => ipcRenderer.invoke('bot-server:get-state'),
    updateState: (partial: unknown) => ipcRenderer.invoke('bot-server:update-state', partial),
    isRunning: () => ipcRenderer.invoke('bot-server:is-running'),
    openFolder: () => ipcRenderer.invoke('bot-server:open-bot-folder'),
    startBot: (token?: string) => ipcRenderer.invoke('bot-server:start-bot', token),
    stopBot: () => ipcRenderer.invoke('bot-server:stop-bot'),
    getBotStatus: () => ipcRenderer.invoke('bot-server:get-bot-status'),
    onLog: (cb: (log: string) => void) => {
      const h = (_: unknown, log: string) => cb(log);
      ipcRenderer.on('bot-server:log', h);
      return () => ipcRenderer.removeListener('bot-server:log', h);
    },
    onStatusChanged: (cb: (data: any) => void) => {
      const h = (_: unknown, data: any) => cb(data);
      ipcRenderer.on('bot-server:status-changed', h);
      return () => ipcRenderer.removeListener('bot-server:status-changed', h);
    }
  },

  // Playback IPC'leri (gizli pencere üzerinden)
  player: {
    pause: () => ipcRenderer.invoke('player:pause'),
    resume: () => ipcRenderer.invoke('player:resume'),
    seek: (s: number) => ipcRenderer.invoke('player:seek', s),
    setVolume: (v: number) => ipcRenderer.invoke('player:setVolume', v),
    next: () => ipcRenderer.invoke('player:next'),
    prev: () => ipcRenderer.invoke('player:prev'),
    skipAd: () => ipcRenderer.invoke('player:skipAd'),
    onUpdate: (cb: (u: PlayerUpdate) => void) => {
      const h = (_: unknown, u: PlayerUpdate) => cb(u);
      ipcRenderer.on('player:update', h);
      return () => ipcRenderer.removeListener('player:update', h);
    }
  }
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
