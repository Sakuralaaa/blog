import test from 'node:test'
import assert from 'node:assert/strict'
import { ProjectInputError, parseGallery, parseProjectInput, parseTags, projectPath } from '../src/lib/projects'
import { isLegacyDefault } from '../scripts/upgrade-settings.mjs'

test('a new work needs only a name; the link is optional', () => {
  const input = parseProjectInput({ name: '  作品集  ' }, false)
  assert.equal(input.name, '作品集')
  assert.equal(input.url, '')
  assert.throws(() => parseProjectInput({ name: ' ' }, false), ProjectInputError)
})

test('an update leaves out fields it does not send and clears empty ones', () => {
  const input = parseProjectInput({ role: '', period: '2025.03 – 2025.06' }, true)
  assert.deepEqual(input, { role: null, period: '2025.03 – 2025.06' })
})

test('slugs, links and images are validated', () => {
  assert.equal(parseProjectInput({ slug: 'My-Site' }, true).slug, 'my-site')
  assert.throws(() => parseProjectInput({ slug: 'a/b' }, true), ProjectInputError)
  assert.throws(() => parseProjectInput({ url: 'javascript:alert(1)' }, true), ProjectInputError)
  assert.throws(() => parseProjectInput({ image: 'javascript:alert(1)' }, true), ProjectInputError)
})

test('tags and gallery are normalized', () => {
  assert.deepEqual(parseTags('Next.js，设计, Next.js、开源'), ['Next.js', '设计', '开源'])
  assert.deepEqual(parseGallery('/api/files/a\n\njavascript:x\n https://e.com/b.png '), ['/api/files/a', 'https://e.com/b.png'])
  assert.equal(parseProjectInput({ gallery: '/a.png\r\nbad\n/b.png' }, true).gallery, '/a.png\n/b.png')
})

test('a work links to its slug, else its id', () => {
  assert.equal(projectPath({ id: 'abc', slug: null }), '/projects/abc')
  assert.equal(projectPath({ id: 'abc', slug: '作品' }), `/projects/${encodeURIComponent('作品')}`)
})

test('old template copy is recognised, edited copy is not', () => {
  assert.equal(isLegacyDefault('site.title', { title: '执笔为剑' }), true)
  assert.equal(isLegacyDefault('site.title', { value: '执笔为剑' }), true)
  assert.equal(isLegacyDefault('site.title', { title: '我的小站' }), false)
  assert.equal(isLegacyDefault('site.footer_powered_by', { value: 'by xywml' }), true)
})
