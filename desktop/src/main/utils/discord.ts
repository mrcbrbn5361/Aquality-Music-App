import { Client } from 'discord-rpc';
import Store from 'electron-store';

interface StoreType {
  discordAppId: string;
}

// Discord Application ID — uygulamaya entegre
// Discord Developer Portal'daki "Aquality Music" uygulamasi icin alindi
// (Portal'daki uygulama adi RPC basligi olarak gorunur)
export const DISCORD_APP_ID = '1547602880427724841';

// Resmi topluluk sunucusu
export const DISCORD_INVITE_URL = 'https://discord.gg/aquality';

const store = new Store<StoreType>({ name: 'aquality-music-settings', defaults: { discordAppId: '' } });

export class DiscordRPC {
  private client: Client | null = null;
  private isConnected = false;
  private currentAppId = '';
  private connecting = false;

  async connect(): Promise<void> {
    await this.connectWithId(DISCORD_APP_ID);
  }

  async connectWithId(appId: string): Promise<void> {
    // Art arda bağlanma isteklerini tekle (15sn'lik durum yoklaması çakışmasın)
    if (this.connecting) return;
    this.connecting = true;
    try {
      await this.doConnect(appId);
    } finally {
      this.connecting = false;
    }
  }

  private async doConnect(appId: string): Promise<void> {
    if (this.client) {
      this.disconnect();
    }

    this.currentAppId = appId;
    store.set('discordAppId', appId);

    try {
      this.client = new Client({ transport: 'ipc' });

      const connectPromise = new Promise<void>((resolve) => {
        this.client!.on('ready', () => {
          this.isConnected = true;
          console.log('[Discord] Rich Presence bağlandı');
          resolve();
        });
      });

      const loginPromise = this.client.login({ clientId: appId });

      // 3 sn timeout — Discord çalışmıyorsa açılışı geciktirmesin
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      await Promise.race([Promise.all([connectPromise, loginPromise]), timeoutPromise]);
    } catch (err) {
      console.log('[Discord] Rich Presence bağlanamadı (Discord açık olmayabilir)');
      this.isConnected = false;
      try { this.client?.destroy(); } catch {}
      this.client = null;
    }
  }

  getAppId(): string {
    return DISCORD_APP_ID;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async setActivity(data: {
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
  }): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      // Discord IPC sınırı: details & state maks 128 karakter
      const safeDetails = (data.details || '').slice(0, 128);
      const safeState = (data.state || '').slice(0, 128);

      // Kapak çözümleme (ytmdesktop2 referans: RPC'de external http URL direkt denenir)
      const cover = (data.coverUrl || data.largeImageKey || '') as string;
      let largeImage: string | undefined;
      let largeText: string | undefined;
      if (cover && cover.startsWith('http')) {
        largeImage = cover.slice(0, 256);
        largeText = (data.largeImageText || data.details || 'Aquality Music').slice(0, 128);
      } else if (typeof data.largeImageKey === 'string' && data.largeImageKey && data.largeImageKey !== '?') {
        largeImage = data.largeImageKey.slice(0, 256);
        largeText = (data.largeImageText || 'Aquality Music').slice(0, 128);
      } else if (typeof data.coverUrl === 'string' && data.coverUrl) {
        largeText = (data.largeImageText || data.details || 'Aquality Music').slice(0, 128);
      }

      const assets: Record<string, string> = {};
      if (largeImage) assets.large_image = largeImage;
      if (largeText) assets.large_text = largeText;
      if (typeof data.smallImageKey === 'string' && data.smallImageKey && !data.smallImageKey.startsWith('http')) {
        assets.small_image = data.smallImageKey.slice(0, 256);
        assets.small_text = (data.smallImageText || '').slice(0, 128);
      }

      const activity: Record<string, unknown> = {
        // 2 = Listening → "Oynuyor" yerine "Dinliyor".
        type: data.type ?? 2,
        details: safeDetails,
        state: safeState || undefined,
        instance: false
      };
      if (typeof data.startTimestamp === 'number' || typeof data.endTimestamp === 'number') {
        const timestamps: Record<string, number> = {};
        if (typeof data.startTimestamp === 'number') timestamps.start = data.startTimestamp;
        if (typeof data.endTimestamp === 'number') timestamps.end = data.endTimestamp;
        activity.timestamps = timestamps;
      }
      if (Object.keys(assets).length > 0) activity.assets = assets;
      if (data.buttons && data.buttons.length > 0) {
        activity.buttons = data.buttons.slice(0, 2).map((b) => ({ label: (b.label || '').slice(0, 32), url: b.url }));
      }

      try {
        await (this.client as any).request('SET_ACTIVITY', { pid: process.pid, activity });
      } catch (rawErr: any) {
        // Discord type'ı reddederse klasik yola düş (Oynuyor görünür ama çalışmaya devam eder)
        console.error('[Discord] Ham activity reddedildi, klasik yola dönülüyor:', rawErr?.message || rawErr);
        await this.client.setActivity({
          details: safeDetails,
          state: safeState,
          largeImageKey: largeImage,
          largeImageText: largeText,
          smallImageKey: data.smallImageKey,
          smallImageText: data.smallImageText,
          startTimestamp: data.startTimestamp,
          endTimestamp: data.endTimestamp,
          instance: false,
          buttons: data.buttons?.slice(0, 2).map((b) => ({ label: (b.label || '').slice(0, 32), url: b.url }))
        } as any);
      }
    } catch (err) {
      console.error('[Discord] Activity ayarlanamadı:', err);
    }
  }

  async clearActivity(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.clearActivity();
    } catch (err) {
      console.error('[Discord] Activity temizlenemedi:', err);
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.destroy();
      this.isConnected = false;
      this.client = null;
    }
  }
}
