export type PlaylistSource = 'local' | 'youtube' | 'spotify';
export type ThemePreset =
	| 'original'
	| 'auroraField'
	| 'frostline'
	| 'emberSands'
	| 'tideglass'
	| 'roseBloom'
	| 'cloudVelvet'
	| 'inkMauve'
	| 'plumNight'
	| 'quantumCircuit'
	| 'stormSignal'
	| 'forestMoss';

export type FontFamilyPreset = 'system' | 'serif' | 'monospace' | 'openDyslexic';
export type ThemeMode = 'dark' | 'light';

export interface IconPreferences {
	fill: number;
	weight: number;
	grade: number;
	opticalSize: number;
}

export interface Song {
	id: string;
	title: string;
	artist: string;
	youtubeId?: string;
	available: boolean;
	mediaUrl?: string;
	thumbnailUrl?: string;
	durationSeconds?: number;
}

export interface TimedLyricsLine {
	time: number;
	text: string;
}

export interface GroundTruthPlaylist {
	id: string;
	title: string;
	source: PlaylistSource;
	description?: string;
	songIds: string[];
}

export interface PlaybackSeed {
	queueTrackIds: string[];
	currentTrackId: string | null;
	activeQueueIndex: number;
	isPlaying: boolean;
	progressSeconds: number;
	activePanel: 'overview' | 'queue' | 'lyrics';
	repeatMode: 'off' | 'one' | 'all';
	shuffle: boolean;
	queueOrigin: PlaybackState['queueOrigin'];
	lyricsByTrackId: Record<string, TimedLyricsLine[]>;
}

export interface GroundTruth {
	schemaVersion: number;
	catalog: {
		library: Song[];
		sections: PlaylistBrowserSection[];
		playlists: Record<string, GroundTruthPlaylist>;
	};
	playback: PlaybackSeed;
}

export interface PlaylistBrowserItem {
	playlistId: string;
	title: string;
	source: PlaylistSource;
	externalId?: string;
}

export interface PlaylistBrowserSection {
	title: string;
	source: PlaylistSource;
	playlists: PlaylistBrowserItem[];
}

export interface PlaylistDetail {
	id: string;
	title: string;
	source: PlaylistSource;
	songs: Song[];
	description?: string;
}

export interface AppPreferences {
	frontend: {
		basePath: string;
	};
	api: {
		mode: 'mock' | 'live';
		baseUrl: string;
		basePath: string;
	};
	auth: {
		sessionToken: string;
	};
	ui: {
		theme: ThemePreset;
		themeMode: ThemeMode;
		fontFamily: FontFamilyPreset;
		uiScale: number;
		icons: IconPreferences;
		leftHanded: boolean;
		sidebarCollapsed: boolean;
	};
}

export interface CatalogState {
	sections: PlaylistBrowserSection[];
	library: Song[];
	playlists: Record<string, PlaylistDetail>;
	sourceMode: 'live' | 'mock';
	status: 'idle' | 'loading' | 'ready' | 'error';
	error: string | null;
	lastSyncedAt: string | null;
	playlistIndexStatus: 'idle' | 'loading' | 'ready' | 'error';
	playlistIndexError: string | null;
}

export interface PlaybackState {
	queue: Song[];
	currentTrackId: string | null;
	activeQueueIndex: number;
	isPlaying: boolean;
	progressSeconds: number;
	seekRequestId: number;
	durationSeconds: number;
	activePanel: 'overview' | 'queue' | 'lyrics';
	returnPanel: 'overview' | 'queue' | 'lyrics' | null;
	repeatMode: 'off' | 'one' | 'all';
	shuffle: boolean;
	showExpandedPlayer: boolean;
	queueOrigin:
		| { kind: 'manual' }
		| { kind: 'library'; sortMode: 'artist' | 'title' }
		| { kind: 'playlist'; playlistId: string };
}

export interface UiState {
	settingsOpen: boolean;
	addDialogOpen: boolean;
	addDialogMode: 'track' | 'playlist' | 'create-playlist';
	addDialogSource: PlaylistSource | 'all';
	addDialogQuery: string;
	addDialogTargetPlaylistId: string | null;
	librarySortMode: 'artist' | 'title';
}
