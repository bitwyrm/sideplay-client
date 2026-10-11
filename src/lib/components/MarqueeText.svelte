<script lang="ts">
	import { onMount } from 'svelte';

	export let text = '';
	export let maxWidth = 200;
	export let speed = 24;

	let container = null;
	let track = null;
	let textNode = null;
	let overflow = false;
	let distance = 0;
	let offset = 0;
	let dragging = false;
	let hovering = false;
	let visible = true;
	let dragStartX = 0;
	let dragStartOffset = 0;
	let rafId = null;
	let lastFrame = 0;
	let resizeObserver = null;
	let intersectionObserver = null;

	function handleMouseEnter() {
		hovering = true;
	}

	function handleMouseLeave() {
		hovering = false;
	}

	function wrap(value) {
		if (!distance) return 0;
		const wrapped = value % distance;
		return wrapped < 0 ? wrapped + distance : wrapped;
	}

	function measure() {
		if (!container || !track || !textNode) return;
		overflow = track.scrollWidth > container.clientWidth;
		distance = overflow ? textNode.scrollWidth + 32 : 0;
		offset = overflow ? wrap(offset) : 0;
		if (overflow && visible) startAnimation();
		else stopAnimation();
	}

	function stopAnimation() {
		if (rafId !== null) window.cancelAnimationFrame(rafId);
		rafId = null;
		lastFrame = 0;
	}

	function tick(now) {
		if (!overflow || !visible) {
			stopAnimation();
			return;
		}
		if (!lastFrame) lastFrame = now;
		const delta = (now - lastFrame) / 1000;
		lastFrame = now;
		if (!hovering && !dragging) {
			offset = wrap(offset + speed * delta);
		}
		rafId = window.requestAnimationFrame(tick);
	}

	function startAnimation() {
		if (rafId !== null || !overflow || !visible) return;
		rafId = window.requestAnimationFrame(tick);
	}

	function startDrag(event) {
		if (!overflow || event.button !== 0) return;
		dragging = true;
		dragStartX = event.clientX;
		dragStartOffset = offset;
		track?.setPointerCapture?.(event.pointerId);
	}

	function moveDrag(event) {
		if (!dragging) return;
		offset = wrap(dragStartOffset - (event.clientX - dragStartX));
	}

	function endDrag(event) {
		if (!dragging) return;
		dragging = false;
		if (event) {
			track?.releasePointerCapture?.(event.pointerId);
		}
	}

	onMount(function () {
		measure();
		resizeObserver = new ResizeObserver(measure);
		if (container) resizeObserver.observe(container);
		if (track) resizeObserver.observe(track);
		if (textNode) resizeObserver.observe(textNode);

		intersectionObserver = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) startAnimation();
			else stopAnimation();
		});
		if (container) intersectionObserver.observe(container);

		function cleanup() {
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			stopAnimation();
		}

		return cleanup;
	});
</script>

<div
	class="marquee"
	data-marquee
	role="group"
	bind:this={container}
	style={`max-width: ${maxWidth}px;`}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	on:pointerdown|stopPropagation={startDrag}
	on:pointermove|stopPropagation={moveDrag}
	on:pointerup|stopPropagation={endDrag}
	on:pointercancel|stopPropagation={endDrag}
>
	<div class="viewport">
		<div
			class:draggable={overflow}
			class="track"
			bind:this={track}
			style={`transform: translate3d(${-offset}px, 0, 0);`}
		>
			<span class="text" bind:this={textNode}>{text}</span>
			{#if overflow}
				<span class="text clone" aria-hidden="true">{text}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.marquee {
		max-width: 100%;
		width: fit-content;
		min-width: 0;
		cursor: grab;
	}

	.marquee:active {
		cursor: grabbing;
	}

	.viewport {
		max-width: 100%;
		overflow: hidden;
		border-radius: inherit;
	}

	.track {
		display: flex;
		align-items: center;
		gap: 2rem;
		width: max-content;
		will-change: transform;
	}

	.text {
		flex: 0 0 auto;
		white-space: nowrap;
	}

	.clone {
		padding-right: 2rem;
	}

	.track.draggable {
		user-select: none;
	}
</style>
