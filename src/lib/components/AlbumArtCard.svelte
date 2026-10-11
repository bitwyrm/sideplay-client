<script lang="ts">
	/** @type {import('$lib/types').Song | null} */
	export let song = null;
	export let size = 120;
	export let radius = 20;
	$: image = song?.thumbnailUrl ? `url(${JSON.stringify(song.thumbnailUrl)})` : 'none';
</script>

<div
	class="album-art"
	style:width={`${size}px`}
	style:height={`${size}px`}
	style:border-radius={`${radius}px`}
	style:background-image={image}
	aria-hidden="true"
></div>

<style>
	.album-art {
		box-sizing: border-box;
		position: relative;
		border: 1px solid var(--sideplay-border);
		box-shadow: var(--sideplay-shadow-soft);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}
</style>
