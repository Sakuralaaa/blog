import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRssXml, escapeXml, serializeJsonLd } from '../src/lib/feed'
import { resolveHstsHeader } from '../src/proxy'

test('escapeXml escapes markup and strips invalid control characters', () => {
  assert.equal(escapeXml(`a<b>&"c'\u0001`), 'a&lt;b&gt;&amp;&quot;c&apos;')
})

test('buildRssXml renders channel and items with absolute links', () => {
  const xml = buildRssXml(
    { title: '我的 <博客>', description: 'd', siteUrl: 'https://blog.test/', feedUrl: 'https://blog.test/feed.xml' },
    [{ title: 'A & B', slug: 'a b', excerpt: 'x', publishedAt: '2026-11-05T08:00:00Z', category: '教程', tags: ['AI'] }]
  )
  assert.match(xml, /<title>我的 &lt;博客&gt;<\/title>/)
  assert.match(xml, /<link>https:\/\/blog\.test\/posts\/a%20b<\/link>/)
  assert.match(xml, /<pubDate>Thu, 05 Nov 2026 08:00:00 GMT<\/pubDate>/)
  assert.match(xml, /<category>教程<\/category>\s*<category>AI<\/category>/)
  assert.ok(xml.startsWith('<?xml'))
})

test('serializeJsonLd cannot close the script tag', () => {
  const out = serializeJsonLd({ headline: '</script><script>alert(1)</script>' })
  assert.ok(!out.includes('</script>'))
  assert.deepEqual(JSON.parse(out), { headline: '</script><script>alert(1)</script>' })
})

test('HSTS header defaults, overrides and can be disabled', () => {
  assert.equal(resolveHstsHeader(''), 'max-age=63072000; includeSubDomains; preload')
  assert.equal(resolveHstsHeader('max-age=300'), 'max-age=300')
  assert.equal(resolveHstsHeader('off'), null)
})
