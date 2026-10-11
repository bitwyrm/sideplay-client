<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { preferences } from '$lib/ui/state';

	export let sections = [];
	export let activePath = '/library';
	export let onSync;
	export let onSectionAdd;

	$: collapsed = $preferences.ui.sidebarCollapsed;

	function sectionKey(section, index) {
		const source = String(section?.source ?? '').trim();
		return source ? `${source}-${index}` : `section-${index}`;
	}

	function playlistKey(playlist, index) {
		const id = String(playlist?.playlistId ?? '').trim();
		return id ? `${id}-${index}` : `playlist-${index}`;
	}
</script>

	<aside class:collapsed class="sidebar glass-panel">
	<div class="sidebar-top">
		<a class:active={activePath === '/library'} class="playlist-row library-row" href="/library" title="Open library">
			<div class="library-mark" aria-hidden="true">
				<AppIcon name="library" size={17} />
			</div>
			<div class="playlist-title">Library</div>
		</a>
		<div class="sidebar-divider" aria-hidden="true"></div>
	</div>

	<nav class="sidebar-nav">
		{#each sections as section, sectionIndex (sectionKey(section, sectionIndex))}
			<section class="section-block">
				<header class="section-header">
					<div class="section-meta">
						<div class="section-label">{section.title}</div>
					</div>
					<div class="button-row">
						{#if onSectionAdd}
							<button class="sideplay-icon-button section-add" type="button" aria-label={`Add to ${section.title}`} title={`Add to ${section.title}`} on:click={() => onSectionAdd(section)}>
								<AppIcon name="add" size={14} />
							</button>
						{/if}
					</div>
				</header>

				<div class="playlist-list">
						{#each section.playlists as playlist, playlistIndex (playlistKey(playlist, playlistIndex))}
						<a
							class:active={
								activePath === `/playlist/${playlist.playlistId}` ||
								(activePath === '/library' && playlist.playlistId === 'library')
							}
							class="playlist-row"
							href={playlist.playlistId === 'library' ? '/library' : `/playlist/${playlist.playlistId}`}
							title={playlist.title}
						>
							<div class="playlist-title">{playlist.title}</div>
						</a>
					{/each}
				</div>
			</section>
		{/each}
		<div class="sidebar-spacer" aria-hidden="true"></div>
	</nav>

	<div class="sidebar-footer">
		<div class="sidebar-divider" aria-hidden="true"></div>
	<button class="sideplay-button tone-primary sidebar-sync" type="button" on:click={onSync} title="Sync library">
			<AppIcon name="sync" size={16} />
			<span>Sync Library</span>
		</button>
	</div>
</aside>

<style>
	.sidebar {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		padding: 1rem;
		overflow: auto;
		background: transparent;
		border: 0;
		box-shadow: none;
		border-radius: 0;
	}

	.sidebar.collapsed {
		box-sizing: border-box;
		width: 4.5rem;
		padding-inline: 0.618rem;
	}

	.sidebar-top {
		flex: 0 0 auto;
		margin-bottom: 0.618rem;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
		padding-right: 0.1rem;
	}

	.sidebar-spacer {
		flex: 1 1 auto;
		min-height: 0;
	}

	.library-row {
		width: 100%;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
	}

	.section-label,
	.playlist-title {
		font-weight: 600;
		line-height: 1.15;
	}

	.section-label {
		color: var(--sideplay-accent-alt);
		font-size: 0.96rem;
	}

	.section-meta {
		display: grid;
		gap: 0;
		padding-left: 0.05rem;
	}

	.section-block {
		margin: 0;
	}

	.section-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.382rem;
		margin: 0.5rem 0 0.25rem;
		padding-left: 0.1rem;
	}

	.playlist-list {
		display: block;
	}

	.playlist-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		column-gap: 0.618rem;
		row-gap: 0.125rem;
		align-items: center;
		margin: 0.125rem 0;
		padding: 0.7rem 0.809rem 0.7rem 0.85rem;
		border-radius: 1rem;
		border: 1px solid transparent;
		background: transparent;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			box-shadow 140ms ease;
	}

	.playlist-row.active {
		border-color: color-mix(in srgb, var(--sideplay-accent) 85%, white 5%);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--sideplay-accent) 40%, white 6%),
			0 0 0 1px color-mix(in srgb, var(--sideplay-accent) 10%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.015)),
			color-mix(in srgb, var(--sideplay-accent) 18%, var(--sideplay-surface-raised) 82%);
		pointer-events: none;
		cursor: default;
	}

	.playlist-row:hover {
		border-color: color-mix(in srgb, var(--sideplay-accent-alt) 45%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.015)),
			color-mix(in srgb, var(--sideplay-surface-raised) 76%, var(--sideplay-accent-alt) 24%);
	}

	.playlist-title {
		grid-column: 1;
		align-self: center;
		width: 100%;
		text-align: left;
		transition: text-decoration-color 140ms ease;
	}

	.library-row .playlist-title {
		grid-column: 2;
	}

	.playlist-row.active:hover {
		border-color: color-mix(in srgb, var(--sideplay-accent) 88%, white 6%);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.015)),
			color-mix(in srgb, var(--sideplay-accent) 18%, var(--sideplay-surface-raised) 82%);
	}

	.sidebar-footer {
		flex: 0 0 auto;
		padding-top: 0.309rem;
		font-size: 0.84rem;
		line-height: 1.45;
		min-height: 0;
	}

	.sidebar-divider {
		height: 1px;
		margin: 0.25rem 0.5rem 0.5rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--sideplay-accent) 74%, white) 50%,
			transparent
		);
		box-shadow: none;
	}

	.sidebar-sync {
		box-sizing: border-box;
		width: 100%;
		min-height: 0;
		padding: 0.85rem 0.95rem;
		border-radius: 0.95rem;
		border: 1px solid var(--sideplay-accent);
		background: transparent;
		--sideplay-button-border-color: var(--sideplay-accent);
		--sideplay-icon-color: var(--sideplay-accent);
		color: var(--sideplay-text-strong);
		font-weight: 800;
		font-size: 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.618rem;
		transition:
			transform 140ms ease,
			background 140ms ease,
			border-color 140ms ease,
			box-shadow 140ms ease;
	}

	.sidebar-sync:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--sideplay-accent) 82%, var(--sideplay-text-strong) 18%);
		background: color-mix(in srgb, var(--sideplay-accent) 12%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--sideplay-accent) 22%, transparent),
			0 0.75rem 1.35rem color-mix(in srgb, var(--sideplay-accent) 12%, transparent);
	}

	.sidebar-sync:active {
		transform: translateY(0);
		background: color-mix(in srgb, var(--sideplay-accent) 18%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--sideplay-accent) 28%, transparent),
			0 0.35rem 0.8rem color-mix(in srgb, var(--sideplay-accent) 18%, transparent);
	}

	.section-add {
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-color: var(--sideplay-accent-alt);
		background: transparent;
		--sideplay-button-border-color: var(--sideplay-accent-alt);
		--sideplay-icon-color: var(--sideplay-accent-alt);
		line-height: 1;
		font-size: 1rem;
	}

	.library-mark {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		color: var(--sideplay-accent);
	}

	@media (max-width: 1000px) {
		.sidebar {
			position: static;
			height: auto;
			min-height: 0;
			padding: 0.85rem;
			overflow: visible;
		}

		.sidebar-nav {
			padding-right: 0;
		}
	}
</style>
