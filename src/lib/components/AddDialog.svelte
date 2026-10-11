<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import AlbumArtCard from '$lib/components/AlbumArtCard.svelte';
	import {
		addSongLocallyToLibrary,
		addSongLocallyToPlaylist,
		addLibraryTrack,
		addSearch,
		closeAddDialog,
		catalog,
		preferences,
		persistCreatedLocalPlaylist,
		persistLinkedPlaylist,
		searchAddDialog,
		savePlaylistTracks,
		ui
	} from '$lib/ui/state';

	let query = '';
	let createInput = null;
	let searchInput = null;

	$: if ($ui.addDialogOpen && query !== $ui.addDialogQuery) {
		query = $ui.addDialogQuery;
	}

	$: mode = $ui.addDialogMode;
	$: source = $ui.addDialogSource;
	$: targetPlaylistId = $ui.addDialogTargetPlaylistId;
	$: normalizedQuery = query.trim().toLowerCase();
	$: isPlaylistMode = mode === 'playlist';
	$: isCreateMode = mode === 'create-playlist';
	$: remoteSearch = $preferences.api.mode === 'live';
	$: trackResults = remoteSearch
		? $addSearch.tracks
		: isPlaylistMode || isCreateMode ? [] : buildTrackResults($catalog.library, normalizedQuery, source);
	$: playlistResults = remoteSearch
		? $addSearch.playlists
		: isPlaylistMode ? buildPlaylistResults($catalog.sections, normalizedQuery, source) : [];
	$: headerTitle = isCreateMode
		? 'Create Playlist'
		: isPlaylistMode
			? source === 'youtube'
				? 'Link YouTube Playlist'
				: source === 'spotify'
					? 'Link Spotify Playlist'
					: 'Link Playlist'
			: targetPlaylistId === 'library' || targetPlaylistId === null
				? 'Add to Library'
				: 'Add to Playlist';

	function close() {
		closeAddDialog();
	}

	function handleTrackAdd(song) {
		if (targetPlaylistId && targetPlaylistId !== 'library') {
			if (!$catalog.playlists[targetPlaylistId]) {
				close();
				return;
			}
			addSongLocallyToPlaylist(targetPlaylistId, song);
			void savePlaylistTracks(targetPlaylistId, [...$catalog.playlists[targetPlaylistId].songs].map((item) => item.id));
		} else {
			addSongLocallyToLibrary(song);
			void addLibraryTrack(song.youtubeId ? 'youtube' : 'local', song.youtubeId ?? song.id);
		}
		close();
	}

	function handlePlaylistAdd(item) {
		void persistLinkedPlaylist(item.source, item.playlistId, item.title, item.externalId);
		void goto(`/playlist/${item.playlistId}`);
		close();
	}

	function handleQueryInput(event) {
		const value = event.currentTarget.value;
		query = value;
		ui.update((state) => ({ ...state, addDialogQuery: value }));
		void searchAddDialog(value, mode, source);
	}

	async function handleCreatePlaylist() {
		const playlistId = await persistCreatedLocalPlaylist(query);
		if (playlistId) {
			void goto(`/playlist/${playlistId}`);
		}
		close();
	}

	function sourceLabel(value) {
		if (value === 'all') return 'All sources';
		return value === 'youtube' ? 'YouTube' : value === 'spotify' ? 'Spotify' : 'Local';
	}

	function buildTrackResults(songs, q, filter) {
		const list = songs.filter((song) => {
			if (q && !matchesSong(song, q)) return false;
			if (filter !== 'all') {
				if (filter === 'youtube') return isYouTubeSong(song);
				if (filter === 'spotify') return song.id.includes('sp-') || song.artist.toLowerCase().includes('spotify');
				return true;
			}
			return true;
		});
		return list.slice(0, 50);
	}

	function buildPlaylistResults(sections, q, filter) {
		const items = sections
			.filter((section) => filter === 'all' || section.source === filter)
			.flatMap((section) => section.playlists)
			.filter((item) => {
				if (!q) return true;
				return `${item.title} ${item.playlistId}`.toLowerCase().includes(q);
			});
		return items.slice(0, 50);
	}

	function matchesSong(song, q) {
		if (!q) return true;
		return `${song.title} ${song.artist} ${song.id}`.toLowerCase().includes(q);
	}

	function isYouTubeSong(song) {
		return Boolean(song.youtubeId);
	}

	function playlistKey(item, index) {
		const id = String(item?.playlistId ?? '').trim();
		return id ? `${id}-${index}` : `playlist-${index}`;
	}

	function trackKey(song, index) {
		const id = String(song?.id ?? '').trim();
		return id ? `${id}-${index}` : `track-${index}`;
	}

	onMount(async () => {
		await tick();
		void searchAddDialog(query, mode, source);
		const input = isCreateMode ? createInput : searchInput;
		input?.focus();
		input?.select?.();
	});
</script>

<button
	class="sideplay-dialog-backdrop"
	type="button"
	aria-label="Close add dialog"
	on:click={close}
></button>

