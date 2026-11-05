'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, BookOpen, Home, Menu, PanelsTopLeft, Search, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileToc } from './mobile-toc'
import { MobileNav } from './mobile-nav'
import { useReadingState } from './reading-context'

export function FloatingActions() {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<'nav' | 'toc' | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const nextPanel = useRef<'nav' | 'toc' | 'search' | null>(null)
  const { post, hasToc, showTools } = useReadingState()
  return (
    <div
      className="ui-float-anchor"
      data-visible={showTools || Boolean(post) || open || Boolean(panel)}
      inert={!showTools && !post && !open && !panel}
    >
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            ref={trigger}
            className="ui-float-trigger"
            aria-label={open ? '收起阅读工具' : '打开多功能工具窗'}
          >
            <span className="ui-float-face" aria-hidden="true">
              <PanelsTopLeft size={18} className="ui-tool-icon" />
              <X size={18} className="ui-tool-close" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="ui-toolbox"
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus({ preventScroll: true })
            const next = nextPanel.current
            nextPanel.current = null
            if (next === 'search') window.dispatchEvent(new Event('lagoon:open-search'))
            else if (next) setPanel(next)
          }}
        >
          <div className="ui-toolbox-heading">
            <span>随手工具</span>
          </div>
          <div className="ui-toolbox-items">
            <DropdownMenuItem
              onSelect={() => {
                nextPanel.current = 'nav'
              }}
            >
              <Menu />
              <span>站点导航</span>
            </DropdownMenuItem>
            {post && hasToc && (
              <DropdownMenuItem
                onSelect={() => {
                  nextPanel.current = 'toc'
                }}
              >
                <BookOpen />
                <span>文章目录</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                nextPanel.current = 'search'
              }}
            >
              <Search />
              <span>搜索文章</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/">
                <Home />
                <span>回到首页</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                window.scrollTo({
                  top: 0,
                  behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'instant'
                    : 'smooth',
                })
              }
            >
              <ArrowUp />
              <span>回到顶部</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <MobileNav
        isOpen={panel === 'nav'}
        onOpenChange={(value) => setPanel(value ? 'nav' : null)}
        showTrigger={false}
      />
      <MobileToc
        isOpen={panel === 'toc'}
        onOpenChange={(value) => setPanel(value ? 'toc' : null)}
      />
    </div>
  )
}
