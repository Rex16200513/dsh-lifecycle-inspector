import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LifecycleInspector, flattenEffects, summarizeEffects } from '../src/inspector.js'

test('flattens nested effect diagnostics', () => {
  assert.deepEqual(flattenEffects([{ label: 'outer', children: [{ label: 'inner', children: [] }] }]), [
    { label: 'outer', depth: 0 },
    { label: 'inner', depth: 1 },
  ])
})

test('groups raw effects into readable resource types', () => {
  assert.deepEqual(summarizeEffects([
    { label: 'ctx.on("ready")', depth: 0 },
    { label: 'tools.register()', depth: 0 },
    { label: 'close worker', depth: 0 },
  ]), [
    { name: 'Event listeners', count: 1 },
    { name: 'Commands and tools', count: 1 },
    { name: 'Cleanup-sensitive resources', count: 1 },
  ])
})

test('projects fibers and identifies slow teardown', () => {
  const fiber = { name: 'demo', state: 2, getEffects: () => [{ label: 'timer', children: [] }] }
  const loader = { entries: () => [{ id: 'include/demo-entry', options: { id: 'demo-entry', name: 'dsh-demo' }, fiber }] }
  const inspector = new LifecycleInspector(loader, { slowTeardownMs: 10 })
  assert.equal(inspector.list()[0].effectCount, 1)
  assert.equal(inspector.overview().phases.active, 1)
  fiber.state = 5
  inspector.observe(fiber, 2, 100)
  fiber.state = 4
  inspector.observe(fiber, 5, 120)
  assert.equal(inspector.report('demo').verdict, 'slow')
  assert.equal(inspector.report('demo-entry').teardownMs, 20)
  assert.equal(inspector.report('dsh-demo').teardownMs, 20)
})
