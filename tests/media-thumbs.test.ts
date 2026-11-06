import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { mediaSrcSet } from '../src/lib/media-srcset'

test('mediaSrcSet only describes uploaded media', () => {
  assert.equal(mediaSrcSet('/api/files/abc123'), '/api/files/abc123?w=480 480w, /api/files/abc123?w=960 960w')
  assert.equal(mediaSrcSet('https://cdn.example.com/a.jpg'), undefined)
  assert.equal(mediaSrcSet('/api/files/abc?w=480'), undefined)
  assert.equal(mediaSrcSet(null), undefined)
})

test('thumbnails resize down, are cached, and skip images already small enough', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'thumbs-'))
  process.env.MEDIA_THUMB_ROOT = path.join(dir, 'thumbs')
  try {
    const { getThumbnail, parseThumbWidth } = await import('../src/lib/media-thumbs')
    assert.equal(parseThumbWidth('480'), 480)
    assert.equal(parseThumbWidth('500'), null)
    assert.equal(parseThumbWidth(null), null)

    const big = path.join(dir, 'big.png')
    await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#88aacc' } }).png().toFile(big)
    const file = { absolutePath: big, sha256: 'deadbeef', mimeType: 'image/png' }
    const thumb = await getThumbnail(file, 'id1', 480)
    assert.ok(thumb)
    const meta = await sharp(thumb).metadata()
    assert.equal(meta.width, 480)
    assert.equal(meta.format, 'webp')
    assert.deepEqual(await getThumbnail(file, 'id1', 480), thumb)

    const small = path.join(dir, 'small.png')
    await sharp({ create: { width: 300, height: 200, channels: 3, background: '#ccaa88' } }).png().toFile(small)
    assert.equal(await getThumbnail({ absolutePath: small, sha256: 'cafe', mimeType: 'image/png' }, 'id2', 480), null)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
