# DSH Lifecycle Inspector

用于诊断 DeepSeek Harness 插件生命周期、活动 Cordis Effect 和卸载结果。

```sh
dsh plugin --profile web add github:Rex16200513/dsh-lifecycle-inspector
```

使用 `/lifecycle list`、`/lifecycle inspect <plugin-id>`，或只读模型工具 `lifecycle_inspect`。

首版展示 Fiber 状态、嵌套 Effect 标签和观测到的卸载耗时。Effect 树清空只证明 Cordis 管理的 disposer 已完成，不能证明插件没有创建未登记的进程、定时器、Socket 或 Watcher。外部资源探针将在后续版本作为独立 Provider seam 实现。

需要 Node.js `^22.19.0 || >=24.0.0`。MIT License。
