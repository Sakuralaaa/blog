'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
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
  name: string
  url: string
  description: string | null
  image: string | null
  createdAt: string
  updatedAt: string
}

type ProjectForm = {
  name: string
  url: string
  description: string
  image: string
}

const emptyForm: ProjectForm = {
  name: '',
  url: '',
  description: '',
  image: '',
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
      url: project.url || '',
      description: project.description || '',
      image: project.image || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const name = formData.name.trim()
    const url = formData.url.trim()
    if (!name) {
      toast({ title: '提示', description: '请填写项目名称', variant: 'destructive' })
      return
    }
    if (!url) {
      toast({ title: '提示', description: '请填写项目链接', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const method = editingProject ? 'PATCH' : 'POST'
      const endpoint = editingProject ? `/api/admin/projects/${editingProject.id}` : '/api/admin/projects'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          description: formData.description,
          image: formData.image,
        }),
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
          <p className="text-muted-foreground">管理「作品」页面中展示的项目</p>
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
                  <Link
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
                  >
                    <ExternalLink className="h-3 w-3" />
                    访问项目
                  </Link>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? '编辑作品' : '新增作品'}</DialogTitle>
            <DialogDescription>填写项目名称、链接、简介与封面图，展示到「作品」页面和首页。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">项目名称</Label>
              <Input
                id="project-name"
                placeholder="例如：个人作品集网站"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-url">项目链接</Label>
              <Input
                id="project-url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-image">项目图片</Label>
              <Input
                id="project-image"
                placeholder="https://example.com/cover.jpg"
                value={formData.image}
                onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">不填则自动使用项目首字</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">项目简介</Label>
              <Textarea
                id="project-description"
                rows={4}
                placeholder="简短描述你的项目特色"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
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
