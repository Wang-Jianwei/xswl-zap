# xswl-zap-vna — 开发计划（AI Agent 执行版 v2.0）

> 目标：本项目由 AI Agent 主导开发，建立“可持续迭代、可验证、可回滚”的执行体系。

---

## 1. 执行总则

- **契约先于实现**：先定 proto/header/schema，再写实现。
- **测试先于合并**：每个任务至少包含单测；跨模块改动必须含集成测试。
- **小任务闭环**：每个任务一个明确验收标准（DoD）。
- **文档同步更新**：架构、UI、计划文档与代码同次提交更新。
- **失败可恢复**：关键能力支持开关、降级和回滚。
- **预发布不保兼容**：在产品正式发布前，不为旧接口/旧结构保留兼容层；优先选择简洁实现，及时删除废弃代码，避免代码库冗余。

> 说明：该策略仅适用于“未正式发布阶段”。进入 GA（正式发布）后，接口演进需切换为兼容优先策略。

### 1.1 本机环境约束（开发/CI）

- **可执行文件命名**：当前环境要求所有编译生成的 `.exe` 必须以 `easy` 开头才能运行；因此本项目新增可执行目标时必须设置 `OUTPUT_NAME` 为 `easy_*`。

关联文档：

- `vna/ai-engineering-framework.md`
- `vna/framework.md`
- `vna/framework-ui.md`
- `vna/architecture-feasibility-assessment.md`

---

## 2. AI 角色与职责

| 角色 | 主要输出 | 约束 |
|------|----------|------|
| 架构 Agent | ADR、接口边界、风险评审 | 不直接改业务实现 |
| 合约 Agent | proto/schema/header | 兼容性优先 |
| 实现 Agent | core/service/drivers/plugins/apps | 必带测试 |
| 测试 Agent | 单测/集成/E2E/基准 | 不改业务逻辑 |
| 文档 Agent | 设计文档、迁移指南、运行手册 | 与代码版本一致 |

---

## 3. 阶段计划（按 AI 任务拆分）

### Phase 0（2 周）— 合约与骨架

**目标**：搭建可并行开发基础，打通最小链路。

| 任务ID | 内容 | 产出 |
| P0.2 | 生成 C++/TS stub | `generated/cpp`, `generated/ts` |
| P0.3 | 建立 mock service（含时域 mock） | `src/service/mock_server.cpp` |
| P0.5 | 硬件抽象接口与驱动工厂 | `include/core/hardware_driver.h`, `src/core/hardware_driver_factory.*` |
| P0.6 | PXI/USB mock driver | `src/drivers/pxi_driver.*`, `src/drivers/usb_vna_driver.*` |


### Phase 1（4-6 周）— Core 能力稳定

**目标**：形成可测试、可复用的 `vna-core-lib`。
|--------|------|------|
| P1.1 | TopologyManager 实现与验证 | `src/core/topology_manager.*` |
| P1.2 | HardwareCoordinator（基于 driver 抽象） | `src/core/hardware_coordinator.*` |
| P1.3 | MeasurementPipeline（频域+时域路由） | `src/core/measurement_pipeline.*` |
| P1.4 | CalibrationSession 与 CalibrationDB | `src/core/calibration_session.*` |
| P1.5 | PluginManager（依赖解析/生命周期） | `src/core/plugin_manager.*` |

**里程碑 M1**：`vna-core-lib` 稳定，单测覆盖率 ≥ 80%。
---

**目标**：形成可部署后端服务。

| P2.2 | ResourceBrokerService | `src/service/resource_broker_service.*` |
| P2.3 | 进程管理与健康检查 | `src/service/process_manager.*` |
| P2.4 | 配置加载（端口/TLS/日志） | `config/service.yaml` |
| P2.5 | 集成测试（协议与资源流） | `tests/integration/*` |

---

### Phase 3A（4-6 周）— Qt 客户端闭环

