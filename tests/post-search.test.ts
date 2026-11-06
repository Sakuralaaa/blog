import test from 'node:test'
import assert from 'node:assert/strict'
import { toFtsQuery } from '../src/lib/post-search'

test('toFtsQuery quotes each word and joins with AND', () => {
  assert.equal(toFtsQuery('DeepSeek Claude'), '"DeepSeek" AND "Claude"')
})

test('toFtsQuery escapes quotes and drops words shorter than three characters', () => {
  assert.equal(toFtsQuery('a"bc 中文'), '"a""bc"')
  assert.equal(toFtsQuery('上手全流程 API'), '"上手全流程" AND "API"')
  assert.equal(toFtsQuery('  '), null)
})
