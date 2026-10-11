<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MobilePlaylistsView from '$lib/components/MobilePlaylistsView.svelte';
	import { SIDEPLAY_WIDE_BREAKPOINT } from '$lib/breakpoints';
	import { catalog, openCreatePlaylistDialog, openPlaylistAddDialog, syncLibrary, ui } from '$lib/ui/state';
	import type { PlaylistBrowserSection } from '$lib/types';

	let viewportWidth = 0;
	let mounted = false;
	let redirecting = false;

	/** @param {PlaylistBrowserSection} section */
	function handleSectionAdd(section) {
		if (section.source === 'local') {
			openCreatePlaylistDialog();
			return;
		}
		openPlaylistAddDialog(section.source);
	}

	function openSettings() {
		ui.update((state) => ({ ...state, settingsOpen: true }));
	}

	$: if (mounted && viewportWidth >= SIDEPLAY_WIDE_BREAKPOINT && !redirecting) {
		redirecting = true;
		void goto('/library', { replaceState: true });
	}
	onMount(() => {
		mounted = true;
	});
</script>

<svelte:head>
	<title>Sideplay - Playlists</title>
</svelte:head>

<svelte:window bind:innerWidth={viewportWidth} />

<MobilePlaylistsView
	sections={$catalog.sections}
	activePath="/playlists"
	loading={($catalog.status === 'loading' || $catalog.playlistIndexStatus === 'loading') && $catalog.sections.length === 0}
	error={$catalog.status === 'error' ? $catalog.error ?? 'Unable to load library.' : $catalog.sections.length === 0 ? $catalog.playlistIndexError ?? '' : ''}
	onSync={() => void syncLibrary()}
	onSectionAdd={handleSectionAdd}
	actions={[
		{
			icon: 'settings',
			label: 'Settings',
			title: 'Settings',
			variant: 'icon',
			onClick: openSettings
		}
	]}/>
