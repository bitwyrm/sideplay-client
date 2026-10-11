import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { getGroundTruthLyrics, getGroundTruthPlaybackSeed } from '$lib/data/ground-truth';
import {
	addTrackToLibrary,
	createLocalPlaylist as createLocalPlaylistRemote,
	deleteAccount as deleteAccountRemote,
	deletePlaylist as deletePlaylistRemote,
	linkPlaylist as linkPlaylistRemote,
	listExternalAccounts,
	loadProviderCapabilities,
	login as loginRemote,
	logout as logoutRemote,
	removeTrackFromLibrary,
	resetPassword as resetPasswordRemote,
	resetUsername as resetUsernameRemote,
	searchPlaylists as searchPlaylistsRemote,
	searchTracks as searchTracksRemote,
	signUp as signUpRemote,
	syncLibrary as syncLibraryRemote,
	updatePlaylistTracks
} from '$lib/data/api';
import { loadLibrary, loadPlaylist, loadPlaylistIndex } from '$lib/data/repository';
import { applyTheme } from '$lib/theme';
import type {
	AppPreferences,
	CatalogState,
	PlaybackState,
	PlaylistDetail,
	PlaylistSource,
	Song,
	UiState
} from '$lib/types';
import {
	DEFAULT_PREFERENCES,
	loadPreferences,
	mergePreferences,
	persistPreferences,
	readSessionToken
} from '$lib/data/preferences';

const groundTruthPlayback = getGroundTruthPlaybackSeed();

export const preferences = writable<AppPreferences>(DEFAULT_PREFERENCES);
export const catalog = writable<CatalogState>({
	sections: [],
	library: [],
	playlists: {},
	sourceMode: 'live',
	status: 'idle',
	error: null,
	lastSyncedAt: null,
	playlistIndexStatus: 'idle',
	playlistIndexError: null
});
export const playback = writable<PlaybackState>({
	queue: [],
	currentTrackId: null,
	activeQueueIndex: 0,
	isPlaying: false,
	progressSeconds: 0,
	seekRequestId: 0,
	durationSeconds: 0,
	activePanel: 'overview',
	returnPanel: null,
	repeatMode: groundTruthPlayback.repeatMode,
	shuffle: groundTruthPlayback.shuffle,
	showExpandedPlayer: false,
	queueOrigin: { kind: 'manual' }
});
export const ui = writable<UiState>({
	settingsOpen: false,
	addDialogOpen: false,
	addDialogMode: 'track',
	addDialogSource: 'all',
	addDialogQuery: '',
	addDialogTargetPlaylistId: null,
	librarySortMode: 'artist'
});

export const addSearch = writable<{
	tracks: Song[];
	playlists: Array<{ playlistId: string; title: string; source: PlaylistSource; externalId?: string }>;
	loading: boolean;
	error: string | null;
}>({ tracks: [], playlists: [], loading: false, error: null });

export const librarySync = writable<{ running: boolean; progress: Record<string, unknown> | null; error: string | null }>({
	running: false,
	progress: null,
	error: null
});
export const providerCapabilities = writable<{ youtube: boolean; spotify: boolean } | null>(null);

let addSearchGeneration = 0;

export async function searchAddDialog(query: string, mode: UiState['addDialogMode'], source: UiState['addDialogSource']) {
	const generation = ++addSearchGeneration;
	if (get(preferences).api.mode !== 'live' || !query.trim() || mode === 'create-playlist' || source === 'local') {
		addSearch.set({ tracks: [], playlists: [], loading: false, error: null });
		return;
	}
	addSearch.update((state) => ({ ...state, loading: true, error: null }));
	try {
		if (mode === 'playlist') {
			const capability = get(providerCapabilities);
			const providers = (source === 'all' ? (['youtube', 'spotify'] as const) : ([source] as const))
				.filter((provider) => capability?.[provider] !== false);
			if (!providers.length) throw new Error('No selected playlist provider is currently available.');
			const responses = await Promise.all(providers.map((provider) => searchPlaylistsRemote(get(preferences), query, provider)));
			if (generation !== addSearchGeneration) return;
			addSearch.set({ tracks: [], playlists: responses.flat(), loading: false, error: null });
		} else {
			const tracks = await searchTracksRemote(get(preferences), query);
			if (generation !== addSearchGeneration) return;
			addSearch.set({ tracks, playlists: [], loading: false, error: null });
		}
	} catch (error) {
		if (generation !== addSearchGeneration) return;
		addSearch.set({ tracks: [], playlists: [], loading: false, error: error instanceof Error ? error.message : 'Search failed' });
	}
}

function trackIdentity(song: Song | null | undefined): string | null {
	return song?.id || song?.youtubeId || null;
}

function matchesTrack(song: Song, identity: string | null | undefined): boolean {
	return Boolean(identity) && (song.id === identity || song.youtubeId === identity);
}

