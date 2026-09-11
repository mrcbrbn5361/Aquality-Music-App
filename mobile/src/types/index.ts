export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  thumbnail: string;
  duration: number;
  durationText?: string;
  album?: string;
  isVideo?: boolean;
}

export interface HomeSection {
  id: string;
  title: string;
  items: Song[];
}

export interface QueueItem extends Song {}

export interface Album {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  year?: string;
}

export interface Artist {
  id: string;
  name: string;
  thumbnail: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: string[];
  createdAt: number;
}

export type SearchFilter = 'all' | 'songs' | 'videos' | 'albums' | 'artists';