**目标**：完成操作员向 UI 的完整流程。
- 与 gRPC 后端联调
- UI 回归测试
**里程碑 M3A**：Qt UI 可完成“拓扑配置 → 测量 → 结果显示 → 保存”。

### Phase 3B（4-6 周）— VS Code 扩展闭环

- 与 Envoy + gRPC 后端联调
- Extension 测试与打包

**里程碑 M3B**：VS Code 扩展可执行基本测量流程并回显结果。

---

### Phase 4（2 周）— 发布与运营

- E2E 集成测试
- 安装包与 VSIX 打包
- 用户文档/API 文档/发布说明

**里程碑 M4**：v1.0 对外发布。

---

## 4. AI Work Unit 模板（必须遵循）

```markdown
WU-<ID>: <Title>
- Objective:
- Scope (in/out):
- Files to change:
- Contract impact:
- Test plan:
- Rollback plan:
- Risks:
- Acceptance criteria:
```

建议每个 WU 控制在 1~3 天内闭环。

### 4.1 WU 完成收尾步骤（必须）

每次 WU 达到 Acceptance criteria 后，必须在同一轮收尾中完成以下动作：

1. 更新 `vna/development-plan.md` 中该 WU 的 `Status` 与 `Validation result`
2. 提交对应的 Git 记录（默认一个 WU 一个独立 commit；简单 WU 可合并批量提交）
3. 在最终说明中给出本次 commit hash 与测试结果摘要

### 4.2 简单 WU 合并提交规则（允许）

满足以下条件的 WU，可合并为一次提交：

- 仅文档/脚本轻量改动，不涉及 proto/公共接口/核心业务逻辑
- 变更文件少且彼此同主题（建议不超过 3 个 WU）
- 可在一组测试命令中完成共同验证

合并提交时必须满足：

1. 在 commit message 中标注 WU 范围（如 `WU-MAINLINE-014~016`）
2. 在 `development-plan.md` 中分别更新每个 WU 的 `Status` 和 `Validation result`
3. 在最终说明中列出“每个 WU -> 对应验证结果”映射

建议 commit 信息格式：

- `feat(wu): complete WU-MAINLINE-013 smoke report timestamp placeholder`
- `fix(wu): complete WU-MAINLINE-011 smoke timeout protection`
- `docs(wu): complete WU-MAINLINE-012 json report output docs`
- `chore(wu): complete WU-MAINLINE-014~016 smoke report refinements`

---

## 5. 质量门禁（CI + 人工审查）

### 5.1 CI 门禁

1. `build`：编译通过
2. `test`：单测 + 集成测试
3. `docs-check`：涉及接口/架构改动时，文档必须更新

### 5.2 合并门禁

- 至少 1 个 reviewer（可为人或受控 Agent）
- PR 必须附测试证据与风险说明
- 禁止“无测试的功能提交”

---

## 6. 里程碑验收标准（Definition of Done）

| 里程碑 | 验收标准 |
|--------|----------|
| M0 | Mock + 合约稳定；前端可联调 |
| M1 | Core 稳定；覆盖率达标；关键错误可恢复 |
| M2 | 服务可部署；集成测试通过 |
| M3A | Qt 闭环可用；核心交互延迟可接受 |
| M3B | VS Code 闭环可用；脚本化可执行 |
| M4 | 发布物可安装、可运行、可回滚 |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| 硬件能力不达预期 | 阻塞 TDR/IP3 等高级功能 | 先抽象驱动接口 + 能力探测 + 降级路径 |
| 多板卡同步不稳定 | 测量误差 | 触发链验证 + 运行时监测 + 延迟补偿 |
| Agent 输出漂移 | 质量不一致 | 严格执行 `copilot-instructions.md` + PR 模板 |
| 长任务性能不足 | 用户体验差 | 并行调度 + 流式缓冲 + 可取消机制 |

---

## 8. 近期执行清单（未来 2 周）