<aside class="add-dialog sideplay-dialog glass-panel" role="dialog" aria-modal="true" aria-label={headerTitle}>
		<div class="sideplay-dialog-header">
			<h3 class="sideplay-dialog-title">{headerTitle}</h3>
			<button
				class="sideplay-icon-button"
			type="button"
			aria-label="Close add dialog"
			title="Close"
			on:click={close}
			>
				<AppIcon name="close" size={14} />
			</button>
		</div>

	<div class="sideplay-dialog-body">
		<p class="intro">
			{#if isCreateMode}
				Create a new local playlist.
			{:else if isPlaylistMode}
				Search {sourceLabel(source)} playlists and link one to the sidebar.
			{:else}
				Search the library and add a song to the current target.
			{/if}
		</p>

		{#if isCreateMode}
			<div class="create-form">
				<label>
					<span>Playlist name</span>
					<input
						bind:this={createInput}
						bind:value={query}
						placeholder="Night Drive"
						on:input={handleQueryInput}
					/>
				</label>

				<div class="button-row actions">
					<button class="sideplay-chip tone-primary" type="button" on:click={handleCreatePlaylist} disabled={!query.trim()}>
						<AppIcon name="add" size={14} />
						<span>Create</span>
					</button>
				</div>
			</div>
		{:else}
			<div class="search-shell">
				<label class="search-input">
					<span>Search</span>
					<input
						bind:this={searchInput}
						bind:value={query}
						placeholder={isPlaylistMode ? 'Search playlists' : 'Search tracks'}
						on:input={handleQueryInput}
					/>
				</label>

				{#if isPlaylistMode}
					<div class="hint">Showing {sourceLabel(source)} playlists.</div>
				{:else}
					<div class="hint">Target: {targetPlaylistId === 'library' || targetPlaylistId === null ? 'Library' : 'Current playlist'}</div>
				{/if}

				<div class="results">
					{#if remoteSearch && $addSearch.loading}
						<div class="empty-state">Searching…</div>
					{:else if remoteSearch && $addSearch.error}
						<div class="empty-state">{$addSearch.error}</div>
					{:else if isPlaylistMode}
						{#if playlistResults.length}
								{#each playlistResults as playlist, index (playlistKey(playlist, index))}
								<div class="result-row">
									<div>
										<div class="result-title">{playlist.title}</div>
										<div class="result-subtitle">{sourceLabel(playlist.source)} • {playlist.playlistId}</div>
									</div>
									<button class="sideplay-chip tone-primary result-action" type="button" on:click={() => handlePlaylistAdd(playlist)}>
										<AppIcon name="add" size={14} />
										<span>Link</span>
									</button>
								</div>
							{/each}
						{:else}
							<div class="empty-state">No playlists match this search.</div>
						{/if}
					{:else if trackResults.length}
						{#each trackResults as song, index (trackKey(song, index))}
							<div class="result-row track-row">
								<AlbumArtCard song={song} size={42} radius={10} />
								<div class="track-meta">
									<div class="result-title">{song.title}</div>
									<div class="result-subtitle">{song.artist}</div>
								</div>
								<button class="sideplay-chip tone-primary result-action" type="button" on:click={() => handleTrackAdd(song)}>
									<AppIcon name="add" size={14} />
									<span>Add</span>
								</button>
							</div>
						{/each}
					{:else}
						<div class="empty-state">No tracks match this search.</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</aside>

<style>
	.add-dialog {
		width: min(41rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		border-radius: 1.618rem;
	}

	.intro {
		margin: 0 0 0.809rem;
		color: var(--sideplay-text-muted);
		line-height: 1.38;
	}

	.search-shell,
	.create-form {
		display: grid;
		gap: 0.809rem;
		min-height: 0;
	}

	label {
		display: grid;
		gap: 0.382rem;
	}

	label span {
		font-size: 0.86rem;
		line-height: 1.2;
		color: var(--sideplay-text-muted);
	}

	input {
		width: 100%;
		padding: 0.618rem 0.809rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--sideplay-border) 92%, transparent);
		background: color-mix(in srgb, var(--sideplay-surface-raised) 84%, transparent);
		color: var(--sideplay-text-strong);
	}

	.hint {
		color: var(--sideplay-text-muted);
		font-size: 0.86rem;
		line-height: 1.2;
	}

	.results {
		display: grid;
		gap: 0.382rem;
		padding-right: 0.1rem;
	}

	.result-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.809rem;
		padding: 0.618rem 0.809rem;
		border-radius: 0.809rem;
		border: 1px solid color-mix(in srgb, var(--sideplay-border) 86%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, transparent);
	}

	.track-row {
		align-items: center;
	}

	.track-meta {
		min-width: 0;
		flex: 1 1 auto;
		display: grid;
		gap: 0.18rem;
	}

	.result-title {
		font-weight: 700;
		line-height: 1.15;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-subtitle {
		color: var(--sideplay-text-muted);
		font-size: 0.86rem;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-action {
		flex: 0 0 auto;
	}

	.empty-state {
		padding: 0.809rem;
		border-radius: 0.809rem;
		color: var(--sideplay-text-muted);
		text-align: center;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed color-mix(in srgb, var(--sideplay-border) 88%, transparent);
	}

	.actions {
		justify-content: flex-end;
	}

	:global(.add-dialog .sideplay-chip.tone-primary) {
		border-color: var(--sideplay-accent);
		color: var(--sideplay-text-strong);
	}
</style>
