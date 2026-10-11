import type { FontFamilyPreset, IconPreferences, ThemeMode, ThemePreset } from '$lib/types';

export interface ThemePalette {
	background: string;
	backgroundAlt: string;
	surface: string;
	surfaceRaised: string;
	surfaceGlass: string;
	accent: string;
	accentAlt: string;
	textStrong: string;
	textMuted: string;
	border: string;
}

export const themePresets: Record<ThemePreset, ThemePalette> = {
	original: {
		background: '#21252e',
		backgroundAlt: '#1b1f27',
		surface: '#2d323c',
		surfaceRaised: '#353b47',
		surfaceGlass: 'rgba(33, 37, 46, 0.72)',
		accent: '#d8006c',
		accentAlt: '#238db8',
		textStrong: '#f3edf7',
		textMuted: '#a3a7b0',
		border: 'rgba(255, 255, 255, 0.08)'
	},
	auroraField: {
		background: '#142c2c',
		backgroundAlt: '#0f2121',
		surface: '#203739',
		surfaceRaised: '#274447',
		surfaceGlass: 'rgba(20, 44, 44, 0.72)',
		accent: '#7fe7d6',
		accentAlt: '#7cc8ff',
		textStrong: '#e2fbf7',
		textMuted: '#b1d7d2',
		border: 'rgba(127, 231, 214, 0.12)'
	},
	frostline: {
		background: '#2e3440',
		backgroundAlt: '#3b4252',
		surface: '#434c5e',
		surfaceRaised: '#4c566a',
		surfaceGlass: 'rgba(46, 52, 64, 0.72)',
		accent: '#88c0d0',
		accentAlt: '#81a1c1',
		textStrong: '#eff4ff',
		textMuted: '#c1ccda',
		border: 'rgba(136, 192, 208, 0.12)'
	},
	emberSands: {
		background: '#2b1f1a',
		backgroundAlt: '#201713',
		surface: '#3a2922',
		surfaceRaised: '#473229',
		surfaceGlass: 'rgba(43, 31, 26, 0.72)',
		accent: '#ff8a65',
		accentAlt: '#ffb36b',
		textStrong: '#fff0ea',
		textMuted: '#d8c0b6',
		border: 'rgba(255, 138, 101, 0.14)'
	},
	tideglass: {
		background: '#122a33',
		backgroundAlt: '#0d1f27',
		surface: '#203a44',
		surfaceRaised: '#25424d',
		surfaceGlass: 'rgba(18, 42, 51, 0.72)',
		accent: '#55c2c0',
		accentAlt: '#ffa56b',
		textStrong: '#ecfbff',
		textMuted: '#b0d3db',
		border: 'rgba(85, 194, 192, 0.12)'
	},
	roseBloom: {
		background: '#232136',
		backgroundAlt: '#2a273f',
		surface: '#393552',
		surfaceRaised: '#4a4666',
		surfaceGlass: 'rgba(35, 33, 54, 0.72)',
		accent: '#eb6f92',
		accentAlt: '#9ccfd8',
		textStrong: '#efeafe',
		textMuted: '#c8bfdc',
		border: 'rgba(235, 111, 146, 0.12)'
	},
	cloudVelvet: {
		background: '#252437',
		backgroundAlt: '#1b1a2b',
		surface: '#34324c',
		surfaceRaised: '#454162',
		surfaceGlass: 'rgba(37, 36, 55, 0.72)',
		accent: '#a8a0ff',
		accentAlt: '#95d8ff',
		textStrong: '#ebe7ff',
		textMuted: '#c5c0e6',
		border: 'rgba(168, 160, 255, 0.12)'
	},
	inkMauve: {
		background: '#241737',
		backgroundAlt: '#171121',
		surface: '#35234d',
		surfaceRaised: '#493164',
		surfaceGlass: 'rgba(36, 23, 55, 0.72)',
		accent: '#c96cff',
		accentAlt: '#6bd6ff',
		textStrong: '#f2e2ff',
		textMuted: '#c8b2dd',
		border: 'rgba(201, 108, 255, 0.12)'
	},
	plumNight: {
		background: '#281824',
		backgroundAlt: '#1b1018',
		surface: '#402233',
		surfaceRaised: '#563048',
		surfaceGlass: 'rgba(40, 24, 36, 0.72)',
		accent: '#b85d8e',
		accentAlt: '#7c8fe0',
		textStrong: '#f7ebf0',
		textMuted: '#d2b8c6',
		border: 'rgba(184, 93, 142, 0.12)'
	},
	quantumCircuit: {
		background: '#202435',
		backgroundAlt: '#161a28',
		surface: '#303854',
		surfaceRaised: '#3f4a70',
		surfaceGlass: 'rgba(32, 36, 53, 0.72)',
		accent: '#ff5f9e',
		accentAlt: '#53c7ff',
		textStrong: '#f5f7ff',
		textMuted: '#b6c0df',
		border: 'rgba(83, 199, 255, 0.12)'
	},
	stormSignal: {
		background: '#1f2833',
		backgroundAlt: '#151c25',
		surface: '#2c3644',
		surfaceRaised: '#39475a',
		surfaceGlass: 'rgba(31, 40, 51, 0.72)',
		accent: '#ff7675',
		accentAlt: '#74b9ff',
		textStrong: '#f6f8fb',
		textMuted: '#b4bfcb',
		border: 'rgba(116, 185, 255, 0.12)'
	},
	forestMoss: {
		background: '#1f2a23',
		backgroundAlt: '#141a16',
		surface: '#2e3a31',
		surfaceRaised: '#3a483d',
		surfaceGlass: 'rgba(31, 42, 35, 0.72)',
		accent: '#a3d977',
		accentAlt: '#4cc9a6',
		textStrong: '#f1f7eb',
		textMuted: '#bfd0b7',
		border: 'rgba(76, 201, 166, 0.12)'
	}
};

