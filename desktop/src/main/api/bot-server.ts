import * as http from 'http';
import * as crypto from 'crypto';
import { app } from 'electron';

export interface BotServerTrack {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
  durationFormatted?: string;
  currentTime?: number;
  currentTimeFormatted?: string;
  progress?: number;
  url?: string;
}

export interface BotServerRecommendation {
  id?: string;
  title: string;
  artist: string;
  thumbnail?: string;
  url?: string;
}

export interface BotServerState {
  app: string;
  version: string;
  status: 'playing' | 'paused' | 'stopped';
  isPlaying: boolean;
  track: BotServerTrack | null;
  recommendations: BotServerRecommendation[];
  lyrics?: string;
  updatedAt: number;
}

export class BotServer {
  private server: http.Server | null = null;
  private port: number = 9863;
  private active: boolean = false;
  private apiToken: string = crypto.randomBytes(32).toString('hex');
  private state: BotServerState = {
    app: 'Aquality Music',
    version: this.appVersion(),
    status: 'stopped',
    isPlaying: false,
    track: null,
    recommendations: [],
    updatedAt: Date.now()
  };

  private appVersion(): string {
    try {
      return app.getVersion();
    } catch {
      return '1.0.1';
    }
  }

  constructor(port: number = 9863) {
    this.port = port;
  }

  public getPort(): number {
    return this.port;
  }

  public getApiToken(): string {
    return this.apiToken;
  }

  public isRunning(): boolean {
    return this.active;
  }

  public getState(): BotServerState {
    return this.state;
  }

  /**
   * Renderer'dan gelen kısmi durumu şema doğrulamasından geçirerek uygular.
   * Bilinmeyen alanlar ve yanlış tipler sessizce atılır — böylece ele
   * geçirilmiş bir renderer bot API'sine keyfi veri enjekte edemez.
   */
  public updateState(partial: unknown): void {
    const clean = BotServer.sanitizeStateUpdate(partial);
    if (!clean) return;
    this.state = {
      ...this.state,
      ...clean,
      updatedAt: Date.now()
    };
  }

  private static asString(value: unknown, maxLen: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    return value.slice(0, maxLen);
  }

  private static asNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return value;
  }

  private static sanitizeStateUpdate(partial: unknown): Partial<BotServerState> | null {
    if (!partial || typeof partial !== 'object' || Array.isArray(partial)) return null;
    const input = partial as Record<string, unknown>;
    const out: Partial<BotServerState> = {};

    if (input.status === 'playing' || input.status === 'paused' || input.status === 'stopped') {
      out.status = input.status;
    }
    if (typeof input.isPlaying === 'boolean') {
      out.isPlaying = input.isPlaying;
    }
    if (input.track === null) {
      out.track = null;
    } else if (input.track && typeof input.track === 'object' && !Array.isArray(input.track)) {
      const t = input.track as Record<string, unknown>;
      const track: BotServerTrack = {
        title: BotServer.asString(t.title, 200) ?? '',
        artist: BotServer.asString(t.artist, 200) ?? ''
      };
      const optional: Array<keyof BotServerTrack> = ['id', 'album', 'thumbnail', 'durationFormatted', 'currentTimeFormatted', 'url'];
      for (const key of optional) {
        const v = BotServer.asString(t[key], 500);
        if (v !== undefined) (track as unknown as Record<string, unknown>)[key] = v;
      }
      const numeric: Array<'duration' | 'currentTime' | 'progress'> = ['duration', 'currentTime', 'progress'];
      for (const key of numeric) {
        const v = BotServer.asNumber(t[key]);
        if (v !== undefined) track[key] = v;
      }
      out.track = track;
    }
    if (Array.isArray(input.recommendations)) {
      out.recommendations = input.recommendations.slice(0, 20).flatMap((r): BotServerRecommendation[] => {
        if (!r || typeof r !== 'object') return [];
        const rec = r as Record<string, unknown>;
        const title = BotServer.asString(rec.title, 200);
        const artist = BotServer.asString(rec.artist, 200);
        if (!title || !artist) return [];
        return [{
          id: BotServer.asString(rec.id, 100),
          title,
          artist,
          thumbnail: BotServer.asString(rec.thumbnail, 500),
          url: BotServer.asString(rec.url, 500)
        }];
      });
    }
    const lyrics = BotServer.asString(input.lyrics, 20000);
    if (lyrics !== undefined) out.lyrics = lyrics;

    return out;
  }

  public start(): Promise<boolean> {
    if (this.server && this.active) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        // CORS Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${this.apiToken}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const url = req.url || '/';

        if (url === '/' || url === '/api/v1/state' || url === '/query' || url === '/state') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(this.state, null, 2));
          return;
        }

        if (url === '/api/v1/health' || url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ok', app: 'Aquality Music', version: this.state.version, port: this.port }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found', availableEndpoints: ['/api/v1/state', '/query', '/health'] }));
      });

      this.server.on('error', (err: any) => {
        console.warn(`[BotServer] Port ${this.port} dinlenirken hata:`, err.message);
        this.active = false;
        resolve(false);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.active = true;
        console.log(`[BotServer] Discord Bot REST API aktif: http://127.0.0.1:${this.port}/api/v1/state`);
        resolve(true);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server || !this.active) {
        this.active = false;
        resolve();
        return;
      }
      this.server.close(() => {
        this.active = false;
        this.server = null;
        console.log('[BotServer] Discord Bot REST API sunucusu kapatıldı.');
        resolve();
      });
    });
  }
}
