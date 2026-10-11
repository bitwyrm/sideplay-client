<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { currentTrack, nextTrack, playback, previousTrack, seekTo, setPlaybackPlaying, updatePlaybackProgress } from '$lib/ui/state';

	let audio = null;
	let loadedUrl = '';
	let lastPlaying = false;
	let handledSeekRequestId = 0;
	let lastMetadataKey = '';
	let removeMediaSessionHandlers = () => {};

	onMount(() => {
		if (!('mediaSession' in navigator)) return;
		const session = navigator.mediaSession;
		const handlers = {
			play: () => {
				if (get(currentTrack)?.available) setPlaybackPlaying(true);
			},
			pause: () => setPlaybackPlaying(false),
			stop: () => setPlaybackPlaying(false),
			previoustrack: () => previousTrack(),
			nexttrack: () => nextTrack(),
			seekbackward: (event) => {
				const offset = Number.isFinite(event.seekOffset) ? event.seekOffset : 10;
				seekTo(get(playback).progressSeconds - offset);
			},
			seekforward: (event) => {
				const offset = Number.isFinite(event.seekOffset) ? event.seekOffset : 10;
				seekTo(get(playback).progressSeconds + offset);
			},
			seekto: (event) => {
				if (Number.isFinite(event.seekTime)) seekTo(event.seekTime);
			}
		};
		const registered = [];
		for (const [action, handler] of Object.entries(handlers)) {
			try {
				session.setActionHandler(action as MediaSessionAction, handler);
				registered.push(action as MediaSessionAction);
			} catch {
				// Some browsers expose Media Session but support only a subset of actions.
			}
		}
		removeMediaSessionHandlers = () => {
			for (const action of registered) {
				try {
					session.setActionHandler(action, null);
				} catch {
					// Ignore unsupported or unavailable actions during teardown.
				}
			}
		};
	});

	onDestroy(() => removeMediaSessionHandlers());

	$: if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
		const track = $currentTrack;
		const session = navigator.mediaSession;
		const metadataKey = track
			? [track.id, track.title, track.artist, track.thumbnailUrl ?? ''].join('\u0000')
			: '';
		if (metadataKey !== lastMetadataKey) {
			lastMetadataKey = metadataKey;
			session.metadata = track && typeof MediaMetadata !== 'undefined'
				? new MediaMetadata({
						title: track.title,
						artist: track.artist,
						album: 'Sideplay',
						artwork: track.thumbnailUrl ? [{ src: track.thumbnailUrl }] : []
					})
				: null;
		}
		session.playbackState = track ? ($playback.isPlaying ? 'playing' : 'paused') : 'none';
		const duration = Number(audio?.duration ?? $playback.durationSeconds);
		const position = Number(audio?.currentTime ?? $playback.progressSeconds);
		if (Number.isFinite(duration) && duration > 0 && Number.isFinite(position)) {
			try {
				session.setPositionState({
					duration,
					playbackRate: audio?.playbackRate || 1,
					position: Math.min(Math.max(0, position), duration)
				});
			} catch {
				// Position state is optional and can be rejected until media metadata is ready.
			}
		}
	}

	$: if (audio) {
		const nextUrl = $currentTrack?.mediaUrl ?? '';
		const sourceChanged = nextUrl !== loadedUrl;
		if ($playback.seekRequestId !== handledSeekRequestId) {
			handledSeekRequestId = $playback.seekRequestId;
			if (Number.isFinite(audio.duration)) audio.currentTime = $playback.progressSeconds;
		}
		if (sourceChanged) {
			loadedUrl = nextUrl;
			audio.pause();
			audio.src = nextUrl;
			audio.load();
		}
		if ($playback.isPlaying && nextUrl && (sourceChanged || !lastPlaying)) {
			void audio.play().catch((error) => { console.error('Audio playback failed', error); setPlaybackPlaying(false); });
		} else if (!$playback.isPlaying && lastPlaying) {
			audio.pause();
		}
		lastPlaying = $playback.isPlaying;
	}

	function handleTimeUpdate() {
		updatePlaybackProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : undefined);
	}

	function handleLoadedMetadata() {
		const requestedPosition = get(playback).progressSeconds;
		if (Number.isFinite(requestedPosition) && requestedPosition > 0 && requestedPosition < audio.duration) {
			audio.currentTime = requestedPosition;
		}
		updatePlaybackProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : undefined);
	}

	function handleEnded() {
		const before = get(playback).currentTrackId;
		nextTrack();
		const after = get(playback);
		if (after.repeatMode === 'one' && after.currentTrackId === before) {
			audio.currentTime = 0;
			void audio.play().catch((error) => { console.error('Audio playback failed', error); setPlaybackPlaying(false); });
		} else if (after.currentTrackId === before) {
			setPlaybackPlaying(false);
		}
	}
</script>

<audio
	bind:this={audio}
	preload="metadata"
	aria-hidden="true"
	on:timeupdate={handleTimeUpdate}
	on:loadedmetadata={handleLoadedMetadata}
	on:ended={handleEnded}
	on:error={() => setPlaybackPlaying(false)}
></audio>
