# DSH Lifecycle Inspector

**专为 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)设计的生命周期诊断插件：看清每个插件管理了什么、发现异常 Fiber 状态，并确认 Cordis 管理的资源是否完成清理，无需阅读底层运行时输出。**

[English](README.md) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [反馈问题](https://github.com/Rex16200513/dsh-lifecycle-inspector/issues)

> 这是一个专为 DSH 构建的独立社区插件。它遵循 DSH 的插件优先架构，只观察现有 Cordis 生命周期，不修改 Agent Loop。

## 为什么需要它？

DSH 将注册项作为 Effect 管理，使它们可以随所属插件一起卸载。但插件加载失败、长期处于 Pending、卸载缓慢或疑似遗留资源时，仅靠底层输出很难判断实际情况。

Lifecycle Inspector 将这些内部状态转换成易读的可视化面板和诊断命令，帮助插件用户回答三个实际问题：

- 哪些插件正在运行、已停用或需要关注？
- 一个插件当前注册了哪些服务、事件监听器、命令、工具和子插件？
- Cordis 是否完成了其管理范围内的 Effect 清理，观测到的卸载用了多长时间？

## 功能

- **原生 DSH Web 面板：**在**设置 → 插件 → 生命周期**中提供健康统计、搜索、仅看问题、刷新和可展开的 Effect 详情。
- **易读的生命周期报告：**将底层 Effect 标签归类为服务、事件监听器、命令与工具、子插件和清理敏感资源。
- **Fiber 健康信号：**突出显示 Failed、Pending 和 Unloading 插件，并区分 Active、Disabled、Disposed 和 Unmounted 状态。
- **卸载观测：**记录近期 Fiber 状态变化，并标记超过可配置阈值的清理过程。
- **Agent 可调用诊断：**除 `/lifecycle` 命令外，还提供只读的 `lifecycle_inspect` 工具。
- **自身也遵守生命周期：**命令、工具、事件监听、HTTP 路由、本地化、样式和 UI 插槽均作为可撤销 Effect 注册。
- **双语界面与文档：**跟随 DSH 当前语言，支持中文和英文。

## 安装

需要 DSH Web Profile，以及 Node.js `^22.19.0 || >=24.0.0`。

```sh
dsh plugin --profile web add github:Rex16200513/dsh-lifecycle-inspector
```

安装后重启 DSH Web 进程，然后打开**设置 → 插件 → 生命周期**。

## 通过命令或 Agent 使用

```text
/lifecycle list
/lifecycle list --verbose
/lifecycle inspect lifecycle-inspector
/lifecycle inspect <plugin-id> --verbose
```

`/lifecycle list` 返回简短的健康摘要。`inspect` 支持 Loader 路径、配置条目 ID、完整包名，以及省略 `dsh-` 前缀的包名。只有需要查看准确 Effect 标签时才添加 `--verbose`。

Agent 可以调用只读工具 `lifecycle_inspect`，并按需传入 `plugin` 参数。该工具只观察运行时状态，不会卸载或修改插件。

## 配置

仓库内置的 DSH Patch 使用以下默认配置安装插件：

```yaml
- insert:
    - id: lifecycle-inspector
      name: dsh-lifecycle-inspector
      config:
        slowTeardownMs: 2000
        historyLimit: 100
```

- `slowTeardownMs`：观测到的卸载时间超过该值时报告为缓慢。
- `historyLimit`：限制保存在内存中的 Fiber 状态变化数量。

## 诊断结果能证明什么？

Effect 树清空代表 Cordis 已完成该树中注册的所有 Disposer。它**不能**证明插件没有绕过 Cordis Effect 创建进程、定时器、Socket、Watcher 或其他资源。Lifecycle Inspector 会在用户报告和模型工具说明中明确展示这个限制，避免将正常结果误解为完整的外部资源审计。

外部资源探针适合作为后续扩展，但应保持为独立 Provider；核心检查器继续只读，并以 Cordis 的权威状态为依据。

## 为什么符合 DSH 架构？

Lifecycle Inspector 本身是插件，而不是对 DSH Agent Loop 的修改。它通过 DSH 和 Cordis 扩展点注册命令、工具、Web UI、HTTP 报告、本地化、生命周期事件和清理逻辑。因此它可以独立安装、卸载和演进，同时遵守并展示它所检查的 Effect 所有权规则。

## 参与贡献

欢迎通过 [GitHub Issues](https://github.com/Rex16200513/dsh-lifecycle-inspector/issues)反馈缺陷或提出聚焦的功能建议。报告生命周期问题时，请附上 DSH 版本、插件 ID、观测到的状态，以及相关资源是否通过 `ctx.effect()` 或 `ctx.on()` 注册。

MIT License。
