'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useReadingState } from './reading-context'
import { MobileNav } from './mobile-nav'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogIn, LogOut, Settings, UserRound } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { StyleSwitcher } from '@/components/theme/style-switcher'
import { SearchTrigger } from '@/components/search/search-trigger'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { SITE_NAV_LINKS, isActivePath } from '@/lib/site-nav'
import { isSafeImageSrc } from '@/lib/utils'

export function Navbar({ settings = {} }: { settings?: Record<string, unknown> }) {
  const pathname = usePathname()
  const { post, showTitle } = useReadingState()
  const [focused, setFocused] = useState(false)
  const reading = Boolean(post) && showTitle && !focused
  const { data: session, status } = useSession()
  const allowStyleSwitch = settings['ui.allowStyleSwitch'] !== false
  const title =
    (typeof settings['site.title'] === 'string' && settings['site.title'].trim()) || '个人主页'
  const logoRaw = typeof settings['site.logoUrl'] === 'string' ? settings['site.logoUrl'].trim() : ''
  const logo = isSafeImageSrc(logoRaw) ? logoRaw : ''
  return (
    <header
      className="site-header"
      data-reading={reading}
      onFocusCapture={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div className="site-header__inner">
        <MobileNav allowStyleSwitch={allowStyleSwitch} />
        <Link href="/" className="site-brand" aria-label={`${title} 首页`}>
          <span className="site-brand__mark" aria-hidden="true">
            {logo ? <img src={logo} alt="" /> : Array.from(title)[0]}
          </span>
          <span className="site-brand__name">{title}</span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          {SITE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActivePath(pathname, link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <SearchTrigger />
          {allowStyleSwitch && <StyleSwitcher />}
          <ThemeToggle />
          {!settings['ui.hideAdminEntry'] && (
            <div className="site-account">
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="icon-btn" aria-label="账号菜单">
                      <Avatar className="site-account__avatar">
                        <AvatarImage src={session.user.image || undefined} />
                        <AvatarFallback>{session.user.name?.[0] || '我'}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {session.user.role === 'ADMIN' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="mr-2 h-4 w-4" />
                            管理后台
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: '/' })}>
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : status === 'loading' ? (
                <button className="icon-btn" disabled aria-label="正在加载账号" aria-busy="true">
                  <UserRound size={18} aria-hidden="true" />
                </button>
              ) : (
                <Link href="/auth/signin" className="icon-btn" aria-label="登录">
                  <LogIn size={18} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="site-header__reading" aria-hidden={!reading}>
        <span title={post?.title}>{post?.title}</span>
      </div>
    </header>
  )
}