- [x] 完成 `VnaControlService` 拓扑结构化错误返回（便于后续 RPC 错误映射）
- [x] 完成 `ResourceBrokerService` 最小实现（Acquire/Renew/Release + easy 单测）
- [x] 完成 `ProcessManager` 最小健康检查实现（ready/degraded + uptime + easy 单测）
- [x] 完成 `service.yaml` 最小配置加载（端口/TLS/日志级别 + easy 单测）
- [x] 完成 `tests/integration/service_flow_integration_test.cpp`（协议与资源流最小集成回归）
- [x] 完成 `ServiceStatusService` 查询接口（健康+配置+运行指标聚合 + easy 单测）
- [x] 完成 `proto/vna.proto` 的 `GetServiceStatus` 契约扩展（服务状态对外接口化）
- [x] 完成 `VnaControlInProcessHandler`（GetServiceStatus -> ServiceStatusService 映射 + easy 单测）
- [x] 完成 `VnaControlGrpcService` unary 适配骨架（`ValidateTopology` + `GetServiceStatus`，默认可选编译）
- [x] 建立 `grpc-mingw64` 隔离构建通道（`build-grpc/` + `scripts/build_grpc_adapter.ps1`）
- [x] 完成最小 gRPC server 启动入口（`easy_grpc_server`，支持 `ValidateTopology/GetServiceStatus`）
- [x] 完成最小 gRPC client smoke（`easy_grpc_client_smoke`，验证 `GetServiceStatus/ValidateTopology` 端到端 unary）
- [x] 完成 `Acquire` unary gRPC 适配与 smoke 验证（`inst0` 默认实例）
- [x] 完成 `StreamAcquisition` 持续 server-streaming（直到客户端取消）与 stream smoke 验证
- [x] 完成 `StreamAcquisition` 节流参数配置化（`service.yaml`：`stream_throttle_every_n_frames`/`stream_throttle_ms`）
- [x] 完成 gRPC 节流矩阵 smoke 脚本（自动切换配置并执行 unary + stream 回归）
- [x] 建立 `docs/specs`、`docs/adr` 目录与模板
- [x] 完成 `proto/vna.proto` v0（含 `ValidationResult.error_details` 结构化错误）
- [x] 生成 C++/TS stub 并纳入构建（`scripts/generate_proto.ps1` + `vna_generate_proto`）
- [x] 完成 mock service 与最小联调
- [x] 完成 `HardwareDriver` 与 2 个 mock driver
- [x] 提交首批核心单测与 CI 门禁
- [x] 完成 VS Code 插件 MVP 骨架（命令：`XSWL: Get Service Status` + TypeScript 构建与最小单测）
- [x] 完成 VS Code 插件 MVP-2（命令：`XSWL: Acquire Once` + 最小结果摘要）
- [x] 完成 VS Code 插件 MVP-3（命令：`XSWL: Stream Preview` + 可取消帧计数摘要）
- [x] 完成 gRPC server 启动稳健性改进（配置路径候选加载 + 启动诊断增强）
- [x] 完成服务状态并发安全改造（`ProcessManager/ServiceStatusService` 加锁 + 并发回归测试）
- [x] 完成主线构建与回归验证（`cmake --build --preset ninja-mingw` + `scripts/run_easy_tests.ps1` 全通过）
- [x] 完成 ServiceStatus 可观测性字段结构化增强（内部字段拆分 + 兼容 message 映射 + 回归通过）
- [x] 完成 `GetServiceStatus` 契约结构化扩展（新增 `bootstrap_mode/config_path` + 插件优先读取 + 回归通过）
- [x] 完成 gRPC smoke 对 `ServiceStatus` 新字段回归校验（矩阵场景全通过）
- [x] 完成 `GetServiceStatus` 插件显示去歧义与回归（结构化优先 + legacy 兜底）
- [x] 完成 `GetServiceStatus` 服务端行为契约化快照测试（组合映射断言 + 回归通过）
- [x] 完成 gRPC `GetServiceStatus` 服务层映射单测（新增独立测试目标并通过）

### 8.1 已完成 Work Unit（归档）

WU-VSCODE-002: VS Code 插件 Acquire Once 命令

