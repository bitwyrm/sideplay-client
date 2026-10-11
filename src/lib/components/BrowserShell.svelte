<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';

	export let sections = [];
	export let activePath = '/library';
	export let onSync;
	export let onSectionAdd;
</script>

<div class="browser-shell route-fade">
	<Sidebar {sections} {activePath} {onSync} {onSectionAdd} />

	<main class="browser-main">
		<section class="surface-panel main-panel">
			<slot name="header" />
			<div class="main-content">
				<slot />
			</div>
		</section>
	</main>
</div>

<style>
	.browser-shell {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: minmax(17rem, var(--sideplay-sidebar-width)) minmax(0, 1fr);
		gap: 0;
		align-items: stretch;
		height: 100%;
		min-height: 0;
		border: 1px solid var(--sideplay-border);
		border-radius: 0;
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)),
			color-mix(in srgb, var(--sideplay-surface) 92%, black 8%);
		box-shadow: 0 0.95rem 2.45rem rgba(0, 0, 0, 0.3);
	}

	.browser-main {
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow: auto;
		border-left: 1px solid color-mix(in srgb, var(--sideplay-border) 88%, transparent);
	}

	.main-panel {
		height: 100%;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		border-radius: 0;
		background: transparent;
		border: 0;
		box-shadow: none;
	}

	.main-content {
		min-height: 0;
		display: grid;
	}

	@media (max-width: 1000px) {
		.browser-shell {
			grid-template-columns: 1fr;
		}

		.main-panel {
			min-height: auto;
		}
	}
</style>
