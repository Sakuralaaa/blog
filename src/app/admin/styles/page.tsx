'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ImageField } from '@/components/admin/image-field'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  DEFAULT_SITE_STYLE,
  SITE_STYLES,
  normalizeSiteStyle,
  type SiteStyle,
} from '@/lib/site-styles'

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
  const [siteStyle, setSiteStyle] = useState<SiteStyle>(DEFAULT_SITE_STYLE)
  const [allowStyleSwitch, setAllowStyleSwitch] = useState(true)
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
        const styleSetting = (data.settings || []).find((it: Setting) => it.key === 'ui.style')
        setSiteStyle(normalizeSiteStyle(readSettingCompatString(styleSetting, ['value', 'style'])))
        const switchSetting = (data.settings || []).find(
          (it: Setting) => it.key === 'ui.allowStyleSwitch'
        )?.value as { enabled?: unknown } | undefined
        setAllowStyleSwitch(switchSetting?.enabled !== false)

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
            { key: 'ui.style', value: { value: siteStyle } },
            { key: 'ui.allowStyleSwitch', value: { enabled: allowStyleSwitch } },
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
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm">
            选择前台默认风格。每种风格都有亮色与暗色两套配色，访客的亮/暗偏好互不影响。
          </p>
          <div className="style-preview-grid" role="radiogroup" aria-label="前台默认风格">
            {SITE_STYLES.map((style) => {
              const [bg, surface, accent, hi] = style.swatches
              const radius = { atoll: 4, minimal: 10, editorial: 1, soft: 14 }[style.id]
              const border =
                style.id === 'atoll' ? '2px solid #16151a' : style.id === 'editorial' ? '1px solid #1c1917' : '1px solid #e4e4e7'
              const shadow =
                style.id === 'atoll'
                  ? '3px 3px 0 #16151a'
                  : style.id === 'soft'
                    ? '0 8px 18px -8px rgba(76,61,180,.45)'
                    : 'none'
              return (
                <button
                  key={style.id}
                  type="button"
                  role="radio"
                  aria-checked={siteStyle === style.id}
                  className="style-preview"
                  onClick={() => setSiteStyle(style.id)}
                >
                  <span className="style-preview__canvas" style={{ background: bg }}>
                    <span
                      className="style-preview__card"
                      style={{ background: surface, border, borderRadius: radius, boxShadow: shadow }}
                    />
                    <span
                      className="style-preview__dot"
                      style={{
                        background: `linear-gradient(135deg, ${accent} 50%, ${hi} 50%)`,
                        borderRadius: style.id === 'minimal' || style.id === 'soft' ? 999 : radius,
                        border: style.id === 'atoll' ? '2px solid #16151a' : undefined,
                      }}
                    />
                  </span>
                  <strong>
                    {style.label}
                    {style.id === DEFAULT_SITE_STYLE ? '（默认）' : ''}
                  </strong>
                  <span>{style.description}</span>
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={allowStyleSwitch}
              onChange={(e) => setAllowStyleSwitch(e.target.checked)}
              className="h-4 w-4"
            />
            允许访客在导航栏自行切换风格（选择会保存在访客浏览器中）
          </label>
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
                背景图片
              </label>
              <ImageField
                className="mt-2"
                value={backgroundUrl}
                onChange={setBackgroundUrl}
                pickerTitle="选择背景图"
                disabled={loading}
              />
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
                className="relative h-40 overflow-hidden rounded-md border"
                style={{ backgroundImage: `url(${JSON.stringify(backgroundUrl.trim())})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="absolute inset-0 bg-background" style={{ opacity: backgroundOverlay / 100 }} />
                <div className="card relative m-6 inline-block px-4 py-2 text-sm font-bold">
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
