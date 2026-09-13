# DSH Lifecycle Inspector

Diagnose plugin lifecycle state, live Cordis Effects, and teardown outcomes in DeepSeek Harness.

```sh
dsh plugin --profile web add github:Rex16200513/dsh-lifecycle-inspector
```

Use `/lifecycle list`, `/lifecycle inspect <plugin-id>`, or the read-only `lifecycle_inspect` model tool. Inspection accepts a loader path, configured entry id, full package name, or the package name without its `dsh-` prefix.

The first release reports Fiber phases, nested Effect labels, and observed teardown duration. A cleared Effect tree proves only that Cordis-managed disposers completed; it does not prove that a plugin created no unregistered process, timer, socket, or watcher. External resource probes are planned as a separate provider seam.

Requires Node.js `^22.19.0 || >=24.0.0`. MIT License.
