import type { AppPreferences, PlaylistBrowserSection, PlaylistDetail, PlaylistSource, Song } from '$lib/types';

type JsonValue = unknown;

type RemoteCatalog = {
	library: Song[];
	sections: PlaylistBrowserSection[];
	playlists: Record<string, PlaylistDetail>;
	sourceMode: 'live' | 'mock';
};

export type RemotePlaylistIndex = {
	sections: PlaylistBrowserSection[];
	playlists: Record<string, PlaylistDetail>;
	sourceMode: 'live' | 'mock';
};

const inFlightLibraryRequests = new Map<string, Promise<Song[]>>();
const inFlightPlaylistIndexRequests = new Map<string, Promise<RemotePlaylistIndex>>();
const inFlightPlaylistRequests = new Map<string, Promise<PlaylistDetail>>();

function joinUrl(baseUrl: string, basePath: string, path: string) {
	const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
	const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
	const url = new URL(normalizedBasePath + trimmedPath, baseUrl);
	const localHttpHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHttpHost)) {
		throw new Error('API URL must use HTTPS, except for local development hosts');
	}
	return url;
}

async function requestJson(
	url: URL,
	init?: RequestInit,
	timeoutMs = 30_000,
	onJsonLine?: (line: JsonValue) => void
): Promise<JsonValue> {
	const controller = new AbortController();
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);
	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal,
			headers: {
				accept: 'application/json',
				...(init?.headers ?? {})
			}
		});

		if (!response.ok) {
			throw new Error(`Request failed (${response.status}) for ${url.pathname}`);
		}

		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/jsonl') || contentType.includes('application/x-ndjson')) {
			const reader = response.body?.getReader();
			if (!reader) return [];
			const decoder = new TextDecoder();
			const records: JsonValue[] = [];
			let pending = '';
			const consumeLine = (line: string) => {
				const trimmed = line.trim();
				if (!trimmed) return;
				let parsed: JsonValue;
				try {
					parsed = JSON.parse(trimmed) as JsonValue;
				} catch {
					throw new Error(`Invalid JSONL response from ${url.pathname}`);
				}
				records.push(parsed);
				onJsonLine?.(parsed);
			};
			try {
				while (true) {
					const { done, value } = await reader.read();
					pending += decoder.decode(value, { stream: !done });
					const lines = pending.split(/\r?\n/);
					pending = lines.pop() ?? '';
					for (const line of lines) consumeLine(line);
					if (done) break;
				}
				consumeLine(pending);
			} finally {
				reader.releaseLock();
			}
			return records;
		}
		if (contentType.includes('application/json')) {
			return response.json();
		}

		return response.text();
	} catch (error) {
		if (timedOut) throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds for ${url.pathname}`);
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

function requireSuccessfulResult<T>(result: T, action: string): T {
	if (result && typeof result === 'object' && (result as Record<string, unknown>).ok === false) {
		const error = (result as Record<string, unknown>).error;
		throw new Error(typeof error === 'string' && error.trim() ? error : `${action} was rejected by the server`);
	}
	return result;
}

function protectedUrl(preferences: AppPreferences, path: string, query?: Record<string, string | boolean>) {
	const url = joinUrl(preferences.api.baseUrl, preferences.api.basePath, path);
	const token = preferences.auth.sessionToken.trim();
	if (!token) throw new Error(`Authenticated request attempted without a session token: ${path}`);
	url.searchParams.set('session_token', token);
	for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
	return url;
}

function usesLiveApi(preferences: AppPreferences) {
	return preferences.api.mode === 'live';
}

export async function loadProviderCapabilities(preferences: AppPreferences) {
	if (!usesLiveApi(preferences)) return { youtube: true, spotify: true };
	const raw = await requestJson(joinUrl(preferences.api.baseUrl, preferences.api.basePath, '/capabilities'));
	if (!raw || typeof raw !== 'object') throw new Error('Capabilities response has an unsupported shape');
	const record = raw as Record<string, unknown>;
	return { youtube: record.youtube !== false, spotify: record.spotify !== false };
}

function stringValue(value: unknown, fallback: string) {
	const text = Array.isArray(value) ? value.join(', ') : String(value ?? '').trim();
	return text || fallback;
}

function booleanValue(value: unknown, fallback = true) {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'false') return false;
		if (value.toLowerCase() === 'true') return true;
	}
	return value == null ? fallback : Boolean(value);
}

function coerceSong(raw: Record<string, unknown>): Song {
	const id = stringValue(raw.id ?? raw.youtube_id ?? raw.youtubeId ?? raw.track_id, '');
	const youtubeId = stringValue(raw.youtube_id ?? raw.youtubeId ?? raw.track_id ?? raw.id, '');
	const duration = raw.duration_seconds ?? raw.durationSeconds;
	return {
		id: id || youtubeId,
		title: stringValue(raw.title ?? raw.name, youtubeId || 'Untitled'),
		artist: stringValue(raw.artist ?? raw.artist_name ?? raw.artists, 'Unknown Artist'),
		youtubeId: youtubeId || undefined,
		available: booleanValue(raw.available ?? raw.is_available ?? raw.isAvailable),
		mediaUrl: raw.mediaUrl ? String(raw.mediaUrl) : raw.media_url ? String(raw.media_url) : undefined,
		thumbnailUrl: raw.thumbnailUrl
			? String(raw.thumbnailUrl)
			: raw.thumbnail_url
				? String(raw.thumbnail_url)
				: undefined,
		durationSeconds:
			duration == null || duration === '' || !Number.isFinite(Number(duration)) || Number(duration) < 0
				? undefined
				: Number(duration)
	};
}

function coerceTrackList(preferences: AppPreferences, raw: unknown, library: Song[] = []): Song[] {
	const items = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? Object.values(raw as Record<string, unknown>).filter((value) => value && typeof value === 'object')
			: [];
	return items.map((item) => {
		const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
		const id = String(record?.youtube_id ?? record?.youtubeId ?? record?.id ?? record?.track_id ?? item ?? '').trim();
		const knownSong = library.find((song) => song.id === id || song.youtubeId === id);
		if (knownSong) {
			const payloadAvailable = record?.available ?? record?.is_available ?? record?.isAvailable ?? record?.locally_available ?? record?.locallyAvailable;
			const fromPayload = payloadAvailable == null ? knownSong.available : booleanValue(payloadAvailable, knownSong.available);
			const payloadSong = record ? coerceSong({ ...record, available: fromPayload }) : knownSong;
			return addMediaUrls(preferences, {
				...knownSong,
				title: knownSong.title === knownSong.id ? payloadSong.title : knownSong.title,
				artist: knownSong.artist === 'Unknown Artist' ? payloadSong.artist : knownSong.artist,
				available: fromPayload
			});
		}
		return addMediaUrls(
			preferences,
			coerceSong(record ? {
				...record,
				available: record.available ?? record.is_available ?? record.isAvailable ?? record.locally_available ?? record.locallyAvailable ?? false
			} : {
				id,
				youtube_id: id,
				title: id || 'Unavailable track',
				available: false
			})
		);
	});
}

function addMediaUrls(preferences: AppPreferences, song: Song): Song {
	const youtubeId = song.youtubeId;
	if (!youtubeId) return song;
	return {
		...song,
		mediaUrl: song.mediaUrl ?? protectedUrl(preferences, `/tracks/${encodeURIComponent(youtubeId)}/media`).toString(),
		thumbnailUrl: song.thumbnailUrl ?? protectedUrl(preferences, `/tracks/${encodeURIComponent(youtubeId)}/thumbnail`).toString()
	};
}

function coerceLibrary(preferences: AppPreferences, raw: JsonValue): Song[] {
	const records = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? ((raw as Record<string, unknown>).library ?? (raw as Record<string, unknown>).tracks)
			: null;
	if (!Array.isArray(records)) throw new Error('Live library response has an unsupported shape');
	return records
		.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
		.map((item) => addMediaUrls(preferences, coerceSong(item)));
}

function playlistsFromSections(sections: PlaylistBrowserSection[]): Record<string, PlaylistDetail> {
	return Object.fromEntries(sections.flatMap((section) => section.playlists.map((playlist) => [
		playlist.playlistId,
		{ id: playlist.playlistId, title: playlist.title, source: playlist.source, songs: [] }
	])));
}

export async function loadRemoteLibrary(preferences: AppPreferences): Promise<Song[]> {
	if (!usesLiveApi(preferences)) throw new Error('loadRemoteLibrary requires live API mode');
	const url = protectedUrl(preferences, '/library');
	const requestKey = `${url.href}\n${preferences.auth.sessionToken}`;
	const existing = inFlightLibraryRequests.get(requestKey);
	if (existing) return existing;
	const request = requestJson(url).then((raw) => coerceLibrary(preferences, raw));
	inFlightLibraryRequests.set(requestKey, request);
	try {
		return await request;
	} finally {
		if (inFlightLibraryRequests.get(requestKey) === request) inFlightLibraryRequests.delete(requestKey);
	}
}

export async function loadRemotePlaylistIndex(preferences: AppPreferences): Promise<RemotePlaylistIndex> {
	if (!usesLiveApi(preferences)) throw new Error('loadRemotePlaylistIndex requires live API mode');
	const url = protectedUrl(preferences, '/playlists');
	const requestKey = `${url.href}\n${preferences.auth.sessionToken}`;
	const existing = inFlightPlaylistIndexRequests.get(requestKey);
	if (existing) return existing;
	const request = requestJson(url, undefined, 20_000).then((raw) => {
		const sections = normalizePlaylistSections(raw);
		return { sections, playlists: playlistsFromSections(sections), sourceMode: 'live' as const };
	});
	inFlightPlaylistIndexRequests.set(requestKey, request);
	try {
		return await request;
	} finally {
		if (inFlightPlaylistIndexRequests.get(requestKey) === request) inFlightPlaylistIndexRequests.delete(requestKey);
	}
}

export async function loadRemoteCatalog(preferences: AppPreferences): Promise<RemoteCatalog> {
	const [library, index] = await Promise.all([
		loadRemoteLibrary(preferences),
		loadRemotePlaylistIndex(preferences)
	]);
	return { library, ...index };
}

function coerceSection(raw: Record<string, unknown>): PlaylistBrowserSection {
	const source = String(raw.source ?? raw.provider ?? 'local') as PlaylistBrowserSection['source'];
	const playlistsRaw = Array.isArray(raw.playlists) ? raw.playlists : [];
	return {
		title: String(raw.title ?? raw.section_title ?? 'Playlists'),
		source,
		playlists: playlistsRaw.map((item) => ({
			playlistId: String((item as Record<string, unknown>).playlist_id ?? (item as Record<string, unknown>).playlistId ?? (item as Record<string, unknown>).id ?? ''),
			title: String((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? 'Untitled'),
			source,
			externalId: String((item as Record<string, unknown>).external_id ?? '').trim() || undefined
		}))
	};
}

function normalizePlaylistSections(raw: JsonValue): PlaylistBrowserSection[] {
	const isGrouped = Array.isArray(raw) && raw.every((item) =>
		Boolean(item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).playlists))
	);
	if (isGrouped) return (raw as Record<string, unknown>[]).map(coerceSection);

	const entries = Array.isArray(raw)
		? raw as Record<string, unknown>[]
		: raw && typeof raw === 'object'
			? Object.values(raw as Record<string, unknown>).flatMap((value) =>
				Array.isArray(value) ? value as Record<string, unknown>[] : []
			)
			: [];
	const groups = new Map<PlaylistSource, PlaylistBrowserSection['playlists']>();
	for (const entry of entries) {
		const source = String(entry.provider ?? entry.source ?? entry.section ?? 'local') as PlaylistSource;
		const item = {
			playlistId: String(entry.playlist_id ?? entry.playlistId ?? entry.id ?? entry.external_id ?? ''),
			title: String(entry.title ?? entry.name ?? entry.playlist_name ?? 'Untitled Playlist'),
			source,
			externalId: String(entry.external_id ?? '').trim() || undefined
		};
		groups.set(source, [...(groups.get(source) ?? []), item]);
	}
	return (['local', 'youtube', 'spotify'] as PlaylistSource[]).map((source) => ({
		title: source === 'local' ? 'Local Playlists' : source === 'youtube' ? 'From YouTube' : 'From Spotify',
		source,
		playlists: groups.get(source) ?? []
	}));
}

export async function loadPlaylistDetail(
	preferences: AppPreferences,
	playlistId: string,
	library: Song[] = []
): Promise<PlaylistDetail> {
	if (!usesLiveApi(preferences)) throw new Error('loadPlaylistDetail requires live API mode');

	const encodedPlaylistId = encodeURIComponent(playlistId);
	const requestUrl = protectedUrl(preferences, `/playlists/${encodedPlaylistId}`);
	const requestKey = `${requestUrl.toString()}\n${preferences.auth.sessionToken}`;
	const existingRequest = inFlightPlaylistRequests.get(requestKey);
	if (existingRequest) return existingRequest;

	const request = (async () => {
			const raw = await requestJson(requestUrl);
			if (Array.isArray(raw)) {
				return {
					id: playlistId,
					title: playlistId,
					source: 'local' as const,
					songs: coerceTrackList(preferences, raw, library)
				};
			}

			if (!raw || typeof raw !== 'object') {
				throw new Error('Live playlist response has an unsupported shape');
			}

			const responseRecord = raw as Record<string, unknown>;
			const record = responseRecord.playlist && typeof responseRecord.playlist === 'object'
				? (responseRecord.playlist as Record<string, unknown>)
				: responseRecord;
			const rawTracks = record.songs ?? record.tracks ?? record.items ?? record.track_ids ?? record.youtube_ids;
			if (!Array.isArray(rawTracks) && (!rawTracks || typeof rawTracks !== 'object')) {
				throw new Error('Live playlist response is missing songs or tracks');
			}
			const songs = coerceTrackList(preferences, rawTracks, library);
			return {
				id: String(record.id ?? playlistId),
				title: String(record.title ?? record.name ?? playlistId),
				source: String(record.source ?? record.provider ?? 'local') as PlaylistDetail['source'],
				songs,
				description: record.description ? String(record.description) : undefined
			};
	})();

	inFlightPlaylistRequests.set(requestKey, request);
	try {
		return await request;
	} finally {
		if (inFlightPlaylistRequests.get(requestKey) === request) {
			inFlightPlaylistRequests.delete(requestKey);
		}
	}
}

export async function login(preferences: AppPreferences, username: string, password: string) {
	if (!usesLiveApi(preferences)) {
		return `mock-session-${username || 'listener'}`;
	}

	const body = JSON.stringify({ username, password });
	const response = await fetch(
		joinUrl(preferences.api.baseUrl, preferences.api.basePath, '/login'),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body
		}
	);
	if (!response.ok) {
		throw new Error(`Login failed (${response.status})`);
	}
	const text = await response.text();
	try {
		const decoded = JSON.parse(text) as Record<string, unknown>;
		const token = decoded.session_token ?? decoded.sessionToken ?? decoded.token;
		if (typeof token === 'string' && token.trim()) return token.trim();
	} catch {
		// Keep compatibility with older deployments that returned a raw token.
	}
	const token = text.trim();
	if (!token) throw new Error('Login succeeded without a session token');
	return token;
}

export async function signUp(preferences: AppPreferences, username: string, password: string) {
	if (!usesLiveApi(preferences)) {
		return;
	}

	const response = await fetch(
		joinUrl(preferences.api.baseUrl, preferences.api.basePath, '/sign-up'),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ username, password })
		}
	);
	if (!response.ok) {
		throw new Error(`Sign-up failed (${response.status})`);
	}
}

export async function updatePlaylistTracks(
	preferences: AppPreferences,
	playlistId: string,
	trackIds: string[]
) {
	if (!usesLiveApi(preferences)) {
		return { playlistId, trackIds, mode: 'mock' };
	}

	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, `/playlists/local/${encodeURIComponent(playlistId)}/update`),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({ tracks: trackIds })
		}
	), 'Playlist update');
}

export async function addTrackToLibrary(
	preferences: AppPreferences,
	provider: string,
	trackId: string
) {
	if (!usesLiveApi(preferences)) {
		return { provider, trackId, mode: 'mock' };
	}

	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, '/library/add-track'),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({ provider, track_id: trackId })
		}
	), 'Adding track');
}

export async function removeTrackFromLibrary(preferences: AppPreferences, youtubeId: string) {
	if (!usesLiveApi(preferences)) {
		return { youtubeId, mode: 'mock' };
	}

	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, '/library/remove-track'),
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({ youtube_id: youtubeId })
		}
	), 'Removing track');
}

export async function syncLibrary(
	preferences: AppPreferences,
	force = false,
	onProgress?: (event: Record<string, unknown>) => void
) {
	if (!usesLiveApi(preferences)) return { mode: 'mock', force };
	const result = await requestJson(
		protectedUrl(preferences, '/sync-library'),
		{ method: 'POST', body: JSON.stringify({ force }), headers: { 'content-type': 'application/json' } },
		10 * 60_000,
		(event) => { if (event && typeof event === 'object') onProgress?.(event as Record<string, unknown>); }
	);
	return requireSuccessfulResult(result, 'Library sync');
}

export async function resetUsername(preferences: AppPreferences, newUsername: string) {
	return requireSuccessfulResult(await requestJson(protectedUrl(preferences, '/account/reset-username'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ new_username: newUsername })
	}), 'Username update');
}

export async function resetPassword(preferences: AppPreferences, oldPassword: string, newPassword: string) {
	return requireSuccessfulResult(await requestJson(protectedUrl(preferences, '/account/reset-password'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
	}), 'Password update');
}

export async function deleteAccount(preferences: AppPreferences) {
	return requireSuccessfulResult(await requestJson(protectedUrl(preferences, '/account'), { method: 'DELETE' }), 'Account deletion');
}

export async function createLocalPlaylist(preferences: AppPreferences, name: string, tracks: string[] = []) {
	if (!usesLiveApi(preferences)) return { mode: 'mock', name, tracks };
	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, '/playlists/local/create'),
		{ method: 'POST', body: JSON.stringify({ name, tracks }), headers: { 'content-type': 'application/json' } }
	), 'Playlist creation');
}

export async function linkPlaylist(
	preferences: AppPreferences,
	source: PlaylistSource,
	playlistId: string,
	externalId: string
) {
	if (!usesLiveApi(preferences)) return { mode: 'mock', source, playlistId };
	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, '/playlists/link'),
		{ method: 'POST', body: JSON.stringify({ provider: source, playlist_id: playlistId, external_id: externalId }), headers: { 'content-type': 'application/json' } }
	), 'Playlist linking');
}

export async function deletePlaylist(preferences: AppPreferences, playlistId: string, cascade = false) {
	if (!usesLiveApi(preferences)) return { mode: 'mock', playlistId, cascade };
	return requireSuccessfulResult(await requestJson(
		protectedUrl(preferences, `/playlists/delete/${encodeURIComponent(playlistId)}`, { cascade }),
		{ method: 'DELETE' }
	), 'Playlist deletion');
}

export async function listExternalAccounts(preferences: AppPreferences) {
	if (!usesLiveApi(preferences)) return { accounts: [] };
	return requestJson(protectedUrl(preferences, '/external-accounts'));
}

export function externalAccountOAuthUrl(preferences: AppPreferences, provider: 'youtube' | 'spotify') {
	const token = preferences.auth.sessionToken.trim();
	if (!token) throw new Error('Sign in before linking an external account');
	const url = joinUrl(preferences.api.baseUrl, preferences.api.basePath, `/oauth/${provider}/init`);
	url.searchParams.set('token', token);
	return url;
}

export async function unlinkExternalAccount(
	preferences: AppPreferences,
	provider: 'youtube' | 'spotify',
	externalId: string
) {
	if (!usesLiveApi(preferences)) return { mode: 'mock' };
	const result = await requestJson(protectedUrl(preferences, '/external-accounts/unlink'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ provider, external_id: externalId })
	});
	if (result && typeof result === 'object' && (result as Record<string, unknown>).ok === false) {
		throw new Error(String((result as Record<string, unknown>).error ?? 'The server refused to unlink this account'));
	}
	return result;
}

export async function logout(preferences: AppPreferences) {
	if (!usesLiveApi(preferences)) return { mode: 'mock' };
	return requireSuccessfulResult(await requestJson(protectedUrl(preferences, '/logout'), { method: 'POST' }), 'Logout');
}

export async function searchTracks(preferences: AppPreferences, query: string): Promise<Song[]> {
	if (!usesLiveApi(preferences)) return [];
	const raw = await requestJson(protectedUrl(preferences, '/search/tracks'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query })
	});
	const records = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? ((raw as Record<string, unknown>).results ?? (raw as Record<string, unknown>).tracks ?? (raw as Record<string, unknown>).items ?? [])
			: [];
	return Array.isArray(records)
		? records.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => addMediaUrls(preferences, coerceSong(item)))
		: [];
}

export async function searchPlaylists(
	preferences: AppPreferences,
	query: string,
	provider: 'youtube' | 'spotify'
): Promise<PlaylistBrowserSection['playlists']> {
	if (!usesLiveApi(preferences)) return [];
	const raw = await requestJson(protectedUrl(preferences, `/search/playlists/${provider}`), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query })
	});
	const records = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? ((raw as Record<string, unknown>).results ?? (raw as Record<string, unknown>).items ?? [])
			: [];
	return Array.isArray(records)
		? records.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => ({
			playlistId: String(item.playlist_id ?? item.playlistId ?? item.id ?? ''),
			title: String(item.title ?? item.name ?? item.playlist_name ?? 'Untitled Playlist'),
			source: provider,
			externalId: String(item.external_id ?? '').trim() || undefined
		}))
		: [];
}
