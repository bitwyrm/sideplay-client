<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import MiniPlayer from '$lib/components/MiniPlayer.svelte';
	import AddDialog from '$lib/components/AddDialog.svelte';
	import ExpandedPlayer from '$lib/components/ExpandedPlayer.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import AudioEngine from '$lib/components/AudioEngine.svelte';
	import { bootstrapApp, playback, seekTo, togglePlay, ui } from '$lib/ui/state';

	let ready = false;

	function handleGlobalKeydown(event) {
		if (event.defaultPrevented) return;
		const target = event.target;
		if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
		if (event.code === 'Space') {
			if (event.repeat) return;
			event.preventDefault();
			togglePlay();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const direction = event.key === 'ArrowLeft' ? -1 : 1;
			seekTo(get(playback).progressSeconds + direction * 5);
		}
	}

	onMount(async () => {
		await bootstrapApp();
		ready = true;
	});

	$: path = $page.url.pathname;
</script>

<svelte:head>
	<title>Sideplay</title>
</svelte:head>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="sideplay-shell">
	<AudioEngine />
	<div class="sideplay-shell-stage">
		<div class:login-page={path === '/login'} class="sideplay-page route-fade">
			<slot />
		</div>

		{#if path !== '/login' && !$playback.showExpandedPlayer}
			<div class="sideplay-footer">
				<MiniPlayer />
			</div>
		{/if}
	</div>

	{#if $playback.showExpandedPlayer}
		<ExpandedPlayer />
	{/if}

	{#if $ui.settingsOpen && path !== '/login'}
		<SettingsPanel />
	{/if}

	{#if $ui.addDialogOpen && path !== '/login'}
		<AddDialog />
	{/if}

</div>

<style>
	.sideplay-shell {
		height: 100dvh;
		min-height: 100dvh;
		box-sizing: border-box;
		overflow: hidden;
		padding: 0;
	}

	.sideplay-footer {
		min-width: 0;
		padding: 0;
	}

	@media (max-width: 700px) {
		.sideplay-shell {
			padding: 0;
		}

		.sideplay-footer {
			padding: 0;
		}
	}
</style>
