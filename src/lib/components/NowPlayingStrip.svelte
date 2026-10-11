<script>
	import AlbumArtCard from '$lib/components/AlbumArtCard.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { SIDEPLAY_COMPACT_BREAKPOINT, SIDEPLAY_FOOTER_LABEL_BREAKPOINT } from '$lib/breakpoints';
	import MarqueeText from '$lib/components/MarqueeText.svelte';
	import ProgressSlider from '$lib/components/ProgressSlider.svelte';

	/** @type {import('$lib/types').Song | null} */
	export let track = null;
	export let progressSeconds = 0;
	export let durationSeconds = 0;
	export let isPlaying = false;
	/** @type {'off' | 'one' | 'all'} */
	export let repeatMode = 'off';
	export let viewportWidth = 1024;
	/** @type {'footer' | 'expanded'} */
	export let variant = 'footer';
	/** @type {(() => void) | null} */
	export let onPrevious = null;
	/** @type {(() => void) | null} */
	export let onTogglePlay = null;
	/** @type {(() => void) | null} */
	export let onNext = null;
	/** @type {((value: number) => void) | null} */
	export let onSeek = null;
	/** @type {(() => void) | null} */
	export let onQueue = null;
	/** @type {(() => void) | null} */
	export let onLyrics = null;
	/** @type {(() => void) | null} */
	export let onRepeat = null;
	export let showPanelActions = true;

	let isFooterCompact = false;
	let isExpandedTiny = false;
	let showTransport = false;
	let showProgress = false;
	let showFooterActions = false;
	let showFooterActionLabels = false;
	let showExpandedRepeat = false;
	let artSize = 60;
	let playSize = 18;

	/** @param {Event} event */
	function stopPropagation(event) {
		event.stopPropagation();
	}

	$: isFooterCompact = variant === 'footer' && viewportWidth <= SIDEPLAY_COMPACT_BREAKPOINT;
	$: isExpandedTiny = variant === 'expanded' && viewportWidth < 420;
	$: showTinyExpandedOnly = isExpandedTiny;
	$: showTransport = variant === 'footer' ? !isFooterCompact : !isExpandedTiny;
	$: showProgress = showTransport && (!isFooterCompact || variant === 'expanded');
	$: showFooterActions = variant === 'footer' && !isFooterCompact;
	$: showFooterActionLabels = variant === 'footer' && viewportWidth >= SIDEPLAY_FOOTER_LABEL_BREAKPOINT;
	$: showExpandedRepeat = variant === 'expanded' && !isExpandedTiny;
	$: repeatLabel = `Repeat ${repeatMode}`;
	$: artSize = variant === 'footer' ? (isFooterCompact ? 46 : 60) : isExpandedTiny ? 40 : 46;
	$: playSize = variant === 'footer' ? (isFooterCompact ? 25 : 18) : 25;
</script>

<div
	class:footer={variant === 'footer'}
	class:expanded={variant === 'expanded'}
	class:compact={isFooterCompact || isExpandedTiny}
	class="now-playing-strip"
