'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { uploadImage } from '@/lib/upload-image'

type Props = {
  /** Called with each uploaded image's URL, in the order chosen. */
  onUploaded: (url: string) => void
  multiple?: boolean
  disabled?: boolean
  label?: string
}

/** Picks images from this computer, uploads them and hands back their URLs. */
export function ImageUploadButton({ onUploaded, multiple = false, disabled, label = '上传' }: Props) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    let done = 0
    try {
      for (const file of files) {
        onUploaded(await uploadImage(file))
        done += 1
      }
      toast({ title: '上传成功', description: done > 1 ? `已上传 ${done} 张图片` : '图片已上传并填好' })
    } catch (error) {
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '上传失败',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        hidden
        onChange={(event) => upload(Array.from(event.target.files || []))}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {busy ? '上传中…' : label}
      </Button>
    </>
  )
}
