'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyTextToClipboard } from '@/lib/copy-to-clipboard'

export function CodeCopyButton() {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="code-copy"
      title={copied ? '已复制' : '复制代码'}
      onClick={async (e) => {
        const root = e.currentTarget.closest('[data-code-block]')
        const codeEl = root?.querySelector('code') as HTMLElement | null
        const text = codeEl?.innerText ?? ''
        if (!text) return

        try {
          const copiedSuccessfully = await copyTextToClipboard(text)
          if (!copiedSuccessfully) return
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          // ignore
        }
      }}
    >
      {copied ? (
        <Check size={14} />
      ) : (
        <Copy size={14} />
      )}
    </button>
  )
}
