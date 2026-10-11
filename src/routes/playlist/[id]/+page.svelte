<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import BrowserShell from '$lib/components/BrowserShell.svelte';
	import BrowserSongList from '$lib/components/BrowserSongList.svelte';
	import MobileSongsView from '$lib/components/MobileSongsView.svelte';
	import { SIDEPLAY_WIDE_BREAKPOINT } from '$lib/breakpoints';
	import {
		catalog,
		openCreatePlaylistDialog,
		openPlaylistAddDialog,
		openTrackAddDialog,
		playSongFromQueueWithOrigin,
		refreshPlaylist,
		reorderPlaylistTracksLocally,
		removePlaylistTrackLocally,
		removeLocalPlaylist,
		savePlaylistTracks,
		syncLibrary,
		ui
	} from '$lib/ui/state';
	import type { PlaylistBrowserSection } from '$lib/types';
	import { derived } from 'svelte/store';

	const playlistId = derived(page, ($page) => $page.params.id);
	const detail = derived([catalog, playlistId], ([$catalog, $playlistId]) => {
		return $catalog.playlists[$playlistId] ?? {
			id: $playlistId,
			title: $playlistId,
			source: 'local',
			songs: []
		};
	});
	const activePath = derived(playlistId, ($playlistId) => {
		return $playlistId === 'library' ? '/library' : `/playlist/${$playlistId}`;
	});
	let detailSubtitle = '';
	$: detailSubtitle = $detail.source === 'youtube' ? 'YouTube' : $detail.source === 'spotify' ? 'Spotify' : 'Local Playlist';
	let viewportWidth = 1024;
	let isCompactViewport = false;
	$: isCompactViewport = viewportWidth <= SIDEPLAY_WIDE_BREAKPOINT;
	let playlistLoading = true;
	let playlistError = '';
	let playlistLoadKey = '';
	let playlistRequestVersion = 0;
	$: playlistKnown =
		$playlistId === 'library' ||
		Boolean($catalog.playlists[$playlistId]) ||
		$catalog.sections.some((section) =>
			section.playlists.some((playlist) => playlist.playlistId === $playlistId)
		);
	$: catalogSettled = $catalog.lastSyncedAt !== null || $catalog.status === 'error' || $catalog.playlistIndexStatus === 'error';

	function openSettings() {
		ui.update((state) => ({ ...state, settingsOpen: true }));
	}

	function playDetailShuffled() {
		const shuffled = [...$detail.songs].sort(() => Math.random() - 0.5);
		playSongFromQueueWithOrigin(shuffled, 0, { kind: 'playlist', playlistId: $detail.id });
	}

	async function syncDetail() {
		await syncLibrary();
		await refreshPlaylist($detail.id);
	}

	async function loadPlaylistForRoute(id, requestVersion) {
		playlistLoading = true;
		playlistError = '';
		if (id === 'library') {
			playlistLoading = false;
			return;
		}
		if (!catalogSettled) return;
		if ($catalog.status === 'error') {
			playlistError = $catalog.error ?? 'Unable to load catalog.';
			playlistLoading = false;
			return;
		}
		if (!playlistKnown && $catalog.playlistIndexStatus !== 'error') {
			playlistLoading = false;
			return;
		}
		try {
			await refreshPlaylist(id);
		} catch (error) {
			if (requestVersion !== playlistRequestVersion) return;
			playlistError = error instanceof Error ? error.message : 'Unable to load playlist.';
		} finally {
			if (requestVersion === playlistRequestVersion) playlistLoading = false;
		}
	}

	$: routeLoadKey = `${$playlistId}|${playlistKnown}|${$catalog.status}|${$catalog.playlistIndexStatus}|${$catalog.lastSyncedAt}`;
	$: if (playlistLoadKey !== routeLoadKey) {
		playlistLoadKey = routeLoadKey;
		const requestVersion = ++playlistRequestVersion;
		if (typeof window !== 'undefined') void loadPlaylistForRoute($playlistId, requestVersion);
	}

	async function deleteDetail() {
		await removeLocalPlaylist($detail.id);
		await goto('/library');
	}

	/** @param {number} index */
	function handleSongRemove(index) {
		const nextTrackIds = removePlaylistTrackLocally($detail.id, index);
		if (!nextTrackIds) return;
		void savePlaylistTracks($detail.id, nextTrackIds);
	}

	/** @param {number} fromIndex @param {number} toIndex */
	function handleReorder(fromIndex, toIndex) {
		const nextTrackIds = reorderPlaylistTracksLocally($detail.id, fromIndex, toIndex);
		if (nextTrackIds) {
			void savePlaylistTracks($detail.id, nextTrackIds);
		}
	}

	/** @param {PlaylistBrowserSection} section */
	function handleSectionAdd(section) {
		if (section.source === 'local') {
			openCreatePlaylistDialog();
			return;
		}
		openPlaylistAddDialog(section.source);
	}
</script>

<svelte:head>
	<title>Sideplay - Playlist</title>
</svelte:head>

<svelte:window bind:innerWidth={viewportWidth} />

