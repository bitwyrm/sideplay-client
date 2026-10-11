<script>
	const codepoints = {
		add: '\ue145',
		close: '\ue5cd',
		delete: '\ue872',
		edit: '\ue3c9',
		'drag-handle': '\ue945',
		library: '\ue030',
		lyrics: '\uec0b',
		'left-arrow': '\ue5cb',
		next: '\ue044',
		pause: '\ue034',
		play: '\ue037',
		previous: '\ue045',
		check: '\ue5ca',
		repeat: '\ue040',
		shuffle: '\ue043',
		'right-arrow': '\ue5cc',
		settings: '\ue8b8',
		sync: '\ue627',
		sort: '\ue164',
		tag: '\ue03d',
		visibility: '\ue8f4',
		visibility_off: '\ue8f5',
		arrow_back: '\ue5c4'
	};

	export let name = 'add';
	export let size = 18;
	export let label = '';
	export let decorative = true;

	$: iconSize = Math.max(size, 20);
	$: glyph = codepoints[name] ?? name;
</script>

<span
	class="app-icon"
	style={`--icon-size: ${iconSize}px`}
	aria-hidden={decorative}
	aria-label={!decorative ? label || glyph : undefined}
	role={!decorative ? 'img' : undefined}
>
	{glyph}
</span>

<style>
	.app-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: var(--icon-size, 1.125rem);
		height: var(--icon-size, 1.125rem);
		line-height: 1;
		vertical-align: middle;
		color: var(--sideplay-icon-color, currentColor);
		font-size: var(--icon-size, 1.125rem);
		font-style: normal;
		font-weight: 400;
		font-family: 'Sideplay Icons';
		font-synthesis: none;
		font-feature-settings: normal;
	}
</style>
