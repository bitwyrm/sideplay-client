import { getGroundTruthCatalog } from '$lib/data/ground-truth';
import {
	loadPlaylistDetail as loadLivePlaylistDetail,
	loadRemoteCatalog as loadLiveCatalog,
	loadRemoteLibrary,
	loadRemotePlaylistIndex
} from '$lib/data/api';
import type { AppPreferences, PlaylistDetail, Song } from '$lib/types';

/** Catalog source selection belongs here; routes and UI state do not know whether data is live or fixture-backed. */
export async function loadCatalog(preferences: AppPreferences) {
	if (preferences.api.mode === 'mock') {
		const catalog = getGroundTruthCatalog();
		return {
			library: catalog.library,
			sections: catalog.sections,
			playlists: catalog.playlists,
			sourceMode: 'mock' as const
		};
	}
	return loadLiveCatalog(preferences);
}

export async function loadLibrary(preferences: AppPreferences) {
	if (preferences.api.mode === 'mock') return getGroundTruthCatalog().library;
	return loadRemoteLibrary(preferences);
}

export async function loadPlaylistIndex(preferences: AppPreferences) {
	if (preferences.api.mode === 'mock') {
		const catalog = getGroundTruthCatalog();
		return { sections: catalog.sections, playlists: catalog.playlists, sourceMode: 'mock' as const };
	}
	return loadRemotePlaylistIndex(preferences);
}

export async function loadPlaylist(preferences: AppPreferences, playlistId: string, library: Song[] = []): Promise<PlaylistDetail> {
	if (preferences.api.mode === 'mock') {
		const catalog = getGroundTruthCatalog();
		return catalog.playlists[playlistId] ?? {
			id: playlistId,
			title: playlistId,
			source: 'local',
			songs: []
		};
	}
	return loadLivePlaylistDetail(preferences, playlistId, library);
}

export type CatalogRepository = {
	loadCatalog: typeof loadCatalog;
	loadPlaylist: typeof loadPlaylist;
};
