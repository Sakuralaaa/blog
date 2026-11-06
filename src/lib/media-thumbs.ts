import path from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { MEDIA_MAX_INPUT_PIXELS, MEDIA_ROOT } from './media'
import { THUMB_WIDTHS } from './media-srcset'

/**
 * Smaller copies of uploaded images for list cards (`/api/files/<id>?w=480`).
 *
 * They are served through the same route as the original, so every request still passes
 * the media access check; the disk copies are only a render cache, never a public HTTP
 * cache, which keeps revoking a file effective. Keyed by content hash, so a replaced file
 * never reuses an old copy.
 */
export const MEDIA_THUMB_ROOT = process.env.MEDIA_THUMB_ROOT || path.join(path.dirname(path.resolve(MEDIA_ROOT)), 'thumbs')

const RESIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const inflight = new Map<string, Promise<Buffer | null>>()

export function parseThumbWidth(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)
  return (THUMB_WIDTHS as readonly number[]).includes(n) ? n : null
}

export function canThumbnail(mimeType: string) {
  return RESIZABLE.has(mimeType)
}

/** Returns a webp at most `width` wide, or null when the original is already that small. */
export async function getThumbnail(file: { absolutePath: string; sha256: string | null; mimeType: string }, id: string, width: number) {
  const key = `${(file.sha256 || id).replace(/[^a-zA-Z0-9]/g, '')}-${width}.webp`
  const target = path.join(MEDIA_THUMB_ROOT, key.slice(0, 2), key)
  try {
    return await readFile(target)
  } catch {
    // not cached yet
  }
  const running = inflight.get(key)
  if (running) return running
  const job = (async () => {
    const input = sharp(file.absolutePath, { failOn: 'error', limitInputPixels: MEDIA_MAX_INPUT_PIXELS })
    const meta = await input.metadata()
    if (!meta.width || meta.width <= width) return null
    const out = await input.rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 74, effort: 4 }).toBuffer()
    await mkdir(path.dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.tmp`
    await writeFile(tmp, out)
    await rename(tmp, target)
    return out
  })().finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}