function durationForSong(song: Song | null | undefined): number {
	const duration = Number(song?.durationSeconds ?? 0);
	return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

function clampProgress(progress: number, duration: number): number {
	if (!Number.isFinite(progress) || progress <= 0 || duration <= 0) return 0;
	return Math.min(progress, duration);
}

function allCatalogSongs(state: CatalogState): Song[] {
	return [state.library, ...Object.values(state.playlists).map((playlist) => playlist.songs)].flat();
}

function findCatalogSong(state: CatalogState, identity: string | null | undefined): Song | null {
	return allCatalogSongs(state).find((song) => matchesTrack(song, identity)) ?? null;
}

export const currentTrack = derived([catalog, playback], ([$catalog, $playback]) => {
	if ($playback.currentTrackId) {
		return $playback.queue.find((song) => matchesTrack(song, $playback.currentTrackId))
			?? findCatalogSong($catalog, $playback.currentTrackId);
	}
	return $playback.queue[$playback.activeQueueIndex] ?? null;
});

const currentLyricsTrackId = derived(
	currentTrack,
	($currentTrack) => trackIdentity($currentTrack) ?? ''
);

export const currentLyrics = derived(
	[currentLyricsTrackId, preferences],
	([trackId, prefs]) => prefs.api.mode === 'mock' ? getGroundTruthLyrics(trackId) : []
);

let initialized = false;
let catalogRefreshGeneration = 0;
const playlistRefreshGenerations = new Map<string, number>();
const playlistSaveQueues = new Map<string, Promise<void>>();
const playlistMutationVersions = new Map<string, number>();
const pendingPlaylistSnapshots = new Map<string, { version: number; detail: PlaylistDetail }>();
type LibraryMutation =
	| { kind: 'add'; song: Song }
	| {
			kind: 'remove';
			song: Song;
			libraryIndex: number;
			playlistMemberships: Array<{ playlistId: string; index: number }>;
		};
const pendingLibraryMutations: LibraryMutation[] = [];
let libraryMutationQueue: Promise<void> = Promise.resolve();

function stableHash(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function playbackOrder(queue: Song[], shuffle: boolean): number[] {
	const indices = queue.map((_, index) => index);
	if (!shuffle) return indices;
	return indices.sort((left, right) => {
		const leftKey = trackIdentity(queue[left]) ?? `index:${left}`;
		const rightKey = trackIdentity(queue[right]) ?? `index:${right}`;
		return stableHash(leftKey) - stableHash(rightKey) || left - right;
	});
}

function capturePlaylistSnapshot(playlistId: string): void {
	if (pendingPlaylistSnapshots.has(playlistId)) return;
	const detail = get(catalog).playlists[playlistId];
	if (!detail) return;
	const version = (playlistMutationVersions.get(playlistId) ?? 0) + 1;
	playlistMutationVersions.set(playlistId, version);
	pendingPlaylistSnapshots.set(playlistId, { version, detail });
}

function nextPlaylistMutationVersion(playlistId: string): number {
	const version = (playlistMutationVersions.get(playlistId) ?? 0) + 1;
	playlistMutationVersions.set(playlistId, version);
	return version;
}

function setCatalogError(error: unknown): void {
	catalog.update((state) => ({
		...state,
		error: error instanceof Error ? error.message : String(error)
	}));
}

function clearCatalogError(): void {
	catalog.update((state) => (state.error ? { ...state, error: null } : state));
}

export async function bootstrapApp() {
	if (initialized) return;
	initialized = true;

	const loaded = browser ? await loadPreferences() : DEFAULT_PREFERENCES;
	const merged = loaded;
	if (browser) {
		let token = readSessionToken();
		if (token.startsWith('mock-session-')) {
			localStorage.removeItem('sideplay.session.token');
			token = '';
		}
		if (token && !merged.auth.sessionToken) {
			merged.auth.sessionToken = token;
		}
	}

	preferences.set(merged);
	applyTheme(merged.ui.theme, merged.ui.fontFamily, merged.ui.uiScale, merged.ui.icons, merged.ui.themeMode);
	persistPreferences(merged);
	void loadProviderCapabilities(merged)
		.then((capabilities) => providerCapabilities.set(capabilities))
		.catch(() => providerCapabilities.set(null));
	if (browser && merged.api.mode === 'live' && !merged.auth.sessionToken) {
		if (window.location.pathname !== '/login') await goto('/login');
		return;
	}
	await refreshCatalog();
}

export async function refreshCatalog() {
	const generation = ++catalogRefreshGeneration;
	const prefs = get(preferences);
	catalog.update((state) => ({
		...state,
		status: 'loading',
		error: null,
		playlistIndexStatus: 'loading',
		playlistIndexError: null
	}));
	const playlistIndexPromise = loadPlaylistIndex(prefs).then(
		(index) => ({ index }),
		(error: unknown) => ({ error })
	);
	try {
		const library = await loadLibrary(prefs);
		if (generation !== catalogRefreshGeneration) return;
		catalog.update((state) => ({
			...state,
			library,
			sourceMode: prefs.api.mode,
			status: 'ready',
			error: null,
			lastSyncedAt: state.lastSyncedAt ?? new Date().toISOString()
		}));
		reconcilePlaybackWithCatalog();

		void playlistIndexPromise.then((result) => {
			if (generation !== catalogRefreshGeneration) return;
			if ('error' in result) {
				catalog.update((state) => ({
					...state,
					status: 'ready',
					playlistIndexStatus: 'error',
					playlistIndexError: result.error instanceof Error ? result.error.message : 'Unable to load playlists.'
				}));
				return;
			}
			catalog.update((state) => ({
				...state,
				sections: result.index.sections,
				playlists: Object.fromEntries(Object.entries(result.index.playlists).map(([playlistId, playlist]) => {
					const existing = state.playlists[playlistId];
					return [playlistId, existing ? { ...existing, ...playlist, songs: existing.songs } : playlist];
				})),
				sourceMode: result.index.sourceMode,
				status: 'ready',
				playlistIndexStatus: 'ready',
				playlistIndexError: null,
				lastSyncedAt: new Date().toISOString()
			}));
			reconcilePlaybackWithCatalog();
		});
	} catch (error) {
		if (generation !== catalogRefreshGeneration) return;
		catalog.update((state) => ({
			...state,
			status: 'error',
			error: error instanceof Error ? error.message : 'Unable to load library'
		}));
	}
}

function reconcilePlaybackWithCatalog() {
	const refreshedCatalog = get(catalog);
	playback.update((state) => {
		const nextQueue = queueForRefresh(state, refreshedCatalog);
		if (!nextQueue.length) {
			return {
				...state,
				queue: [],
				activeQueueIndex: 0,
				currentTrackId: null,
				durationSeconds: 0,
				progressSeconds: 0,
				isPlaying: false
			};
		}
		return reconcilePlaybackQueue(state, nextQueue);
	});
}

export function reorderPlaybackQueueLocally(fromIndex: number, toIndex: number) {
	playback.update((state) => {
		if (
			fromIndex < 0 ||
			fromIndex >= state.queue.length ||
			toIndex < 0 ||
			toIndex >= state.queue.length ||
			fromIndex === toIndex
		) {
			return state;
		}

		const queue = [...state.queue];
		const [moved] = queue.splice(fromIndex, 1);
		if (!moved) return state;
		queue.splice(toIndex, 0, moved);

		const activeSong = state.queue[state.activeQueueIndex] ?? null;
		const activeQueueIndex = activeSong
			? Math.max(
						0,
						queue.findIndex((song) => matchesTrack(song, trackIdentity(activeSong)))
					)
			: 0;
		const currentTrack = queue[activeQueueIndex] ?? queue[0] ?? null;

		return {
			...state,
			queue,
			activeQueueIndex,
			currentTrackId: trackIdentity(currentTrack),
			durationSeconds: durationForSong(currentTrack),
			progressSeconds: clampProgress(state.progressSeconds, durationForSong(currentTrack))
		};
	});
}

export function removePlaybackQueueLocally(index: number) {
	playback.update((state) => {
		if (index < 0 || index >= state.queue.length) return state;

		const queue = [...state.queue];
		const [removed] = queue.splice(index, 1);
		if (!removed) return state;

		if (!queue.length) {
			return {
				...state,
				queue,
				activeQueueIndex: 0,
				currentTrackId: null,
				durationSeconds: 0,
				progressSeconds: 0,
				isPlaying: false
			};
		}

		let activeQueueIndex = state.activeQueueIndex;
		if (index < activeQueueIndex) {
			activeQueueIndex -= 1;
		} else if (index === activeQueueIndex) {
			activeQueueIndex = Math.min(index, queue.length - 1);
		}

		const currentTrack = queue[activeQueueIndex] ?? queue[0] ?? null;

		return {
			...state,
			queue,
			activeQueueIndex,
			currentTrackId: trackIdentity(currentTrack),
			durationSeconds: durationForSong(currentTrack),
			progressSeconds: index === state.activeQueueIndex
				? 0
				: clampProgress(state.progressSeconds, durationForSong(currentTrack))
		};
	});
}

export function playSongFromQueueWithOrigin(
	queue: Song[],
	index: number,
	queueOrigin: PlaybackState['queueOrigin']
) {
	const requested = queue[index];
	if (!requested) return;
	const selectedIndex = requested.available
		? index
		: findNextAvailableTrackIndex(queue, index, 1, true, false);
	if (selectedIndex < 0) {
		playback.update((state) => ({ ...state, queue, activeQueueIndex: index, currentTrackId: null, isPlaying: false, progressSeconds: 0, durationSeconds: 0, queueOrigin }));
		return;
	}
	const song = queue[selectedIndex];
	playback.update((state) => ({
		...state,
		queue,
		activeQueueIndex: selectedIndex,
		currentTrackId: trackIdentity(song),
		durationSeconds: durationForSong(song),
		progressSeconds: 0,
		isPlaying: true,
		queueOrigin
	}));
}

export function togglePlay() {
	playback.update((state) => ({ ...state, isPlaying: !state.isPlaying }));
}

export function openExpandedPlayer(panel: PlaybackState['activePanel'] = 'overview') {
	playback.update((state) => ({
		...state,
		returnPanel: state.showExpandedPlayer ? state.returnPanel : state.activePanel,
		activePanel: panel,
		showExpandedPlayer: true
	}));
}

export function closeExpandedPlayer() {
	playback.update((state) => ({
		...state,
		activePanel: state.returnPanel ?? state.activePanel,
		returnPanel: null,
		showExpandedPlayer: false
	}));
}

export function openTrackAddDialog(
	source: PlaylistSource | 'all' = 'all',
	query = '',
	targetPlaylistId: string | null = null
) {
	ui.update((state) => ({
		...state,
		addDialogOpen: true,
		addDialogMode: 'track',
		addDialogSource: source,
		addDialogQuery: query,
		addDialogTargetPlaylistId: targetPlaylistId
	}));
}

export function openPlaylistAddDialog(source: PlaylistSource, query = '') {
	ui.update((state) => ({
		...state,
		addDialogOpen: true,
		addDialogMode: 'playlist',
		addDialogSource: source,
		addDialogQuery: query,
		addDialogTargetPlaylistId: null
	}));
}

export function openCreatePlaylistDialog() {
	ui.update((state) => ({
		...state,
		addDialogOpen: true,
		addDialogMode: 'create-playlist',
		addDialogSource: 'local',
		addDialogQuery: '',
		addDialogTargetPlaylistId: null
	}));
}

export function closeAddDialog() {
	ui.update((state) => ({
		...state,
		addDialogOpen: false,
		addDialogQuery: ''
	}));
}

export function setActivePanel(panel: PlaybackState['activePanel']) {
	playback.update((state) => ({ ...state, activePanel: panel }));
}

export function seekTo(progressSeconds: number) {
	playback.update((state) => ({
		...state,
		progressSeconds: clampProgress(progressSeconds, state.durationSeconds),
		seekRequestId: state.seekRequestId + 1
	}));
}

export function updatePlaybackProgress(progressSeconds: number, durationSeconds?: number) {
	playback.update((state) => {
		const duration = durationSeconds !== undefined && Number.isFinite(durationSeconds) && durationSeconds >= 0
			? durationSeconds
			: state.durationSeconds;
		return {
			...state,
			durationSeconds: duration,
			progressSeconds: clampProgress(progressSeconds, duration)
		};
	});
}

export function setPlaybackPlaying(isPlaying: boolean) {
	playback.update((state) => ({ ...state, isPlaying }));
}

export function nextTrack() {
	playback.update((state) => {
		if (!state.queue.length || state.repeatMode === 'one') {
			return state.repeatMode === 'one' ? { ...state, progressSeconds: 0 } : state;
		}
		const nextIndex = findNextAvailableTrackIndex(
			state.queue,
			state.activeQueueIndex,
			1,
			state.repeatMode === 'all',
			state.shuffle
		);
		if (nextIndex === -1) return state;
		const selected = state.queue[nextIndex] ?? null;
		return {
			...state,
			activeQueueIndex: nextIndex,
			currentTrackId: trackIdentity(selected),
			durationSeconds: durationForSong(selected),
			progressSeconds: 0
		};
	});
}

export function previousTrack() {
	playback.update((state) => {
		const restartCurrentTrack = () => ({
			...state,
			progressSeconds: 0,
			seekRequestId: state.seekRequestId + 1
		});
		if (state.progressSeconds > 5) return restartCurrentTrack();
		if (!state.queue.length) return restartCurrentTrack();
		const prevIndex = findNextAvailableTrackIndex(
			state.queue,
			state.activeQueueIndex,
			-1,
			state.repeatMode === 'all',
			state.shuffle
		);
		if (prevIndex === -1) return restartCurrentTrack();
		const selected = state.queue[prevIndex] ?? null;
		return {
			...state,
			activeQueueIndex: prevIndex,
			currentTrackId: trackIdentity(selected),
			durationSeconds: durationForSong(selected),
			progressSeconds: 0
		};
	});
}

export function toggleLibrarySortMode() {
	ui.update((state) => {
		const nextSortMode = state.librarySortMode === 'artist' ? 'title' : 'artist';
		playback.update((playbackState) => {
			if (playbackState.queueOrigin.kind !== 'library') return playbackState;
			return reconcilePlaybackQueue(playbackState, sortSongsForLibrary(get(catalog).library, nextSortMode));
		});
		return {
			...state,
			librarySortMode: nextSortMode
		};
	});
}

export function toggleRepeatMode() {
	playback.update((state) => ({
		...state,
		repeatMode: state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off'
	}));
}

export function toggleShuffle() {
	playback.update((state) => ({ ...state, shuffle: !state.shuffle }));
}

export function sortSongsForLibrary(songs: Song[], sortMode: 'artist' | 'title') {
	return [...songs].sort((left, right) => {
		const primaryLeft = sortMode === 'artist' ? left.artist : left.title;
		const primaryRight = sortMode === 'artist' ? right.artist : right.title;
		const primaryOrder = primaryLeft.localeCompare(primaryRight, undefined, {
			sensitivity: 'base',
			numeric: true
		});
		if (primaryOrder !== 0) return primaryOrder;

		const secondaryLeft = sortMode === 'artist' ? left.title : left.artist;
		const secondaryRight = sortMode === 'artist' ? right.title : right.artist;
		const secondaryOrder = secondaryLeft.localeCompare(secondaryRight, undefined, {
			sensitivity: 'base',
			numeric: true
		});
		if (secondaryOrder !== 0) return secondaryOrder;

		return left.id.localeCompare(right.id, undefined, {
			sensitivity: 'base',
			numeric: true
		});
	});
}

function syncPlaybackQueueForLibrary(library: Song[]) {
	playback.update((state) => {
		if (state.queueOrigin.kind !== 'library') return state;
		return reconcilePlaybackQueue(state, sortSongsForLibrary(library, state.queueOrigin.sortMode));
	});
}

function syncPlaybackQueueForPlaylist(playlistId: string, songs: Song[]) {
	playback.update((state) => {
		if (state.queueOrigin.kind !== 'playlist' || state.queueOrigin.playlistId !== playlistId) {
			return state;
		}
		return reconcilePlaybackQueue(state, songs);
	});
}

function findNextAvailableTrackIndex(
	queue: Song[],
	startIndex: number,
	direction: 1 | -1,
	wrap = false,
	shuffle = false
) {
	if (!queue.length) return -1;
	const order = playbackOrder(queue, shuffle);
	const currentPosition = Math.max(0, order.indexOf(startIndex));
	for (let offset = 1; offset <= queue.length; offset += 1) {
		let position = currentPosition + direction * offset;
		if (position < 0 || position >= order.length) {
			if (!wrap) break;
			position = (position + order.length) % order.length;
		}
		const candidateIndex = order[position];
		if (queue[candidateIndex]?.available) return candidateIndex;
	}
	return -1;
}

function reconcilePlaybackQueue(
	state: PlaybackState,
	nextQueue: Song[]
): PlaybackState {
	const activeSong = state.queue.find((song) => matchesTrack(song, state.currentTrackId))
		?? state.queue[state.activeQueueIndex]
		?? null;
	const activeSongId = trackIdentity(activeSong) ?? state.currentTrackId;
	if (!nextQueue.length) {
		return {
			...state,
			queue: nextQueue,
			activeQueueIndex: 0,
				currentTrackId: null,
				durationSeconds: 0,
				progressSeconds: 0,
				isPlaying: false
		};
	}

	const nextActiveIndex = activeSongId
		? nextQueue.findIndex((song) => matchesTrack(song, activeSongId))
		: -1;
	const resolvedActiveIndex = nextActiveIndex >= 0
		? nextActiveIndex
		: Math.min(state.activeQueueIndex, nextQueue.length - 1);
	const resolvedTrack = nextQueue[resolvedActiveIndex] ?? nextQueue[0];
	const sameTrack = Boolean(resolvedTrack) && matchesTrack(resolvedTrack, activeSongId);
	const durationSeconds = durationForSong(resolvedTrack);

	return {
		...state,
		queue: nextQueue,
		activeQueueIndex: resolvedActiveIndex,
		currentTrackId: trackIdentity(resolvedTrack),
		durationSeconds,
		progressSeconds: sameTrack ? clampProgress(state.progressSeconds, durationSeconds) : 0
	};
}

function queueForRefresh(state: PlaybackState, refreshedCatalog: CatalogState): Song[] {
	if (state.queueOrigin.kind === 'library') {
		return sortSongsForLibrary(refreshedCatalog.library, state.queueOrigin.sortMode);
	}
	if (state.queueOrigin.kind === 'playlist') {
		return refreshedCatalog.playlists[state.queueOrigin.playlistId]?.songs ?? [];
	}

	const freshSongs = allCatalogSongs(refreshedCatalog);
	if (!state.queue.length) return refreshedCatalog.library.slice(0, 4);
	return state.queue
		.map((song) => freshSongs.find((candidate) => matchesTrack(candidate, trackIdentity(song))))
		.filter((song): song is Song => Boolean(song));
}

export async function setSessionToken(token: string) {
	preferences.update((state) => {
		const next = mergePreferences(state, { auth: { sessionToken: token } });
		persistPreferences(next);
		return next;
	});
}

export async function signIn(username: string, password: string) {
	const token = await loginRemote(get(preferences), username, password);
	await setSessionToken(token);
	await refreshCatalog();
}

export async function createAccount(username: string, password: string) {
	await signUpRemote(get(preferences), username, password);
}

export function persistCurrentPreferences() {
	persistPreferences(get(preferences));
}

export async function logout() {
	try {
		await logoutRemote(get(preferences));
	} catch {
		// Local logout still clears the browser session if the server is unavailable.
	}
	if (browser) {
		localStorage.removeItem('sideplay.session.token');
	}
	preferences.update((state) => {
		const next = mergePreferences(state, { auth: { sessionToken: '' } });
		persistPreferences(next);
		return next;
	});
	if (browser) {
		await goto('/login');
	}
}

export async function refreshPlaylist(playlistId: string) {
	const generation = (playlistRefreshGenerations.get(playlistId) ?? 0) + 1;
	playlistRefreshGenerations.set(playlistId, generation);
	const mutationVersion = playlistMutationVersions.get(playlistId) ?? 0;
	const prefs = get(preferences);
	const detail = await loadPlaylist(prefs, playlistId, get(catalog).library);
	if (
		playlistRefreshGenerations.get(playlistId) !== generation ||
		(playlistMutationVersions.get(playlistId) ?? 0) !== mutationVersion
	) {
		return get(catalog).playlists[playlistId] ?? detail;
	}
	catalog.update((state) => ({
		...state,
		playlists: {
			...state.playlists,
			[playlistId]: detail
		}
	}));
	const playbackState = get(playback);
	if (playbackState.queueOrigin.kind === 'playlist' && playbackState.queueOrigin.playlistId === playlistId) {
		playback.update((state) => reconcilePlaybackQueue(state, detail.songs));
	}
	return detail;
}

export async function syncLibrary(force = false) {
	const prefs = get(preferences);
	librarySync.set({ running: true, progress: null, error: null });
	try {
		await syncLibraryRemote(prefs, force, (progress) => librarySync.update((state) => ({ ...state, progress })));
		await refreshCatalog();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		librarySync.update((state) => ({ ...state, error: message }));
		setCatalogError(error);
	} finally {
		librarySync.update((state) => ({ ...state, running: false }));
	}
}

export async function resetAccountUsername(newUsername: string) {
	await resetUsernameRemote(get(preferences), newUsername);
}

export async function resetAccountPassword(oldPassword: string, newPassword: string) {
	await resetPasswordRemote(get(preferences), oldPassword, newPassword);
}

export async function deleteCurrentAccount() {
	await deleteAccountRemote(get(preferences));
	await logout();
}

function enqueueLibraryMutation(operation: () => Promise<void>): Promise<void> {
	const next = libraryMutationQueue.catch(() => undefined).then(operation);
	libraryMutationQueue = next;
	return next;
}

function applyLibraryMutation(mutation: LibraryMutation): void {
	catalog.update((state) => {
		const identity = trackIdentity(mutation.song);
		if (mutation.kind === 'add') {
			if (state.library.some((item) => matchesTrack(item, identity))) return state;
			return {
				...state,
				library: [...state.library, mutation.song],
				playlists: {
					...state.playlists,
					library: {
						...state.playlists.library,
						songs: [...state.playlists.library.songs, mutation.song]
					}
				}
			};
		}
		const library = state.library.filter((item) => !matchesTrack(item, identity));
		const playlists = Object.fromEntries(
			Object.entries(state.playlists).map(([playlistId, detail]) => [
				playlistId,
				{ ...detail, songs: detail.songs.filter((item) => !matchesTrack(item, identity)) }
			])
		);
		return { ...state, library, playlists };
	});
	syncPlaybackQueueForLibrary(get(catalog).library);
}

function rollbackLibraryMutation(mutation: LibraryMutation): void {
	catalog.update((state) => {
		const identity = trackIdentity(mutation.song);
		if (mutation.kind === 'add') {
			return {
				...state,
				library: state.library.filter((item) => !matchesTrack(item, identity)),
				playlists: {
					...state.playlists,
					library: {
						...state.playlists.library,
						songs: state.playlists.library.songs.filter((item) => !matchesTrack(item, identity))
					}
				}
			};
		}

		const library = [...state.library];
		if (!library.some((item) => matchesTrack(item, identity))) {
			library.splice(Math.min(mutation.libraryIndex, library.length), 0, mutation.song);
		}
		const playlists = { ...state.playlists };
		for (const membership of mutation.playlistMemberships) {
			const detail = playlists[membership.playlistId];
			if (!detail || detail.songs.some((item) => matchesTrack(item, identity))) continue;
			const songs = [...detail.songs];
			songs.splice(Math.min(membership.index, songs.length), 0, mutation.song);
			playlists[membership.playlistId] = { ...detail, songs };
		}
		return { ...state, library, playlists };
	});
	syncPlaybackQueueForLibrary(get(catalog).library);
}

export function addLibraryTrack(provider: string, trackId: string): Promise<void> {
	return enqueueLibraryMutation(async () => {
		const prefs = get(preferences);
		const song = get(catalog).library.find((item) => item.youtubeId === trackId || item.id === trackId);
		if (song) addSongLocallyToLibrary(song);
		const mutation = pendingLibraryMutations.shift();
		try {
			await addTrackToLibrary(prefs, provider, trackId);
			clearCatalogError();
		} catch (error) {
			if (mutation) {
				rollbackLibraryMutation(mutation);
				for (const pending of pendingLibraryMutations) applyLibraryMutation(pending);
			}
			setCatalogError(error);
		}
	});
}

export function removeLibraryTrack(youtubeId: string): Promise<void> {
	return enqueueLibraryMutation(async () => {
		const prefs = get(preferences);
		removeLibraryTrackLocally(youtubeId);
		const mutation = pendingLibraryMutations.shift();
		try {
			await removeTrackFromLibrary(prefs, youtubeId);
			clearCatalogError();
		} catch (error) {
			if (mutation) {
				rollbackLibraryMutation(mutation);
				for (const pending of pendingLibraryMutations) applyLibraryMutation(pending);
			}
			setCatalogError(error);
		}
	});
}

export function savePlaylistTracks(playlistId: string, trackIds: string[]): Promise<void> {
	const prefs = get(preferences);
	const currentDetail = get(catalog).playlists[playlistId];
	if (!currentDetail) return Promise.resolve();
	const snapshot = pendingPlaylistSnapshots.get(playlistId)?.detail ?? currentDetail;
	pendingPlaylistSnapshots.delete(playlistId);
	const version = nextPlaylistMutationVersion(playlistId);
	const previous = playlistSaveQueues.get(playlistId) ?? Promise.resolve();
	const operation = previous
		.catch(() => undefined)
		.then(async () => {
			try {
				await updatePlaylistTracks(prefs, playlistId, trackIds);
				if (playlistMutationVersions.get(playlistId) === version) clearCatalogError();
			} catch (error) {
				if (playlistMutationVersions.get(playlistId) === version) {
					catalog.update((state) => ({
						...state,
						playlists: { ...state.playlists, [playlistId]: snapshot }
					}));
					syncPlaybackQueueForPlaylist(playlistId, snapshot.songs);
				}
				setCatalogError(error);
			}
		});
	playlistSaveQueues.set(playlistId, operation);
	void operation.finally(() => {
		if (playlistSaveQueues.get(playlistId) === operation) playlistSaveQueues.delete(playlistId);
	});
	return operation;
}

export function reorderPlaylistTracksLocally(playlistId: string, fromIndex: number, toIndex: number) {
	let nextTrackIds: string[] | null = null;
	const currentDetail = get(catalog).playlists[playlistId];
	if (
		!currentDetail ||
		fromIndex < 0 ||
		fromIndex >= currentDetail.songs.length ||
		toIndex < 0 ||
		toIndex >= currentDetail.songs.length ||
		fromIndex === toIndex
	) return nextTrackIds;
	capturePlaylistSnapshot(playlistId);
	catalog.update((state) => {
		const detail = state.playlists[playlistId];
		if (!detail) return state;
		const songs = [...detail.songs];
		if (
			fromIndex < 0 ||
			fromIndex >= songs.length ||
			toIndex < 0 ||
			toIndex >= songs.length ||
			fromIndex === toIndex
		) {
			return state;
		}

		const [moved] = songs.splice(fromIndex, 1);
		if (!moved) return state;
		songs.splice(toIndex, 0, moved);
		nextTrackIds = songs.map((song) => song.id);
		return {
			...state,
			playlists: {
				...state.playlists,
				[playlistId]: {
					...detail,
					songs
				}
			}
		};
	});
	syncPlaybackQueueForPlaylist(playlistId, get(catalog).playlists[playlistId]?.songs ?? []);
	return nextTrackIds;
}

export function removePlaylistTrackLocally(playlistId: string, index: number) {
	let nextTrackIds: string[] | null = null;
	const currentDetail = get(catalog).playlists[playlistId];
	if (!currentDetail || index < 0 || index >= currentDetail.songs.length) return nextTrackIds;
	capturePlaylistSnapshot(playlistId);
	catalog.update((state) => {
		const detail = state.playlists[playlistId];
		if (!detail) return state;
		if (index < 0 || index >= detail.songs.length) return state;
		const songs = detail.songs.filter((_, currentIndex) => currentIndex !== index);
		nextTrackIds = songs.map((song) => song.id);
		return {
			...state,
			playlists: {
				...state.playlists,
				[playlistId]: {
					...detail,
					songs
				}
			}
		};
	});
	syncPlaybackQueueForPlaylist(playlistId, get(catalog).playlists[playlistId]?.songs ?? []);
	return nextTrackIds;
}

export function addSongLocallyToLibrary(song: Song) {
	const before = get(catalog);
	if (!before.library.some((item) => item.id === song.id)) {
		pendingLibraryMutations.push({ kind: 'add', song });
	}
	catalog.update((state) => {
		const exists = state.library.some((item) => item.id === song.id);
		if (exists) return state;
		return {
			...state,
			library: [...state.library, song],
			playlists: {
				...state.playlists,
				library: {
					...state.playlists.library,
					songs: [...state.playlists.library.songs, song]
				}
			}
		};
	});
	syncPlaybackQueueForLibrary(get(catalog).library);
}

export function addSongLocallyToPlaylist(playlistId: string, song: Song) {
	const currentDetail = get(catalog).playlists[playlistId];
	if (!currentDetail || currentDetail.songs.some((item) => item.id === song.id)) return;
	capturePlaylistSnapshot(playlistId);
	catalog.update((state) => {
		const detail = state.playlists[playlistId];
		if (!detail) return state;
		const exists = detail.songs.some((item) => item.id === song.id);
		if (exists) return state;
		return {
			...state,
			playlists: {
				...state.playlists,
				[playlistId]: {
					...detail,
					songs: [...detail.songs, song]
				}
			}
		};
	});
	syncPlaybackQueueForPlaylist(playlistId, get(catalog).playlists[playlistId]?.songs ?? []);
}

export function removeLibraryTrackLocally(youtubeId: string) {
	const before = get(catalog);
	const removedSong = before.library.find((item) => item.id === youtubeId || item.youtubeId === youtubeId);
	if (removedSong) {
		pendingLibraryMutations.push({
			kind: 'remove',
			song: removedSong,
			libraryIndex: before.library.indexOf(removedSong),
			playlistMemberships: Object.entries(before.playlists).flatMap(([playlistId, detail]) => {
				const index = detail.songs.findIndex((item) => matchesTrack(item, trackIdentity(removedSong)));
				return index >= 0 ? [{ playlistId, index }] : [];
			})
		});
	}
	catalog.update((state) => {
		const exists = state.library.some((item) => item.id === youtubeId || item.youtubeId === youtubeId);
		if (!exists) return state;
		const library = state.library.filter((item) => item.id !== youtubeId && item.youtubeId !== youtubeId);
		const playlists = Object.fromEntries(
			Object.entries(state.playlists).map(([playlistId, detail]) => [
				playlistId,
				{
					...detail,
					songs: detail.songs.filter((item) => item.id !== youtubeId && item.youtubeId !== youtubeId)
				}
			])
		);
		return {
			...state,
			library,
			playlists
		};
	});
	syncPlaybackQueueForLibrary(get(catalog).library);
}

export function createLocalPlaylist(title: string) {
	const trimmed = title.trim();
	if (!trimmed) return null;
	const id = `local-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'playlist'}`;
	if (get(catalog).playlists[id]) return null;
	catalog.update((state) => {
		const nextPlaylist: PlaylistDetail = {
			id,
			title: trimmed,
			source: 'local',
			songs: []
		};
		const localSectionIndex = state.sections.findIndex((section) => section.source === 'local');
		const nextSections = [...state.sections];
		if (localSectionIndex >= 0) {
			const section = nextSections[localSectionIndex];
			nextSections[localSectionIndex] = {
				...section,
				playlists: [...section.playlists, { playlistId: id, title: trimmed, source: 'local' }]
			};
		} else {
			nextSections.unshift({
				title: 'Local Playlists',
				source: 'local',
				playlists: [{ playlistId: id, title: trimmed, source: 'local' }]
			});
		}

		return {
			...state,
			sections: nextSections,
			playlists: {
				...state.playlists,
				[id]: nextPlaylist
			}
		};
	});
	return id;
}

function removePlaylistFromCatalog(playlistId: string): void {
	catalog.update((state) => ({
		...state,
		sections: state.sections.map((section) => ({
			...section,
			playlists: section.playlists.filter((playlist) => playlist.playlistId !== playlistId)
		})),
		playlists: Object.fromEntries(Object.entries(state.playlists).filter(([id]) => id !== playlistId))
	}));
}

export async function persistCreatedLocalPlaylist(title: string, tracks: string[] = []) {
	const optimisticId = createLocalPlaylist(title);
	if (!optimisticId) return null;
	try {
		const response = await createLocalPlaylistRemote(get(preferences), title, tracks);
		const createdId = response && typeof response === 'object'
			? String((response as Record<string, unknown>).playlist_id ?? '').trim()
			: '';
		if (!createdId) throw new Error('The server created the playlist without returning its playlist_id');

		catalog.update((state) => {
			const detail = state.playlists[optimisticId];
			if (!detail) return state;
			const playlists = { ...state.playlists };
			delete playlists[optimisticId];
			playlists[createdId] = { ...detail, id: createdId };
			return {
				...state,
				sections: state.sections.map((section) => ({
					...section,
					playlists: section.playlists.map((item) =>
						item.playlistId === optimisticId ? { ...item, playlistId: createdId } : item
					)
				})),
				playlists
			};
		});
		clearCatalogError();
		await refreshCatalog();
		return createdId;
	} catch (error) {
		if (get(catalog).playlists[optimisticId]) removePlaylistFromCatalog(optimisticId);
		setCatalogError(error);
		return null;
	}
}

export function linkPlaylistToSection(source: PlaylistSource, playlistId: string, title: string) {
	catalog.update((state) => {
		const sectionIndex = state.sections.findIndex((section) => section.source === source);
		if (sectionIndex < 0) return state;
		const section = state.sections[sectionIndex];
		if (section.playlists.some((item) => item.playlistId === playlistId)) return state;
		const nextSections = [...state.sections];
		nextSections[sectionIndex] = {
			...section,
			playlists: [...section.playlists, { playlistId, title, source }]
		};
		return {
			...state,
			sections: nextSections,
			playlists: {
				...state.playlists,
				[playlistId]: state.playlists[playlistId] ?? {
					id: playlistId,
					title,
					source,
					songs: []
				}
			}
		};
	});
}

export async function persistLinkedPlaylist(
	source: PlaylistSource,
	playlistId: string,
	title: string,
	externalId?: string
) {
	const before = get(catalog);
	const existed = Boolean(get(catalog).playlists[playlistId]);
	linkPlaylistToSection(source, playlistId, title);
	try {
		let resolvedExternalId = externalId?.trim() ?? '';
		if (!resolvedExternalId && get(preferences).api.mode === 'live') {
			const response = await listExternalAccounts(get(preferences));
			const accounts = response && typeof response === 'object' && Array.isArray((response as Record<string, unknown>).accounts)
				? (response as { accounts: Array<Record<string, unknown>> }).accounts
				: [];
			const account = accounts.find((candidate) => String(candidate.provider ?? '').toLowerCase() === source);
			resolvedExternalId = String(account?.external_id ?? account?.externalId ?? '').trim();
		}
		if (!resolvedExternalId) throw new Error(`Link a ${source} account before linking playlists.`);
		await linkPlaylistRemote(get(preferences), source, playlistId, resolvedExternalId);
		clearCatalogError();
		await refreshCatalog();
	} catch (error) {
		if (!existed) removePlaylistFromCatalog(playlistId);
		else catalog.set(before);
		setCatalogError(error);
	}
}

export async function removeLocalPlaylist(playlistId: string) {
	const detail = get(catalog).playlists[playlistId];
	if (!detail || detail.source !== 'local') return;
	try {
		await deletePlaylistRemote(get(preferences), playlistId);
		removePlaylistFromCatalog(playlistId);
		clearCatalogError();
	} catch (error) {
		setCatalogError(error);
	}
}
