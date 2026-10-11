<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { setActivePanel, playback } from '$lib/ui/state';

	const tabs = [
		{ key: 'queue', label: 'Queue', icon: 'tag' },
		{ key: 'lyrics', label: 'Lyrics', icon: 'lyrics' }
	] as const;

	let tabButtons = [];

	function handleKeydown(event, index) {
		let nextIndex = index;
		if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
		if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
		if (event.key === 'Home') nextIndex = 0;
		if (event.key === 'End') nextIndex = tabs.length - 1;
		if (nextIndex === index) return;

		event.preventDefault();
		setActivePanel(tabs[nextIndex].key);
		tabButtons[nextIndex]?.focus();
	}
</script>

<div class="tabs" role="tablist" aria-label="Playback panels">
	{#each tabs as tab, index}
		<button
			class:active={$playback.activePanel === tab.key || (tab.key === 'queue' && $playback.activePanel === 'overview')}
			type="button"
			role="tab"
			id={`playback-tab-${tab.key}`}
			aria-selected={$playback.activePanel === tab.key || (tab.key === 'queue' && $playback.activePanel === 'overview')}
			aria-controls={`playback-panel-${tab.key}`}
			tabindex={$playback.activePanel === tab.key || (tab.key === 'queue' && $playback.activePanel === 'overview') ? 0 : -1}
			aria-label={tab.label}
			bind:this={tabButtons[index]}
			on:click={() => setActivePanel(tab.key)}
			on:keydown={(event) => handleKeydown(event, index)}
		>
			<AppIcon name={tab.icon} size={14} />
			<span>{tab.label}</span>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		gap: 0.809rem;
		padding: 0.382rem 0.382rem 0;
	}

	button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.382rem;
		padding: 0.382rem 0.25rem 0.618rem;
		border: 0;
		background: transparent;
		color: var(--sideplay-text-muted);
		font: inherit;
		font-weight: 500;
		line-height: 1.1;
		transition:
			color 140ms ease,
			box-shadow 140ms ease;
	}

	button:hover {
		color: var(--sideplay-text-strong);
	}

	button:active {
		transform: none;
	}

	button.active {
		color: var(--sideplay-text-strong);
		font-weight: 600;
	}

	button.active::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 72%;
		height: 2px;
		transform: translateX(-50%);
		border-radius: 999px;
		background: var(--sideplay-accent);
	}

</style>
