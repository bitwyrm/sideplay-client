<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import MiniPlayer from '$lib/components/MiniPlayer.svelte';
	import { SIDEPLAY_WIDE_BREAKPOINT } from '$lib/breakpoints';
	import { playback, closeExpandedPlayer, currentTrack, nextTrack, previousTrack, seekTo, togglePlay, toggleRepeatMode, ui } from '$lib/ui/state';
	import AlbumArtCard from '$lib/components/AlbumArtCard.svelte';
	import ProgressSlider from '$lib/components/ProgressSlider.svelte';
	import PlaybackPanels from '$lib/components/PlaybackPanels.svelte';
	import PlaybackTabs from '$lib/components/PlaybackTabs.svelte';

	let viewportWidth = 1024;
	let playerElement;
	let closeButton;
	let settingsButton;
	$: isWide = viewportWidth >= SIDEPLAY_WIDE_BREAKPOINT;
	$: mobileCompactMode = !isWide && $playback.activePanel !== 'overview';
	$: mobileCoverSize = Math.max(260, Math.min(viewportWidth * 0.76, 340));
	$: repeatActive = $playback.repeatMode !== 'off';
	$: repeatLabel = `Repeat ${$playback.repeatMode}`;

	onMount(() => {
		closeButton?.focus();
	});

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			if (get(ui).settingsOpen) return;
			event.preventDefault();
			void closePlayer();
			return;
		}

		if (event.key !== 'Tab' || !playerElement) return;
		const focusable = Array.from(
			playerElement.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
			)
		);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function openSettings() {
		ui.update((state) => ({ ...state, settingsOpen: true }));
	}

	function showQueue() {
		playback.update((state) => ({ ...state, activePanel: 'queue' }));
	}

	function showLyrics() {
		playback.update((state) => ({ ...state, activePanel: 'lyrics' }));
	}

	async function closePlayer() {
		closeExpandedPlayer();
		await tick();
		document.querySelector<HTMLElement>('.sideplay-footer .mini')?.focus();
	}

</script>

<svelte:window bind:innerWidth={viewportWidth} on:keydown={handleKeydown} />

