'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { SettingsFieldProps } from './settings-fields'

export function ProfileSettingsSection({ getVal, getBoolVal, setVal }: SettingsFieldProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              身份属性（侧边栏）
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.tagline') || '')}
              onChange={(e) => setVal('profile.tagline', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              个性签名
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.signature') || '')}
              onChange={(e) => setVal('profile.signature', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              身份/职业
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.role') || '')}
              onChange={(e) => setVal('profile.role', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              地点
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.location') || '')}
              onChange={(e) => setVal('profile.location', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              加入于（年份）
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.joinedYear') || '')}
              onChange={(e) => setVal('profile.joinedYear', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              个人简介
            </label>
            <Textarea
              className="mt-2"
              rows={5}
              value={String(getVal('profile.bio') || '')}
              onChange={(e) => setVal('profile.bio', e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">支持换行，将自动分段展示。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              关注领域 / 技能
            </label>
            <Textarea
              className="mt-2"
              rows={4}
              value={String(getVal('profile.techStack') || '')}
              onChange={(e) => setVal('profile.techStack', e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">每行一组，可写分组名，例如“设计: Figma, 插画”。留空则不显示。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              兴趣爱好
            </label>
            <Textarea
              className="mt-2"
              rows={4}
              value={String(getVal('profile.hobbies') || '')}
              onChange={(e) => setVal('profile.hobbies', e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">每行一个条目，可包含 emoji。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              联系我说明
            </label>
            <Textarea
              className="mt-2"
              rows={3}
              value={String(getVal('profile.contactIntro') || '')}
              onChange={(e) => setVal('profile.contactIntro', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              联系邮箱
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.contactEmail') || '')}
              onChange={(e) => setVal('profile.contactEmail', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              GitHub 地址
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.contactGithub') || '')}
              onChange={(e) => setVal('profile.contactGithub', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              X 地址
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.contactX') || '')}
              onChange={(e) => setVal('profile.contactX', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bilibili 地址
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.contactBilibili') || '')}
              onChange={(e) => setVal('profile.contactBilibili', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              QQ 号码
            </label>
            <Input
              className="mt-2"
              value={String(getVal('profile.contactQQ') || '')}
              onChange={(e) => setVal('profile.contactQQ', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              显示 GitHub 链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getBoolVal('profile.social.github.enabled', true) ? 'true' : 'false'}
              onChange={(e) =>
                setVal('profile.social.github.enabled', e.target.value === 'true')
              }
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              显示 X 链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getBoolVal('profile.social.x.enabled', true) ? 'true' : 'false'}
              onChange={(e) => setVal('profile.social.x.enabled', e.target.value === 'true')}
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              显示 Bilibili 链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getBoolVal('profile.social.bilibili.enabled', true) ? 'true' : 'false'}
              onChange={(e) =>
                setVal('profile.social.bilibili.enabled', e.target.value === 'true')
              }
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              显示邮箱链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getBoolVal('profile.social.email.enabled', true) ? 'true' : 'false'}
              onChange={(e) =>
                setVal('profile.social.email.enabled', e.target.value === 'true')
              }
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              显示 QQ 链接
            </label>
            <select
              className="mt-2 w-full rounded border bg-transparent px-3 py-2"
              value={getBoolVal('profile.social.qq.enabled', true) ? 'true' : 'false'}
              onChange={(e) => setVal('profile.social.qq.enabled', e.target.value === 'true')}
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
