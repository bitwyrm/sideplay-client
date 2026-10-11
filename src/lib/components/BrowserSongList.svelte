<script lang="ts">
	import SongRow from '$lib/components/SongRow.svelte';

	/** @type {import('$lib/types').Song[]} */
	export let songs = [];
	export let compact = false;
	export let flat = true;
	export let activeIndex = -1;
	export let showDragHandle = false;
	export let showRemove = false;
	export let loading = false;
	export let error = '';
	export let emptyMessage = 'No songs in this list.';
	/** @type {((index: number) => void) | undefined} */
	export let onPlay;
	/** @type {((index: number) => void) | undefined} */
	export let onRemove;
	/** @type {((fromIndex: number, toIndex: number) => void) | undefined} */
	export let onReorder;

	let draggedIndex = -1;
	let insertionIndex = -1;
	let listElement;
	let dragPreview = null;
	let pointerOffsetX = 0;
	let pointerOffsetY = 0;
	let activePointerId = -1;

	function handleDragStart(index, event) {
		if (typeof onReorder !== 'function' || event.button !== 0) return;
		const row = event.currentTarget.closest('.song-row');
		if (!row) return;
		event.preventDefault();
		event.stopPropagation();
		draggedIndex = index;
		insertionIndex = index;
		activePointerId = event.pointerId;
		const bounds = row.getBoundingClientRect();
		pointerOffsetX = event.clientX - bounds.left;
		pointerOffsetY = event.clientY - bounds.top;
		dragPreview = row.cloneNode(true);
		dragPreview.inert = true;
		dragPreview.setAttribute('aria-hidden', 'true');
		Object.assign(dragPreview.style, {
			position: 'fixed',
			left: '0',
			top: '0',
			width: `${bounds.width}px`,
			height: `${bounds.height}px`,
			boxSizing: 'border-box',
			margin: '0',
			opacity: '0.96',
			zIndex: '10000',
			pointerEvents: 'none',
			cursor: 'grabbing',
			transition: 'none',
			transform: `translate3d(${bounds.left}px, ${bounds.top}px, 0)`
		});
		document.body.appendChild(dragPreview);
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event) {
		if (draggedIndex < 0 || !dragPreview || event.pointerId !== activePointerId) return;
		dragPreview.style.transform = `translate3d(${event.clientX - pointerOffsetX}px, ${event.clientY - pointerOffsetY}px, 0)`;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const row = target instanceof Element ? target.closest('.song-row') : null;
		if (row && listElement?.contains(row)) {
			const index = Number(row.getAttribute('data-index'));
			const bounds = row.getBoundingClientRect();
			insertionIndex = index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0);
			return;
		}

		if (!listElement) return;
		const listBounds = listElement.getBoundingClientRect();
		if (
			event.clientX < listBounds.left || event.clientX > listBounds.right ||
			event.clientY < listBounds.top || event.clientY > listBounds.bottom
		) {
			insertionIndex = -1;
			return;
		}
		const rows = Array.from(listElement.querySelectorAll('.song-row'));
		insertionIndex = rows.length;
		for (const candidate of rows) {
			const bounds = candidate.getBoundingClientRect();
			if (event.clientY < bounds.top + bounds.height / 2) {
				insertionIndex = Number(candidate.getAttribute('data-index'));
				break;
			}
		}
	}

	function handlePointerUp(event) {
		if (draggedIndex < 0 || event.pointerId !== activePointerId) return;
		const fromIndex = draggedIndex;
		const boundary = insertionIndex;
		const targetIndex = Math.max(0, Math.min(songs.length - 1, boundary > fromIndex ? boundary - 1 : boundary));
		if (boundary >= 0 && fromIndex !== targetIndex) onReorder?.(fromIndex, targetIndex);
		resetDrag();
	}

	function resetDrag() {
		dragPreview?.remove();
		dragPreview = null;
		draggedIndex = -1;
		insertionIndex = -1;
		activePointerId = -1;
	}

	function songKey(song, index) {
		const id = String(song?.id ?? '').trim();
		return id ? `${id}-${index}` : `song-${index}`;
	}

</script>

<svelte:window on:pointermove={handlePointerMove} on:pointerup={handlePointerUp} on:pointercancel={resetDrag} />

<div class="song-list" role="list">
	{#if loading}
		<div class="list-state" role="status">Loading songs…</div>
	{:else if error}
		<div class="list-state error-state" role="alert">{error}</div>
	{:else if !songs.length}
		<div class="list-state">{emptyMessage}</div>
	{:else}
		{#each songs as song, index (songKey(song, index))}
			{#if draggedIndex >= 0 && insertionIndex === index && insertionIndex !== draggedIndex && insertionIndex !== draggedIndex + 1}
				<div class="drop-placeholder" aria-hidden="true"></div>
			{/if}
			<SongRow
				{song}
				active={index === activeIndex}
				{compact}
				{flat}
				{showDragHandle}
				{showRemove}
				{index}
				dragging={draggedIndex === index}
				draggable={typeof onReorder === 'function' && showDragHandle}
				onPlay={onPlay ? () => onPlay(index) : undefined}
				onRemove={onRemove ? () => onRemove(index) : undefined}
				onDragStart={typeof onReorder === 'function' ? (event) => handleDragStart(index, event) : undefined}
			/>
		{/each}
		{#if draggedIndex >= 0 && insertionIndex === songs.length}
			<div class="drop-placeholder" aria-hidden="true"></div>
		{/if}
	{/if}
</div>

<style>
	.song-list {
		width: 100%;
		padding: 0 0 1rem;
		display: grid;
		align-content: start;
		min-height: 0;
	}

	.drop-placeholder {
		min-height: 4.5rem;
		margin: 0.2rem 0;
		border: 1px dashed color-mix(in srgb, var(--sideplay-accent-alt) 68%, transparent);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--sideplay-accent-alt) 8%, transparent);
		pointer-events: none;
	}

	.list-state {
		padding: 2rem 1rem;
		color: var(--sideplay-text-muted);
		text-align: center;
	}

	.error-state {
		color: var(--sideplay-danger);
	}
</style>