- Objective: 在扩展中提供最小 `Acquire` 联调入口，支持输入实例与采样点，回显帧摘要。
- Scope (in/out):
  - in: 命令注册、gRPC `Acquire` 调用、最小结果格式化、单测。
  - out: webview 图形渲染、流式采集 UI、历史记录持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/statusFormatter.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/test/statusFormatter.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
- Contract impact: 无（复用已有 `vna.proto` 的 `Acquire` RPC）。
- Test plan: `cd vna/tools/vscode-extension && npm run test`。
- Rollback plan: 回滚上述扩展目录文件变更并移除命令贡献项。
- Risks: 后端未就绪或参数不完整会返回 gRPC 错误，需在 UI 给出明确提示。
- Acceptance criteria:
  - 命令面板可执行 `XSWL: Acquire Once`。
  - 成功时显示 instanceId / timestamp / frame 类型与点数摘要。
  - 失败时显示可读错误信息。
  - TypeScript 构建与最小单测通过。

WU-VSCODE-003: VS Code 插件 StreamAcquisition 预览命令

- Objective: 在扩展中提供最小 `StreamAcquisition` 预览入口，支持用户取消并回显帧计数摘要。
- Scope (in/out):
  - in: 命令注册、gRPC `StreamAcquisition` 调用、取消控制、最小摘要格式化、单测。
  - out: 波形图渲染、频谱图、历史缓存、导出。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/statusFormatter.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/test/statusFormatter.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
- Contract impact: 无（复用已有 `vna.proto` 的 `StreamAcquisition` RPC）。
- Test plan: `cd vna/tools/vscode-extension && npm run test`。
- Rollback plan: 回滚扩展目录对应文件改动并移除命令贡献项。
- Risks: 流式请求可能因后端状态或网络中断提前结束；取消动作需避免误报错误。
- Acceptance criteria:
  - 命令面板可执行 `XSWL: Stream Preview`。
  - 运行中可取消，取消后命令正常结束。
  - 结束后显示 frameCount / latestTimestamp / lastFrameType / lastPointCount 摘要。
  - TypeScript 构建与最小单测通过。

WU-MAINLINE-001: gRPC server 启动稳健性改进

- Objective: 解决 `easy_grpc_server.exe` 在不同工作目录下启动失败且诊断不足的问题。
- Scope (in/out):
  - in: 增加配置文件候选路径解析、启动失败错误输出增强、最小单测。
  - out: TLS 启用实现、端口自动切换策略、服务自恢复守护进程。
- Files to change:
  - `vna/src/service/grpc/grpc_server_main.cpp`
  - `vna/src/service/grpc/grpc_bootstrap_paths.cpp`
  - `vna/include/service/grpc/grpc_bootstrap_paths.h`
  - `vna/tests/core/grpc_bootstrap_paths_test.cpp`
  - `vna/CMakeLists.txt`
  - `vna/scripts/run_easy_tests.ps1`
- Contract impact: 无（不改动 proto 或公共 RPC 接口）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚上述文件并恢复 gRPC server 原始单路径配置加载逻辑。
- Risks: 候选路径策略错误可能导致加载到非预期配置文件。
- Acceptance criteria:
  - `easy_grpc_server.exe` 在仓库根目录和 `vna` 目录均可加载配置并启动。
  - 配置加载失败时输出所有候选路径和对应错误。
  - 新增单测通过且不影响现有 easy tests。

WU-MAINLINE-002: 服务状态并发安全改造

- Objective: 消除并发访问 `ProcessManager` 与 `ServiceStatusService` 的数据竞争风险，提升 gRPC 多请求场景稳定性。
- Scope (in/out):
  - in: 两个服务类的互斥保护、并发回归测试、测试脚本接线。
  - out: 引入读写锁、跨进程共享状态、指标系统重构。
- Files to change:
  - `vna/include/service/process_manager.h`
  - `vna/src/service/process_manager.cpp`
  - `vna/include/service/service_status_service.h`
  - `vna/src/service/service_status_service.cpp`
  - `vna/tests/core/service_status_concurrency_test.cpp`
  - `vna/CMakeLists.txt`
  - `vna/scripts/run_easy_tests.ps1`
