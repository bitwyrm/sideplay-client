<script lang="ts">
	export let value = 0;
	export let max = 100;
	export let disabled = false;
	export let compact = false;
	export let onChange;
	$: safeMax = Math.max(0, Number(max) || 0);
	$: safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0));

	const onInput = (event) => {
		const input = event.currentTarget as HTMLInputElement;
		value = Math.min(safeMax, Math.max(0, input.valueAsNumber || 0));
		onChange?.(value);
	};

	function handleKeydown(event) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		const direction = event.key === 'ArrowLeft' ? -1 : 1;
		const inputValue = Number(event.currentTarget.value) || 0;
		onChange?.(Math.min(safeMax, Math.max(0, inputValue + direction * 5)));
	}
</script>

<div class:compact class="progress-wrap">
	<div class="progress-track">
		<div class="progress-fill" style={`width: ${(safeMax ? (safeValue / safeMax) * 100 : 0).toFixed(2)}%`}></div>
	</div>
	<input
		class="progress-input"
		type="range"
		min="0"
		max={safeMax}
		{disabled}
		value={safeValue}
		on:pointerdown|stopPropagation
		on:pointerup|stopPropagation
		on:click|stopPropagation
		on:input={onInput}
		on:keydown={handleKeydown}
		aria-label="Playback progress"
		title="Playback progress"
	/>
</div>

<style>
	.progress-wrap {
		position: relative;
		width: 100%;
		padding: 0.15rem 0;
		user-select: none;
	}

	.progress-wrap.compact {
		padding: 0.05rem 0;
	}

	.progress-track {
		height: 0.44rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--sideplay-text-strong) 14%, transparent);
		overflow: hidden;
		transition: height 140ms ease, background 140ms ease;
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--sideplay-accent), var(--sideplay-accent-alt));
		box-shadow: 0 0 1rem color-mix(in srgb, var(--sideplay-accent) 42%, transparent);
	}

	.progress-input {
		position: absolute;
		inset: -0.55rem 0;
		width: 100%;
		appearance: none;
		background: transparent;
		pointer-events: auto;
		cursor: ew-resize;
		outline: none;
	}

	.progress-wrap:hover .progress-track,
	.progress-wrap:focus-within .progress-track {
		height: 0.5rem;
		background: color-mix(in srgb, var(--sideplay-text-strong) 22%, transparent);
	}

	.progress-input::-webkit-slider-thumb {
		box-sizing: border-box;
		appearance: none;
		width: 1.05rem;
		height: 1.05rem;
		border-radius: 50%;
		border: 2px solid white;
		background: var(--sideplay-accent);
		box-shadow: 0 0 0 0.28rem color-mix(in srgb, var(--sideplay-accent) 20%, transparent), 0 0 1rem color-mix(in srgb, var(--sideplay-accent) 32%, transparent);
	}

	.progress-input::-moz-range-thumb {
		box-sizing: border-box;
		width: 1.05rem;
		height: 1.05rem;
		border-radius: 50%;
		border: 2px solid white;
		background: var(--sideplay-accent);
		box-shadow: 0 0 0 0.28rem color-mix(in srgb, var(--sideplay-accent) 20%, transparent), 0 0 1rem color-mix(in srgb, var(--sideplay-accent) 32%, transparent);
	}

	.progress-input:hover::-webkit-slider-thumb,
	.progress-input:active::-webkit-slider-thumb,
	.progress-input:hover::-moz-range-thumb,
	.progress-input:active::-moz-range-thumb {
		transform: scale(1.08);
	}

	.progress-input:focus-visible::-webkit-slider-thumb,
	.progress-input:focus-visible::-moz-range-thumb {
		box-shadow:
			0 0 0 0.28rem color-mix(in srgb, var(--sideplay-accent) 22%, transparent),
			0 0 0 0.4rem color-mix(in srgb, var(--sideplay-accent-alt) 45%, transparent),
			0 0 1rem color-mix(in srgb, var(--sideplay-accent) 42%, transparent);
	}

	.progress-input::-webkit-slider-runnable-track,
	.progress-input::-moz-range-track {
		background: transparent;
		border: none;
	}
</style>
