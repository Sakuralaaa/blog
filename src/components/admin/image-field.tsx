'use client'

import { useState, type ClipboardEvent, type DragEvent } from 'react'
import { Input } from '@/components/ui/input'
import { cn, isSafeImageSrc } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { imageFilesFrom, uploadImage } from '@/lib/upload-image'
import { ImagePickerDialog } from './image-picker-dialog'
import { ImageUploadButton } from './image-upload-button'

type Props = {
  id?: string
  value: string
  onChange: (url: string) => void
  pickerTitle?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  preview?: boolean
}

/**
 * An image URL field with an Upload button and the file-manager picker beside it.
 * An image can also be dropped on the field or pasted into it.
 */
export function ImageField({
  id,
  value,
  onChange,
  pickerTitle = '选择图片',
  placeholder = '上传、粘贴或填写图片地址',
  disabled,
  className,
  preview = true,
}: Props) {
  const { toast } = useToast()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const uploadFirst = async (files: File[]) => {
    if (!files.length || disabled) return false
    setBusy(true)
    try {
      onChange(await uploadImage(files[0]))
      toast({ title: '上传成功', description: '图片已上传并填好' })
    } catch (error) {
      toast({ title: '上传失败', description: error instanceof Error ? error.message : '上传失败', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
    return true
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const files = imageFilesFrom(event.clipboardData)
    if (files.length) {
      event.preventDefault()
      void uploadFirst(files)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDragging(false)
    const files = imageFilesFrom(event.dataTransfer)
    if (files.length) {
      event.preventDefault()
      void uploadFirst(files)
    }
  }

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.types).includes('Files')) {
          event.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          className={cn('sm:flex-1', dragging && 'ring-2 ring-primary')}
          value={value}
          placeholder={busy ? '上传中…' : placeholder}
          disabled={disabled || busy}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
        />
        <ImageUploadButton disabled={disabled || busy} onUploaded={onChange} />
        <ImagePickerDialog title={pickerTitle} triggerText="图库" disabled={disabled || busy} onSelect={onChange} />
      </div>
      {preview && isSafeImageSrc(value) && (
        <img src={value} alt="" className="h-20 w-auto max-w-[240px] rounded-md border object-cover" />
      )}
    </div>
  )
}
