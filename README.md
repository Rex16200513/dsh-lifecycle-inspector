# DSH Lifecycle Inspector

**Lifecycle diagnostics for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness): see what each plugin owns, spot unhealthy Fiber states, and verify Cordis-managed cleanup without reading raw runtime output.**

[中文说明](README.zh.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Report an issue](https://github.com/Rex16200513/dsh-lifecycle-inspector/issues)

> This is an independent community plugin built specifically for DSH. It follows DSH's plugin-first architecture and observes the existing Cordis lifecycle instead of modifying the agent loop.

## Why use it?

DSH treats registrations as Effects so they can be disposed with their owning plugin. That lifecycle is powerful, but it is difficult to inspect when a plugin fails to load, remains pending, unloads slowly, or appears to leave resources behind.

Lifecycle Inspector turns that internal state into an operator-friendly dashboard and concise diagnostic commands. It helps plugin users answer three practical questions:

- Which plugins are active, inactive, or need attention?
- What services, event listeners, commands, tools, and child plugins does a plugin currently register?
- Did Cordis finish disposing the Effects it manages, and how long did the observed teardown take?

## Features

- **Native DSH Web dashboard:** health totals, search, problem-only filtering, refresh, and expandable Effect details under **Settings → Plugins → Lifecycle**.
- **Readable lifecycle reports:** groups low-level Effect labels into services, event listeners, commands and tools, child plugins, and cleanup-sensitive resources.
- **Fiber health signals:** highlights failed, pending, and unloading plugins and distinguishes active, disabled, disposed, and unmounted entries.
- **Teardown observations:** records recent Fiber transitions and flags cleanup that exceeds the configurable threshold.
- **Agent-accessible diagnostics:** exposes the read-only `lifecycle_inspect` tool alongside `/lifecycle` commands.
- **Lifecycle-safe implementation:** its command, tool, event listener, HTTP route, locale, styles, and UI slot are themselves registered as disposable Effects.
- **Bilingual UI and documentation:** follows the active DSH locale and supports English and Chinese.

## Install

Requirements: DSH Web profile and Node.js `^22.19.0 || >=24.0.0`.

```sh
dsh plugin --profile web add github:Rex16200513/dsh-lifecycle-inspector
```

Restart the DSH Web process after installation, then open **Settings → Plugins → Lifecycle**.

## Use it from commands or an agent

```text
/lifecycle list
/lifecycle list --verbose
/lifecycle inspect lifecycle-inspector
/lifecycle inspect <plugin-id> --verbose
```

`/lifecycle list` gives a short health summary. `inspect` accepts a loader path, configured entry ID, full package name, or package name without the `dsh-` prefix. Add `--verbose` only when exact Effect labels are useful.

Agents can call the read-only `lifecycle_inspect` tool with an optional `plugin` argument. The tool observes runtime state and does not unload or mutate plugins.

## Configuration

The included DSH patch installs the plugin with these defaults:

```yaml
- insert:
    - id: lifecycle-inspector
      name: dsh-lifecycle-inspector
      config:
        slowTeardownMs: 2000
        historyLimit: 100
```

- `slowTeardownMs` controls when an observed teardown is reported as slow.
- `historyLimit` limits retained in-memory Fiber transitions.

## What the result proves

A cleared Effect tree means Cordis completed every disposer registered in that tree. It does **not** prove that the plugin created no process, timer, socket, watcher, or other resource outside Cordis Effects. Lifecycle Inspector states this limit in both its human reports and model-tool description so a clean result is not mistaken for a complete external-resource audit.

External resource probes are a natural future extension, but they should remain separate providers: the core inspector stays read-only and reports authoritative Cordis state.

## DSH architecture fit

Lifecycle Inspector is intentionally a plugin, not a change to DSH's agent loop. It uses DSH and Cordis extension points for commands, tools, Web UI, HTTP reporting, localization, lifecycle events, and cleanup. This keeps the feature installable, removable, and independently evolvable while demonstrating the same Effect ownership rules it helps users inspect.

## Contributing

Bug reports and focused feature proposals are welcome in [GitHub Issues](https://github.com/Rex16200513/dsh-lifecycle-inspector/issues). When reporting a lifecycle problem, include the affected DSH version, plugin ID, observed phase, and whether the resource was registered through `ctx.effect()` or `ctx.on()`.

MIT License.