- Contract impact: 无（不改动 proto 或公开接口）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚上述文件，移除并发测试目标并恢复原有实现。
- Risks: 锁粒度设计不当可能影响极端高频状态读取吞吐。
- Acceptance criteria:
  - 状态更新/读取在并发执行时无数据竞争。
  - 新增并发回归测试可执行并纳入 easy tests。
  - 不改变现有服务状态字段语义。

### 8.2 当前 Work Unit

WU-MAINLINE-003: ServiceStatus 可观测性字段结构化增强（内部）

- Objective: 在不修改 proto 契约前提下，提升服务内部状态快照的结构化可读性，减少通过 message 拼接解析带来的歧义。
- Scope (in/out):
  - in: `ServiceStatusSnapshot` 内部字段扩展（如启动来源/配置路径分离）、状态组装逻辑与单测更新。
  - out: 修改 `proto/vna.proto`、变更现有 RPC 返回字段、插件 UI 改版。
- Files to change:
  - `vna/include/service/service_status_service.h`
  - `vna/src/service/service_status_service.cpp`
  - `vna/src/service/grpc/grpc_server_main.cpp`
  - `vna/tests/core/service_status_service_test.cpp`
  - `vna/tests/core/vna_control_inproc_handler_test.cpp`
- Contract impact: 无（仅内部结构与组装逻辑调整，外部契约保持不变）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚上述文件并恢复 message 拼接方案。
- Risks: 内部字段改名或映射不当可能导致状态文本回退或缺失。
- Acceptance criteria:
  - 不破坏现有 `GetServiceStatus` 对外字段语义。
  - 状态信息来源清晰，减少 message 语义重载。
  - 相关 easy 测试全部通过。

### 8.3 已完成 Work Unit（最新）

WU-MAINLINE-004: `GetServiceStatus` 契约结构化扩展（Pre-GA）

- Objective: 将 `configPath/bootstrapMode` 从 message 字符串中解耦到明确 proto 字段，降低客户端解析歧义。
- Scope (in/out):
  - in: 更新 `proto/vna.proto`、服务端映射、插件客户端解析与最小回归测试。
  - out: 大规模 UI 重构、历史兼容层双轨保留（遵循 Pre-GA 简化原则）。
- Files to change:
  - `vna/proto/vna.proto`
  - `vna/src/service/vna_control_inproc_handler.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/statusFormatter.ts`
  - `vna/tests/core/vna_control_inproc_handler_test.cpp`
  - `vna/tools/vscode-extension/test/statusFormatter.test.ts`
- Contract impact: 有（新增 ServiceStatus 字段，需重新生成并同步 C++/TS stub）。
- Test plan:
  - `vna/scripts/generate_proto.ps1`
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 proto 与映射改动，恢复 message 兼容解析路径。
- Risks: proto 变更若未同步插件端，会导致字段读取回退或空值。
- Acceptance criteria:
  - `ServiceStatus` 返回包含结构化 `configPath/bootstrapMode`。
  - 插件优先使用结构化字段，旧 message 解析仅作兜底。
  - 主线 easy tests 与插件测试全部通过。

### 8.4 已完成 Work Unit（最新）

WU-MAINLINE-005: gRPC smoke 对 `ServiceStatus` 新字段回归校验

- Objective: 在 smoke 验证链路中显式校验 `bootstrap_mode/config_path`，确保契约扩展在本地与 CI 中可见、可回归。
- Scope (in/out):
  - in: 更新 `easy_grpc_client_smoke` 输出与断言、脚本调用链回归。
  - out: 新增复杂 E2E 测试框架、插件 UI 迭代。
