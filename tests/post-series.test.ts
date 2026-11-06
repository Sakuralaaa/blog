import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSeriesInput, seriesHref, sortSeriesPosts } from '../src/lib/post-series'
import { RequestBodyError } from '../src/lib/request-body'

test('series input: missing keys mean no change, blanks clear', () => {
  assert.deepEqual(parseSeriesInput({}), {})
  assert.deepEqual(parseSeriesInput({ series: '  AI   上手全流程 ', seriesOrder: 3 }), { series: 'AI 上手全流程', seriesOrder: 3 })
  assert.deepEqual(parseSeriesInput({ series: '' }), { series: null, seriesOrder: null })
  assert.deepEqual(parseSeriesInput({ series: null, seriesOrder: 2 }), { series: null, seriesOrder: 2 })
  assert.deepEqual(parseSeriesInput({ seriesOrder: '7' }), { seriesOrder: 7 })
  assert.deepEqual(parseSeriesInput({ seriesOrder: '' }), { seriesOrder: null })
})

test('series input rejects bad values', () => {
  for (const body of [{ series: 3 }, { series: 'x'.repeat(81) }, { seriesOrder: 0 }, { seriesOrder: 1.5 }, { seriesOrder: 'abc' }, { seriesOrder: 10000 }]) {
    assert.throws(() => parseSeriesInput(body), RequestBodyError)
  }
})

test('series order: numbered parts first, unnumbered keep their order', () => {
  const posts = [
    { slug: 'c', seriesOrder: null },
    { slug: 'b', seriesOrder: 2 },
    { slug: 'd', seriesOrder: null },
    { slug: 'a', seriesOrder: 1 },
  ]
  assert.deepEqual(sortSeriesPosts(posts).map((p) => p.slug), ['a', 'b', 'c', 'd'])
})

test('series link encodes the name', () => {
  assert.equal(seriesHref('AI 上手全流程'), '/posts?series=AI%20%E4%B8%8A%E6%89%8B%E5%85%A8%E6%B5%81%E7%A8%8B')
})
