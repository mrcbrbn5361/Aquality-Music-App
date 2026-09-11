import { Song, Album, Artist, SearchFilter, HomeSection, LyricsData } from '../types';

const BASE_URL = 'https://music.youtube.com/youtubei/v1';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'X-YouTube-Client-Name': '67',
  'X-YouTube-Client-Version': '1.20250801.00.00',
  'Origin': 'https://music.youtube.com',
  'Referer': 'https://music.youtube.com/'
};

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20250801.00.00',
    hl: 'tr',
    gl: 'TR'
  }
};

const SEARCH_PARAMS: Record<string, string> = {
  songs: 'EgWKAQIIAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  videos: 'EgWKAQIQAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  albums: 'EgWKAQIBAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  artists: 'EgWKAQIgAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D'
};

export class InnerTubeMobileApi {
  private async request<T = any>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const payload = {
      context: INNERTUBE_CONTEXT,
      ...body
    };

    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`InnerTube ${endpoint} error: ${res.status} - ${errText.substring(0, 200)}`);
    }

    return res.json();
  }

  private text(obj: any): string {
    if (!obj) return '';
    if (Array.isArray(obj.runs)) return obj.runs.map((r: any) => r.text).join('');
    return obj.simpleText || '';
  }

  private thumb(obj: any): string {
    try {
      const thumbs =
        obj?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        obj?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        obj?.thumbnails;
      if (Array.isArray(thumbs) && thumbs.length > 0) {
        return thumbs[thumbs.length - 1].url || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  private duration(str: string): number {
    if (!str) return 0;
    const p = str.split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  private parseSong(item: any): Song | null {
    const r = item?.musicResponsiveListItemRenderer;
    if (!r) return null;

    const videoId =
      r.playlistItemData?.videoId ||
      r.navigationEndpoint?.watchEndpoint?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
      '';

    if (!videoId) return null;

    const col0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
    const col1 = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
    const col2 = r.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text;

    const title = this.text(col0);
    let artist = this.text(col1);
    let album = this.text(col2);
    let duration = 0;

    if (r.fixedColumns?.length) {
      for (const fc of r.fixedColumns) {
        const fStr = this.text(fc.musicResponsiveListItemFixedColumnRenderer?.text);
        duration = this.duration(fStr);
        if (duration > 0) break;
      }
    }

    if (!duration && r.flexColumns?.length) {
      for (const fc of r.flexColumns) {
        const fStr = this.text(fc.musicResponsiveListItemFlexColumnRenderer?.text);
        if (/^\d+:\d{2}(:\d{2})?$/.test(fStr.trim())) {
          duration = this.duration(fStr.trim());
          if (duration > 0) break;
        }
      }
    }

    if (artist) {
      const parts = artist.split(/[•·]/).map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 1) {
        const durIdx = parts.findIndex((p: string) => /^\d+:\d{2}(:\d{2})?$/.test(p));
        if (durIdx !== -1) {
          if (!duration) duration = this.duration(parts[durIdx]);
          parts.splice(durIdx, 1);
        }
        const nonMeta = parts.filter(
          (p) => !/^(video|şarkı|song|track|episode|bölüm|album|albüm)$/i.test(p) && !/\bgörüntüleme\b|\bviews\b/i.test(p)
        );
        if (nonMeta.length >= 1) {
          artist = nonMeta[0];
          if (nonMeta.length >= 2 && !album) album = nonMeta[1];
        } else if (parts.length >= 1) {
          artist = parts[0];
        }
      }
    }

    const isVideo = /(video|klip|visualizer|official)/i.test(title) || /video/i.test(this.text(col1));

    return {
      id: videoId,
      title: title || 'Bilinmeyen Parça',
      artist: artist || 'Bilinmeyen Sanatçı',
      thumbnail: this.thumb(r) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration,
      durationText: duration > 0 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : undefined,
      album: album || undefined,
      isVideo
    };
  }

  private parseTwoRow(item: any): Song | Album | null {
    const r = item?.musicTwoRowItemRenderer;
    if (!r) return null;

    const nav = r.navigationEndpoint;
    const title = this.text(r.title);
    const thumb = this.thumb(r);
    const subtitle = this.text(r.subtitle);

    if (nav?.watchEndpoint?.videoId) {
      let duration = 0;
      let album = '';
      const parts = subtitle.split(/[•·]/).map((p: string) => p.trim()).filter(Boolean);
      const durIdx = parts.findIndex((p: string) => /^\d+:\d{2}(:\d{2})?$/.test(p));
      if (durIdx !== -1) {
        duration = this.duration(parts[durIdx]);
        parts.splice(durIdx, 1);
      }
      const artist = parts[0] || '';
      if (parts[1]) album = parts[1];

      const isVideo = /(video|klip|visualizer|official)/i.test(title) || /video/i.test(subtitle);

      return {
        id: nav.watchEndpoint.videoId,
        title,
        artist,
        thumbnail: thumb || `https://i.ytimg.com/vi/${nav.watchEndpoint.videoId}/hqdefault.jpg`,
        duration,
        album,
        isVideo
      } as Song;
    }

    const browseId: string = nav?.browseEndpoint?.browseId || '';
    if (browseId && (browseId.startsWith('MPRE') || /albüm|album/i.test(subtitle))) {
      return {
        id: browseId,
        title,
        artist: subtitle.split(/[•·]/)[0]?.trim() || '',
        thumbnail: thumb
      } as Album;
    }

    return null;
  }

  /**
   * YouTube Music arama işlemi (Tüm formatları tarar)
   */
  async search(query: string, filter: SearchFilter = 'all'): Promise<{
    songs: Song[];
    videos: Song[];
    albums: Album[];
    artists: Artist[];
  }> {
    try {
      const body: Record<string, unknown> = { query };
      if (SEARCH_PARAMS[filter]) {
        body.params = SEARCH_PARAMS[filter];
      }

      const data = await this.request('search', body);
      const songs: Song[] = [];
      const videos: Song[] = [];
      const albums: Album[] = [];
      const artists: Artist[] = [];

      let contents: any[] = [];
      contents = (data as any)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      if (!contents.length) {
        const tabs = (data as any)?.contents?.tabbedSearchResultsRenderer?.tabs;
        if (tabs) {
          for (const tab of tabs) {
            const tabContents = tab?.tabRenderer?.content?.sectionListRenderer?.contents;
            if (Array.isArray(tabContents)) contents.push(...tabContents);
          }
        }
      }

      if (!contents.length) {
        contents = (data as any)?.sectionListRenderer?.contents || [];
      }

      for (const section of contents) {
        const shelf = section?.musicShelfRenderer;
        if (shelf) {
          const category = this.text(shelf.title);
          const isVideoCategory = /video/i.test(category);
          for (const item of shelf.contents || []) {
            const song = this.parseSong(item);
            if (song) {
              if (isVideoCategory || song.isVideo) {
                song.isVideo = true;
                videos.push(song);
              } else {
                songs.push(song);
              }
            }
          }
          continue;
        }

        const itemSection = section?.itemSectionRenderer?.contents;
        if (Array.isArray(itemSection)) {
          for (const item of itemSection) {
            const song = this.parseSong(item);
            if (song) songs.push(song);
          }
          continue;
        }

        const carousel = section?.musicCarouselShelfRenderer;
        if (carousel) {
          for (const item of carousel.contents || []) {
            const parsed = this.parseTwoRow(item);
            if (parsed) {
              if ('id' in parsed && (parsed as Song).duration !== undefined) {
                songs.push(parsed as Song);
              } else {
                albums.push(parsed as Album);
              }
            } else {
              const song = this.parseSong(item);
              if (song) songs.push(song);
            }
          }
        }
      }

      return { songs, videos, albums, artists };
    } catch (err) {
      console.error('[InnerTubeMobile] Search error:', err);
      return { songs: [], videos: [], albums: [], artists: [] };
    }
  }

  /**
   * Zengin Ana Sayfa (FEmusic_home + FEmusic_explore + FEmusic_charts birleşik motoru)
   */
  async getHome(): Promise<{
    quickPicks: Song[];
    trending: Song[];
    charts: Song[];
    sections: HomeSection[];
    albums: Album[];
  }> {
    const quickPicks: Song[] = [];
    const trending: Song[] = [];
    const charts: Song[] = [];
    const sections: HomeSection[] = [];
    const albums: Album[] = [];

    // Helper: Bir carousel'ı parse edip listelere ekler
    const parseCarouselSection = (carousel: any) => {
      const headerTitle =
        this.text(carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title) || 'Önerilenler';

      const sectionSongs: Song[] = [];
      for (const it of carousel.contents || []) {
        const parsed = this.parseTwoRow(it);
        if (parsed) {
          if ('id' in parsed && (parsed as Song).duration !== undefined) {
            sectionSongs.push(parsed as Song);
          } else {
            albums.push(parsed as Album);
          }
          continue;
        }

        const song = this.parseSong(it);
        if (song) sectionSongs.push(song);
      }

      if (sectionSongs.length > 0) {
        sections.push({
          id: headerTitle.toLowerCase().replace(/\s+/g, '_'),
          title: headerTitle,
          items: sectionSongs
        });

        if (/hızlı|quick|seçim/i.test(headerTitle)) {
          quickPicks.push(...sectionSongs);
        } else if (/video|klip/i.test(headerTitle)) {
          sectionSongs.forEach((s) => (s.isVideo = true));
          trending.push(...sectionSongs);
        } else {
          trending.push(...sectionSongs);
        }
      }
    };

    try {
      // 1. Ana Sayfa (FEmusic_home - Hızlı seçimler & topluluk listeleri)
      const homeData = await this.request('browse', { browseId: 'FEmusic_home' });
      const homeSections =
        homeData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      for (const section of homeSections) {
        if (section?.musicCarouselShelfRenderer) {
          parseCarouselSection(section.musicCarouselShelfRenderer);
        }
      }

      // 2. Keşfet (FEmusic_explore - Yeni albümler, Trendler, Klipler, Türler)
      try {
        const exploreData = await this.request('browse', { browseId: 'FEmusic_explore' });
        const exploreSections =
          exploreData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const section of exploreSections) {
          if (section?.musicCarouselShelfRenderer) {
            parseCarouselSection(section.musicCarouselShelfRenderer);
          }
        }
      } catch (e) {
        console.warn('[InnerTubeMobile] Explore non-fatal error:', e);
      }

      // 3. Trendler & Popüler Parçalar (FEmusic_charts - Türkiye & Global Top Hits)
      try {
        const chartsData = await this.request('browse', { browseId: 'FEmusic_charts' });
        const chartSections =
          chartsData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const sec of chartSections) {
          const shelf = sec?.musicCarouselShelfRenderer || sec?.musicShelfRenderer;
          if (!shelf) continue;
          const shelfTitle = this.text(shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title || shelf.title) || 'En Çok Dinlenenler';
          const items = shelf.contents || [];

          const chartSongs: Song[] = [];
          for (const item of items) {
            const song = this.parseSong(item) || (this.parseTwoRow(item) as Song);
            if (song && song.id) {
              chartSongs.push(song);
              charts.push(song);
            }
          }

          if (chartSongs.length > 0) {
            sections.push({
              id: 'charts_' + shelfTitle.toLowerCase().replace(/\s+/g, '_'),
              title: shelfTitle,
              items: chartSongs
            });
          }
        }
      } catch (e) {
        console.warn('[InnerTubeMobile] Charts non-fatal error:', e);
      }

      // Fallback
      if (trending.length === 0) {
        trending.push(...charts, ...quickPicks);
      }
    } catch (err) {
      console.error('[InnerTubeMobile] getHome error:', err);
    }

    return { quickPicks, trending, charts, sections, albums };
  }

  /**
   * Albüm, Oynatma Listesi veya Sanatçı Detaylarını Çek (Browse)
   */
  async browse(browseId: string, params?: string): Promise<{ title: string; items: Song[] }> {
    try {
      const body: Record<string, unknown> = { browseId };
      if (params) body.params = params;

      const data = await this.request('browse', body);
      const items: Song[] = [];

      const contents =
        data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
        data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents;

      if (Array.isArray(contents)) {
        for (const section of contents) {
          const shelf = section?.musicShelfRenderer || section?.musicPlaylistShelfRenderer;
          if (shelf) {
            for (const item of shelf.contents || []) {
              const song = this.parseSong(item);
              if (song) items.push(song);
            }
            continue;
          }

          const carousel = section?.musicCarouselShelfRenderer;
          if (carousel) {
            for (const item of carousel.contents || []) {
              const parsed = this.parseTwoRow(item);
              if (parsed && 'id' in parsed) items.push(parsed as Song);
            }
          }
        }
      }

      let title = '';
      const hdr = data?.header;
      if (hdr?.musicDetailHeaderRenderer?.title) {
        title = this.text(hdr.musicDetailHeaderRenderer.title);
      } else if (hdr?.musicResponsiveHeaderRenderer?.title) {
        title = this.text(hdr.musicResponsiveHeaderRenderer.title);
      }

      return { title, items };
    } catch (err) {
      console.error('[InnerTubeMobile] Browse error:', err);
      return { title: '', items: [] };
    }
  }

  /**
   * Benzer parça / Sonsuz radyo kuyruğu
   */
  async getNext(videoId: string): Promise<Song[]> {
    try {
      const data = await this.request('next', { videoId });
      const items: Song[] = [];
      const tabs =
        data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];

      for (const tab of tabs) {
        const panel = tab?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];
        for (const pv of panel) {
          const item = pv?.playlistPanelVideoRenderer;
          if (item?.videoId) {
            items.push({
              id: item.videoId,
              title: this.text(item.title),
              artist: this.text(item.shortBylineText),
              thumbnail: item.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
              duration: this.duration(this.text(item.lengthText))
            });
          }
        }
      }
      return items;
    } catch (e) {
      console.warn('[InnerTubeMobile] getNext error:', e);
      return [];
    }
  }

  /**
   * Anlık arama önerileri
   */
  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const data = await this.request('music/get_search_suggestions', {
        input: query
      });
      const contents = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [];
      const suggestions: string[] = [];
      for (const item of contents) {
        const text = this.text(item?.searchSuggestionRenderer?.suggestion);
        if (text) suggestions.push(text);
      }
      return suggestions;
    } catch {
      return [];
    }
  }

  /**
   * Şarkı sözlerini YouTube Music InnerTube veya LRCLIB üzerinden çeker
   */
  async getLyrics(videoId: string, title?: string, artist?: string): Promise<LyricsData | null> {
    try {
      // 1. YouTube Music Next endpointinden FEmusic_lyrics browseId'yi bul
      const nextData = await this.request('next', { videoId });
      const tabs =
        nextData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];

      let lyricsBrowseId = '';
      for (const tab of tabs) {
        const bId = tab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
        if (
          bId &&
          (bId.includes('lyrics') ||
            bId.startsWith('FEmusic_lyrics') ||
            tab?.tabRenderer?.title === 'Lyrics' ||
            tab?.tabRenderer?.title === 'Sözler')
        ) {
          lyricsBrowseId = bId;
          break;
        }
      }

      if (lyricsBrowseId) {
        const lyricsData = await this.request('browse', { browseId: lyricsBrowseId });
        const contents = lyricsData?.contents?.sectionListRenderer?.contents || [];
        for (const sec of contents) {
          const shelf = sec?.musicDescriptionShelfRenderer;
          if (shelf?.description) {
            const raw = this.text(shelf.description);
            if (raw && raw.trim().length > 0) {
              const lines = raw
                .split('\n')
                .map((l: string) => l.trim())
                .filter((l: string) => l.length > 0);
              return {
                videoId,
                lines,
                source: 'YouTube Music'
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[InnerTubeMobile] getLyrics InnerTube error:', e);
    }

    // 2. Fallback: LRCLIB (açık kaynaklı şarkı sözü servisi)
    if (title && artist) {
      try {
        const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const cleanArtist = artist.split(/[•·,]/)[0].trim();
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const lrcJson = await res.json();
          if (lrcJson.plainLyrics) {
            const lines = lrcJson.plainLyrics
              .split('\n')
              .map((l: string) => l.trim())
              .filter((l: string) => l.length > 0);
            return {
              videoId,
              lines,
              source: 'LRCLIB'
            };
          }
        }
      } catch {
        // Sessiz hata toleransı
      }
    }

    return null;
  }
}

export const mobileApi = new InnerTubeMobileApi();
