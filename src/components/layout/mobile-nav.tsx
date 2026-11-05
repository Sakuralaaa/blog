'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  Home,
  BookOpen,
  Archive,
  Shapes,
  Hash,
  LayoutGrid,
  UserRound,
  ChevronRight,
} from 'lucide-react'
import { NavigationDrawer } from './navigation-drawer'
import { isActivePath } from '@/lib/site-nav'
import { StyleOptions } from '@/components/theme/style-switcher'

const links = [
  { href: '/', label: '首页', icon: Home },
  { href: '/projects', label: '作品', icon: LayoutGrid },
  { href: '/posts', label: '文章', icon: BookOpen },
  { href: '/archive', label: '归档', icon: Archive },
  { href: '/categories', label: '分类', icon: Shapes },
  { href: '/tags', label: '标签', icon: Hash },
  { href: '/about', label: '关于', icon: UserRound },
]
export function MobileNav({
  isOpen,
  onOpenChange,
  showTrigger = true,
  showOnDesktop = false,
  allowStyleSwitch = false,
}: {
  isOpen?: boolean
  onOpenChange?: (v: boolean) => void
  side?: 'left' | 'top'
  showTrigger?: boolean
  showOnDesktop?: boolean
  allowStyleSwitch?: boolean
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = isOpen ?? localOpen,
    setOpen = onOpenChange ?? setLocalOpen
  const pathname = usePathname()
  return (
    <NavigationDrawer
      open={open}
      onOpenChange={setOpen}
      title="导航"
      description="选择页面，按关闭按钮返回。"
      trigger={
        showTrigger ? (
          <button
            className={`icon-btn site-menu-trigger ${showOnDesktop ? '' : 'md:hidden'}`}
            aria-label="打开导航"
          >
            <Menu size={18} />
          </button>
        ) : undefined
      }
    >
      <nav aria-label="移动导航" className="drawer-links">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={isActivePath(pathname, href) ? 'page' : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={16} />
          </Link>
        ))}
      </nav>
      {allowStyleSwitch && (
        <section className="drawer-section" aria-label="界面风格">
          <h3>界面风格</h3>
          <StyleOptions variant="list" />
        </section>
      )}
    </NavigationDrawer>
  )
}
