import { defineTool } from '@deepseek-ai/dsh-tools'
import { writeReportResponse } from './http.js'
import { LifecycleInspector } from './inspector.js'

export const name = 'lifecycle-inspector'
export const inject = ['loader', 'commands', 'tools']

const REPORT_ENDPOINT = '/lifecycle-inspector/report'

function renderOverview(overview, verbose = false) {
  const { phases, attention, plugins } = overview
  const lines = [
    'Lifecycle overview',
    `Healthy: ${phases.active} active`,
    `Inactive: ${phases.disabled} disabled · ${phases.disposed} disposed · ${phases.unmounted} unmounted`,
    `Attention: ${phases.failed} failed · ${phases.pending} pending · ${phases.unloading} unloading`,
    '',
    attention.length === 0
      ? 'No lifecycle problems are currently visible.'
      : `Check these plugins: ${attention.map(plugin => `${plugin.id} (${plugin.phase})`).join(', ')}`,
  ]
  if (verbose) lines.push('', 'All plugins', ...plugins.map(plugin => `- ${plugin.id}: ${plugin.phase}, ${plugin.effectCount} registered effects`))
  else lines.push('', 'Use /lifecycle inspect <plugin> for one plugin, or /lifecycle list --verbose for the full inventory.')
  return lines.join('\n')
}

function renderReport(plugin, verbose = false) {
  const assessment = plugin.verdict === 'failed'
    ? 'Plugin failed to load.'
    : plugin.verdict === 'slow'
      ? `Cleanup was slow (${plugin.teardownMs} ms).`
      : plugin.verdict === 'cordis-cleared'
        ? 'Cordis removed every registered effect.'
        : ['unloading', 'pending'].includes(plugin.phase)
          ? `Plugin needs attention: it is ${plugin.phase}.`
          : 'No cleanup problem is currently visible.'
  const groups = plugin.effectSummary.length === 0
    ? ['- No registered effects']
    : plugin.effectSummary.map(group => `- ${group.name}: ${group.count}`)
  const lines = [
    `Lifecycle report: ${plugin.id}`,
    `Status: ${plugin.phase}`,
    `Assessment: ${assessment}`,
    `Registered effects: ${plugin.effectCount}`,
    '',
    'What Cordis is managing',
    ...groups,
    '',
    'Coverage',
    'These registrations can be tracked during unload. External resources created outside Cordis effects cannot be verified.',
  ]
  if (verbose && plugin.effects.length > 0) lines.push('', 'Effect details', ...plugin.effects.map(effect => `${'  '.repeat(effect.depth)}- ${effect.label}`))
  else if (plugin.effects.length > 0) lines.push('', `Use /lifecycle inspect ${plugin.configId ?? plugin.moduleName} --verbose to show exact effect names.`)
  return lines.join('\n')
}

export function apply(ctx, config = {}) {
  const inspector = new LifecycleInspector(ctx.loader, config)
  ctx.on('internal/status', (fiber, oldState) => inspector.observe(fiber, oldState), { global: true })

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: REPORT_ENDPOINT,
      handler: (req, res) => writeReportResponse(req, res, inspector),
    }), 'lifecycle-inspector: report route')
  })

  ctx.commands.register({
    name: 'lifecycle',
    description: 'Inspect plugin Fiber phases, live Effects, and teardown observations',
    input: { hint: '[list [--verbose]|inspect <plugin-id> [--verbose]]' },
    handler(invocation) {
      const parts = invocation.rawInput.trim().split(/\s+/u).filter(Boolean)
      const action = parts.shift() ?? 'list'
      const verbose = parts.includes('--verbose')
      const target = parts.filter(part => part !== '--verbose').join(' ')
      if (action === 'list') return { kind: 'success', text: renderOverview(inspector.overview(), verbose) }
      if (action === 'inspect' && target.length > 0) {
        const report = inspector.report(target)
        return report === undefined
          ? { kind: 'error', text: `Plugin ${target} was not found.` }
          : { kind: 'success', text: renderReport(report, verbose) }
      }
      return { kind: 'error', text: 'Usage: /lifecycle [list [--verbose]|inspect <plugin-id> [--verbose]]' }
    },
  })

  ctx.tools.register(defineTool({
    name: 'lifecycle_inspect',
    description: 'Read DSH plugin lifecycle phases and Cordis-managed live effects. This diagnoses registered cleanup only and cannot prove the absence of unregistered external resources.',
    parameters: { plugin: { type: 'string', description: 'Optional exact loader entry id or module name.' } },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{
        type: 'text',
        text: value.error ?? (value.plugins === undefined ? renderReport(value) : renderOverview(inspector.overview())),
      }],
    },
    execute(args) {
      if (args.plugin) return inspector.report(args.plugin) ?? { error: `Plugin ${args.plugin} was not found.` }
      return { plugins: inspector.list() }
    },
  }))
}
