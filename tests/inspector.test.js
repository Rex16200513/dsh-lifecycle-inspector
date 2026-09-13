import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LifecycleInspector, flattenEffects } from '../src/inspector.js'

test('flattens nested effect diagnostics', () => {
  assert.deepEqual(flattenEffects([{ label: 'outer', children: [{ label: 'inner', children: [] }] }]), [
    { label: 'outer', depth: 0 },
    { label: 'inner', depth: 1 },
  ])
})

test('projects fibers and identifies slow teardown', () => {
  const fiber = { name: 'demo', state: 2, getEffects: () => [{ label: 'timer', children: [] }] }
  const loader = { entries: () => [{ id: 'demo', options: { name: 'demo' }, fiber }] }
  const inspector = new LifecycleInspector(loader, { slowTeardownMs: 10 })
  assert.equal(inspector.list()[0].effectCount, 1)
  fiber.state = 5
  inspector.observe(fiber, 2, 100)
  fiber.state = 4
  inspector.observe(fiber, 5, 120)
  assert.equal(inspector.report('demo').verdict, 'slow')
  assert.equal(inspector.report('demo').teardownMs, 20)
})
