'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="icon-btn" disabled aria-label="切换主题">
        <Sun size={18} />
      </button>
    )
  }

  const dark = resolvedTheme === 'dark'
  return (
    <button
      className="icon-btn"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
