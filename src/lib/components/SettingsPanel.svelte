<script lang="ts">
	import { onMount, tick } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { externalAccountOAuthUrl, listExternalAccounts, unlinkExternalAccount } from '$lib/data/api';
	import { preferences, logout, persistCurrentPreferences, refreshCatalog, syncLibrary, librarySync, resetAccountUsername, resetAccountPassword, deleteCurrentAccount, providerCapabilities, ui } from '$lib/ui/state';
	import { applyTheme, fontFamilyStacks, themePresets } from '$lib/theme';

	const themes = Object.keys(themePresets);
	const fonts = Object.keys(fontFamilyStacks);
	let dialog;
	let closeButton;
	let opener;
	let externalAccounts = [];
	let accountsLoading = false;
	let accountError = '';
	let accountAction = null;
	let newUsername = '';
	let oldPassword = '';
	let newPassword = '';
	let accountNotice = '';
	$: syncProgressText = $librarySync.progress
		? (() => {
			const progress = $librarySync.progress?.progress;
			if (progress && typeof progress === 'object') {
				const values = progress as Record<string, unknown>;
				return `Syncing media: ${values.downloaded ?? 0}/${values.total ?? '?'} downloaded, ${values.failed ?? 0} failed`;
			}
			return 'Syncing library…';
		})()
		: 'Syncing library…';

	function humanizeLabel(value) {
		return value
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	const commit = (next) => {
		preferences.set(next);
		applyTheme(next.ui.theme, next.ui.fontFamily, next.ui.uiScale, next.ui.icons, next.ui.themeMode);
		persistCurrentPreferences();
	};

	onMount(() => {
		opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		closeButton?.focus();
		const handleWindowFocus = () => void refreshExternalAccounts();
		window.addEventListener('focus', handleWindowFocus);
		void refreshExternalAccounts();
		return () => window.removeEventListener('focus', handleWindowFocus);
	});

	async function refreshExternalAccounts() {
		if ($preferences.api.mode !== 'live' || !$preferences.auth.sessionToken) {
			externalAccounts = [];
			return;
		}
		accountsLoading = true;
		accountError = '';
		try {
			const response = await listExternalAccounts($preferences);
			const rawAccounts = response && typeof response === 'object'
				? (response as Record<string, unknown>).accounts
				: [];
			externalAccounts = Array.isArray(rawAccounts)
				? rawAccounts.flatMap((item) => {
					if (!item || typeof item !== 'object') return [];
					const account = item as Record<string, unknown>;
					const provider = String(account.provider ?? '').toLowerCase();
					const externalId = String(account.external_id ?? account.externalId ?? '').trim();
					return (provider === 'youtube' || provider === 'spotify') && externalId
						? [{ provider, externalId }]
						: [];
				})
				: [];
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to load linked accounts.';
		} finally {
			accountsLoading = false;
		}
	}

	function connectExternalAccount(provider) {
		accountError = '';
		try {
			const authWindow = window.open(externalAccountOAuthUrl($preferences, provider).toString(), `sideplay-${provider}-oauth`, 'popup,width=620,height=760');
			if (!authWindow) accountError = 'The authorization window was blocked. Allow pop-ups and try again.';
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to start account authorization.';
		}
	}

	async function disconnectExternalAccount(account) {
		accountAction = account.provider;
		accountError = '';
		try {
			await unlinkExternalAccount($preferences, account.provider, account.externalId);
			await refreshExternalAccounts();
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to unlink account.';
		} finally {
			accountAction = null;
		}
	}

	async function handleUsernameReset() {
		if (!newUsername.trim()) return;
		accountAction = 'username';
		accountError = '';
		accountNotice = '';
		try {
			await resetAccountUsername(newUsername.trim());
			newUsername = '';
			accountNotice = 'Username updated.';
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to update the username.';
		} finally { accountAction = null; }
	}

	async function handlePasswordReset() {
		if (!oldPassword || !newPassword) return;
		accountAction = 'password';
		accountError = '';
		accountNotice = '';
		try {
			await resetAccountPassword(oldPassword, newPassword);
			oldPassword = '';
			newPassword = '';
			accountNotice = 'Password updated.';
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to update the password.';
		} finally { accountAction = null; }
	}

	async function handleAccountDeletion() {
		if (!window.confirm('Delete this account and its server-side data? This cannot be undone.')) return;
		accountAction = 'delete';
		accountError = '';
		try {
			await deleteCurrentAccount();
		} catch (error) {
			accountError = error instanceof Error ? error.message : 'Unable to delete the account.';
			accountAction = null;
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			void closeSettings();
			return;
		}

		if (event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
			)
		);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	async function closeSettings() {
		ui.update((state) => ({ ...state, settingsOpen: false }));
		await tick();
		if (opener?.isConnected) opener.focus();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<button
	class="sideplay-dialog-backdrop"
	type="button"
	aria-label="Close settings"
	on:click={closeSettings}
></button>

<aside bind:this={dialog} class="settings-dialog sideplay-dialog glass-panel" role="dialog" aria-modal="true" aria-label="Settings">
	<div class="sideplay-dialog-header">
		<h3 class="sideplay-dialog-title">Settings</h3>
		<button
			bind:this={closeButton}
			class="sideplay-icon-button"
			type="button"
			aria-label="Close settings"
			title="Close settings"
			on:click={closeSettings}
		>
			<AppIcon name="close" size={14} />
		</button>
	</div>

	<div class="sideplay-dialog-body">
		<p class="intro">
			Account, appearance, and routing. The content below stays compact and reversible.
		</p>

		<div class="stack">
			<section class="section-card">
				<div class="section-title-row">
					<div>
						<div class="eyebrow">Account</div>
						<h4>Session and refresh</h4>
					</div>
					<div class="button-row">
						<button class="sideplay-chip tone-secondary" type="button" on:click={() => void syncLibrary()} disabled={$librarySync.running}>
							<AppIcon name="sync" size={14} />
							<span>{$librarySync.running ? 'Syncing…' : 'Sync library'}</span>
						</button>
						<button class="sideplay-chip" type="button" on:click={logout}>Log out</button>
					</div>
				</div>
				<p class="section-copy">
					Sync requests media for tracks that are not available yet. Progress streams in while the server works.
				</p>
				{#if $librarySync.running}<p class="muted" aria-live="polite">{syncProgressText}</p>{/if}
				{#if $librarySync.error}<p class="account-error" role="alert">{$librarySync.error}</p>{/if}
				<div class="account-management">
					<form class="account-form" on:submit|preventDefault={handleUsernameReset}>
						<label><span>New username</span><input bind:value={newUsername} autocomplete="username" required /></label>
						<button class="sideplay-chip" type="submit" disabled={Boolean(accountAction)}>Update username</button>
					</form>
					<form class="account-form" on:submit|preventDefault={handlePasswordReset}>
						<label><span>Current password</span><input bind:value={oldPassword} type="password" autocomplete="current-password" required /></label>
						<label><span>New password</span><input bind:value={newPassword} type="password" autocomplete="new-password" required /></label>
						<button class="sideplay-chip" type="submit" disabled={Boolean(accountAction)}>Update password</button>
					</form>
					<button class="sideplay-chip danger-action" type="button" on:click={() => void handleAccountDeletion()} disabled={Boolean(accountAction)}>
						{accountAction === 'delete' ? 'Deleting account…' : 'Delete account'}
					</button>
				</div>
				{#if accountNotice}<p class="muted" role="status">{accountNotice}</p>{/if}
				{#if accountError}<p class="account-error" role="alert">{accountError}</p>{/if}
			</section>

			<section class="section-card">
				<div class="section-title-row">
					<div>
						<div class="eyebrow">Connected services</div>
						<h4>External accounts</h4>
					</div>
					<button class="sideplay-chip tone-secondary" type="button" on:click={() => void refreshExternalAccounts()} disabled={accountsLoading}>
						<AppIcon name="sync" size={14} />
						<span>{accountsLoading ? 'Loading…' : 'Refresh'}</span>
					</button>
				</div>
				<p class="section-copy">Connect an account to search and link its playlists. Authorization opens in a separate tab; return here to refresh the linked status.</p>
				<div class="button-row">
					<button class="sideplay-chip" type="button" on:click={() => connectExternalAccount('youtube')} disabled={$providerCapabilities?.youtube === false}>Connect YouTube</button>
					<button class="sideplay-chip" type="button" on:click={() => connectExternalAccount('spotify')} disabled={$providerCapabilities?.spotify === false}>Connect Spotify</button>
				</div>
				{#if accountsLoading && externalAccounts.length === 0}
					<p class="muted">Loading linked accounts…</p>
				{:else if externalAccounts.length}
					<div class="account-list">
						{#each externalAccounts as account (account.provider + account.externalId)}
							<div class="config-row account-row">
								<div><strong>{humanizeLabel(account.provider)}</strong><span>{account.externalId}</span></div>
								<button class="sideplay-chip" type="button" on:click={() => void disconnectExternalAccount(account)} disabled={accountAction === account.provider}>
									{accountAction === account.provider ? 'Unlinking…' : 'Unlink'}
								</button>
							</div>
						{/each}
					</div>
				{:else if !accountsLoading}
					<p class="muted">No linked accounts yet.</p>
				{/if}
				{#if accountError}<p class="account-error" role="alert">{accountError}</p>{/if}
			</section>

			<section class="section-card">
				<div class="section-title-row">
					<div>
						<div class="eyebrow">Appearance</div>
						<h4>Theme and density</h4>
					</div>
				</div>

				<label>
					<span>Theme preset</span>
					<div class="swatches">
						{#each themes as theme}
							<button
								class="sideplay-chip"
								class:active={$preferences.ui.theme === theme}
								type="button"
								on:click={() =>
									commit({
										...$preferences,
										ui: { ...$preferences.ui, theme }
									})
								}
							>
								{humanizeLabel(theme)}
							</button>
						{/each}
					</div>
				</label>

				<div class="grid-two">
					<label>
						<span>Color mode</span>
						<select
							value={$preferences.ui.themeMode}
							on:change={(event) =>
								commit({
									...$preferences,
									ui: {
										...$preferences.ui,
										themeMode: (event.currentTarget as HTMLSelectElement).value as 'dark' | 'light'
									}
								})
							}
						>
							<option value="dark">Dark</option>
							<option value="light">Light</option>
						</select>
					</label>
					<label>
						<span>Font family</span>
						<select
							value={$preferences.ui.fontFamily}
							on:change={(event) =>
								commit({
									...$preferences,
									ui: {
										...$preferences.ui,
										fontFamily: (event.currentTarget as HTMLSelectElement).value
									}
								})
							}
						>
							{#each fonts as font}
								<option value={font}>{humanizeLabel(font)}</option>
							{/each}
						</select>
					</label>

					<label>
						<span>UI scale</span>
						<input
							type="range"
							min="0.5"
							max="1.5"
							step="0.05"
							value={$preferences.ui.uiScale}
							on:input={(event) =>
								commit({
									...$preferences,
									ui: {
										...$preferences.ui,
										uiScale: (event.currentTarget as HTMLInputElement).valueAsNumber
									}
								})
							}
						/>
					</label>
				</div>

				<div class="toggle-grid">
					<label class="inline">
						<input
							type="checkbox"
							checked={$preferences.ui.leftHanded}
							on:change={(event) =>
								commit({
									...$preferences,
									ui: {
										...$preferences.ui,
										leftHanded: (event.currentTarget as HTMLInputElement).checked
									}
								})
							}
						/>
						<span>Left-handed mode</span>
					</label>

					<label class="inline">
						<input
							type="checkbox"
							checked={$preferences.ui.sidebarCollapsed}
							on:change={(event) =>
								commit({
									...$preferences,
									ui: {
										...$preferences.ui,
										sidebarCollapsed: (event.currentTarget as HTMLInputElement).checked
									}
								})
							}
						/>
						<span>Collapse sidebar</span>
					</label>
				</div>
			</section>

			<section class="section-card">
				<div class="section-title-row">
					<div>
						<div class="eyebrow">Configuration</div>
						<h4>Frontend and API paths</h4>
					</div>
				</div>
				<div class="config-grid">
					<div class="config-row">
						<div class="muted">Frontend base path</div>
						<div>{$preferences.frontend.basePath || '/'}</div>
					</div>
					<div class="config-row">
						<div class="muted">API base URL</div>
						<div>{$preferences.api.baseUrl}</div>
					</div>
					<div class="config-row">
						<div class="muted">API base path</div>
						<div>{$preferences.api.basePath}</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</aside>

<style>
	.settings-dialog {
		z-index: 9;
		width: min(34rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		border-radius: 1.618rem;
	}

	:global(.sideplay-dialog-backdrop) {
		z-index: 8;
	}

	.intro {
		margin: 0 0 0.95rem;
		color: var(--sideplay-text-muted);
		line-height: 1.38;
	}

	.section-title-row {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	h4 {
		margin: 0.15rem 0 0;
	}

	.section-card {
		padding: 0.95rem;
		border-radius: 0.95rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid color-mix(in srgb, var(--sideplay-border) 72%, transparent);
		display: grid;
		gap: 0.5rem;
	}

	.stack {
		display: grid;
		gap: 0.95rem;
	}

	label {
		display: grid;
		gap: 0.382rem;
	}

	span {
		color: var(--sideplay-text-muted);
		font-size: 0.86rem;
		line-height: 1.2;
	}

	select,
	input[type='range'] {
		width: 100%;
	}

	select {
		border: 1px solid color-mix(in srgb, var(--sideplay-border) 76%, transparent);
		border-radius: 0.95rem;
		padding: 0.618rem 0.809rem;
		background: rgba(255, 255, 255, 0.03);
		color: var(--sideplay-text-strong);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.382rem;
	}

	.swatches button {
		border: 1px solid color-mix(in srgb, var(--sideplay-border) 76%, transparent);
		border-radius: 0.809rem;
		padding: 0.382rem 0.809rem;
		background: rgba(255, 255, 255, 0.03);
		color: var(--sideplay-text-muted);
	}

	.swatches button.active {
		color: var(--sideplay-text-strong);
		border-color: color-mix(in srgb, var(--sideplay-accent) 38%, transparent);
		background: color-mix(in srgb, var(--sideplay-accent) 16%, transparent);
	}

	.grid-two {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.618rem;
	}

	.toggle-grid {
		display: grid;
		gap: 0.618rem;
	}

	.inline {
		display: flex;
		align-items: center;
		gap: 0.618rem;
	}

	.config-grid {
		display: grid;
		gap: 0.382rem;
	}

	.config-row {
		display: grid;
		gap: 0.125rem;
		padding: 0.618rem 0.809rem;
		border-radius: 0.809rem;
		background: rgba(255, 255, 255, 0.018);
	}

	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.618rem;
	}

	.account-management,
	.account-form { display: grid; gap: 0.55rem; }
	.account-form { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: end; }
	.account-form label { display: grid; gap: 0.3rem; color: var(--sideplay-text-muted); font-size: 0.86rem; }
	.account-form input { min-width: 0; border: 1px solid var(--sideplay-border); border-radius: 0.6rem; padding: 0.55rem 0.65rem; color: var(--sideplay-text); background: var(--sideplay-surface); font: inherit; }
	.danger-action { justify-self: start; color: var(--sideplay-danger, #d66); }

	.account-row > div {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}

	.account-row span,
	.muted {
		color: var(--sideplay-text-muted);
		font-size: 0.86rem;
		overflow-wrap: anywhere;
	}

	.account-error {
		margin: 0;
		color: var(--sideplay-danger, #d66);
	}

	@media (max-width: 760px) {
		.grid-two {
			grid-template-columns: 1fr;
		}
	}
</style>
