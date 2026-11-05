// Legacy single-preset setting kept for upgrade compatibility; styles now live in site-styles.ts.
export const PUBLIC_STYLE_PRESETS = ['atoll'] as const
export type PublicStylePreset = 'atoll'
export const DEFAULT_PUBLIC_STYLE_PRESET: PublicStylePreset = 'atoll'
export function normalizePublicStylePreset(_raw?: string | null): PublicStylePreset { return 'atoll' }
