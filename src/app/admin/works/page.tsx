'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ExternalLink, Eye } from 'lucide-react'
import { ImageField } from '@/components/admin/image-field'
import { ImageUploadButton } from '@/components/admin/image-upload-button'
import { ImagePickerDialog } from '@/components/admin/image-picker-dialog'
import { parseGallery, projectPath } from '@/lib/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Project = {
  id: string
  slug: string | null
  name: string
  url: string
  description: string | null
  image: string | null
  role: string | null
  period: string | null
  tags: string | null
  gallery: string | null
  content: string | null
  createdAt: string
  updatedAt: string
}

type ProjectForm = {
  name: string
  slug: string
  url: string
  description: string
  image: string
  role: string
  period: string
  tags: string
  gallery: string
  content: string
}

const emptyForm: ProjectForm = {
  name: '',
  slug: '',
  url: '',
  description: '',
  image: '',
  role: '',
  period: '',
  tags: '',
  gallery: '',
  content: '',
}

function appendLine(text: string, line: string) {
  const trimmed = text.replace(/\s+$/, '')
  return trimmed ? `${trimmed}\n${line}` : line
}

export default function AdminWorksPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState<ProjectForm>(emptyForm)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/projects')
      const data = await res.json()
      if (res.ok) {
        setProjects(data.projects || [])
      } else {
        toast({ title: '错误', description: data.error || '获取作品失败', variant: 'destructive' })
      }
    } catch (error) {
      console.error('获取作品失败:', error)
      toast({ title: '错误', description: '获取作品失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  const openCreate = () => {
    setEditingProject(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name || '',
      slug: project.slug || '',
      url: project.url || '',
      description: project.description || '',
      image: project.image || '',
      role: project.role || '',
      period: project.period || '',
      tags: project.tags || '',
      gallery: project.gallery || '',
      content: project.content || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = formData.name.trim()
    if (!name) {
      toast({ title: '提示', description: '请填写作品名称', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const method = editingProject ? 'PATCH' : 'POST'
      const endpoint = editingProject ? `/api/admin/projects/${editingProject.id}` : '/api/admin/projects'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, name }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '成功', description: editingProject ? '作品已更新' : '作品已创建' })
        setDialogOpen(false)
        setEditingProject(null)
        setFormData(emptyForm)
        await loadProjects()
      } else {
        toast({ title: '错误', description: data.error || '保存失败', variant: 'destructive' })
      }
    } catch (error) {
      console.error('保存作品失败:', error)
      toast({ title: '错误', description: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (project: Project) => {
    try {
      setDeletingId(project.id)
      const res = await fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setProjects((prev) => prev.filter((item) => item.id !== project.id))
        toast({ title: '成功', description: '作品已删除' })
      } else {
        toast({ title: '错误', description: data.error || '删除失败', variant: 'destructive' })
      }
    } catch (error) {
      console.error('删除作品失败:', error)
      toast({ title: '错误', description: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">作品展示</h1>
          <p className="text-muted-foreground">首页横向展示，点开进入作品详情页</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新增作品
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">加载中...</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">暂无作品，点击右上角新增</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const fallback = project.name?.charAt(0)?.toUpperCase() || '作'
            return (
              <Card key={project.id} className="overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {project.image ? (
                    <img src={project.image} alt={project.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl font-serif font-bold text-gray-900 dark:text-white">{fallback}</span>
                  )}
                </div>
                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link
                      href={projectPath(project)}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"
                    >
                      <Eye className="h-3 w-3" />
                      查看详情页
                    </Link>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        访问链接
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(project)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deletingId === project.id}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除作品</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除作品“{project.name}”吗？此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          确定删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? '编辑作品' : '新增作品'}</DialogTitle>
            <DialogDescription>
              首页横向展示封面、名称和简介；点开是详情页，展示下面所有内容。图片都可以直接上传、拖进来或 Ctrl+V 粘贴。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name">作品名称</Label>
                <Input
                  id="project-name"
                  placeholder="例如：个人作品集网站"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-slug">详情页路径（可选）</Label>
                <Input
                  id="project-slug"
                  placeholder="例如：portfolio，不填用编号"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">一句话简介</Label>
              <Textarea
                id="project-description"
                rows={2}
                placeholder="显示在卡片和详情页标题下"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-image">封面</Label>
              <ImageField
                id="project-image"
                value={formData.image}
                onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
                pickerTitle="选择作品封面"
              />
              <p className="text-xs text-muted-foreground">不填则用作品名首字</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-role">担任角色</Label>
                <Input
                  id="project-role"
                  placeholder="例如：独立开发 / 前端负责人"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-period">时间</Label>
                <Input
                  id="project-period"
                  placeholder="例如：2025.03 – 2025.06"
                  value={formData.period}
                  onChange={(e) => setFormData((prev) => ({ ...prev, period: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-tags">标签</Label>
              <Input
                id="project-tags"
                placeholder="用逗号分隔，例如：Next.js, 设计, 开源"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-url">访问链接（可选）</Label>
              <Input
                id="project-url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="project-gallery">截图画廊</Label>
                <div className="flex gap-2">
                  <ImageUploadButton
                    multiple
                    label="上传截图"
                    onUploaded={(url) => setFormData((prev) => ({ ...prev, gallery: appendLine(prev.gallery, url) }))}
                  />
                  <ImagePickerDialog
                    title="添加截图"
                    triggerText="图库"
                    onSelect={(url) => setFormData((prev) => ({ ...prev, gallery: appendLine(prev.gallery, url) }))}
                  />
                </div>
              </div>
              <Textarea
                id="project-gallery"
                rows={3}
                className="font-mono text-xs"
                placeholder="每行一个图片地址，可多选上传"
                value={formData.gallery}
                onChange={(e) => setFormData((prev) => ({ ...prev, gallery: e.target.value }))}
              />
              {parseGallery(formData.gallery).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parseGallery(formData.gallery).map((src, index) => (
                    <img key={`${src}-${index}`} src={src} alt="" className="h-14 w-20 rounded border object-cover" />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-content">介绍正文（Markdown）</Label>
              <Textarea
                id="project-content"
                rows={8}
                placeholder={'## 背景\n\n## 我做了什么\n\n## 结果'}
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
