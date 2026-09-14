window.__ModuleLoader__.load({
  id: 'dsh-lifecycle-inspector',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')

    const NS = 'settings.lifecycleInspector'
    const ENDPOINT = '/lifecycle-inspector/report'
    const zh = {
      tab: '生命周期', loading: '正在检查插件…', error: '暂时无法读取生命周期报告。', retry: '重试',
      refresh: '刷新', title: '生命周期健康度', healthy: '正常', inactive: '已停用', attention: '需关注',
      all: '全部', problems: '仅看问题', search: '搜索插件', noMatch: '没有匹配的插件。',
      effects: '个已登记 Effect', managed: 'Cordis 正在管理', details: '底层 Effect', coverage: '检查范围',
      coverageText: '可验证 Cordis 登记的清理项；插件自行创建且未登记的外部资源无法验证。',
      active: '运行中', disabled: '已停用', pending: '等待依赖', loadingPhase: '加载中', failed: '加载失败',
      unloading: '卸载中', disposed: '已卸载', unmounted: '未挂载',
    }
    const en = {
      tab: 'Lifecycle', loading: 'Inspecting plugins…', error: 'Lifecycle report is temporarily unavailable.', retry: 'Retry',
      refresh: 'Refresh', title: 'Lifecycle health', healthy: 'Healthy', inactive: 'Inactive', attention: 'Attention',
      all: 'All', problems: 'Problems only', search: 'Search plugins', noMatch: 'No matching plugins.',
      effects: 'registered Effects', managed: 'Managed by Cordis', details: 'Raw Effects', coverage: 'Coverage',
      coverageText: 'Cordis-registered cleanup can be verified. External resources created without registration cannot be verified.',
      active: 'Active', disabled: 'Disabled', pending: 'Waiting', loadingPhase: 'Loading', failed: 'Failed',
      unloading: 'Unloading', disposed: 'Disposed', unmounted: 'Unmounted',
    }

    const css = `
      .li-root{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);max-width:840px}.li-toolbar,.li-summary,.li-card-head,.li-meta{display:flex;align-items:center}.li-toolbar{gap:10px}.li-search{flex:1;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 12px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit}.li-button,.li-filter{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 12px;background:var(--dsw-alias-bg-layer-3);color:inherit;font:inherit;cursor:pointer}.li-filter[data-active=true]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.li-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.li-stat{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:14px;background:var(--dsw-alias-bg-layer-3)}.li-stat strong{display:block;font-size:24px;line-height:30px}.li-stat span{font-size:12px;color:var(--dsw-alias-label-tertiary)}.li-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}.li-card{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);overflow:hidden}.li-card-head{width:100%;justify-content:space-between;gap:12px;border:0;padding:12px 14px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}.li-card-head:hover{background:var(--dsw-alias-interactive-bg-hover)}.li-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.li-meta{gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12px;white-space:nowrap}.li-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.li-dot[data-phase=active]{background:var(--dsw-alias-state-success-primary)}.li-dot[data-phase=failed]{background:var(--dsw-alias-state-error-primary)}.li-dot[data-phase=pending],.li-dot[data-phase=unloading]{background:var(--dsw-alias-state-business-primary)}.li-body{border-top:1px solid var(--dsw-alias-border-l2);padding:12px 14px;background:var(--dsw-alias-bg-module-platform)}.li-groups{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 14px}.li-chip{border-radius:6px;padding:4px 8px;background:var(--dsw-alias-bg-layer-1);font-size:12px}.li-effects{margin:7px 0 14px;padding-left:20px;color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code);font-size:12px}.li-note,.li-state{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}.li-heading{margin:0;font-size:13px}.li-error{color:var(--dsw-alias-state-error-primary)}@media(max-width:680px){.li-summary{grid-template-columns:1fr}.li-toolbar{flex-wrap:wrap}.li-search{flex-basis:100%}}
    `

    function LifecycleDashboard({ t }) {
      const [state, setState] = React.useState({ status: 'loading' })
      const [query, setQuery] = React.useState('')
      const [problemsOnly, setProblemsOnly] = React.useState(false)
      const [expanded, setExpanded] = React.useState(null)
      const load = React.useCallback(() => {
        setState({ status: 'loading' })
        fetch(ENDPOINT, { headers: { accept: 'application/json' } }).then(response => {
          if (!response.ok) throw new Error(String(response.status))
          return response.json()
        }).then(data => setState({ status: 'ready', data }), () => setState({ status: 'error' }))
      }, [])
      React.useEffect(load, [load])
      if (state.status === 'loading') return React.createElement('p', { className: 'li-state' }, t('loading'))
      if (state.status === 'error') return React.createElement('div', { className: 'li-root li-error' },
        React.createElement('p', null, t('error')), React.createElement('button', { className: 'li-button', onClick: load }, t('retry')))
      const data = state.data
      const attention = new Set(['failed', 'pending', 'unloading'])
      const normalized = query.trim().toLocaleLowerCase()
      const plugins = data.plugins.filter(plugin => (!problemsOnly || attention.has(plugin.phase))
        && (plugin.id.toLocaleLowerCase().includes(normalized) || plugin.moduleName.toLocaleLowerCase().includes(normalized)))
      const phaseLabel = phase => t(phase === 'loading' ? 'loadingPhase' : phase)
      return React.createElement('div', { className: 'li-root' },
        React.createElement('div', { className: 'li-summary' },
          React.createElement('div', { className: 'li-stat' }, React.createElement('strong', null, data.phases.active), React.createElement('span', null, t('healthy'))),
          React.createElement('div', { className: 'li-stat' }, React.createElement('strong', null, data.phases.disabled + data.phases.disposed + data.phases.unmounted), React.createElement('span', null, t('inactive'))),
          React.createElement('div', { className: 'li-stat' }, React.createElement('strong', null, data.attention.length), React.createElement('span', null, t('attention')))),
        React.createElement('div', { className: 'li-toolbar' },
          React.createElement('input', { className: 'li-search', type: 'search', value: query, placeholder: t('search'), 'aria-label': t('search'), onChange: event => setQuery(event.currentTarget.value) }),
          React.createElement('button', { className: 'li-filter', 'data-active': problemsOnly, onClick: () => setProblemsOnly(value => !value) }, problemsOnly ? t('problems') : t('all')),
          React.createElement('button', { className: 'li-button', onClick: load }, t('refresh'))),
        plugins.length === 0 ? React.createElement('p', { className: 'li-state' }, t('noMatch')) : React.createElement('ul', { className: 'li-list' }, plugins.map(plugin => {
          const open = expanded === plugin.id
          return React.createElement('li', { className: 'li-card', key: plugin.id },
            React.createElement('button', { className: 'li-card-head', 'aria-expanded': open, onClick: () => setExpanded(open ? null : plugin.id) },
              React.createElement('strong', { className: 'li-name' }, plugin.configId || plugin.moduleName),
              React.createElement('span', { className: 'li-meta' }, React.createElement('span', { className: 'li-dot', 'data-phase': plugin.phase }), phaseLabel(plugin.phase), ` · ${plugin.effectCount} ${t('effects')}`)),
            open ? React.createElement('div', { className: 'li-body' },
              React.createElement('h3', { className: 'li-heading' }, t('managed')),
              React.createElement('div', { className: 'li-groups' }, plugin.effectSummary.length === 0 ? React.createElement('span', { className: 'li-chip' }, '0') : plugin.effectSummary.map(group => React.createElement('span', { className: 'li-chip', key: group.name }, `${group.name} · ${group.count}`))),
              plugin.effects.length > 0 ? React.createElement(React.Fragment, null, React.createElement('h3', { className: 'li-heading' }, t('details')), React.createElement('ul', { className: 'li-effects' }, plugin.effects.map((effect, index) => React.createElement('li', { key: `${effect.label}-${index}` }, effect.label)))) : null,
              React.createElement('h3', { className: 'li-heading' }, t('coverage')),
              React.createElement('p', { className: 'li-note' }, t('coverageText'))) : null)
        })))
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-lifecycle-inspector'
        tag.textContent = css
        document.head.appendChild(tag)
        return () => tag.remove()
      }, 'lifecycle-inspector: styles')
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'lifecycle-inspector: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab', id: 'lifecycle', order: 20, label: () => t('tab'), locale: NS,
        inject: () => ({}),
      }, props => React.createElement(LifecycleDashboard, { ...props, t })))
    }
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