<div class="player-overlay" aria-hidden="false">
	<button class="player-backdrop" type="button" aria-label="Close player" on:click={closePlayer}></button>

	<div class="player" bind:this={playerElement} role="dialog" aria-modal="true" aria-label="Expanded playback view">
		{#if isWide || !mobileCompactMode}
			<div class="header-actions">
				{#if isWide}
					<button bind:this={settingsButton} class="sideplay-icon-button" type="button" on:click={openSettings} aria-label="Settings" title="Settings">
						<AppIcon name="settings" size={18} />
					</button>
				{/if}
				<button bind:this={closeButton} class="sideplay-icon-button" type="button" on:click={closePlayer} aria-label="Close player" title="Close player">
					<AppIcon name="close" size={14} />
				</button>
			</div>
		{/if}

		<div class="player-body">
			{#if !$currentTrack}
				<div class="empty-player">Choose a song to start playback.</div>
			{:else if isWide}
				<div class="wide-layout">
					<div class="wide-stage">
						<AlbumArtCard song={$currentTrack} size={308} radius={24} />

						<div class="wide-copy">
							<div class="title">{$currentTrack.title}</div>
							<div class="artist">{$currentTrack.artist}</div>
						</div>

						<div class="wide-slider">
							<ProgressSlider value={$playback.progressSeconds} max={$playback.durationSeconds} onChange={seekTo} />
						</div>

						<div class="transport">
							<button class="sideplay-icon-button tone-secondary" type="button" on:click={previousTrack} title="Previous track" aria-label="Previous track">
								<AppIcon name="previous" size={16} />
							</button>
							<button class="sideplay-icon-button tone-primary" type="button" on:click={togglePlay} title={$playback.isPlaying ? 'Pause' : 'Play'} aria-label={$playback.isPlaying ? 'Pause' : 'Play'}>
								<AppIcon name={$playback.isPlaying ? 'pause' : 'play'} size={18} />
							</button>
							<button class="sideplay-icon-button tone-secondary" type="button" on:click={nextTrack} title="Next track" aria-label="Next track">
								<AppIcon name="next" size={16} />
							</button>
						</div>

						<div class="repeat-row">
							<button class="sideplay-icon-button tone-secondary" type="button" on:click={toggleRepeatMode} aria-pressed={repeatActive} aria-label={repeatLabel} title={repeatLabel}>
								<AppIcon name="repeat" size={16} />
							</button>
						</div>
					</div>

					<div class="panel-shell">
						<PlaybackTabs />
						<PlaybackPanels songs={$playback.queue} />
					</div>
				</div>
			{:else}
				<div class:compact-mode={mobileCompactMode} class="mobile-layout">
					{#if mobileCompactMode}
						<div class="mobile-compact-player">
							<MiniPlayer showPanelActions={false} />

							<div class="mobile-panel-shell">
								{#if $playback.activePanel === 'queue' || $playback.activePanel === 'lyrics'}
									<PlaybackTabs />
									<PlaybackPanels songs={$playback.queue} />
								{/if}
							</div>
						</div>
					{:else}
						<div class="mobile-stage">
							<AlbumArtCard song={$currentTrack} size={mobileCoverSize} radius={24} />

							<div class="mobile-copy-row">
								<div class="mobile-copy">
									<div class="title">{$currentTrack.title}</div>
									<div class="artist">{$currentTrack.artist}</div>
								</div>
							</div>

							<div class="mobile-slider">
								<ProgressSlider value={$playback.progressSeconds} max={$playback.durationSeconds} onChange={seekTo} />
							</div>

							<div class="transport">
								<button class="sideplay-icon-button tone-secondary" type="button" on:click={previousTrack} title="Previous track" aria-label="Previous track">
									<AppIcon name="previous" size={16} />
								</button>
								<button class="sideplay-icon-button tone-primary" type="button" on:click={togglePlay} title={$playback.isPlaying ? 'Pause' : 'Play'} aria-label={$playback.isPlaying ? 'Pause' : 'Play'}>
									<AppIcon name={$playback.isPlaying ? 'pause' : 'play'} size={18} />
								</button>
								<button class="sideplay-icon-button tone-secondary" type="button" on:click={nextTrack} title="Next track" aria-label="Next track">
									<AppIcon name="next" size={16} />
								</button>
								<button class="sideplay-icon-button tone-secondary" type="button" on:click={toggleRepeatMode} aria-pressed={repeatActive} aria-label={repeatLabel} title={repeatLabel}>
									<AppIcon name="repeat" size={16} />
								</button>
							</div>

							<div class="mobile-actions">
								<button class="sideplay-chip tone-primary" type="button" on:click={showQueue} title="Show queue">
									<AppIcon name="tag" size={14} />
									<span>Queue</span>
								</button>
								<button class="sideplay-chip tone-primary" type="button" on:click={showLyrics} title="Show lyrics">
									<AppIcon name="lyrics" size={14} />
									<span>Lyrics</span>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.player-overlay {
		position: fixed;
		inset: 0;
		z-index: 4;
	}

	.player-backdrop {
		position: absolute;
		inset: 0;
		z-index: 5;
		border: 0;
		background: var(--sideplay-backdrop);
		backdrop-filter: blur(8px);
	}

	.player {
		position: absolute;
		inset: 0;
		z-index: 6;
		width: 100%;
		height: 100%;
		max-width: none;
		max-height: none;
		display: block;
		border: 0;
		border-radius: 0;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, black 8%);
		box-shadow: none;
		backdrop-filter: blur(10px) saturate(1.08);
		transform: none;
		animation: player-pop 180ms ease-out;
	}

	.header-actions {
		position: absolute;
		top: 0.809rem;
		right: 0.809rem;
		display: flex;
		gap: 0.382rem;
		z-index: 7;
	}

	.player-body {
		height: 100%;
		box-sizing: border-box;
		overflow: auto;
		padding: 0;
		display: grid;
		gap: 0.809rem;
	}

	@media (min-width: 1000px) {
		.player-body {
			padding: 2.618rem 1.618rem 1.618rem;
		}
	}

	.wide-layout {
		display: grid;
		grid-template-columns: minmax(20rem, 1fr) minmax(22rem, 0.98fr);
		gap: 1.618rem;
		align-items: center;
		padding: 0.125rem 0.125rem 0.382rem;
		min-height: calc(100vh - 6.5rem);
	}

	.wide-stage {
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 0.809rem;
		padding-top: 0.382rem;
	}

	.wide-copy {
		display: grid;
		justify-items: center;
		gap: 0.382rem;
		width: 100%;
		max-width: 36rem;
	}

	.title {
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1.08;
		text-align: center;
	}

	.artist {
		color: var(--sideplay-text-muted);
		font-size: 1.1rem;
		line-height: 1.32;
		text-align: center;
	}

	.wide-slider {
		width: min(100%, 28rem);
	}

	.transport {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.809rem;
	}

	.repeat-row {
		margin-top: 0.618rem;
	}

	.panel-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.618rem;
		align-self: stretch;
		min-height: 0;
		padding-top: 0;
		padding-bottom: 0.382rem;
		height: 100%;
	}

		.mobile-layout {
			display: grid;
			align-content: center;
		justify-items: center;
		min-height: 0;
		height: 100%;
		width: 100%;
	}

	.mobile-layout.compact-mode {
		align-content: stretch;
		justify-items: stretch;
		gap: 0.125rem;
		width: 100%;
		height: 100%;
		min-height: 0;
		padding: 0.125rem;
	}

	.mobile-compact-player {
		width: 100%;
		height: 100%;
		min-height: 0;
		margin: 0;
		padding: 0;
		border-radius: 0;
		border: 0;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.25rem;
		box-sizing: border-box;
		overflow: hidden;
		background: transparent;
	}

	.mobile-stage {
		width: min(100%, 36rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.809rem;
		min-height: 0;
		height: 100%;
		text-align: center;
	}

	.mobile-panel-shell {
		width: 100%;
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: 0;
		align-self: stretch;
		border-radius: 0;
		border: 0;
		background: transparent;
	}

	.mobile-panel-shell :global(.panel) {
		width: 100%;
		height: 100%;
		flex: 1 1 0;
		min-height: 0;
		border-radius: 0;
		padding: 0;
		background: transparent;
		box-shadow: none;
	}

	.mobile-panel-shell :global(.tabs) {
		padding-top: 0;
		padding-bottom: 0;
	}

	.mobile-panel-shell :global(.lyrics) {
		padding-left: 0.125rem;
		padding-right: 0.125rem;
		padding-bottom: 0.125rem;
	}

	.mobile-panel-shell :global(.lyrics-panel) {
		padding-bottom: 0;
	}

	.mobile-copy-row {
		width: min(100%, 32rem);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.809rem;
		padding: 0;
	}

	.mobile-copy {
		min-width: 0;
		display: grid;
		gap: 0.125rem;
		justify-items: center;
		text-align: center;
	}

	.mobile-slider {
		width: min(100%, 28rem);
	}

	.mobile-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.382rem;
		padding-top: 0.125rem;
	}

	@media (max-width: 1000px) {
		.wide-layout {
			grid-template-columns: 1fr;
		}

		.player-body {
			padding: 0;
		}

		.mobile-layout {
			align-content: stretch;
		}

		.mobile-stage {
			width: min(100%, 38rem);
			justify-content: center;
		}
	}

	@media (max-width: 420px) {
		.mobile-layout.compact-mode {
			padding: 0;
			gap: 0;
		}

		.mobile-compact-player {
			gap: 0;
		}

		.mobile-panel-shell :global(.panel) {
			padding-left: 0;
			padding-right: 0;
		}
	}

	@keyframes player-pop {
		from {
			opacity: 0;
			transform: scale(0.94);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.empty-player {
		min-height: 18rem;
		display: grid;
		place-items: center;
		padding: 2rem;
		color: var(--sideplay-text-muted);
		text-align: center;
	}
</style>
