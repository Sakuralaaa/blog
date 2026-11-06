'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { SettingsFieldProps } from './settings-fields'

export function InteractionSettingsSection({ getVal, setVal }: SettingsFieldProps) {
  const { toast } = useToast()
  return (
    <Card>
      <CardHeader>
        <CardTitle>评论与注册</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              评论开启
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('comments.enabled') ? 'true' : 'false'}
              onChange={(e) => {
                const enabled = e.target.value === 'true'
                setVal('comments.enabled', enabled)
                if (!enabled) {
                  setVal('comments.allowGuest', false)
                }
              }}
            >
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              允许未登录评论
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('comments.allowGuest') ? 'true' : 'false'}
              onChange={(e) => setVal('comments.allowGuest', e.target.value === 'true')}
              disabled={!getVal('comments.enabled')}
            >
              <option value="true">允许</option>
              <option value="false">禁止</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              游客评论强制审核
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('comments.guestModerationRequired') ? 'true' : 'false'}
              onChange={(e) =>
                setVal('comments.guestModerationRequired', e.target.value === 'true')
              }
              disabled={!getVal('comments.enabled') || !getVal('comments.allowGuest')}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              若“评论需审核”开启，此项将强制生效。
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              评论需审核
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('comments.moderationRequired') ? 'true' : 'false'}
              onChange={(e) => setVal('comments.moderationRequired', e.target.value === 'true')}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              允许用户注册
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('auth.allowRegistration') ? 'true' : 'false'}
              onChange={(e) => setVal('auth.allowRegistration', e.target.value === 'true')}
            >
              <option value="true">允许</option>
              <option value="false">禁止</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              邮件通知开启
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getVal('email.enabled') ? 'true' : 'false'}
              onChange={(e) => setVal('email.enabled', e.target.value === 'true')}
            >
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              回复评论邮件通知
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={
                (getVal('email.reply.enabled') === '' ? true : getVal('email.reply.enabled'))
                  ? 'true'
                  : 'false'
              }
              onChange={(e) => setVal('email.reply.enabled', e.target.value === 'true')}
              disabled={!getVal('email.enabled')}
            >
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              仅审核通过后通知回复
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={
                (
                  getVal('email.reply.requireApproved') === ''
                    ? true
                    : getVal('email.reply.requireApproved')
                )
                  ? 'true'
                  : 'false'
              }
              onChange={(e) => setVal('email.reply.requireApproved', e.target.value === 'true')}
              disabled={!getVal('email.enabled') || !getVal('email.reply.enabled')}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              退订链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={
                (
                  getVal('email.reply.unsubscribeEnabled') === ''
                    ? true
                    : getVal('email.reply.unsubscribeEnabled')
                )
                  ? 'true'
                  : 'false'
              }
              onChange={(e) =>
                setVal('email.reply.unsubscribeEnabled', e.target.value === 'true')
              }
              disabled={!getVal('email.enabled') || !getVal('email.reply.enabled')}
            >
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              邮件发件人显示名
            </label>
            <Input
              className="mt-2"
              value={String(getVal('email.from') || '')}
              onChange={(e) => setVal('email.from', e.target.value)}
              placeholder="网站通知"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              实际发件地址固定使用 SMTP_USER，此项仅用于邮件展示名称。
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              测试邮件
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input id="email-test-title" className="sm:flex-1" placeholder="标题（可空）" />
              <Input id="email-test-message" className="sm:flex-1" placeholder="消息（可空）" />
              <Button
                onClick={async () => {
                  const title = (
                    document.getElementById('email-test-title') as HTMLInputElement
                  )?.value
                  const message = (
                    document.getElementById('email-test-message') as HTMLInputElement
                  )?.value
                  try {
                    const res = await fetch('/api/admin/settings/test-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title, message }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      toast({
                        title: '成功',
                        description: '测试邮件已发送（若 SMTP 配置正确）',
                      })
                    } else {
                      toast({
                        title: '错误',
                        description: data.error || '发送失败',
                        variant: 'destructive',
                      })
                    }
                  } catch (e) {
                    console.error(e)
                    toast({ title: '错误', description: '发送失败', variant: 'destructive' })
                  }
                }}
              >
                发送测试
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              收件人优先使用环境变量 EMAIL_TO；未配置时会自动发送给管理员邮箱。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
