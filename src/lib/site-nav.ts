/** Primary public navigation, shared by the header, drawer and footer. */
export const SITE_NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/projects', label: '作品' },
  { href: '/posts', label: '文章' },
  { href: '/archive', label: '归档' },
  { href: '/about', label: '关于' },
] as const

export function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
