'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { SettingsFieldProps } from './settings-fields'

export function GotifySettingsSection({ getVal, setVal }: SettingsFieldProps) {
  const { toast } = useToast()
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Gotify 推送</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                开启 Gotify 推送
              </label>
              <select
                className="mt-2 w-full rounded border bg-transparent px-3 py-2"
                value={getVal('notifications.gotify.enabled') ? 'true' : 'false'}
                onChange={(e) =>
                  setVal('notifications.gotify.enabled', e.target.value === 'true')
                }
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                新评论通知
              </label>
              <select
                className="mt-2 w-full rounded border bg-transparent px-3 py-2"
                value={getVal('notifications.gotify.notifyNewComment') ? 'true' : 'false'}
                onChange={(e) =>
                  setVal('notifications.gotify.notifyNewComment', e.target.value === 'true')
                }
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gotify URL
              </label>
              <Input
                className="mt-2"
                value={String(getVal('notifications.gotify.url') || '')}
                onChange={(e) => setVal('notifications.gotify.url', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                待审核评论通知
              </label>
              <select
                className="mt-2 w-full rounded border bg-transparent px-3 py-2"
                value={getVal('notifications.gotify.notifyPendingComment') ? 'true' : 'false'}
                onChange={(e) =>
                  setVal('notifications.gotify.notifyPendingComment', e.target.value === 'true')
                }
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gotify Token
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="password"
                  id="gotify-token-input"
                  placeholder="输入或更新 token"
                  className="w-full rounded border bg-transparent px-3 py-2"
                />
                <Button
                  onClick={async () => {
                    const el = document.getElementById('gotify-token-input') as HTMLInputElement
                    const token = el?.value
                    if (!token) {
                      toast({
                        title: '错误',
                        description: '请输入 token',
                        variant: 'destructive',
                      })
                      return
                    }

                    try {
                      const res = await fetch('/api/admin/settings/gotify-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                      })
                      const data = await res.json()
                      if (res.ok) {
                        toast({ title: '成功', description: 'Token 已保存' })
                        el.value = ''
                      } else {
                        toast({
                          title: '错误',
                          description: data.error || '保存失败',
                          variant: 'destructive',
                        })
                      }
                    } catch (e) {
                      console.error(e)
                      toast({ title: '错误', description: '保存失败', variant: 'destructive' })
                    }
                  }}
                >
                  保存 Token
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                注意：Token 为 secret，不会在此页面显示。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                测试推送
              </label>
              <div className="mt-2 flex gap-2">
                <Input id="gotify-test-title" placeholder="标题（可空）" />
                <Input id="gotify-test-message" placeholder="消息（可空）" />
                <Button
                  onClick={async () => {
                    const title = (
                      document.getElementById('gotify-test-title') as HTMLInputElement
                    )?.value
                    const message = (
                      document.getElementById('gotify-test-message') as HTMLInputElement
                    )?.value
                    try {
                      const res = await fetch('/api/admin/settings/test-gotify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, message }),
                      })
                      const data = await res.json()
                      if (res.ok) {
                        toast({ title: '成功', description: '测试推送已发送（若配置正确）' })
                      } else {
                        toast({
                          title: '错误',
                          description: data.error || '推送失败',
                          variant: 'destructive',
                        })
                      }
                    } catch (e) {
                      console.error(e)
                      toast({ title: '错误', description: '推送失败', variant: 'destructive' })
                    }
                  }}
                >
                  发送测试
                </Button>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                测试推送仅使用服务端配置（环境变量或已保存设置），不会从浏览器传递 Token。
              </p>
            </div>
          </div>

          <div className="mt-3">
            <small className="text-muted-foreground">
              你也可以通过设置环境变量 <code>GOTIFY_URL</code> 与 <code>GOTIFY_TOKEN</code>{' '}
              来覆盖数据库中的配置。
            </small>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
