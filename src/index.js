import { defineTool } from '@deepseek-ai/dsh-tools'
import { LifecycleInspector } from './inspector.js'

export const name = 'lifecycle-inspector'
export const inject = ['loader', 'commands', 'tools']

function renderPlugin(plugin) {
  const effects = plugin.effects.length === 0
    ? '  effects: none'
    : plugin.effects.map(effect => `${'  '.repeat(effect.depth + 1)}- ${effect.label}`).join('\n')
  return `${plugin.id} [${plugin.phase}] (${plugin.effectCount} effects)\n${effects}`
}

export function apply(ctx, config = {}) {
  const inspector = new LifecycleInspector(ctx.loader, config)
  ctx.on('internal/status', (fiber, oldState) => inspector.observe(fiber, oldState), { global: true })

  ctx.commands.register({
    name: 'lifecycle',
    description: 'Inspect plugin Fiber phases, live Effects, and teardown observations',
    input: { hint: '[list|inspect <plugin-id>]' },
    handler(invocation) {
      const [action = 'list', ...rest] = invocation.rawInput.trim().split(/\s+/u)
      if (action === 'list') return { kind: 'success', text: inspector.list().map(renderPlugin).join('\n\n') || 'No plugins found.' }
      if (action === 'inspect' && rest.length > 0) {
        const report = inspector.report(rest.join(' '))
        return report === undefined
          ? { kind: 'error', text: `Plugin ${rest.join(' ')} was not found.` }
          : { kind: 'success', text: `${renderPlugin(report)}\nverdict: ${report.verdict}\nassurance: ${report.assurance}` }
      }
      return { kind: 'error', text: 'Usage: /lifecycle [list|inspect <plugin-id>]' }
    },
  })

  ctx.tools.register(defineTool({
    name: 'lifecycle_inspect',
    description: 'Read DSH plugin lifecycle phases and Cordis-managed live effects. This diagnoses registered cleanup only and cannot prove the absence of unregistered external resources.',
    parameters: { plugin: { type: 'string', description: 'Optional exact loader entry id or module name.' } },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    execute(args) {
      if (args.plugin) return inspector.report(args.plugin) ?? { error: `Plugin ${args.plugin} was not found.` }
      return { plugins: inspector.list() }
    },
  }))
}
