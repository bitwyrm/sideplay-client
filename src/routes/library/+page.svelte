<script lang="ts">
	import BrowserShell from '$lib/components/BrowserShell.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import BrowserSongList from '$lib/components/BrowserSongList.svelte';
	import MobileSongsView from '$lib/components/MobileSongsView.svelte';
	import { SIDEPLAY_WIDE_BREAKPOINT } from '$lib/breakpoints';
	import {
		catalog,
		openCreatePlaylistDialog,
		openPlaylistAddDialog,
		openTrackAddDialog,
		playSongFromQueueWithOrigin,
		removeLibraryTrack,
		syncLibrary,
		sortSongsForLibrary,
		toggleLibrarySortMode,
		ui
	} from '$lib/ui/state';
	import type { PlaylistBrowserSection } from '$lib/types';
	let viewportWidth = 1024;
	let isCompactViewport = false;
	let sortedLibrarySource = null;
	let sortedLibraryMode = '';
	let sortedLibrary = [];
	$: isCompactViewport = viewportWidth <= SIDEPLAY_WIDE_BREAKPOINT;
	$: if (sortedLibrarySource !== $catalog.library || sortedLibraryMode !== $ui.librarySortMode) {
		sortedLibrarySource = $catalog.library;
		sortedLibraryMode = $ui.librarySortMode;
		sortedLibrary = sortSongsForLibrary($catalog.library, $ui.librarySortMode);
	}
	$: librarySongs = sortedLibrary;
	$: librarySortLabel = $ui.librarySortMode === 'artist' ? 'Artist' : 'Song';

	function openSettings() {
		ui.update((state) => ({ ...state, settingsOpen: true }));
	}

	function playLibraryShuffled() {
		const shuffled = [...librarySongs].sort(() => Math.random() - 0.5);
		playSongFromQueueWithOrigin(shuffled, 0, { kind: 'manual' });
	}

	/** @param {number} index */
	function handleLibraryRemove(index) {
		const song = librarySongs[index];
		if (!song) return;
		void removeLibraryTrack(song.youtubeId ?? song.id);
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
	<title>Sideplay - Library</title>
</svelte:head>

<svelte:window bind:innerWidth={viewportWidth} />

{#if isCompactViewport}
	<MobileSongsView
		title="Library"
		subtitle="All songs in one place"
		songs={librarySongs}
		loading={$catalog.status === 'loading'}
		error={$catalog.status === 'error' ? $catalog.error ?? 'Unable to load library.' : ''}
		emptyMessage="Your library is empty."
		backHref="/playlists"
		onPlay={(index) =>
			playSongFromQueueWithOrigin(librarySongs, index, {
				kind: 'library',
				sortMode: $ui.librarySortMode
			})
		}
		showRemove
		onRemove={handleLibraryRemove}
		actions={[
			{
				icon: 'sort',
				label: `Sort by ${librarySortLabel}`,
				title: `Sort by ${librarySortLabel}`,
				onClick: toggleLibrarySortMode
			},
			{
				icon: 'add',
				label: 'Add to Library',
				title: 'Add track to library',
				onClick: () => openTrackAddDialog('all')
			},
			{
				icon: 'shuffle',
				label: 'Shuffle',
				title: 'Shuffle library',
				onClick: playLibraryShuffled
			}
		]}
	/>
{:else}
	<BrowserShell
		sections={$catalog.sections}
		activePath="/library"
		onSync={() => void syncLibrary()}
		onSectionAdd={handleSectionAdd}
	>
		<div slot="header" class="panel-header header-row">
			<div class="panel-title">
				<h1 class="headline">Library</h1>
				<p class="subhead">All songs in one place</p>
			</div>
			<div class="button-row">
				<button class="sideplay-chip tone-secondary" type="button" on:click={toggleLibrarySortMode} title={`Sort by ${librarySortLabel}`}>
					<AppIcon name="sort" size={14} />
					<span>Sort: {librarySortLabel}</span>
				</button>
				<button class="sideplay-chip tone-primary" type="button" on:click={() => openTrackAddDialog('all')} title="Add track to library">
					<AppIcon name="add" size={14} />
					<span>Add to Library</span>
				</button>
				<button class="sideplay-icon-button" type="button" on:click={openSettings} aria-label="Settings" title="Settings">
					<AppIcon name="settings" size={18} />
				</button>
			</div>
		</div>

		<BrowserSongList
			songs={librarySongs}
			loading={$catalog.status === 'loading'}
			error={$catalog.status === 'error' ? $catalog.error ?? 'Unable to load library.' : ''}
			emptyMessage="Your library is empty."
			onPlay={(index) =>
				playSongFromQueueWithOrigin(librarySongs, index, {
					kind: 'library',
					sortMode: $ui.librarySortMode
				})
			}
			showRemove
			onRemove={handleLibraryRemove}
		/>
	</BrowserShell>
{/if}

<style>
	.header-row {
		padding: 1rem 1rem 0.618rem;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 90%, transparent);
	}

</style>
