'use client'

/** Uploads one image through the admin file manager and returns its URL. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('只能上传图片')
  const form = new FormData()
  form.append('file', file, file.name || 'image.png')
  form.append('compressionMode', 'BALANCED')
  const res = await fetch('/api/admin/files', { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.file?.url) throw new Error(data?.error || '上传失败')
  return String(data.file.url)
}

/** The image files in a paste or drop, in order. */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return []
  const files = Array.from(data.files || []).filter((file) => file.type.startsWith('image/'))
  if (files.length) return files
  return Array.from(data.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
}
