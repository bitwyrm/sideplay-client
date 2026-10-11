import type { AppPreferences, FontFamilyPreset, ThemeMode, ThemePreset } from '$lib/types';
import { fontFamilyStacks, themePresets } from '$lib/theme';

const STORAGE_KEY = 'sideplay.preferences.override';
const TOKEN_KEY = 'sideplay.session.token';

export const DEFAULT_PREFERENCES: AppPreferences = {
	frontend: {
		basePath: '/'
	},
	api: {
		mode: 'live',
		baseUrl: 'https://api.sideplay.endothermic-dragon.dev',
		basePath: '/'
	},
	auth: {
		sessionToken: ''
	},
	ui: {
		theme: 'original',
		themeMode: 'dark',
		fontFamily: 'system',
		uiScale: 1,
		icons: {
			fill: 0,
			weight: 400,
			grade: 0,
			opticalSize: 24
		},
		leftHanded: false,
		sidebarCollapsed: false
	}
};

type PartialDeep<T> = {
	[K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

function parseScalar(value: string): string | number | boolean {
	const trimmed = value.trim();
	if (!trimmed) return '';
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (!Number.isNaN(Number(trimmed)) && trimmed.match(/^[-+]?\d+(\.\d+)?$/)) {
		return Number(trimmed);
	}
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function parseSimpleYaml(source: string): Record<string, unknown> {
	const root: Record<string, unknown> = {};
	const stack: Array<{ indent: number; target: Record<string, unknown> }> = [
		{ indent: -1, target: root }
	];

	for (const rawLine of source.split(/\r?\n/)) {
		const line = rawLine.replace(/\t/g, '  ');
		const stripped = line.replace(/#.*$/, '').trimEnd();
		if (!stripped.trim()) continue;

		const indent = line.match(/^ */)?.[0].length ?? 0;
		const colonIndex = stripped.indexOf(':');
		if (colonIndex === -1) continue;

		while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
			stack.pop();
		}

		const current = stack[stack.length - 1].target;
		const key = stripped.slice(0, colonIndex).trim();
		const rawValue = stripped.slice(colonIndex + 1).trim();
		if (!rawValue) {
			const nested: Record<string, unknown> = {};
			current[key] = nested;
			stack.push({ indent, target: nested });
			continue;
		}

		current[key] = parseScalar(rawValue);
	}

	return root;
}

function mergeDeep<T>(base: T, patch: PartialDeep<T>): T {
	if (Array.isArray(base) || Array.isArray(patch)) {
		return (patch ?? base) as T;
	}

	if (typeof base !== 'object' || base === null) {
		return (patch ?? base) as T;
	}

	const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
	for (const [key, value] of Object.entries(patch ?? {})) {
		const existing = result[key];
		if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			existing &&
			typeof existing === 'object' &&
			!Array.isArray(existing)
		) {
			result[key] = mergeDeep(existing, value as PartialDeep<typeof existing>);
			continue;
		}

		result[key] = value as unknown;
	}

	return result as T;
}

function normalizePreferences(input: PartialDeep<AppPreferences>): AppPreferences {
	const merged = mergeDeep(DEFAULT_PREFERENCES, input);
	const requestedScale = Number(merged.ui?.uiScale ?? DEFAULT_PREFERENCES.ui.uiScale);
	const uiScale = Number.isFinite(requestedScale)
		? Math.min(1.5, Math.max(0.5, requestedScale))
		: DEFAULT_PREFERENCES.ui.uiScale;
	const requestedTheme = merged.ui?.theme;
	const theme = typeof requestedTheme === 'string' && requestedTheme in themePresets
		? requestedTheme as ThemePreset
		: DEFAULT_PREFERENCES.ui.theme;
	const requestedFontFamily = merged.ui?.fontFamily;
	const fontFamily = typeof requestedFontFamily === 'string' && requestedFontFamily in fontFamilyStacks
		? requestedFontFamily as FontFamilyPreset
		: DEFAULT_PREFERENCES.ui.fontFamily;
	const finiteNumber = (value: unknown, fallback: number, min: number, max: number) => {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
	};
	return {
		frontend: {
			basePath: String(merged.frontend?.basePath ?? DEFAULT_PREFERENCES.frontend.basePath)
		},
		api: {
			mode: (merged.api?.mode as 'mock' | 'live') ?? DEFAULT_PREFERENCES.api.mode,
			baseUrl: String(merged.api?.baseUrl ?? DEFAULT_PREFERENCES.api.baseUrl),
			basePath: String(merged.api?.basePath ?? DEFAULT_PREFERENCES.api.basePath)
		},
		auth: {
			sessionToken: String(merged.auth?.sessionToken ?? '')
		},
		ui: {
			theme,
			themeMode: merged.ui?.themeMode === 'light' ? 'light' : 'dark',
			fontFamily,
			uiScale,
			icons: {
				fill: finiteNumber(merged.ui?.icons?.fill, DEFAULT_PREFERENCES.ui.icons.fill, 0, 1),
				weight: finiteNumber(merged.ui?.icons?.weight, DEFAULT_PREFERENCES.ui.icons.weight, 100, 700),
				grade: finiteNumber(merged.ui?.icons?.grade, DEFAULT_PREFERENCES.ui.icons.grade, -25, 200),
				opticalSize: finiteNumber(merged.ui?.icons?.opticalSize, DEFAULT_PREFERENCES.ui.icons.opticalSize, 20, 48)
			},
			leftHanded: Boolean(merged.ui?.leftHanded ?? DEFAULT_PREFERENCES.ui.leftHanded),
			sidebarCollapsed: Boolean(
				merged.ui?.sidebarCollapsed ?? DEFAULT_PREFERENCES.ui.sidebarCollapsed
			)
		}
	};
}

export async function loadPreferences(): Promise<AppPreferences> {
	const fallback = DEFAULT_PREFERENCES;
	if (typeof fetch === 'undefined') return fallback;

	try {
		const response = await fetch('/preferences.yaml', { cache: 'no-store' });
		if (!response.ok) throw new Error(`preferences fetch failed: ${response.status}`);
		const parsed = parseSimpleYaml(await response.text()) as PartialDeep<AppPreferences>;
		const local = readLocalPreferenceOverrides();
		return normalizePreferences(mergeDeep(parsed, local));
	} catch {
		return normalizePreferences(mergeDeep(DEFAULT_PREFERENCES, readLocalPreferenceOverrides()));
	}
}

export function readLocalPreferenceOverrides(): PartialDeep<AppPreferences> {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const saved = JSON.parse(raw) as PartialDeep<AppPreferences>;
		// This key historically stored the entire preferences object. Only UI choices
		// belong here; API configuration comes from /preferences.yaml and the token
		// has its dedicated session key. This prevents old mock settings from masking
		// the live FastAPI configuration after an upgrade.
		return { ui: saved.ui };
	} catch {
		return {};
	}
}

export function persistPreferences(prefs: AppPreferences) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: prefs.ui }));
	localStorage.setItem(TOKEN_KEY, prefs.auth.sessionToken || '');
}

export function readSessionToken() {
	if (typeof localStorage === 'undefined') return '';
	return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function mergePreferences(
	base: AppPreferences,
	patch: PartialDeep<AppPreferences>
): AppPreferences {
	return normalizePreferences(mergeDeep(base, patch));
}
