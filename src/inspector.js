const PHASE = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

function flattenEffects(effects, depth = 0) {
  return effects.flatMap(effect => [
    { label: effect.label, depth },
    ...flattenEffects(effect.children ?? [], depth + 1),
  ])
}

/** Read-only lifecycle projection over Cordis loader entries. */
export class LifecycleInspector {
  constructor(loader, options = {}) {
    this.loader = loader
    this.slowTeardownMs = options.slowTeardownMs ?? 2000
    this.historyLimit = options.historyLimit ?? 100
    this.transitions = []
    this.unloadingAt = new WeakMap()
  }

  observe(fiber, oldState, now = Date.now()) {
    const phase = PHASE[fiber.state] ?? 'unknown'
    const previousPhase = PHASE[oldState] ?? 'unknown'
    let teardownMs
    if (phase === 'unloading') this.unloadingAt.set(fiber, now)
    if (phase === 'disposed') {
      const startedAt = this.unloadingAt.get(fiber)
      if (startedAt !== undefined) teardownMs = now - startedAt
      this.unloadingAt.delete(fiber)
    }
    this.transitions.push({ plugin: fiber.name ?? 'anonymous', previousPhase, phase, at: now, teardownMs })
    if (this.transitions.length > this.historyLimit) this.transitions.splice(0, this.transitions.length - this.historyLimit)
  }

  list() {
    return [...this.loader.entries()]
      .filter(entry => !entry.options.group)
      .map(entry => {
        const fiber = entry.fiber
        const effects = fiber?.getEffects() ?? []
        return {
          id: entry.id,
          moduleName: entry.options.name,
          phase: fiber === undefined ? (entry.disabled ? 'disabled' : 'unmounted') : PHASE[fiber.state],
          effectCount: flattenEffects(effects).length,
          effects: flattenEffects(effects),
        }
      })
  }

  report(id) {
    const plugin = this.list().find(entry => entry.id === id || entry.moduleName === id)
    if (plugin === undefined) return undefined
    const transitions = this.transitions.filter(item => item.plugin === plugin.moduleName || item.plugin === id)
    const lastTeardown = [...transitions].reverse().find(item => item.teardownMs !== undefined)
    return {
      ...plugin,
      teardownMs: lastTeardown?.teardownMs,
      verdict: plugin.phase === 'failed'
        ? 'failed'
        : lastTeardown?.teardownMs !== undefined && lastTeardown.teardownMs > this.slowTeardownMs
          ? 'slow'
          : plugin.phase === 'disposed' && plugin.effectCount === 0
            ? 'cordis-cleared'
            : 'observed',
      assurance: 'Cordis-managed effects only; unregistered external resources are not proven absent.',
      transitions,
    }
  }
}

export { flattenEffects }
