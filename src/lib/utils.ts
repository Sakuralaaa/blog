import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidHref(href: string | undefined): boolean {
  if (!href || typeof href !== 'string') return false
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

/** Accept absolute http(s) URLs, site-relative paths and inline data images. */
export function isSafeImageSrc(src: string | null | undefined): src is string {
  if (!src || typeof src !== 'string') return false
  const value = src.trim()
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(value)) return true
  return /^(https?:\/\/|\/(?!\/))[^\s"'<>]+$/i.test(value)
}
