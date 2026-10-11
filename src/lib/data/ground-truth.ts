import rawGroundTruth from '$lib/data/ground-truth.json';
import type {
	CatalogState,
	GroundTruth,
	PlaybackSeed,
	PlaylistDetail,
	Song,
	TimedLyricsLine
} from '$lib/types';

const source = rawGroundTruth as GroundTruth;

function clone<T>(value: T): T {
	return structuredClone(value);
}

function normalizeDuration(value: unknown): number | undefined {
	if (value == null || value === '') return undefined;
	const duration = Number(value);
	return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

function normalizeSong(song: Song): Song {
	return { ...song, durationSeconds: normalizeDuration(song.durationSeconds) };
}

function catalogFromGroundTruth(): CatalogState {
	const library = source.catalog.library.map(normalizeSong);
	const songsById = new Map(library.map((song) => [song.id, song]));
	const playlists = Object.fromEntries(
		Object.entries(source.catalog.playlists).map(([id, playlist]) => [
			id,
			{
				id: playlist.id,
				title: playlist.title,
				source: playlist.source,
				description: playlist.description,
				songs: playlist.songIds.map((songId) => songsById.get(songId)).filter((song): song is Song => Boolean(song))
			} satisfies PlaylistDetail
		])
	);

	return {
		sections: clone(source.catalog.sections),
		library: clone(library),
		playlists,
		sourceMode: 'mock',
		status: 'ready',
		error: null,
		lastSyncedAt: null,
		playlistIndexStatus: 'ready',
		playlistIndexError: null
	};
}

export function getGroundTruthCatalog() {
	return catalogFromGroundTruth();
}

export const groundTruthCatalog = catalogFromGroundTruth();

export function getGroundTruthPlaybackSeed(): PlaybackSeed {
	const seed = clone(source.playback);
	const canonicalId = (trackId: string | null) => {
		if (!trackId) return null;
		const song = source.catalog.library.find(
			(candidate) => candidate.id === trackId || candidate.youtubeId === trackId
		);
		return song?.id ?? trackId;
	};
	const currentTrackId = canonicalId(seed.currentTrackId);
	const currentSong = source.catalog.library.find((song) => song.id === currentTrackId);
	const duration = normalizeDuration(currentSong?.durationSeconds) ?? 0;
	const progress = Number(seed.progressSeconds);
	return {
		...seed,
		queueTrackIds: seed.queueTrackIds.map((trackId) => canonicalId(trackId) ?? trackId),
		currentTrackId,
		progressSeconds:
			Number.isFinite(progress) && progress > 0 && duration > 0
				? Math.min(progress, duration)
				: 0
	};
}

export function getGroundTruthLyrics(trackId: string): TimedLyricsLine[] {
	const song = source.catalog.library.find(
		(candidate) => candidate.id === trackId || candidate.youtubeId === trackId
	);
	const lyricKeys = [trackId, song?.id, song?.youtubeId].filter(
		(key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index
	);
	const lines = lyricKeys
		.map((key) => source.playback.lyricsByTrackId[key])
		.find((candidate): candidate is TimedLyricsLine[] => Array.isArray(candidate));
	return clone(lines ?? []);
}

export const groundTruthSchemaVersion = source.schemaVersion;