export const fontFamilyStacks: Record<FontFamilyPreset, string> = {
	system:
		'"Roboto", "Segoe UI Variable", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
	serif: 'Georgia, "Times New Roman", serif',
	monospace: '"SFMono-Regular", ui-monospace, Menlo, Monaco, Consolas, monospace',
	openDyslexic: '"OpenDyslexic", "Comic Sans MS", "Trebuchet MS", sans-serif'
};

export function applyTheme(
	theme: ThemePreset,
	fontFamily: FontFamilyPreset,
	uiScale = 1,
	icons: IconPreferences = {
		fill: 0,
		weight: 400,
		grade: 0,
		opticalSize: 24
	},
	themeMode: ThemeMode = 'dark'
) {
	if (typeof document === 'undefined') return;

	const palette = themePresets[theme] ?? themePresets.original;
	const fontStack = fontFamilyStacks[fontFamily] ?? fontFamilyStacks.system;
	const safeScale = Number.isFinite(uiScale) ? Math.min(1.5, Math.max(0.5, uiScale)) : 1;
	const resolvedPalette: ThemePalette = themeMode === 'light'
		? {
				...palette,
				background: `color-mix(in srgb, ${palette.accent} 4%, #f4f6fa)`,
				backgroundAlt: `color-mix(in srgb, ${palette.accentAlt} 7%, #e8edf4)`,
				surface: `color-mix(in srgb, ${palette.accentAlt} 2%, #ffffff)`,
				surfaceRaised: `color-mix(in srgb, ${palette.accent} 5%, #f1f4f8)`,
				surfaceGlass: 'rgba(255, 255, 255, 0.78)',
				accent: '#9c174f',
				accentAlt: '#075985',
				textStrong: '#18202a',
				textMuted: '#4b5968',
				border: 'rgba(24, 32, 42, 0.28)'
			}
		: palette;
	const root = document.documentElement;
	root.dataset.themeMode = themeMode;
	root.style.colorScheme = themeMode;
	root.style.setProperty('--sideplay-bg', resolvedPalette.background);
	root.style.setProperty('--sideplay-bg-alt', resolvedPalette.backgroundAlt);
	root.style.setProperty('--sideplay-surface', resolvedPalette.surface);
	root.style.setProperty('--sideplay-surface-raised', resolvedPalette.surfaceRaised);
	root.style.setProperty('--sideplay-surface-glass', resolvedPalette.surfaceGlass);
	root.style.setProperty('--sideplay-accent', resolvedPalette.accent);
	root.style.setProperty('--sideplay-accent-alt', resolvedPalette.accentAlt);
	root.style.setProperty('--sideplay-text-strong', resolvedPalette.textStrong);
	root.style.setProperty('--sideplay-text-muted', resolvedPalette.textMuted);
	root.style.setProperty('--sideplay-border', resolvedPalette.border);
	root.style.setProperty('--sideplay-danger', themeMode === 'light' ? '#b4234d' : '#ff6b8a');
	root.style.setProperty('--sideplay-selection', `color-mix(in srgb, ${resolvedPalette.accent} 40%, transparent)`);
	root.style.setProperty('--sideplay-glass-tint', `color-mix(in srgb, ${resolvedPalette.accent} 8%, transparent)`);
	root.style.setProperty('--sideplay-surface-tint', `color-mix(in srgb, ${resolvedPalette.accentAlt} 6%, transparent)`);
	root.style.setProperty('--sideplay-backdrop', themeMode === 'light' ? 'rgba(24, 32, 42, 0.2)' : 'rgba(8, 10, 14, 0.42)');
	root.style.setProperty('--sideplay-font-family', fontStack);
	root.style.setProperty('--sideplay-ui-scale', String(Math.sqrt(safeScale)));
}