- Files to change:
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无（消费已新增字段，不再改 proto）。
- Test plan:
  - `vna/scripts/build_grpc_adapter.ps1`
  - `vna/build-grpc/easy_grpc_client_smoke.exe 127.0.0.1:50051`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild`
- Rollback plan: 回滚 smoke 断言与脚本改动，恢复原输出。
- Risks: 本地配置路径差异可能导致断言过严，需要采用“非空+格式”校验而非硬编码绝对路径。
- Acceptance criteria:
  - smoke 输出包含 `bootstrap_mode/config_path`。
  - 当字段为空时 smoke 显式失败并返回非 0。
  - 不影响现有 unary/stream smoke 路径。

### 8.5 已完成 Work Unit（最新）

WU-MAINLINE-006: `GetServiceStatus` 插件显示去歧义与回归

- Objective: 清理插件状态展示中对 legacy `message | config=...` 的解析分支，统一以结构化字段为主，避免重复或冲突展示。
- Scope (in/out):
  - in: 插件 `statusFormatter` 展示规则收敛、测试补齐、README 行为说明补充。
  - out: 新增 UI 组件、改造命令交互流程。
- Files to change:
  - `vna/tools/vscode-extension/src/statusFormatter.ts`
  - `vna/tools/vscode-extension/test/statusFormatter.test.ts`
  - `vna/tools/vscode-extension/README.md`
- Contract impact: 无（仅消费与展示逻辑调整）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚上述插件文件，恢复旧解析展示策略。
- Risks: 若后端旧版本未带新字段，展示可能回退到 legacy message 解析路径。
- Acceptance criteria:
  - 新字段存在时仅展示结构化 `configPath/bootstrapMode`。
  - 旧字段缺失时可继续兼容显示。
  - 插件测试全部通过。

### 8.6 已完成 Work Unit（最新）

WU-MAINLINE-007: 服务端 `GetServiceStatus` 行为契约化快照测试

- Objective: 为结构化扩展后的 `GetServiceStatus` 建立稳定快照测试，避免后续字段回退或 message 语义漂移。
- Scope (in/out):
  - in: 新增/更新 core 测试覆盖 message、bootstrap_mode、config_path 的映射组合。
  - out: 新增集成环境依赖、改动插件逻辑。
- Files to change:
  - `vna/tests/core/vna_control_inproc_handler_test.cpp`
  - `vna/tests/core/service_status_service_test.cpp`
  - `vna/tests/core/service_status_concurrency_test.cpp`
- Contract impact: 无（测试增强）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚新增断言与测试用例。
- Risks: 断言过严可能在合法文案调整时引发误报，需要关注字段语义而非字面文本。
- Acceptance criteria:
  - 关键字段映射行为在测试中可重复验证。
  - easy tests 全通过。
  - 不引入 flaky 并发测试。

### 8.7 已完成 Work Unit（最新）

WU-MAINLINE-008: gRPC `GetServiceStatus` 单测覆盖（服务层）

- Objective: 补齐 gRPC service 层对 `GetServiceStatus` 结构化字段映射的单测，避免仅依赖 inproc 测试覆盖。
- Scope (in/out):
  - in: 新增/扩展 gRPC service 测试，验证 `message/bootstrap_mode/config_path` 字段映射。
  - out: 网络级集成测试框架、插件侧改造。
- Files to change:
  - `vna/tests/core/grpc_service_status_mapping_test.cpp`（新增）
  - `vna/CMakeLists.txt`
  - `vna/scripts/build_grpc_adapter.ps1`
- Contract impact: 无（测试增强）。
- Test plan:
  - `vna/scripts/build_grpc_adapter.ps1`
  - `vna/build-grpc/easy_grpc_service_status_mapping_test.exe`
- Rollback plan: 回滚新增测试目标与 gRPC 适配构建脚本接线。
- Risks: 测试桩构造不当可能引入与真实服务不一致行为。
- Acceptance criteria:
  - 新增测试覆盖 `GetServiceStatus` 结构化字段映射。
  - gRPC 适配构建链路可执行该测试并通过。

### 8.8 已完成 Work Unit

WU-MAINLINE-009: gRPC 日志噪声分级治理（smoke 可读性）

- Objective: 降低 smoke 过程中的重复 gRPC 指标告警噪声，提升回归日志可读性与故障定位效率。
- Scope (in/out):
  - in: 评估并收敛 smoke 执行路径中的可控日志输出（脚本级过滤或分级输出）。
  - out: 修改第三方 gRPC 库源码、引入外部日志框架。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild`
