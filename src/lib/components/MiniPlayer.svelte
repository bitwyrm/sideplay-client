<script lang="ts">
	import NowPlayingStrip from '$lib/components/NowPlayingStrip.svelte';
	import { SIDEPLAY_COMPACT_BREAKPOINT } from '$lib/breakpoints';
	import { currentTrack, nextTrack, openExpandedPlayer, playback, previousTrack, seekTo, togglePlay, toggleRepeatMode } from '$lib/ui/state';
	export let showPanelActions = true;

	let viewportWidth = 1024;
	let dragStartX = 0;
	let dragDeltaX = 0;
	let dragArmed = false;
	let dragging = false;
	let suppressClick = false;
	$: compact = viewportWidth <= SIDEPLAY_COMPACT_BREAKPOINT;

	const SWIPE_THRESHOLD = 56;

	function handlePointerDown(event) {
		if (!compact || event.button !== 0) return;
		dragging = true;
		dragArmed = false;
		dragDeltaX = 0;
		dragStartX = event.clientX;
	}

	function handlePointerMove(event) {
		if (!compact || !dragging) return;
		dragDeltaX = event.clientX - dragStartX;
		if (!dragArmed && Math.abs(dragDeltaX) >= SWIPE_THRESHOLD) {
			dragArmed = true;
			globalThis.navigator?.vibrate?.(30);
		}
	}

	function finishDrag() {
		const swiped = dragArmed;
		if (dragArmed) {
			suppressClick = true;
			if (dragDeltaX > 0) {
				previousTrack();
			} else {
				nextTrack();
			}
		}

		dragStartX = 0;
		dragDeltaX = 0;
		dragArmed = false;
		dragging = false;

		window.setTimeout(() => {
			suppressClick = false;
		}, 0);

		return swiped;
	}

	function openPlayer() {
		openExpandedPlayer('overview');
	}

	function openQueue() {
		openExpandedPlayer('queue');
	}

	function openLyrics() {
		openExpandedPlayer('lyrics');
	}

	function shouldIgnoreTarget(event) {
		const target = event.target;
		return target instanceof Element && target.closest('button, input, a, [role="slider"]');
	}

	function handlePointerUp(event) {
		const swiped = finishDrag();
		if (!swiped && !suppressClick && !shouldIgnoreTarget(event)) {
			openPlayer();
		}
	}

	function handleClick(event) {
		if (suppressClick || dragging || shouldIgnoreTarget(event)) return;
		openPlayer();
	}

	function handleKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			openPlayer();
		}
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<div
	class="mini glass-panel"
	role="button"
	tabindex="0"
	aria-label="Open expanded player"
	title="Open expanded player"
	on:pointerdown={handlePointerDown}
	on:pointermove={handlePointerMove}
	on:pointerup={handlePointerUp}
	on:pointercancel={finishDrag}
	on:click={handleClick}
	on:keydown={handleKeydown}
>
	<NowPlayingStrip
		variant="footer"
		viewportWidth={viewportWidth}
		track={$currentTrack}
		progressSeconds={$playback.progressSeconds}
		durationSeconds={$playback.durationSeconds}
		isPlaying={$playback.isPlaying}
		repeatMode={$playback.repeatMode}
		onPrevious={previousTrack}
		onTogglePlay={togglePlay}
		onNext={nextTrack}
		onSeek={seekTo}
		onQueue={openQueue}
		onLyrics={openLyrics}
		onRepeat={toggleRepeatMode}
		showPanelActions={showPanelActions}
	/>
</div>

<style>
	.mini {
		box-sizing: border-box;
	display: flex;
		align-items: center;
		padding: 1rem 1.118rem;
		border-radius: 0;
		width: 100%;
		max-width: none;
		margin: 0;
		border: 0;
		box-shadow: none;
		touch-action: pan-y;
		cursor: pointer;
		transition: opacity 140ms ease;
	}

	@media (max-width: 700px) {
		.mini {
			gap: 0.8rem;
		}
	}
</style>
