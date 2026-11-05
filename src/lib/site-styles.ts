/**
 * Built-in visual styles. Each style is a set of design tokens applied through
 * `data-style` on <html>; light/dark stays orthogonal (handled by next-themes).
 */
export const SITE_STYLE_IDS = ['atoll', 'minimal', 'editorial', 'soft'] as const
export type SiteStyle = (typeof SITE_STYLE_IDS)[number]
export const DEFAULT_SITE_STYLE: SiteStyle = 'atoll'
/** localStorage key holding a visitor's explicit choice (absent = follow site default). */
export const SITE_STYLE_STORAGE_KEY = 'site-style'

export const SITE_STYLES: ReadonlyArray<{
  id: SiteStyle
  label: string
  labelEn: string
  description: string
  /** background, surface, accent, highlight — used by previews/swatches. */
  swatches: [string, string, string, string]
}> = [
  {
    id: 'atoll',
    label: 'Atoll 纸面',
    labelEn: 'Atoll',
    description: '米色纸面、2px 墨线描边与硬阴影，紫色与黄色点缀。',
    swatches: ['#f4f0e8', '#fffdf8', '#a78bfa', '#fde68a'],
  },
  {
    id: 'minimal',
    label: '极简',
    labelEn: 'Minimal',
    description: '纯白与近黑、1px 细线、几乎无阴影，安静克制。',
    swatches: ['#ffffff', '#fafafa', '#18181b', '#e4e4e7'],
  },
  {
    id: 'editorial',
    label: '杂志',
    labelEn: 'Editorial',
    description: '衬线标题、米白纸色、细分隔线，像一本排版讲究的刊物。',
    swatches: ['#faf8f3', '#fffefa', '#b4232a', '#1c1917'],
  },
  {
    id: 'soft',
    label: '柔和',
    labelEn: 'Soft',
    description: '16px 大圆角、柔和渐变与弥散阴影，轻盈友好。',
    swatches: ['#f5f3ff', '#ffffff', '#7c6cf2', '#fbcfe8'],
  },
]

export function isSiteStyle(value: unknown): value is SiteStyle {
  return typeof value === 'string' && (SITE_STYLE_IDS as readonly string[]).includes(value)
}

export function normalizeSiteStyle(value: unknown): SiteStyle {
  return isSiteStyle(value) ? value : DEFAULT_SITE_STYLE
}

/**
 * Inline, dependency-free script that applies a stored visitor style before first paint.
 * The server already renders the site default on <html data-style>, so if this script is
 * blocked (strict CSP) the page still renders in the default style.
 */
export function buildStyleBootScript() {
  const ids = JSON.stringify(SITE_STYLE_IDS)
  return `(function(){try{var d=document.documentElement;if(d.getAttribute('data-style-switch')!=='1')return;var s=localStorage.getItem(${JSON.stringify(
    SITE_STYLE_STORAGE_KEY
  )});if(s&&${ids}.indexOf(s)>-1)d.setAttribute('data-style',s)}catch(e){}})()`
}