- Rollback plan: 回滚脚本与文档改动，恢复原始输出。
- Risks: 过滤策略过强可能掩盖真实错误，需要只处理已知重复噪声模式。
- Acceptance criteria:
  - smoke 输出保留关键通过/失败信息。
  - 已知重复噪声显著减少。
  - 矩阵脚本功能保持不变。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild` 通过（all cases passed）
  - 已知重复噪声按模式抑制并输出计数（`[MATRIX][NOISE] suppressed ...`）

### 8.9 已完成 Work Unit

WU-MAINLINE-010: gRPC smoke 严格模式（未知 stderr 失败）

- Objective: 为矩阵 smoke 增加可选“严格 stderr 判失败”模式，提升 CI 场景对异常日志的敏感度。
- Scope (in/out):
  - in: `run_grpc_smoke_matrix.ps1` 参数扩展与失败判定增强，README 用法说明。
  - out: 修改 gRPC 可执行程序、引入新日志框架。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -FailOnUnknownStderr`
- Rollback plan: 回滚脚本参数与 README 说明，恢复当前默认行为。
- Risks: 若外部依赖在 stderr 打印无害信息，严格模式可能出现误报。
- Acceptance criteria:
  - 默认模式行为不变。
  - 严格模式下，未知 stderr 可导致对应 case 失败。
  - 已知噪声过滤策略继续生效。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild` 通过（all cases passed）
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -FailOnUnknownStderr` 通过（strict mode enabled）

### 8.10 已完成 Work Unit

WU-MAINLINE-011: gRPC smoke 超时保护（防卡死）

- Objective: 为矩阵 smoke 子进程增加可配置超时，避免单个 case 卡死导致整批回归阻塞。
- Scope (in/out):
  - in: `run_grpc_smoke_matrix.ps1` 增加 `SmokeTimeoutSec` 参数与超时失败判定，README 参数说明。
  - out: 修改 gRPC 客户端实现、新增外部 watchdog 进程。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -SmokeTimeoutSec 30`
- Rollback plan: 回滚脚本参数与超时判定分支，恢复当前执行逻辑。
- Risks: 超时阈值设置过小可能产生误报，需要按环境负载调整。
- Acceptance criteria:
  - 默认行为不变。
  - 超时时对应 case 明确失败并输出 TIMEOUT 标识。
  - 配置恢复与脚本整体流程不受影响。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild` 通过（all cases passed）
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -SmokeTimeoutSec 30` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -FailOnUnknownStderr -SmokeTimeoutSec 30` 通过

### 8.11 已完成 Work Unit

WU-MAINLINE-012: gRPC smoke 结构化报告输出（JSON）

- Objective: 为矩阵 smoke 增加可选 JSON 报告输出，便于 CI 留档、对比与问题追溯。
- Scope (in/out):
  - in: `run_grpc_smoke_matrix.ps1` 增加 `ReportJsonPath` 参数并输出每个 case 结果摘要；README 用法说明。
  - out: 引入外部报表系统、修改 gRPC 客户端程序。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath .\build-grpc\smoke-matrix-report.json`
- Rollback plan: 回滚脚本新增参数与 JSON 写出逻辑，恢复当前终端输出模式。
- Risks: 报告路径无权限时可能写文件失败；需保持不影响核心回归判定。
- Acceptance criteria:
  - 默认行为不变。
  - 指定 `ReportJsonPath` 时生成有效 JSON 文件。
  - 报告包含整体结果与逐 case 关键字段（通过/失败、退出码、噪声统计）。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath .\build-grpc\smoke-matrix-report.json` 通过
  - 报告文件已生成并包含 `overallPassed/cases/*` 关键字段

