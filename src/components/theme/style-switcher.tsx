'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Check, Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DEFAULT_SITE_STYLE,
  SITE_STYLES,
  SITE_STYLE_STORAGE_KEY,
  isSiteStyle,
  normalizeSiteStyle,
  type SiteStyle,
} from '@/lib/site-styles'

const STYLE_EVENT = 'site-style-change'

function readStored(): SiteStyle | null {
  try {
    const raw = localStorage.getItem(SITE_STYLE_STORAGE_KEY)
    return isSiteStyle(raw) ? raw : null
  } catch {
    return null
  }
}

function siteDefault(): SiteStyle {
  return normalizeSiteStyle(document.documentElement.dataset.styleDefault)
}

function subscribe(callback: () => void) {
  window.addEventListener(STYLE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(STYLE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Persist (or clear) the visitor's choice and apply it to <html data-style>. */
export function applySiteStyle(choice: SiteStyle | null) {
  try {
    if (choice) localStorage.setItem(SITE_STYLE_STORAGE_KEY, choice)
    else localStorage.removeItem(SITE_STYLE_STORAGE_KEY)
  } catch {
    // Private mode: still switch for this page view.
  }
  document.documentElement.setAttribute('data-style', choice ?? siteDefault())
  window.dispatchEvent(new Event(STYLE_EVENT))
}

export function useSiteStyleChoice() {
  const stored = useSyncExternalStore(subscribe, readStored, () => null)
  return { stored, choose: useCallback((choice: SiteStyle | null) => applySiteStyle(choice), []) }
}

function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="style-swatch" aria-hidden="true">
      {colors.map((color) => (
        <span key={color} style={{ background: color }} />
      ))}
    </span>
  )
}

/** Visitor style options, shared by the header dropdown and the mobile drawer. */
export function StyleOptions({
  variant,
  onPicked,
}: {
  variant: 'menu' | 'list'
  onPicked?: () => void
}) {
  const { stored, choose } = useSiteStyleChoice()
  const fallback = useSyncExternalStore(subscribe, siteDefault, () => DEFAULT_SITE_STYLE)
  const defaultMeta = SITE_STYLES.find((item) => item.id === fallback)
  const options: Array<{ id: SiteStyle | null; label: string; swatches: readonly string[] }> = [
    { id: null, label: `跟随站点默认（${defaultMeta?.label ?? ''}）`, swatches: defaultMeta?.swatches ?? [] },
    ...SITE_STYLES.map((item) => ({ id: item.id, label: item.label, swatches: item.swatches })),
  ]
  if (variant === 'menu') {
    return (
      <>
        {options.map((option, index) => (
          <DropdownMenuItem
            key={option.id ?? 'default'}
            onSelect={() => {
              choose(option.id)
              onPicked?.()
            }}
            className="style-option"
          >
            <Swatch colors={option.swatches} />
            <span>{option.label}</span>
            {stored === option.id && <Check size={14} className="style-option__check" />}
            {index === 0 && <span className="sr-only">（使用站长设置的风格）</span>}
          </DropdownMenuItem>
        ))}
      </>
    )
  }
  return (
    <div className="style-list" role="radiogroup" aria-label="界面风格">
      {options.map((option) => (
        <button
          key={option.id ?? 'default'}
          type="button"
          role="radio"
          aria-checked={stored === option.id}
          onClick={() => {
            choose(option.id)
            onPicked?.()
          }}
        >
          <Swatch colors={option.swatches} />
          <span>{option.label}</span>
          {stored === option.id && <Check size={14} />}
        </button>
      ))}
    </div>
  )
}

export function StyleSwitcher() {
  // Re-apply a stored choice in case the inline boot script was blocked by CSP.
  useEffect(() => {
    const stored = readStored()
    if (stored && document.documentElement.dataset.styleSwitch === '1') {
      document.documentElement.setAttribute('data-style', stored)
    }
  }, [])
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="icon-btn style-trigger" aria-label="切换界面风格" title="界面风格">
          <Palette size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="style-menu">
        <DropdownMenuLabel>界面风格</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <StyleOptions variant="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
