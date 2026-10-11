<script lang="ts">
	import { tick } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import BrowserSongList from '$lib/components/BrowserSongList.svelte';
	import {
		playback,
		playSongFromQueueWithOrigin,
		removePlaybackQueueLocally,
		reorderPlaybackQueueLocally,
		currentLyrics
	} from '$lib/ui/state';

	export let songs = [];

	$: currentSeconds = $playback.progressSeconds;
	$: activeLineIndex = $playback.activePanel === 'lyrics'
		? $currentLyrics.reduce((index, line, currentIndex) => {
				return currentSeconds >= line.time ? currentIndex : index;
			}, -1)
		: -1;

	let lyricsViewport;
	let lastCenteredIndex = -1;
	let lastTrackId = null;
	let lastPanel = $playback.activePanel;

	$: if ($playback.currentTrackId !== lastTrackId) {
		lastTrackId = $playback.currentTrackId;
		lastCenteredIndex = -1;
	}
	$: if ($playback.activePanel !== lastPanel) {
		if ($playback.activePanel === 'lyrics') lastCenteredIndex = -1;
		lastPanel = $playback.activePanel;
	}

	$: if ($playback.activePanel === 'lyrics' && activeLineIndex !== lastCenteredIndex) {
		lastCenteredIndex = activeLineIndex;
		if (activeLineIndex >= 0) void centerActiveLyric();
	}

	async function centerActiveLyric() {
		await tick();
		const line = lyricsViewport?.querySelector(`[data-lyric-index="${activeLineIndex}"]`);
		line?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	function playQueueSong(index) {
		playSongFromQueueWithOrigin(songs, index, $playback.queueOrigin);
	}
</script>

	<div class="panel queue-panel" id="playback-panel-queue" role="tabpanel" aria-labelledby="playback-tab-queue" tabindex="0" hidden={$playback.activePanel === 'lyrics'}>
		<BrowserSongList
			songs={songs}
			activeIndex={$playback.activeQueueIndex}
			compact
			flat
			showDragHandle
			showRemove
			onPlay={playQueueSong}
			onRemove={removePlaybackQueueLocally}
			onReorder={reorderPlaybackQueueLocally}
		/>
	</div>

	<div class="panel lyrics-panel" id="playback-panel-lyrics" role="tabpanel" aria-labelledby="playback-tab-lyrics" tabindex="0" hidden={$playback.activePanel !== 'lyrics'}>
		<div class="lyrics" bind:this={lyricsViewport}>
			{#each $currentLyrics as line, index (line.time)}
				<div data-lyric-index={index} class:active={index === activeLineIndex} class="lyric-line" aria-current={index === activeLineIndex ? 'step' : undefined}>
					<span>{line.text}</span>
				</div>
			{/each}
		</div>
	</div>

<style>
	.panel {
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		gap: 0;
		padding: 0;
		border-radius: 0.95rem;
		border: 0;
		min-height: 100%;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, transparent);
	}

	/* The panel has an explicit display rule, so restore the native hidden behavior. */
	.panel[hidden] {
		display: none;
	}

	.queue-panel {
		min-height: 0;
		height: 100%;
		overflow: auto;
	}

	.lyrics {
		box-sizing: border-box;
		display: grid;
		align-content: start;
		gap: 0.382rem;
		min-height: 100%;
		overflow: auto;
		padding: 0.25rem 0.5rem 0.5rem;
	}

	.lyrics-panel {
		padding-bottom: 0.809rem;
	}

	.lyric-line {
		content-visibility: auto;
		contain-intrinsic-size: 3rem;
		display: grid;
		place-items: center;
		padding: 0.618rem 0.809rem;
		border-radius: 0.809rem;
		color: var(--sideplay-text-muted);
		transition: background 140ms ease, color 140ms ease;
		text-align: center;
	}

	.lyric-line.active {
		background: rgba(216, 0, 108, 0.18);
		color: var(--sideplay-text-strong);
	}

</style>
