const PHASE = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

function flattenEffects(effects, depth = 0) {
  return effects.flatMap(effect => [
    { label: effect.label, depth },
    ...flattenEffects(effect.children ?? [], depth + 1),
  ])
}

const EFFECT_GROUPS = [
  ['Services', /ctx\.provide\(/u],
  ['Event listeners', /ctx\.on\(/u],
  ['Commands and tools', /(?:commands|tools)\.register\(/u],
  ['Child plugins', /ctx\.plugin\(\)/u],
  ['Cleanup-sensitive resources', /(?:timer|interval|watch|worker|process|socket|server|stream|close|dispose|cleanup|teardown|pty)/iu],
]

/** Summarize raw Cordis effect labels into user-facing resource groups. */
export function summarizeEffects(effects) {
  const counts = Object.fromEntries(EFFECT_GROUPS.map(([name]) => [name, 0]))
  counts.Other = 0
  for (const effect of effects) {
    const group = EFFECT_GROUPS.find(([, pattern]) => pattern.test(effect.label))
    counts[group?.[0] ?? 'Other'] += 1
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, count }))
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
        const flattened = flattenEffects(effects)
        return {
          id: entry.id,
          configId: entry.options.id,
          moduleName: entry.options.name,
          phase: fiber === undefined ? (entry.disabled ? 'disabled' : 'unmounted') : PHASE[fiber.state],
          effectCount: flattened.length,
          effects: flattened,
          effectSummary: summarizeEffects(flattened),
        }
      })
  }

  overview() {
    const plugins = this.list()
    const phases = Object.fromEntries(['active', 'disabled', 'pending', 'loading', 'failed', 'unloading', 'disposed', 'unmounted'].map(phase => [phase, 0]))
    for (const plugin of plugins) phases[plugin.phase] = (phases[plugin.phase] ?? 0) + 1
    return {
      total: plugins.length,
      phases,
      attention: plugins.filter(plugin => ['failed', 'unloading', 'pending'].includes(plugin.phase)),
      plugins,
    }
  }

  report(id) {
    const plugin = this.list().find(entry =>
      entry.id === id
      || entry.configId === id
      || entry.moduleName === id
      || entry.moduleName === `dsh-${id}`,
    )
    if (plugin === undefined) return undefined
    const shortModuleName = plugin.moduleName.startsWith('dsh-') ? plugin.moduleName.slice(4) : plugin.moduleName
    const transitions = this.transitions.filter(item =>
      item.plugin === plugin.moduleName
      || item.plugin === plugin.configId
      || item.plugin === shortModuleName
      || item.plugin === id,
    )
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
