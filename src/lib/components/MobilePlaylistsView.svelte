<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	export let sections = [];
	export let activePath = '/playlists';
	export let onSync;
	export let onSectionAdd;
	export let actions = [];
	export let loading = false;
	export let error = '';
	$: hasPlaylists = sections.some((section) => section.playlists.length > 0);
</script>

<div class="mobile-playlists route-fade">
	<header class="mobile-header">
		<div class="mobile-title">Browse</div>

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

	<div class="mobile-sidebar-shell">
		{#if loading}
			<div class="list-state" role="status">Loading playlists…</div>
		{:else if error}
			<div class="list-state error-state" role="alert">{error}</div>
		{:else if hasPlaylists}
			<Sidebar {sections} {activePath} {onSync} {onSectionAdd} />
		{:else}
			<div class="list-state">No playlists available.</div>
		{/if}
	</div>
</div>

<style>
	.mobile-playlists {
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
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.809rem;
		min-height: 3.5rem;
		padding: 0.85rem 1rem 0.7rem;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 90%, transparent);
	}

	.mobile-title {
		min-width: 0;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.01em;
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

	.mobile-sidebar-shell {
		display: flex;
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
	}

	.mobile-sidebar-shell :global(.sidebar) {
		flex: 1 1 auto;
		min-height: 0;
	}

	.list-state {
		width: 100%;
		padding: 2rem 1rem;
		color: var(--sideplay-text-muted);
		text-align: center;
	}

	.error-state {
		color: var(--sideplay-danger);
	}
</style>
