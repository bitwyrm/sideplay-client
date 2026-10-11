<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import { createAccount, signIn, ui } from '$lib/ui/state';

	let username = '';
	let password = '';
	let showPassword = false;
	let creatingAccount = false;
	let loading = false;
	let error = '';

	async function submit() {
		error = '';
		if (!username.trim() || !password) {
			error = 'Username and password are required.';
			return;
		}
		loading = true;
		try {
			if (creatingAccount) await createAccount(username.trim(), password);
			await signIn(username.trim(), password);
			await goto('/library');
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to sign in.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sideplay - Login</title>
</svelte:head>

<div class="login-shell">
	<button class="sideplay-icon-button settings-gear" type="button" aria-label="Settings" on:click={() => ui.update((state) => ({ ...state, settingsOpen: true }))}>
		<AppIcon name="settings" size={18} />
	</button>

	<section class="login-card glass-panel">
		<div class="brand">Sideplay</div>
		<p class="subtitle">Sign in to load your library and playlists.</p>

		<form class="login-form" on:submit|preventDefault={submit}>
			<label class="field">
				<span>Username</span>
				<input bind:value={username} />
			</label>

			<label class="field">
				<span>Password</span>
				<div class="password-row">
					<input bind:value={password} type={showPassword ? 'text' : 'password'} />
					<button class="sideplay-icon-button eye" type="button" aria-label="Toggle password visibility" on:click={() => (showPassword = !showPassword)}>
						<AppIcon name={showPassword ? 'visibility' : 'visibility_off'} size={18} />
					</button>
				</div>
			</label>

			<div class="actions">
				<button class="sideplay-button tone-primary primary" type="submit" disabled={loading}>
					{loading ? 'Working…' : creatingAccount ? 'Create account' : 'Sign In'}
				</button>
				<button class="sideplay-button secondary" type="button" on:click={() => (creatingAccount = !creatingAccount)} disabled={loading}>
					{creatingAccount ? 'Back to sign in' : 'Need an account? Create one'}
				</button>
			</div>
		</form>

		{#if error}<p class="error">{error}</p>{/if}

		<p class="note">
			Sign in to load your library, playlists, and playable media.
		</p>
	</section>
</div>

<style>
	.login-shell {
		box-sizing: border-box;
		position: relative;
		min-height: calc(100% - var(--sideplay-mini-height));
		display: grid;
		place-items: center;
		padding: 1.618rem;
	}

	.settings-gear {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 5;
		color: var(--sideplay-accent);
		font-size: 1.4rem;
	}

	.login-card {
		box-sizing: border-box;
		width: min(100%, 27rem);
		padding: 2.118rem 1.618rem 1.618rem;
		display: grid;
		gap: 0.809rem;
		text-align: center;
		border-radius: 1.618rem;
		background: color-mix(in srgb, var(--sideplay-surface) 74%, black 26%);
		border-color: color-mix(in srgb, var(--sideplay-border) 85%, transparent);
	}

	.brand {
		font-size: clamp(2rem, 4vw, 2.618rem);
		font-weight: 800;
		color: var(--sideplay-accent);
		line-height: 1.05;
	}

	.subtitle,
	.note {
		margin: 0;
		color: var(--sideplay-text-muted);
		line-height: 1.38;
	}

	.field {
		display: grid;
		gap: 0.382rem;
		text-align: left;
	}

	.login-form {
		display: grid;
		gap: 0.809rem;
	}

	.field span {
		font-size: 0.86rem;
		color: var(--sideplay-text-strong);
		line-height: 1.2;
	}

	.field input {
		width: 100%;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--sideplay-border) 70%, white 30%);
		background: transparent;
		color: var(--sideplay-text-strong);
		padding: 0.618rem 0;
		outline: none;
	}

	.password-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.618rem;
		align-items: center;
	}

	.eye {
		color: var(--sideplay-text-strong);
		font-size: 1.3rem;
		width: 2.118rem;
		height: 2.118rem;
		padding: 0;
	}

	.actions {
		display: grid;
		gap: 0.618rem;
	}

	.primary {
		min-height: 2.618rem;
		border-radius: 1.618rem;
		font-size: 1rem;
	}

	.secondary {
		min-height: 2.2rem;
		border: 1px solid var(--sideplay-border);
		border-radius: 1.2rem;
		background: transparent;
		color: var(--sideplay-text-strong);
	}

	.error {
		margin: 0;
		color: #ff8da8;
		font-size: 0.86rem;
	}

	.primary {
		border: 0;
		background: color-mix(in srgb, var(--sideplay-accent) 14%, transparent);
		color: var(--sideplay-text-strong);
	}

	.note {
		font-size: 0.86rem;
	}
</style>
