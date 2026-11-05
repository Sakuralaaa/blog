'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Search } from 'lucide-react'
import Image from 'next/image'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { imageFilesFrom, uploadImage } from '@/lib/upload-image'
import { ImageUploadButton } from './image-upload-button'

type MediaFile = {
  id: string
  originalName: string
  ext: string
  size: number
  width: number | null
  height: number | null
  createdAt: string
  url: string
}

type Props = {
  onSelect: (url: string) => void
  triggerText?: string
  title?: string
  disabled?: boolean
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

export function ImagePickerDialog({
  onSelect,
  triggerText = '从文件管理选择',
  title = '选择图片',
  disabled,
}: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalFiles, setTotalFiles] = useState(0)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const trimmedQuery = useMemo(() => query.trim(), [query])

  const latestRequest = useRef(0)
  const loadFiles = useCallback(async (q = '') => {
    const sequence = ++latestRequest.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ kind: 'images', limit: '24', page: String(page) })
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/files?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (sequence !== latestRequest.current) return
      if (!res.ok) {
        throw new Error(data.error || '加载图片失败')
      }
      if (page > (data.pagination?.totalPages || 1)) { setPage(data.pagination?.totalPages || 1); return }
      setFiles(data.files || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalFiles(data.pagination?.total || 0)
    } catch (error) {
      if (sequence !== latestRequest.current) return
      console.error('加载图片失败:', error)
      toast({ title: '错误', description: '加载图片失败', variant: 'destructive' })
    } finally {
      if (sequence === latestRequest.current) setLoading(false)
    }
  }, [toast, page])

  useEffect(() => {
    if (!open) return

    const delay = trimmedQuery ? 300 : 0
    const timer = window.setTimeout(() => {
      loadFiles(trimmedQuery)
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [trimmedQuery, open, loadFiles])

  const handleSelect = (url: string) => {
    onSelect(url)
    setOpen(false)
    toast({ title: '已选择', description: '已回填图片 URL' })
  }

  // An image uploaded here (button, drop or Ctrl+V) is selected right away.
  const uploadAndSelect = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setUploading(true)
      try {
        const url = await uploadImage(files[0])
        onSelect(url)
        setOpen(false)
        toast({ title: '上传成功', description: '图片已上传并填好' })
      } catch (error) {
        toast({
          title: '上传失败',
          description: error instanceof Error ? error.message : '上传失败',
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
      }
    },
    [onSelect, toast]
  )

  useEffect(() => {
    if (!open) return
    const onPaste = (event: ClipboardEvent) => {
      const files = imageFilesFrom(event.clipboardData)
      if (!files.length) return
      event.preventDefault()
      void uploadAndSelect(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, uploadAndSelect])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" disabled={disabled}>
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>选一张已有的图片，或者直接上传：拖进来、Ctrl+V 粘贴截图都行。</DialogDescription>
        </DialogHeader>

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-sm text-muted-foreground transition-colors ${dragging ? 'border-primary bg-primary/5' : ''}`}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.types).includes('Files')) {
              event.preventDefault()
              setDragging(true)
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            setDragging(false)
            const files = imageFilesFrom(event.dataTransfer)
            if (files.length) {
              event.preventDefault()
              void uploadAndSelect(files)
            }
          }}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 上传中…
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" /> 把图片拖到这里，或按 Ctrl+V 粘贴
              </span>
              <ImageUploadButton label="从电脑选择" onUploaded={(url) => handleSelect(url)} />
            </>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件名"
          />
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-md border p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">暂无可选图片</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => (
                <div key={file.id} className="overflow-hidden rounded-lg border bg-card">
                  <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <Image
                      unoptimized
                      src={file.url}
                      alt={file.originalName}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-1 text-sm font-medium" title={file.originalName}>{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.width && file.height ? `${file.width} × ${file.height}` : '未知尺寸'} · {formatBytes(file.size)} · {file.ext.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleString('zh-CN')}</p>
                    <Button className="w-full" size="sm" onClick={() => handleSelect(file.url)}>
                      选择该图片
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <PaginationControls page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
