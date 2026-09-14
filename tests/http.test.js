import assert from 'node:assert/strict'
import { test } from 'node:test'
import { writeReportResponse } from '../src/http.js'

function responseRecorder() {
  return {
    status: undefined,
    headers: undefined,
    body: undefined,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) { this.body = body },
  }
}

test('serves the current report without caching', () => {
  const res = responseRecorder()
  writeReportResponse({ method: 'GET' }, res, { overview: () => ({ total: 2 }) })
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  assert.equal(res.headers['cache-control'], 'no-store')
  assert.equal(res.body, '{"total":2}')
})

test('allows HEAD and rejects mutation methods', () => {
  const head = responseRecorder()
  writeReportResponse({ method: 'HEAD' }, head, { overview: () => ({ total: 2 }) })
  assert.equal(head.status, 200)
  assert.equal(head.body, undefined)

  const post = responseRecorder()
  writeReportResponse({ method: 'POST' }, post, { overview: () => ({ total: 2 }) })
  assert.equal(post.status, 405)
  assert.equal(post.headers.allow, 'GET, HEAD')
})
