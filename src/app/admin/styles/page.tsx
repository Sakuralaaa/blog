'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ImagePickerDialog } from '@/components/admin/image-picker-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  DEFAULT_PUBLIC_STYLE_PRESET,
  type PublicStylePreset,
  normalizePublicStylePreset,
} from '@/lib/public-style-preset'

type Setting = {
  key: string
  value: unknown
}

function readSettingCompatString(
  setting: Setting | undefined,
  preferredFields: readonly string[]
): string | undefined {
  const value = setting?.value
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const record = value as Record<string, unknown>
  for (const field of preferredFields) {
    const raw = record[field]
    if (typeof raw === 'string') return raw
  }

  const entries = Object.entries(record)
  if (entries.length === 1 && typeof entries[0][1] === 'string') {
    return entries[0][1]
  }

  return undefined
}

export default function AdminStylesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publicStylePreset, setPublicStylePreset] =
    useState<PublicStylePreset>(DEFAULT_PUBLIC_STYLE_PRESET)
  const [customHeadCode, setCustomHeadCode] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [backgroundOverlay, setBackgroundOverlay] = useState(70)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok) {
        const presetSetting = (data.settings || []).find(
          (it: Setting) => it.key === 'ui.publicStylePreset'
        )
        const rawPreset = readSettingCompatString(presetSetting, ['preset', 'value', 'text', 'style'])
          ?? DEFAULT_PUBLIC_STYLE_PRESET
        setPublicStylePreset(normalizePublicStylePreset(rawPreset))

        const headCodeSetting = (data.settings || []).find((it: Setting) => it.key === 'site.customHeadCode')
        const rawHeadCode = readSettingCompatString(headCodeSetting, ['text', 'value']) ?? ''
        setCustomHeadCode(rawHeadCode)

        const settings = (data.settings || []) as Setting[]
        const bg = settings.find((it) => it.key === 'ui.backgroundUrl')
        setBackgroundUrl(readSettingCompatString(bg, ['url', 'value', 'text']) ?? '')
        const ov = settings.find((it) => it.key === 'ui.backgroundOverlay')?.value as
          | { value?: unknown }
          | undefined
        const ovNum = Number(ov?.value)
        setBackgroundOverlay(Number.isFinite(ovNum) ? ovNum : 70)
      } else {
        toast({ title: '错误', description: data.error || '获取样式设置失败', variant: 'destructive' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: '错误', description: '获取样式设置失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { key: 'ui.publicStylePreset', value: { preset: publicStylePreset } },
            { key: 'site.customHeadCode', value: { text: customHeadCode } },
            { key: 'ui.backgroundUrl', value: { url: backgroundUrl.trim() } },
            { key: 'ui.backgroundOverlay', value: { value: backgroundOverlay } },
          ],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '成功', description: '样式设置已保存' })
        fetchSettings()
      } else {
        toast({ title: '错误', description: data.error || '保存失败', variant: 'destructive' })
      }
    } catch (e) {
      console.error(e)
      toast({ title: '错误', description: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">样式管理</h1>
        <p className="text-muted-foreground">管理前台视觉样式（仅管理员可设置）</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>界面风格</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-md border-2 border-black bg-[#f3efe6] p-6 shadow-[5px_5px_0_0_#000] dark:bg-[#2c2b35]">
              <h3 className="text-2xl font-bold italic">Atoll · 块状纸面</h3>
              <p className="mt-2 text-sm text-muted-foreground">米色纸面、粗描边和硬阴影的块状风格，支持浅色与深色模式，背景图可在下方自定义。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>背景图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                图片地址
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  className="sm:flex-1"
                  value={backgroundUrl}
                  onChange={(e) => setBackgroundUrl(e.target.value)}
                  placeholder="https://example.com/bg.jpg 或 /api/files/..."
                  disabled={loading}
                />
                <ImagePickerDialog title="选择背景图" onSelect={(url) => setBackgroundUrl(url)} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                留空则使用默认的点阵纸背景。图片会铺满整个页面并固定不滚动。
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                遮罩强度：{backgroundOverlay}%
              </label>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={backgroundOverlay}
                onChange={(e) => setBackgroundOverlay(Number(e.target.value))}
                className="mt-3 w-full accent-violet-500"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                在图片上盖一层背景色，数值越大越淡，文字越清楚。
              </p>
            </div>
            {backgroundUrl.trim() && (
              <div
                className="relative h-40 overflow-hidden rounded-md border-2 border-black"
                style={{ backgroundImage: `url(${JSON.stringify(backgroundUrl.trim())})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="absolute inset-0 bg-[#f3efe6] dark:bg-[#1f1e26]" style={{ opacity: backgroundOverlay / 100 }} />
                <div className="relative m-6 inline-block rounded border-2 border-black bg-white px-4 py-2 text-sm font-bold italic shadow-[4px_4px_0_0_#000] dark:bg-zinc-800">
                  预览效果
                </div>
              </div>
            )}
            <div className="flex items-center justify-end">
              <Button onClick={save} disabled={saving || loading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存设置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自定义 Head 注入</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">安全限制</p>
                <ul className="mt-1 list-disc pl-4 text-xs leading-relaxed text-amber-800/80 dark:text-amber-100/80">
                  <li>仅允许 <code>&lt;script&gt;</code>、<code>&lt;meta&gt;</code>、<code>&lt;link&gt;</code> 标签</li>
                  <li>脚本必须通过 <code>src</code> 引入外部 HTTPS 地址，<strong>禁止内联代码</strong></li>
                  <li>所有 <code>on*</code> 事件属性会被自动移除</li>
                  <li>需要在环境变量 <code>HEAD_INJECT_SCRIPT_ORIGINS</code> 中添加脚本域名以放行 CSP</li>
                </ul>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                注入代码
              </label>
              <Textarea
                value={customHeadCode}
                onChange={(e) => setCustomHeadCode(e.target.value)}
                placeholder={'<script defer src="https://example.com/script.js" data-website-id="xxx"></script>'}
                className="mt-2 font-mono text-sm"
                rows={5}
                maxLength={4096}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                适用于第三方统计（Umami、Google Analytics 等）或验证标签。最多 4096 个字符。
              </p>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={save} disabled={saving || loading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存设置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