### 8.12 已完成 Work Unit

WU-MAINLINE-013: smoke 报告路径时间戳占位符

- Objective: 让 `ReportJsonPath` 支持时间戳占位符，避免 CI 多次执行互相覆盖报告文件。
- Scope (in/out):
  - in: `run_grpc_smoke_matrix.ps1` 增加路径模板解析（`{timestamp}` 等）；README 用法补充。
  - out: 外部归档系统改造、历史报告清理策略。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-{timestamp}.json'`
- Rollback plan: 回滚路径模板解析逻辑与 README 说明，恢复固定路径模式。
- Risks: 若占位符拼写错误将按字面写入文件名，可能不符合预期。
- Acceptance criteria:
  - 默认固定路径行为不变。
  - 指定占位符时生成带时间戳的唯一报告文件。
  - 回归结果判定逻辑不受影响。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-{timestamp}.json'` 通过
  - 已生成示例文件：`build-grpc/smoke-matrix-20260213-060232.json`

### 8.13 已完成 Work Unit

WU-MAINLINE-014: smoke 报告失败原因分类统计

- Objective: 在 JSON 报告中增加失败原因分类统计，便于 CI 快速识别失败类型（退出码、超时、未知 stderr）。
- Scope (in/out):
  - in: `run_grpc_smoke_matrix.ps1` 报告汇总字段扩展；README 报告字段说明。
  - out: 引入外部告警平台、修改 smoke 可执行程序返回内容。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-{timestamp}.json'`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -FailOnUnknownStderr -ReportJsonPath '.\build-grpc\smoke-matrix-{timestamp}.json'`
- Rollback plan: 回滚新增汇总字段与 README 说明，恢复当前报告结构。
- Risks: 分类规则定义不清会导致统计与真实失败原因不一致。
- Acceptance criteria:
  - 报告新增 `failureSummary`（按类型计数）并保持向后兼容。
  - 默认成功场景统计为 0，失败场景能体现主因分类。
  - 现有矩阵通过/失败判定逻辑不变。

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-pass.json'` 通过，`failureSummary` 全 0
  - 受控失败验证（临时将 `config/service.yaml` 端口改为 `50052` 后执行）：`vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-fail.json'` 返回失败，`failureSummary.exitCode = 3`
  - 验证后已恢复 `config/service.yaml` 原值

### 8.14 已完成 Work Unit（批量）

WU-MAINLINE-015: smoke 报告增加执行耗时字段

- Objective: 在报告中增加整体与单 case 耗时，便于回归性能对比。
- Scope (in/out):
  - in: 增加 `durationMs`（top-level 与 `cases[*]`）。
  - out: 新增性能基准测试框架。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增耗时字段。
- Risks: 环境抖动导致耗时仅可用于趋势参考，不能作为绝对门限。
- Acceptance criteria:
  - 报告包含 `durationMs` 与 `cases[*].durationMs`。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-016: smoke 报告增加失败 case 名单

- Objective: 快速定位失败 case，减少排查时间。
- Scope (in/out):
  - in: 增加 `failedCaseNames` 顶层字段。
  - out: 外部告警路由。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增名单字段。
- Risks: 无失败时应返回空数组而非 null。
- Acceptance criteria:
  - 报告包含 `failedCaseNames`，成功场景为空数组。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-017: smoke 报告增加版本字段

- Objective: 为后续报告结构演进提供版本标识。
- Scope (in/out):
  - in: 增加 `reportVersion` 顶层字段并在 README 说明。
  - out: 兼容转换工具。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增版本字段。
- Risks: 版本命名不一致会影响下游解析。
- Acceptance criteria:
  - 报告包含 `reportVersion`（当前 `1.1`）。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v11.json'` 通过
  - 报告包含 `reportVersion=1.1`、`durationMs`、`cases[*].durationMs`、`failedCaseNames=[]`

---

*版本：v2.0（AI Agent 执行版） | 日期：2026-02-13*