>
	{#if showTinyExpandedOnly}
		<div class="mini-tiny-expanded">
			{#if onTogglePlay}
				<button class="sideplay-icon-button tone-primary" type="button" on:click={(event) => { stopPropagation(event); onTogglePlay?.(); }} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
					<AppIcon name={isPlaying ? 'pause' : 'play'} size={playSize} />
				</button>
			{/if}
		</div>
	{:else}
		<div class="mini-left">
			<AlbumArtCard song={track} size={artSize} radius={14} />
			<div class="mini-meta">
				<div class="mini-title">
					<MarqueeText text={track?.title ?? ''} maxWidth={200} speed={18} />
				</div>
				<div class="mini-artist">
					<MarqueeText text={track?.artist ?? ''} maxWidth={200} speed={14} />
				</div>
			</div>
		</div>

		{#if showTransport}
			<div class="mini-middle">
				<div class="controls">
					{#if onPrevious}
						<button class="sideplay-icon-button tone-secondary" type="button" on:click={(event) => { stopPropagation(event); onPrevious?.(); }} title="Previous track" aria-label="Previous track">
							<AppIcon name="previous" size={16} />
						</button>
					{/if}
					<button class:compact-play={isFooterCompact || isExpandedTiny} class="sideplay-icon-button tone-primary" type="button" on:click={(event) => { stopPropagation(event); onTogglePlay?.(); }} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
						<AppIcon name={isPlaying ? 'pause' : 'play'} size={playSize} />
					</button>
					{#if onNext}
						<button class="sideplay-icon-button tone-secondary" type="button" on:click={(event) => { stopPropagation(event); onNext?.(); }} title="Next track" aria-label="Next track">
							<AppIcon name="next" size={16} />
						</button>
					{/if}
				</div>
				{#if showProgress && onSeek}
					<ProgressSlider value={progressSeconds} max={durationSeconds} compact={variant === 'footer'} onChange={onSeek} />
				{/if}
			</div>
		{/if}
	{/if}

	{#if !showTinyExpandedOnly}
		<div class="mini-right">
			{#if showFooterActions}
				{#if showPanelActions}
					{#if onQueue}
						<button class="sideplay-chip tone-primary" type="button" on:pointerdown={stopPropagation} on:pointerup={stopPropagation} on:click={(event) => { stopPropagation(event); onQueue?.(); }} title="Open queue">
							<AppIcon name="tag" size={14} />
							{#if showFooterActionLabels}
								<span>Queue</span>
							{/if}
						</button>
					{/if}
					{#if onLyrics}
						<button class="sideplay-chip tone-primary" type="button" on:pointerdown={stopPropagation} on:pointerup={stopPropagation} on:click={(event) => { stopPropagation(event); onLyrics?.(); }} title="Open lyrics">
							<AppIcon name="lyrics" size={14} />
							{#if showFooterActionLabels}
								<span>Lyrics</span>
							{/if}
						</button>
					{/if}
				{/if}
				{#if onRepeat}
					<button class="sideplay-icon-button" type="button" aria-pressed={repeatMode !== 'off'} aria-label={repeatLabel} title={repeatLabel} on:pointerdown={stopPropagation} on:pointerup={stopPropagation} on:click={(event) => { stopPropagation(event); onRepeat?.(); }}>
						<AppIcon name="repeat" size={16} />
					</button>
				{/if}
			{:else if showExpandedRepeat}
				{#if onRepeat}
					<button class="sideplay-icon-button tone-secondary" type="button" aria-pressed={repeatMode !== 'off'} aria-label={repeatLabel} title={repeatLabel} on:pointerdown={stopPropagation} on:pointerup={stopPropagation} on:click={(event) => { stopPropagation(event); onRepeat?.(); }}>
						<AppIcon name="repeat" size={16} />
					</button>
				{/if}
			{:else}
				{#if onTogglePlay}
					<button class:compact-play={isFooterCompact || isExpandedTiny} class="sideplay-icon-button tone-primary" type="button" on:pointerdown={stopPropagation} on:pointerup={stopPropagation} on:click={(event) => { stopPropagation(event); onTogglePlay?.(); }} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
						<AppIcon name={isPlaying ? 'pause' : 'play'} size={playSize} />
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.now-playing-strip {
		display: flex;
		gap: 0.809rem;
		align-items: center;
		width: 100%;
		min-width: 0;
	}

	.now-playing-strip.compact {
		gap: 0.8rem;
	}

	.compact-play {
		border: 0;
		background: transparent;
		box-shadow: none;
		color: var(--sideplay-text-strong);
		padding: 0;
		width: auto;
		height: auto;
	}

	.mini-left,
	.mini-right,
	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.809rem;
		min-width: 0;
	}

	.mini-left {
		flex: 0 0 auto;
	}

	.mini-tiny-expanded {
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}

	.mini-middle {
		flex: 1 1 auto;
		min-width: 0;
		display: grid;
		gap: 0.618rem;
	}

	.mini-right {
		flex: 0 0 auto;
		justify-self: end;
		margin-left: auto;
	}

	.mini-meta {
		min-width: 0;
		width: fit-content;
		max-width: 200px;
		display: grid;
		gap: 0.125rem;
	}

	.mini-title {
		color: var(--sideplay-text-strong);
	}

	.mini-artist {
		color: color-mix(in srgb, var(--sideplay-text-muted) 92%, white 8%);
	}
</style>
