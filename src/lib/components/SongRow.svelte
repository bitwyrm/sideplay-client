<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import AlbumArtCard from '$lib/components/AlbumArtCard.svelte';

	/** @type {import('$lib/types').Song} */
	export let song;
	export let index = -1;
	export let active = false;
	export let compact = false;
	export let flat = false;
	export let showDragHandle = false;
	export let showRemove = false;
	export let draggable = false;
	export let dragging = false;
	/** @type {(() => void) | undefined} */
	export let onPlay;
	/** @type {(() => void) | undefined} */
	export let onRemove;
	/** @type {((event: PointerEvent) => void) | undefined} */
	export let onDragStart;

	$: interactive = typeof onPlay === 'function';
	$: removable = showRemove;
	$: playbackDisabled = interactive && !song.available;
</script>

<div
	class:unavailable={!song.available}
	class:editable={showRemove || draggable}
	class:active
	class:compact
	class:flat
	class:interactive
	class:dragging
	class="song-row"
	data-index={index}
	role="listitem"
>
	{#if interactive}
		<button
			class="song-main song-main-button"
			type="button"
			disabled={playbackDisabled}
			aria-disabled={playbackDisabled}
			title={song.available ? `Play ${song.title}` : `${song.title} is unavailable`}
			on:click={() => {
				if (song.available) onPlay?.();
			}}
		>
			{#if showDragHandle}
				<div
					class="drag-handle"
					aria-hidden="true"
					on:click|stopPropagation
					on:pointerdown={onDragStart}
				>
					<AppIcon name="drag-handle" size={14} />
				</div>
			{/if}
				<AlbumArtCard song={song} size={compact ? 42 : 44} radius={compact ? 10 : 12} />
				<div class="song-text">
					<div class="song-title">{song.title}</div>
					<div class="song-artist">{song.artist}</div>
				</div>
				</button>
	{:else}
		<div class="song-main">
			{#if showDragHandle}
				<div
					class="drag-handle"
					aria-hidden="true"
					on:click|stopPropagation
					on:pointerdown={onDragStart}
				>
					<AppIcon name="drag-handle" size={14} />
				</div>
			{/if}
				<AlbumArtCard song={song} size={compact ? 42 : 44} radius={compact ? 10 : 12} />
				<div class="song-text">
					<div class="song-title">{song.title}</div>
					<div class="song-artist">{song.artist}</div>
				</div>
			</div>
	{/if}

		<div class="song-actions">
			{#if removable}
			<button class="action danger" type="button" on:click|stopPropagation={() => onRemove?.()} aria-label="Remove song" title="Remove song">
				<AppIcon name="delete" size={16} />
			</button>
		{/if}
	</div>
</div>

<style>
	.song-row {
		box-sizing: border-box;
		content-visibility: auto;
		contain-intrinsic-size: 4.5rem;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.809rem;
		padding: 0.809rem 1rem;
		border: 1px solid transparent;
		border-radius: 1rem;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, transparent);
		color: var(--sideplay-text-strong);
		text-align: left;
		user-select: none;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			box-shadow 140ms ease;
		cursor: default;
	}

	.song-row.interactive {
		cursor: pointer;
	}

	.song-row.dragging {
		cursor: grabbing;
		opacity: 0.28;
	}

	.song-row.interactive:hover,
	.song-row.active {
		border-color: color-mix(in srgb, var(--sideplay-accent-alt) 22%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface-raised) 88%, var(--sideplay-accent-alt) 12%);
		box-shadow: none;
	}

	.song-row.interactive:hover {
		border-color: color-mix(in srgb, var(--sideplay-accent-alt) 28%, transparent);
	}

	.song-row.active {
		border-color: color-mix(in srgb, var(--sideplay-accent) 28%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface-raised) 84%, var(--sideplay-accent) 16%);
	}

	.song-row:focus-within {
		border-color: color-mix(in srgb, var(--sideplay-accent-alt) 42%, transparent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--sideplay-accent-alt) 22%, transparent);
	}

	.song-row.flat {
		padding: 0.7rem 0.95rem 0.7rem 0.809rem;
		border-radius: 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 88%, transparent);
		background: transparent;
		box-shadow: none;
	}

	.song-row.flat.interactive:hover,
	.song-row.flat.active {
		border-bottom-color: color-mix(in srgb, var(--sideplay-accent) 48%, var(--sideplay-border));
		background: color-mix(in srgb, var(--sideplay-accent) 11%, transparent);
	}

	.song-row.unavailable:not(.editable) {
		opacity: 0.66;
		filter: saturate(0.65) grayscale(0.2);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.006)),
			color-mix(in srgb, var(--sideplay-surface) 80%, black 20%);
		border-color: color-mix(in srgb, var(--sideplay-border) 80%, black 20%);
	}

	.song-row.flat.unavailable:not(.editable) {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.005)),
			color-mix(in srgb, var(--sideplay-surface) 80%, black 20%);
	}

	.song-row.unavailable.editable {
		filter: none;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.005)),
			color-mix(in srgb, var(--sideplay-surface) 80%, black 20%);
		border-color: color-mix(in srgb, var(--sideplay-border) 80%, black 20%);
	}

	.song-row.flat.unavailable.editable {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0.004)),
			color-mix(in srgb, var(--sideplay-surface) 80%, black 20%);
		border-bottom-color: color-mix(in srgb, var(--sideplay-border) 80%, black 20%);
	}

	.song-row.unavailable.editable .song-title,
	.song-row.unavailable.editable .song-artist {
		color: color-mix(in srgb, var(--sideplay-text-muted) 86%, var(--sideplay-text-strong));
	}

	.song-row.unavailable .song-title,
	.song-row.unavailable .song-artist {
		color: color-mix(in srgb, var(--sideplay-text-muted) 75%, var(--sideplay-text-strong));
	}

	.song-row.compact {
		padding: 0.618rem 0.809rem;
	}

	.song-main {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.809rem;
		flex: 1 1 auto;
	}

	.song-main-button {
		width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.drag-handle {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--sideplay-accent-alt) 10%, transparent);
		color: var(--sideplay-accent-alt);
		flex: 0 0 auto;
		margin-right: 0.1rem;
		cursor: grab;
		touch-action: none;
	}

	.song-text {
		min-width: 0;
		display: grid;
		gap: 0.22rem;
	}

	.song-title {
		font-weight: 500;
		line-height: 1.15;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.song-artist {
		color: color-mix(in srgb, var(--sideplay-text-muted) 92%, white 8%);
		font-size: 0.86rem;
		line-height: 1.22;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
	}

	.song-actions {
		flex: 0 0 auto;
		display: flex;
		gap: 0.382rem;
		align-items: center;
		padding-right: 0.125rem;
	}

	.action {
		box-sizing: border-box;
		border: 1px solid var(--sideplay-button-border-color, var(--sideplay-accent-alt));
		border-radius: 0.95rem;
		width: 2.118rem;
		height: 2.118rem;
		background: transparent;
		color: var(--sideplay-text-strong);
		--sideplay-button-border-color: var(--sideplay-accent-alt);
		--sideplay-icon-color: var(--sideplay-accent-alt);
		transition:
			transform 140ms ease,
			background 140ms ease,
			color 140ms ease;
	}

	.action:hover {
		border-color: color-mix(in srgb, var(--sideplay-accent-alt) 68%, var(--sideplay-text-strong) 32%);
		background: transparent;
		transform: translateY(-1px);
	}

	.action.danger {
		--sideplay-button-border-color: var(--sideplay-danger);
		--sideplay-icon-color: var(--sideplay-danger);
		border: 1px solid var(--sideplay-danger);
		background: transparent;
		box-shadow: none;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
	}

	.action.danger:hover {
		border-color: var(--sideplay-danger);
		background: color-mix(in srgb, var(--sideplay-danger) 12%, transparent);
	}

	.song-row.flat .song-actions {
		padding-left: 0.3rem;
	}
</style>
