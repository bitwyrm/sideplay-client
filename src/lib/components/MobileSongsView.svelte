<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import BrowserSongList from '$lib/components/BrowserSongList.svelte';

	/** @type {import('$lib/types').Song[]} */
	export let songs = [];
	export let title = '';
	export let subtitle = '';
	export let backHref = '/playlists';
	/** @type {number} */
	export let activeIndex = -1;
	export let showDragHandle = false;
	export let showRemove = false;
	export let loading = false;
	export let error = '';
	export let emptyMessage = 'No songs in this list.';
	export let actions = [];
	/** @type {((index: number) => void) | undefined} */
	export let onPlay;
	/** @type {((index: number) => void) | undefined} */
	export let onRemove;
	/** @type {((fromIndex: number, toIndex: number) => void) | undefined} */
	export let onReorder;
</script>

<div class="mobile-song-view route-fade">
	<header class="mobile-header">
		<a class="mobile-back" href={backHref} aria-label="Back to playlists" title="Back to playlists">
			<AppIcon name="arrow_back" size={20} />
			<span>Back</span>
		</a>

		<div class="mobile-actions">
			{#each actions as action}
				<button
					class:icon-only={action.variant === 'icon'}
					class="sideplay-chip tone-primary mobile-action"
					type="button"
					title={action.title ?? action.label}
					aria-label={action.label}
					disabled={action.disabled}
					on:click={action.onClick}
				>
					<AppIcon name={action.icon} size={action.iconSize ?? 14} />
					{#if action.variant !== 'icon'}
						<span>{action.label}</span>
					{/if}
				</button>
			{/each}
		</div>
	</header>

	<div class="mobile-intro">
		<div class="eyebrow">Browse</div>
		<h1>{title}</h1>
		{#if subtitle}
			<p>{subtitle}</p>
		{/if}
	</div>

	<div class="mobile-body">
		<BrowserSongList
			{songs}
			{activeIndex}
			{showDragHandle}
			{showRemove}
			{loading}
			{error}
			{emptyMessage}
			onPlay={onPlay}
			onRemove={onRemove}
			onReorder={onReorder}
		/>
	</div>
</div>

<style>
	.mobile-song-view {
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, black 8%);
	}

	.mobile-header {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.809rem;
		min-height: 3.5rem;
		padding: 0.85rem 1rem 0.7rem;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 90%, transparent);
	}

	.mobile-back {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.309rem;
		padding: 0.2rem 0;
		border: 0;
		background: transparent;
		color: var(--sideplay-text-strong);
		font: inherit;
		font-weight: 600;
		font-size: 0.98rem;
		line-height: 1;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.mobile-back :global(.app-icon) {
		color: var(--sideplay-accent-alt);
	}

	.mobile-back span {
		white-space: nowrap;
		transform: translateY(0.5px);
	}

	.mobile-intro {
		min-width: 0;
		display: grid;
		gap: 0.309rem;
		padding: 0.809rem 1rem 0.618rem;
	}

	.mobile-intro .eyebrow {
		width: fit-content;
		padding: 0.18rem 0.55rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--sideplay-accent-alt) 12%, transparent);
		color: var(--sideplay-accent-alt);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		line-height: 1;
		text-transform: uppercase;
	}

	.mobile-intro h1 {
		margin: 0;
		font-size: 1.9rem;
		line-height: 1.06;
		letter-spacing: -0.02em;
	}

	.mobile-intro p {
		margin: 0.125rem 0 0;
		color: var(--sideplay-text-muted);
		line-height: 1.35;
	}

	.mobile-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.382rem;
		flex: 0 0 auto;
	}

	.mobile-action {
		min-height: 2.118rem;
	}

	.mobile-action.icon-only {
		width: 2.118rem;
		padding-left: 0;
		padding-right: 0;
	}

	.mobile-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
	}
</style>