{#if playlistLoading}
	<div class="route-state" role="status">Loading playlist…</div>
{:else if playlistError}
	<div class="route-state error-state" role="alert">{playlistError}</div>
{:else if !playlistKnown}
	<div class="route-state" role="alert">Playlist not found.</div>
{:else if isCompactViewport}
	<MobileSongsView
		title={$detail.title}
		subtitle={detailSubtitle}
		songs={$detail.songs}
		emptyMessage="This playlist is empty."
		backHref="/playlists"
		onPlay={(index) =>
			playSongFromQueueWithOrigin($detail.songs, index, {
			kind: 'playlist',
			playlistId: $detail.id
		})
	}
		showDragHandle={$detail.source === 'local'}
		showRemove={$detail.source === 'local'}
		onRemove={$detail.source === 'local' ? handleSongRemove : undefined}
		onReorder={$detail.source === 'local' ? handleReorder : undefined}
		actions={
			$detail.source === 'local'
				? [
						{
							icon: 'play',
							label: 'Play',
							title: 'Play playlist',
							onClick: () =>
								playSongFromQueueWithOrigin($detail.songs, 0, {
									kind: 'playlist',
									playlistId: $detail.id
								})
						},
						{
							icon: 'shuffle',
							label: 'Shuffle',
							title: 'Shuffle playlist',
							onClick: playDetailShuffled
						},
						{
							icon: 'add',
							label: 'Add',
							title: 'Add track to playlist',
							onClick: () => openTrackAddDialog('all', '', $detail.id)
						},
					]
				: [
						{
							icon: 'play',
							label: 'Play',
							title: 'Play playlist',
							onClick: () =>
								playSongFromQueueWithOrigin($detail.songs, 0, {
									kind: 'playlist',
									playlistId: $detail.id
								})
						},
						{
							icon: 'shuffle',
							label: 'Shuffle',
							title: 'Shuffle playlist',
							onClick: playDetailShuffled
						},
						{
							icon: 'sync',
							label: 'Sync',
							title: 'Sync playlist',
							onClick: syncDetail
						}
					]
		}
	/>
{:else}
	<BrowserShell
		sections={$catalog.sections}
		activePath={$activePath}
		onSync={() => void syncLibrary()}
		onSectionAdd={handleSectionAdd}
	>
		<div slot="header" class="panel-header header-row">
			<div class="panel-title">
				<h1 class="headline">{$detail.title}</h1>
				<p class="subhead">{#if $detail.source === 'youtube'}YouTube{:else if $detail.source === 'spotify'}Spotify{:else}Local Playlist{/if}</p>
			</div>
			<div class="button-row">
				<button class="sideplay-chip tone-primary" type="button" title="Play playlist" on:click={() => playSongFromQueueWithOrigin($detail.songs, 0, { kind: 'playlist', playlistId: $detail.id })}>
					<AppIcon name="play" size={14} />
					<span>Play</span>
				</button>
				<button class="sideplay-chip tone-secondary" type="button" title="Shuffle playlist" on:click={playDetailShuffled}>
					<AppIcon name="shuffle" size={14} />
					<span>Shuffle</span>
				</button>
				{#if $detail.source === 'local'}
					<button
						class="sideplay-chip tone-primary"
						type="button"
						title="Add track to playlist"
						on:click={() => openTrackAddDialog('all', '', $detail.id)}
					>
						<AppIcon name="add" size={14} />
						<span>Add</span>
					</button>
				{:else}
					<button class="sideplay-chip tone-primary" type="button" title="Link playlist" on:click={() => openPlaylistAddDialog($detail.source)}>
						<AppIcon name="add" size={14} />
						<span>Sync</span>
					</button>
				{/if}
				{#if $detail.source === 'local' && $detail.id !== 'library'}
					<button class="sideplay-chip tone-danger" type="button" title="Delete playlist" on:click={deleteDetail}>
						<AppIcon name="delete" size={14} />
						<span>Delete</span>
					</button>
				{/if}
				<button class="sideplay-icon-button" type="button" on:click={openSettings} aria-label="Settings" title="Settings">
					<AppIcon name="settings" size={18} />
				</button>
			</div>
		</div>

		<BrowserSongList
			songs={$detail.songs}
			emptyMessage="This playlist is empty."
			showDragHandle={$detail.source === 'local'}
			showRemove={$detail.source === 'local'}
			onRemove={$detail.source === 'local' ? handleSongRemove : undefined}
			onPlay={(index) =>
				playSongFromQueueWithOrigin($detail.songs, index, {
					kind: 'playlist',
					playlistId: $detail.id
				})
			}
			onReorder={$detail.source === 'local' ? handleReorder : undefined}
		/>
	</BrowserShell>
{/if}

<style>
	.header-row {
		padding: 1rem 1rem 0.618rem;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 90%, transparent);
	}

	.route-state {
		box-sizing: border-box;
		display: grid;
		place-items: center;
		min-height: 100%;
		padding: 2rem;
		color: var(--sideplay-text-muted);
		text-align: center;
	}

	.error-state {
		color: var(--sideplay-danger);
	}


</style>
