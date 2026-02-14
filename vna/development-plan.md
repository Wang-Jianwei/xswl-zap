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

默认执行粒度（强约束）：

- 每个开发批次应优先收敛为 **1~3 个粗粒度 WU**（功能实现 / 测试回归 / 批次收敛）。
- 禁止将同一主题能力机械拆分为大量“仅数行改动”的细碎 WU。
- 仅在以下场景允许细分超过 3 个 WU：
  - 契约变更（proto/header/schema）与实现必须分离验收；
  - 高风险改动需要独立回滚与验证；
  - 用户明确要求按细粒度追踪。

满足以下条件的 WU，可合并为一次提交：

- 仅文档/脚本轻量改动，不涉及 proto/公共接口/核心业务逻辑
- 变更文件少且彼此同主题（默认应优先合并，建议 6~12 个小 WU 一批；同主题且同验证链路下可扩展到 16 个）
- 可在一组测试命令中完成共同验证

执行偏好补充：除非涉及重大契约变更、高风险重构或用户明确要求拆分，否则不将任务过细拆分为大量单独小 WU。

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

### 8.2 已完成 Work Unit

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

- Status: ✅ Completed (2026-02-13)
- Validation result:
  - `cmake --build --preset ninja-mingw` 通过
  - `vna/scripts/run_easy_tests.ps1` 通过
  - 后续 `WU-MAINLINE-004~029` 的连续交付与回归基于该结构化结果持续通过

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

### 8.15 已完成 Work Unit（批量）

WU-MAINLINE-018: failureSummary 增加占比字段

- Objective: 为失败分类提供比例视图，便于趋势分析。
- Scope (in/out):
  - in: 增加 `failureRate/exitCodeRate/timeoutRate/unknownStderrRate`。
  - out: 外部图表分析系统。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增比率字段。
- Risks: 低样本下比例波动较大，仅用于快速判断。
- Acceptance criteria:
  - 报告中包含 4 个比率字段，取值范围 `0.0~1.0`。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-019: 报告增加执行参数快照

- Objective: 记录本次执行关键参数，提升复现与审计能力。
- Scope (in/out):
  - in: 增加 `executionOptions` 顶层字段。
  - out: 命令历史持久化服务。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增 `executionOptions` 字段。
- Risks: 参数快照遗漏会影响复现质量。
- Acceptance criteria:
  - 报告包含 `executionOptions`，至少覆盖 `skipBuild/failOnUnknownStderr/smokeTimeoutSec/reportJsonPath*`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v12.json'` 通过
  - 报告包含 `failureSummary.*Rate` 与 `executionOptions.*` 字段

### 8.16 已完成 Work Unit（批量）

WU-MAINLINE-020: 报告增加 endpoint 快照

- Objective: 记录本次 smoke 连接端点，便于跨环境排障。
- Scope (in/out):
  - in: `executionOptions.endpoint` 字段。
  - out: 动态 endpoint 发现机制。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增 endpoint 字段。
- Risks: 若后续支持多 endpoint，需要扩展字段结构。
- Acceptance criteria:
  - 报告包含 `executionOptions.endpoint`。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-021: 报告增加 config 哈希快照

- Objective: 为配置可追溯性提供稳定指纹，便于复现。
- Scope (in/out):
  - in: `executionOptions.configPath/configHashSha256` 字段。
  - out: 配置差异比对工具。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增配置快照字段。
- Risks: 哈希仅反映原始配置内容，不反映运行期临时改写。
- Acceptance criteria:
  - 报告包含 `executionOptions.configPath` 与 `executionOptions.configHashSha256`。
  - `reportVersion` 更新为 `1.2`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v13.json'` 通过
  - 报告包含 `reportVersion=1.2`、`executionOptions.endpoint`、`executionOptions.configHashSha256`

### 8.17 已完成 Work Unit（批量）

WU-MAINLINE-022: 报告增加噪声抑制总量统计

- Objective: 为 CI 阈值判断提供顶层噪声统计。
- Scope (in/out):
  - in: 增加 `noiseSuppressedTotal` 顶层字段。
  - out: 噪声趋势告警系统。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增统计字段。
- Risks: 仅统计已知噪声，不代表全部日志量。
- Acceptance criteria:
  - 报告包含 `noiseSuppressedTotal` 且与各 case 之和一致。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-023: 报告增加结构化 warnings 摘要

- Objective: 在报告层汇总关键告警，提升可读性。
- Scope (in/out):
  - in: 增加 `warnings[]` 顶层字段。
  - out: 外部通知系统联动。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增 warnings 字段。
- Risks: 告警编码扩展时需保持命名一致。
- Acceptance criteria:
  - 报告包含 `warnings[]`，至少支持 `known_noise_suppressed`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v14.json'` 通过
  - 报告包含 `reportVersion=1.3`、`noiseSuppressedTotal`、`warnings[]`

### 8.18 已完成 Work Unit（批量）

WU-MAINLINE-024: 报告增加稳定 case 序号

- Objective: 提供稳定的 case 顺序索引，便于下游比对。
- Scope (in/out):
  - in: 增加 `cases[*].caseIndex`。
  - out: 外部排序策略定制。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增 caseIndex 字段。
- Risks: case 定义顺序变更会同步影响序号。
- Acceptance criteria:
  - 报告中每个 case 带 `caseIndex` 且从 `1` 递增。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-025: 报告增加顶层摘要字符串

- Objective: 提供可直接展示的单行摘要信息，便于日志快速阅读。
- Scope (in/out):
  - in: 增加 `reportDigest` 顶层字段。
  - out: 复杂模板化报表输出。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增摘要字段。
- Risks: 摘要格式变更需保持向后兼容约定。
- Acceptance criteria:
  - 报告包含 `reportDigest`，覆盖通过/失败/噪声/告警计数。
  - `reportVersion` 更新为 `1.4`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v15.json'` 通过
  - 报告包含 `reportVersion=1.4`、`reportDigest`、`cases[*].caseIndex`

### 8.19 已完成 Work Unit（批量）

WU-MAINLINE-026: 报告增加顶层状态字段

- Objective: 提供机器可读的顶层结果状态（PASS/FAIL）。
- Scope (in/out):
  - in: 新增 `status` 字段。
  - out: 细粒度状态机定义。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 `status` 字段。
- Risks: 状态语义扩展时需保持兼容。
- Acceptance criteria:
  - 报告包含 `status` 且与 `overallPassed` 一致。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-027: 报告增加生成器元数据

- Objective: 明确报告来源脚本与运行时，提升追溯性。
- Scope (in/out):
  - in: 新增 `generatedBy` 字段。
  - out: 完整构建环境指纹。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 `generatedBy` 字段。
- Risks: 运行时命名约定调整需同步文档。
- Acceptance criteria:
  - 报告包含 `generatedBy.script/runtime`。
  - `reportVersion` 更新为 `1.5`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v16.json'` 通过
  - 报告包含 `reportVersion=1.5`、`status`、`generatedBy`

### 8.20 已完成 Work Unit（批量）

WU-MAINLINE-028: failureSummary 增加按原因失败名单

- Objective: 快速定位不同失败原因对应的 case 集合。
- Scope (in/out):
  - in: 增加 `failureSummary.failedCaseNamesByReason`。
  - out: 外部统计报表联动。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增分组名单字段。
- Risks: 原因分类扩展时需同步新增分组键。
- Acceptance criteria:
  - 报告包含 `failedCaseNamesByReason.exitCode/timeout/unknownStderr`。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-029: 单 case 增加摘要字符串

- Objective: 为每个 case 提供快速阅读的一行摘要。
- Scope (in/out):
  - in: 增加 `cases[*].resultDigest`。
  - out: 复杂模板渲染。
- Files to change:
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 `resultDigest` 字段。
- Risks: 摘要格式变更需保持兼容性。
- Acceptance criteria:
  - 报告中每个 case 包含 `resultDigest`。
  - `reportVersion` 更新为 `1.6`。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - 受控失败验证（临时将 `config/service.yaml` 端口改为 `50052` 后执行）：`vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-summary-v17-fail.json'` 返回失败
  - 报告包含 `reportVersion=1.6`、`failureSummary.failedCaseNamesByReason`、`cases[*].resultDigest`
  - 验证后已恢复 `config/service.yaml` 原值

### 8.21 已完成 Work Unit（批量）

WU-MAINLINE-030: CI 报告门禁脚本

- Objective: 提供一条可直接用于 CI 的“生成+校验”门禁命令。
- Scope (in/out):
  - in: 新增 `run_smoke_report_gate.ps1`。
  - out: CI 平台流水线模板。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚门禁脚本与 README 对应说明。
- Risks: 报告路径模板变更需同步门禁脚本定位策略。
- Acceptance criteria:
  - 一条命令可完成 smoke 报告生成并执行校验。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-031: smoke 报告 JSON Schema 固化

- Objective: 固化报告字段契约，降低后续演进漂移风险。
- Scope (in/out):
  - in: 新增 `smoke_matrix_report.schema.json`。
  - out: 引入第三方 JSON Schema 引擎。
- Files to change:
  - `vna/scripts/smoke_matrix_report.schema.json`
  - `vna/README.md`
- Contract impact: 无（内部质量约束）。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 schema 文件与文档说明。
- Risks: 字段升级时需同步维护 schema。
- Acceptance criteria:
  - schema 覆盖报告关键字段与核心嵌套结构。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-032: 报告结构快照校验脚本

- Objective: 增加结构快照检查，防止关键 key-set 漂移。
- Scope (in/out):
  - in: 新增 `validate_smoke_matrix_report.ps1`（required + snapshot 校验）。
  - out: 基于测试框架的单元测试套件。
- Files to change:
  - `vna/scripts/validate_smoke_matrix_report.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚校验脚本并移除门禁中的校验调用。
- Risks: 报告新增字段时需同步更新 snapshot 预期键集。
- Acceptance criteria:
  - 校验脚本可检查必填字段与关键快照结构。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild` 通过
  - 输出含 `[REPORT][PASS] validation ok` 与 `[GATE][PASS]`，门禁链路闭环

### 8.22 已完成 Work Unit（批量）

WU-MAINLINE-033: Gate 告警升级失败策略

- Objective: 支持按告警码将报告告警升级为门禁失败。
- Scope (in/out):
  - in: `run_smoke_report_gate.ps1` 增加 `FailOnWarningCodes` 参数。
  - out: 外部告警平台策略联动。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚告警升级策略逻辑与参数。
- Risks: 告警码误配置可能导致非预期失败。
- Acceptance criteria:
  - 可配置指定告警码触发 gate 失败。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-034: 报告摘要消费工具

- Objective: 提供一条可读摘要输出，方便 CI 日志展示。
- Scope (in/out):
  - in: 新增 `summarize_smoke_matrix_report.ps1`。
  - out: 富文本报表渲染。
- Files to change:
  - `vna/scripts/summarize_smoke_matrix_report.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚摘要脚本。
- Risks: 摘要字段变更需同步脚本输出格式。
- Acceptance criteria:
  - 脚本可输出单行摘要与 digest。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-035: 报告演进策略文档化

- Objective: 固化报告版本升级与维护流程，减少后续漂移。
- Scope (in/out):
  - in: README 增加“报告演进策略”章节。
  - out: 组织级规范文档。
- Files to change:
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 文档变更通过脚本命令可执行性验证。
- Rollback plan: 回滚策略章节。
- Risks: 策略未同步脚本实现会造成文档偏差。
- Acceptance criteria:
  - README 明确版本升级、schema/snapshot 同步要求与 gate 建议用法。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v18.json'` 通过
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v18-warning.json' -FailOnWarningCodes known_noise_suppressed` 按策略失败（exit 1）
  - `vna/scripts/summarize_smoke_matrix_report.ps1 -ReportPath '.\build-grpc\smoke-matrix-gate-v18.json'` 成功输出摘要

### 8.23 已完成 Work Unit（批量）

WU-MAINLINE-036: Gate 机器可解析结果输出

- Objective: 为 gate 脚本提供稳定机器输出，便于 CI/自动化消费。
- Scope (in/out):
  - in: `run_smoke_report_gate.ps1` 增加 `AsJson` 模式。
  - out: 外部告警平台联动与流水线模板。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 `AsJson` 输出分支。
- Risks: 输出字段变更会影响外部消费者解析。
- Acceptance criteria:
  - `-AsJson` 可输出稳定 JSON 结果（含 `status/reportPath/error`）。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-037: Gate 失败路径统一结构化输出

- Objective: 让 gate 在失败场景也保持统一机器结果格式，避免分支解析逻辑。
- Scope (in/out):
  - in: `run_smoke_report_gate.ps1` 在 PASS/FAIL 均输出统一结构结果。
  - out: 报告 schema 升级。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚统一输出与错误封装逻辑。
- Risks: 错误消息文案调整可能影响日志检索规则。
- Acceptance criteria:
  - FAIL 路径在 `-AsJson` 下输出 `status=FAIL` 且包含 `error`。
  - warning policy 触发失败时返回码为 1。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v19.json' -AsJson` 通过并输出 PASS JSON
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v19-warning.json' -FailOnWarningCodes known_noise_suppressed -AsJson` 按策略失败并输出 FAIL JSON（exit 1）
  - `vna/scripts/summarize_smoke_matrix_report.ps1 -ReportPath '.\build-grpc\smoke-matrix-gate-v19.json' -AsJson` 成功输出摘要 JSON

### 8.24 已完成 Work Unit（批量）

WU-MAINLINE-038: Gate 结果 JSON 落盘能力

- Objective: 支持将 gate 结果对象写入指定文件，便于 CI 工件归档。
- Scope (in/out):
  - in: `run_smoke_report_gate.ps1` 增加 `ResultJsonPath` 参数与占位符解析。
  - out: CI 工件上传模板。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚 `ResultJsonPath` 参数与落盘逻辑。
- Risks: 结果文件路径配置错误会导致工件缺失。
- Acceptance criteria:
  - gate 结果可按指定路径落盘 JSON，支持时间戳占位符。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-039: Gate 结果执行元数据增强

- Objective: 为 gate 机器结果增加可观测执行元数据。
- Scope (in/out):
  - in: 增加 `exitCode/durationMs/startedAtUtc/finishedAtUtc` 字段。
  - out: 外部指标平台写入。
- Files to change:
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚新增元数据字段。
- Risks: 下游消费者若强依赖旧字段集合需同步更新解析逻辑。
- Acceptance criteria:
  - PASS/FAIL 两条路径均输出新增元数据字段。

- Status: ✅ Completed (2026-02-13)

WU-MAINLINE-040: 摘要 JSON 压缩输出与落盘

- Objective: 支持摘要脚本输出压缩 JSON，并可写入文件。
- Scope (in/out):
  - in: `summarize_smoke_matrix_report.ps1` 增加 `CompactJson/OutputJsonPath`。
  - out: 摘要聚合看板。
- Files to change:
  - `vna/scripts/summarize_smoke_matrix_report.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan: 见本批量 WU 统一验证命令。
- Rollback plan: 回滚压缩输出与落盘参数。
- Risks: 压缩 JSON 可读性下降，需要配合工具消费。
- Acceptance criteria:
  - 摘要脚本支持压缩 JSON 控制台输出与文件落盘。

- Status: ✅ Completed (2026-02-13)

- Validation result（批量 WU 统一）:
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v20.json' -AsJson -ResultJsonPath '.\build-grpc\gate-result-v20-pass-{timestamp}.json'` 通过
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-v20-warning.json' -FailOnWarningCodes known_noise_suppressed -AsJson -ResultJsonPath '.\build-grpc\gate-result-v20-fail-{timestamp}.json'` 按策略失败并输出 FAIL JSON（exit 1）
  - `vna/scripts/summarize_smoke_matrix_report.ps1 -ReportPath '.\build-grpc\smoke-matrix-gate-v20.json' -AsJson -CompactJson -OutputJsonPath '.\build-grpc\smoke-summary-v20-{timestamp}.json'` 成功输出并落盘摘要 JSON

### 8.25 下一批 Work Unit（业务功能优先，计划中）

WU-MAINLINE-041: 基本测量参数模型与 S 参数扫描 MVP

- Objective: 将“频率/点数/功率/IFBW”参数接入测量主流程，并先打通接收机数值采集链路（I/Q 复数采样）后形成最小可验收 S 参数扫描链路。
- Data product policy: `S 参数`只是标准输出之一；接收机原始/补偿后数据同样属于一等数据产品，需支持独立查看与输出。
- Scope (in/out):
  - in: 参数模型、接收机采样帧模型（R/A/B 或等价参考/测量通道）、服务层接入、最小回归测试。
  - out: 高阶测量算法优化与性能调优。
- Files to change:
  - `vna/include/core/measurement_pipeline.h`
  - `vna/src/core/measurement_pipeline.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/*measurement*`
- Contract impact: 可能涉及 `proto/vna.proto` 扩展（待实现时确认）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
  - gRPC smoke 最小回归
- Rollback plan: 回滚参数扩展与服务映射改动，保留现有最小 Acquire/Stream 路径。
- Risks: 参数语义定义不完整会导致前后端行为不一致。
- Acceptance criteria:
  - 可配置并生效最小测量参数集合（频率范围、点数、功率、IFBW）。
  - 每个频点可获得结构化接收机复数采样结果（含参考与测量通道）。
  - 采样链路包含最小可观测字段：通道标识、时间戳、I/Q 数值、过载/裁剪标记（若触发）。
  - 单次采集至少可输出两类结果：`receiver`（接收机数据）与 `s-parameter`（S 参数），二者可独立消费。
  - 数据处理链路保持分层：`raw receiver -> factory compensation -> optional user calibration -> s-parameter -> derived views`。
  - 回归测试覆盖关键参数有效/无效路径，以及接收机数值采集的稳定输出路径。

- Status: ✅ Completed (2026-02-13)

- Progress update:
  - 已完成核心数据模型扩展：接收机原始/补偿后数据结构与 n 端口 S 参数矩阵结构。
  - 已完成 CW 采集链路增强：支持最小扫频、多端口接收机通道输出与单激励列 S 参数求解。
  - 已完成 `measurement_pipeline_test` 回归扩展并通过。

- Validation result（阶段性）:
  - `cmake --build --preset ninja-mingw --target vna_measurement_pipeline_test` 通过
  - `vna/build/easy_measurement_pipeline_test.exe` 通过
  - `vna/scripts/generate_proto.ps1` 通过（契约变更后重新生成 stub）
  - `cmake --build --preset grpc-mingw64 --target vna_grpc_server vna_grpc_service_adapter vna_grpc_client_smoke vna_grpc_stream_smoke` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu41-v2.json'` 通过（Acquire 输出 `receiver_raw/receiver_comp/s_param`）

WU-MAINLINE-042: 数据导出 MVP（Touchstone/CSV）

- Objective: 打通测量结果导出闭环，优先交付 Touchstone 与 CSV。
- Scope (in/out):
  - in: 最小导出器实现、导出接口与基础回归测试。
  - out: MAT 导出与导入回放完整能力。
- Files to change:
  - `vna/include/core/*export*`
  - `vna/src/core/*export*`
  - `vna/src/service/*`
  - `vna/tests/core/*export*`
- Contract impact: 可能新增导出相关 RPC（待实现时确认）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
  - 导出文件格式回归（Touchstone/CSV）
- Rollback plan: 回滚新增导出接口与实现，保留原始测量路径。
- Risks: 文件格式细节（单位/精度/头信息）需与行业工具兼容。
- Acceptance criteria:
  - 能导出可被常见工具识别的 `.sNp` 与 `.csv` 文件。
  - 导出失败路径可给出结构化错误信息。

- Status: ✅ Completed (2026-02-13)

- Implementation notes:
  - 新增 core 导出器：`MeasurementExporter::ExportCsv/ExportTouchstone`。
  - 新增 service 封装：`VnaControlService::ExportAcquisitionResult`。
  - 新增导出回归测试：`measurement_exporter_test`，并纳入 `run_easy_tests.ps1`。

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test vna_vna_control_service_test` 通过
  - `vna/build/easy_measurement_exporter_test.exe` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过（含导出文件存在性断言）

WU-MAINLINE-043: VNA 实例生命周期与多实例最小并发

- Objective: 建立实例创建/销毁与双实例并行测量的最小闭环。
- Scope (in/out):
  - in: 实例生命周期最小接口、资源隔离校验、并发回归测试。
  - out: 完整同步触发与时钟对齐高级能力。
- Files to change:
  - `vna/include/core/topology_manager.h`
  - `vna/src/core/topology_manager.cpp`
  - `vna/src/service/resource_broker_service.cpp`
  - `vna/tests/integration/*instance*`
- Contract impact: 可能涉及实例管理 RPC 扩展（待实现时确认）。
- Test plan:
  - `cmake --build --preset ninja-mingw`
  - `vna/scripts/run_easy_tests.ps1`
  - 双实例并行测量集成回归
- Rollback plan: 回滚实例生命周期新增路径，保留单实例默认链路。
- Risks: 资源竞争与状态同步逻辑复杂，需先保证观测与错误诊断。
- Acceptance criteria:
  - 至少两个逻辑实例可并行执行最小测量且互不干扰。
  - 资源冲突时返回可诊断错误。

- Status: ✅ Completed (2026-02-13)

- Implementation notes:
  - 为 `InstanceManager` 增加互斥锁保护，覆盖创建/启动/停止/采集/计数路径，支持并发采集安全访问。
  - 新增双实例并行采集集成测试（`inst0` + `inst1` 同时 Acquire）。
  - 资源冲突路径强化为可诊断状态断言：冲突启动返回 `Status::kTimeout`。

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_multi_instance_parallel_integration_test vna_vna_control_service_test` 通过
  - `vna/build/easy_multi_instance_parallel_integration_test.exe` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过
  - `vna/scripts/run_easy_tests.ps1` 全通过（包含新并行测试）

### 8.26 已完成 Work Unit

WU-MAINLINE-044: 复数结果派生格式（幅度 dB / 相位 deg）

- Objective: 为接收机与 S 参数导出提供用户常用派生格式，减少下游重复计算。
- Scope (in/out):
  - in: 新增复数派生计算模块并接入 CSV 导出。
  - out: Smith/Z/Y 等更高阶派生视图。
- Files to change:
  - `vna/include/core/s_parameter_math.h`
  - `vna/src/core/s_parameter_math.cpp`
  - `vna/src/core/measurement_exporter.cpp`
  - `vna/tests/core/s_parameter_math_test.cpp`
  - `vna/tests/core/measurement_exporter_test.cpp`
- Contract impact: 无（不改动 proto）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_s_parameter_math_test vna_measurement_exporter_test`
  - `vna/build/easy_s_parameter_math_test.exe`
  - `vna/build/easy_measurement_exporter_test.exe`
- Rollback plan: 回滚派生计算模块与导出字段扩展。
- Risks: 数值边界（接近 0）需避免 `-inf`，已通过 epsilon 保护。
- Acceptance criteria:
  - CSV 导出新增 `magnitude_db` 与 `phase_deg` 列。
  - 接收机与 S 参数导出行均包含派生值。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_s_parameter_math_test vna_measurement_exporter_test` 通过
  - `vna/build/easy_s_parameter_math_test.exe` 通过
  - `vna/build/easy_measurement_exporter_test.exe` 通过
  - `vna/scripts/run_easy_tests.ps1` 全通过（包含 `easy_s_parameter_math_test.exe`）

### 8.27 已完成 Work Unit

WU-MAINLINE-045: Acquire 一体化导出触发（CSV/Touchstone）

- Objective: 在采集 RPC 中增加可选导出触发，打通“采集即导出”的最小闭环。
- Scope (in/out):
  - in: `AcquisitionRequest` 增加导出路径字段；gRPC `Acquire` 成功后可触发导出。
  - out: 导出任务队列与异步调度。
- Files to change:
  - `vna/proto/vna.proto`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/generated/cpp/*`
  - `vna/generated/ts/*`
- Contract impact: 是（`AcquisitionRequest` 新增字段 `export_csv_path`、`export_touchstone_path`）。
- Test plan:
  - `vna/scripts/generate_proto.ps1`
  - `cmake --build --preset grpc-mingw64 --target vna_grpc_server vna_grpc_service_adapter vna_grpc_client_smoke`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu45-v1.json'`
- Rollback plan: 回滚 proto 新字段与 gRPC 导出触发逻辑。
- Risks: 导出路径无效时 `Acquire` 会按错误返回，需要调用方显式处理。
- Acceptance criteria:
  - 不配置导出路径时行为与现有 Acquire 一致。
  - 配置导出路径时采集成功后可生成 CSV/Touchstone 文件。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `vna/scripts/generate_proto.ps1` 通过
  - `cmake --build --preset grpc-mingw64 --target vna_grpc_server vna_grpc_service_adapter vna_grpc_client_smoke` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu45-v1.json'` 通过
  - 产物检查通过：`build-grpc/grpc-acquire-export.csv`、`build-grpc/grpc-acquire-export.s4p` 存在

### 8.28 已完成 Work Unit

WU-MAINLINE-046: 导出失败可诊断信息增强

- Objective: 导出失败时返回明确原因，便于调用方快速定位路径/数据问题。
- Scope (in/out):
  - in: exporter/service/grpc 失败路径增加错误消息透传。
  - out: 统一错误码体系重构。
- Files to change:
  - `vna/include/core/measurement_exporter.h`
  - `vna/src/core/measurement_exporter.cpp`
  - `vna/include/service/vna_control_service.h`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
- Contract impact: 无（不改动 proto 字段）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚错误消息参数与 gRPC 透传逻辑。
- Risks: 错误文案变更可能影响日志关键字检索。
- Acceptance criteria:
  - 导出失败时可获取非空错误消息。
  - gRPC `Acquire` 导出失败返回包含错误详情。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过（含无效导出路径错误消息断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.29 已完成 Work Unit

WU-MAINLINE-047: MinGW 运行时环境自愈与脚本稳定性

- Objective: 避免因终端 PATH/PowerShell native 错误策略导致的误判失败。
- Scope (in/out):
  - in: 关键脚本增加 MinGW 运行时自检与 PATH 注入，关闭 native stderr 误报。
  - out: 构建系统级工具链安装流程重构。
- Files to change:
  - `vna/scripts/run_easy_tests.ps1`
  - `vna/scripts/run_grpc_smoke_matrix.ps1`
  - `vna/scripts/run_smoke_report_gate.ps1`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `vna/scripts/run_easy_tests.ps1`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu47-v1.json'`
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-wu47.json' -AsJson`
- Rollback plan: 回滚脚本环境自检逻辑。
- Risks: 固定的 MinGW 路径假设在非标准安装机器上可能不适配。
- Acceptance criteria:
  - 脚本在缺失 MinGW 运行时时可给出明确错误。
  - 标准环境下脚本不再受终端 PATH 漂移影响。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `vna/scripts/run_easy_tests.ps1` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu47-v1.json'` 通过
  - `vna/scripts/run_smoke_report_gate.ps1 -SkipBuild -ReportPath '.\build-grpc\smoke-matrix-gate-wu47.json' -AsJson` 通过

### 8.30 已完成 Work Unit

WU-MAINLINE-048: 导出路径目录自动创建

- Objective: 导出路径父目录不存在时自动创建，降低调用方路径准备成本。
- Scope (in/out):
  - in: CSV/Touchstone 导出前的目录递归创建。
  - out: 跨盘符映射策略与权限升级处理。
- Files to change:
  - `vna/src/core/measurement_exporter.cpp`
  - `vna/tests/core/measurement_exporter_test.cpp`
  - `vna/development-plan.md`
  - `vna/README.md`
- Contract impact: 无。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test`
  - `vna/build/easy_measurement_exporter_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚目录自动创建逻辑，恢复由调用方预建目录。
- Risks: 深层目录创建在权限受限路径下可能失败，仍需返回可诊断错误。
- Acceptance criteria:
  - 指定嵌套导出路径时可自动创建父目录并成功写出文件。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test` 通过
  - `vna/build/easy_measurement_exporter_test.exe` 通过（含嵌套目录导出断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.31 已完成 Work Unit

WU-MAINLINE-049: JSON 导出能力与 Acquire 一体化触发

- Objective: 为采集结果增加 JSON 导出能力，并支持在 `AcquireRequest` 中直接指定 JSON 导出路径。
- Scope (in/out):
  - in: `AcquisitionRequest` 新增 `export_json_path`；core/service/grpc 接入 JSON 导出；相关单测与 smoke 校验更新。
  - out: MAT 格式导出与导入回放。
- Files to change:
  - `vna/proto/vna.proto`
  - `vna/generated/cpp/vna.pb.h`
  - `vna/generated/cpp/vna.pb.cc`
  - `vna/generated/ts/vna.ts`
  - `vna/include/core/measurement_exporter.h`
  - `vna/src/core/measurement_exporter.cpp`
  - `vna/include/service/vna_control_service.h`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/tests/core/measurement_exporter_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 是（`AcquisitionRequest` 新增字段 `export_json_path`）。
- Test plan:
  - `vna/scripts/generate_proto.ps1`
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test vna_vna_control_service_test`
  - `vna/build/easy_measurement_exporter_test.exe`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚 proto 字段与 JSON 导出分支，恢复仅 CSV/Touchstone 导出。
- Risks: JSON 文件体积可能较大；调用方如对字段结构有强依赖需同步适配。
- Acceptance criteria:
  - 采集结果可导出 JSON 文件并包含 receiver 与 s-parameter 数据。
  - gRPC `Acquire` 在设置 `export_json_path` 时可成功生成 JSON 导出文件。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `vna/scripts/generate_proto.ps1` 通过
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test vna_vna_control_service_test` 通过
  - `vna/build/easy_measurement_exporter_test.exe` 通过（含 JSON 导出与嵌套目录断言）
  - `vna/build/easy_vna_control_service_test.exe` 通过（含服务侧 JSON 导出断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.32 已完成 Work Unit

WU-MAINLINE-050: JSON 导入（导入回放基础能力）

- Objective: 为已导出的 JSON 测量结果提供回读能力，建立导入回放的 core 层基础。
- Scope (in/out):
  - in: `MeasurementExporter` 新增 `ImportJson`，支持回读 receiver raw/compensated 与 s-parameter 点集；补充 round-trip 单测。
  - out: gRPC 导入接口、UI 回放流程、MAT 导入。
- Files to change:
  - `vna/include/core/measurement_exporter.h`
  - `vna/src/core/measurement_exporter.cpp`
  - `vna/tests/core/measurement_exporter_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test`
  - `vna/build/easy_measurement_exporter_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚 `ImportJson` 与新增单测，保持仅导出能力。
- Risks: 当前解析器按项目导出 JSON 结构实现，若外部 JSON 结构差异较大将返回解析错误。
- Acceptance criteria:
  - 导出的 JSON 可成功回读为 `AcquisitionResult`。
  - round-trip 测试覆盖实例标识、时间戳与主要点集数量。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_measurement_exporter_test` 通过
  - `vna/build/easy_measurement_exporter_test.exe` 通过（含 JSON round-trip 断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.33 已完成 Work Unit

WU-MAINLINE-051: Service 层导入入口接线

- Objective: 在业务服务层暴露 JSON 导入能力，统一导入调用与错误语义。
- Scope (in/out):
  - in: `VnaControlService` 新增 `ImportAcquisitionResult` 并接入 core importer；补充服务层回归测试。
  - out: gRPC 导入 RPC、导入结果缓存与回放调度。
- Files to change:
  - `vna/include/service/vna_control_service.h`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚 service 导入方法与相关测试，保留 core 层导入能力。
- Risks: 目前导入入口仅支持 JSON 文件路径，后续扩展到其他格式时需补统一策略。
- Acceptance criteria:
  - service 可通过 JSON 路径导入 `AcquisitionResult`。
  - 导入成功与空路径失败场景均有可验证断言。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过（含 service 导入 round-trip 与错误路径断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.34 已完成 Work Unit

WU-MAINLINE-052: gRPC 导入 RPC（ImportAcquisition）

- Objective: 将导入能力从 service 层暴露到 gRPC 对外接口，支持远程按 JSON 路径回读测量结果。
- Scope (in/out):
  - in: proto 新增 `ImportAcquisitionRequest` 与 `ImportAcquisition` RPC；gRPC service 实现与 smoke client 校验接线。
  - out: 导入结果持久化缓存、批量导入任务编排。
- Files to change:
  - `vna/proto/vna.proto`
  - `vna/generated/cpp/vna.pb.h`
  - `vna/generated/cpp/vna.pb.cc`
  - `vna/generated/cpp/vna.grpc.pb.h`
  - `vna/generated/cpp/vna.grpc.pb.cc`
  - `vna/generated/ts/vna.ts`
  - `vna/include/service/grpc/vna_control_grpc_service.h`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 是（`VnaControl` 新增 `ImportAcquisition` RPC）。
- Test plan:
  - `vna/scripts/generate_proto.ps1`
  - `vna/scripts/build_grpc_adapter.ps1`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu52.json'`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚 proto 新 RPC 与 gRPC 适配分支，恢复仅本地导入入口。
- Risks: 目前按文件路径导入，服务部署形态变化时需进一步约束路径可见性与访问策略。
- Acceptance criteria:
  - gRPC 可通过 `ImportAcquisition` 成功回读已导出的 JSON 测量结果。
  - smoke 回归矩阵覆盖新增 RPC 且不影响既有 Acquire/Stream 流程。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `vna/scripts/generate_proto.ps1` 通过
  - `vna/scripts/build_grpc_adapter.ps1` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu52.json'` 通过
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.35 已完成 Work Unit

WU-MAINLINE-053: 导入路径约束与错误码细化

- Objective: 收敛导入路径风险并增强可诊断性，避免路径穿越和绝对路径误用。
- Scope (in/out):
  - in: service 导入路径校验（相对路径、`.json` 扩展名、禁止 `..`），错误消息统一 `IMPORT_PATH_*` 前缀；更新服务/烟测校验。
  - out: 基于用户权限的文件系统沙箱。
- Files to change:
  - `vna/src/service/vna_control_service.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/build_grpc_adapter.ps1`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu53.json'`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚路径校验逻辑与对应断言，恢复宽松导入路径策略。
- Risks: 绝对路径导入将被拒绝；若外部调用依赖此行为需改为相对路径。
- Acceptance criteria:
  - 非 `.json`、绝对路径、`..` 穿越路径导入均返回 `kInvalidArgument` 且错误含 `IMPORT_PATH_*` 前缀。
  - gRPC smoke 负场景可观测到 `IMPORT_PATH_TRAVERSAL`。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_vna_control_service_test` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过（含路径约束断言）
  - `vna/scripts/build_grpc_adapter.ps1` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu53.json'` 通过
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.36 已完成 Work Unit

WU-MAINLINE-054: 导入结果与当前采集最小比对能力

- Objective: 为导入回放场景提供最小可用比对能力，支持导入结果与当前采集结果的一致性检查。
- Scope (in/out):
  - in: 新增 core 比对器（receiver/s-parameter 数据产品 + 容差）；service 新增 `CompareImportedAcquisition`；新增 core/service 测试。
  - out: 频域/时域 frame 全量波形比对、报告可视化。
- Files to change:
  - `vna/include/core/acquisition_comparator.h`
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/include/service/vna_control_service.h`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/CMakeLists.txt`
  - `vna/scripts/run_easy_tests.ps1`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto）。
- Test plan:
  - `cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `vna/build/easy_acquisition_comparator_test.exe`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚比对器与 service 比对入口，恢复仅导入不比对。
- Risks: 当前比对范围聚焦 receiver/s-parameter，未覆盖全部 frame 维度。
- Acceptance criteria:
  - 导入结果可与当前采集结果按容差执行比对并返回一致/不一致结果。
  - 不一致场景返回 `COMPARE_MISMATCH` 诊断前缀。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `vna/build/easy_acquisition_comparator_test.exe` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过（含 compare 成功/失败断言）
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.37 已完成 Work Unit

WU-MAINLINE-055: gRPC 回放比对 RPC（CompareImportedAcquisition）

- Objective: 将“导入 vs 当前采集”的比对能力对外暴露为 gRPC RPC，支持远程调用。
- Scope (in/out):
  - in: proto 新增 Compare 请求/响应；gRPC service 实现 compare 流程；smoke 客户端覆盖 compare RPC；比对逻辑忽略时间戳元数据以适配跨次采集。
  - out: 比对报告持久化与多维统计摘要。
- Files to change:
  - `vna/proto/vna.proto`
  - `vna/generated/cpp/vna.pb.h`
  - `vna/generated/cpp/vna.pb.cc`
  - `vna/generated/cpp/vna.grpc.pb.h`
  - `vna/generated/cpp/vna.grpc.pb.cc`
  - `vna/generated/ts/vna.ts`
  - `vna/include/service/grpc/vna_control_grpc_service.h`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/src/service/grpc/grpc_client_smoke_main.cpp`
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 是（`VnaControl` 新增 `CompareImportedAcquisition` RPC）。
- Test plan:
  - `vna/scripts/generate_proto.ps1`
  - `vna/scripts/build_grpc_adapter.ps1`
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu55.json'`
  - `cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `vna/build/easy_acquisition_comparator_test.exe`
  - `vna/build/easy_vna_control_service_test.exe`
  - `vna/scripts/run_easy_tests.ps1`
- Rollback plan: 回滚 compare RPC 契约与 gRPC 分支，保留本地 compare 能力。
- Risks: compare 结果受容差参数影响；容差过小可能导致误判不匹配。
- Acceptance criteria:
  - gRPC Compare RPC 可返回 `matched=true/false` 与 detail 信息。
  - compare 失败（不匹配）走业务结果返回，不作为 RPC 传输层错误。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `vna/scripts/generate_proto.ps1` 通过
  - `vna/scripts/build_grpc_adapter.ps1` 通过
  - `vna/scripts/run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-wu55.json'` 通过
  - `cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `vna/build/easy_acquisition_comparator_test.exe` 通过
  - `vna/build/easy_vna_control_service_test.exe` 通过
  - `vna/scripts/run_easy_tests.ps1` 全通过

### 8.38 已完成 Work Unit

WU-MAINLINE-056: VS Code 插件波形预览（MVP）

- Objective: 尽快达到“可在 VS Code 插件端查看波形”的主线里程碑。
- Scope (in/out):
  - in: 新增插件命令 `XSWL: Preview Waveform`；复用 `Acquire` 获取点集；Webview 折线图渲染；插件单测补齐。
  - out: 交互缩放、Marker、多 trace 叠加与历史缓存。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（复用现有 `Acquire` RPC）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚插件命令与波形渲染模块，恢复摘要文本模式。
- Risks: 当前 Webview 图仅为 MVP，复杂数据量下渲染性能与交互体验仍需后续增强。
- Acceptance criteria:
  - 命令面板可执行 `XSWL: Preview Waveform`。
  - 能在 Webview 看到采集点折线图（频域或时域）。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.39 已完成 Work Unit

WU-MAINLINE-057: 插件波形预览模式切换与基础 Marker

- Objective: 提升 VS Code 插件端波形可用性，支持频域/时域切换并提供基础峰谷定位信息。
- Scope (in/out):
  - in: `Preview Waveform` 命令增加模式选择；波形页面增加 min/max marker 与轴标签；测试补齐。
  - out: 交互式 marker 拖拽、多 marker 管理、频谱数学运算。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（复用既有 Acquire 契约）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚模式选择与 marker 渲染，恢复单模式最小折线图。
- Risks: Pulse 模式下回包形态受后端当前能力影响，可能仍返回频域帧。
- Acceptance criteria:
  - 预览命令可选择 `frequency/time` 模式。
  - 预览页展示 `min/max` marker 坐标。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.40 已完成 Work Unit

WU-MAINLINE-058: 插件波形 live 自动刷新与性能保护

- Objective: 提升插件端波形监看体验，支持短时自动刷新并避免渲染卡顿。
- Scope (in/out):
  - in: `Preview Waveform` 增加 `snapshot/live` 选择；live 通过 stream 短时刷新；增加点数下采样与刷新节流。
  - out: 长时后台采集会话管理、交互缩放与历史缓存。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（复用现有 Acquire/StreamAcquisition）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 live 分支与节流/下采样逻辑，恢复单次预览。
- Risks: live 模式依赖后端 stream 稳定性，网络抖动下可能提前结束。
- Acceptance criteria:
  - 预览命令支持 `snapshot/live`。
  - live 模式可自动刷新并可取消。
  - 渲染点数保护与刷新节流生效。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.41 已完成 Work Unit

WU-MAINLINE-059: 插件频域波形多 trace 选择与叠加预览

- Objective: 在 VS Code 插件端提升频域分析能力，支持按数据产品选择波形来源并进行同屏对比。
- Scope (in/out):
  - in: `Preview Waveform` 频域模式新增 trace source 选择（`frame` / `receiverRaw` / `receiverCompensated` / `sParameterS11` / `all`）；Webview 支持多曲线叠加与图例；测试补齐。
  - out: 通道级筛选、交互式多 marker、曲线开关持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（复用既有 Acquire/StreamAcquisition 返回字段，仅扩展插件端映射与渲染）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 trace source 选择与多曲线渲染逻辑，恢复 WU058 的单曲线预览。
- Risks: `all` 模式多曲线叠加会增加 Webview 绘制负担，已沿用下采样与刷新节流策略缓解。
- Acceptance criteria:
  - 频域预览可选择 trace source。
  - `all` 模式可同屏展示多曲线并显示图例。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.42 已完成 Work Unit

WU-MAINLINE-060: 插件频域接收机通道选择（channel index）

- Objective: 提升 VS Code 插件端多通道可观测性，在频域下支持按接收机通道索引查看曲线。
- Scope (in/out):
  - in: `Preview Waveform` 在 `receiverRaw` / `receiverCompensated` / `all` 场景新增 `channel index` 输入；渲染按指定通道提取数据；测试与文档更新。
  - out: 自动探测后端最大通道数、通道命名别名管理、跨会话记忆上次通道。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto；仅扩展插件端参数与映射）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 channel index 输入与通道映射逻辑，恢复首通道固定策略。
- Risks: 用户输入超出实际通道范围时可能导致接收机 trace 为空（已通过输入校验与现有空数据兜底处理）。
- Acceptance criteria:
  - 频域 `receiverRaw` / `receiverCompensated` / `all` 支持输入 channel index。
  - 接收机曲线按指定 channel 展示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.43 已完成 Work Unit

WU-MAINLINE-061: 插件 `all` 模式曲线显隐控制

- Objective: 提升 VS Code 插件端多曲线可读性，在 `all` 叠加模式下支持按曲线开关可见性。
- Scope (in/out):
  - in: `Preview Waveform` 在 `trace source=all` 时增加可见曲线勾选；渲染层按选中集合过滤 trace；测试与文档更新。
  - out: 图内交互式图例点击开关、每实例显隐配置持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto，仅插件侧交互和渲染过滤逻辑）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 `all` 模式显隐选择与 trace 过滤逻辑，恢复默认全量叠加。
- Risks: 可见集合配置不当可能误以为数据缺失（通过 meta/legend 显示当前可见列表）。
- Acceptance criteria:
  - `all` 模式可勾选要显示的曲线。
  - 预览图与图例仅展示选中曲线。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.44 已完成 Work Unit

WU-MAINLINE-062: 插件图例点击显隐（运行中交互）

- Objective: 提升波形预览交互效率，支持在已打开图形中直接切换曲线显隐。
- Scope (in/out):
  - in: Webview 图例改为可点击控件；点击后即时隐藏/显示对应 trace；补齐测试与文档。
  - out: 缩放/平移、图内 marker 拖拽、显隐状态跨刷新持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（纯插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚可点击图例与脚本化显隐逻辑，恢复静态图例展示。
- Risks: 需启用 webview script；若脚本异常将回退为静态图形显示。
- Acceptance criteria:
  - 图例可点击切换对应曲线显隐。
  - 不需要重新运行命令即可完成多曲线对比。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.45 已完成 Work Unit

WU-MAINLINE-063: 插件波形坐标轴刻度文本（x/y min/max）

- Objective: 提升插件波形可读性，在图内直接显示基础坐标刻度信息。
- Scope (in/out):
  - in: 在 Webview 坐标轴增加 x/y 的 min/max 文本刻度；补测试与文档。
  - out: 自适应多刻度分级、单位换算切换、缩放后动态坐标重排。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（纯前端渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚轴刻度文本渲染，恢复仅轴线/网格展示。
- Risks: 极端数值范围下刻度文本可能较长（已采用定点/科学计数法格式化）。
- Acceptance criteria:
  - 坐标轴显示 x/y min/max 文本。
  - 与现有波形渲染、图例显隐兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.46 已完成 Work Unit

WU-MAINLINE-064: 插件 marker 分组列表与图内标记点

- Objective: 提升多曲线读数效率，将 marker 从纯文本提升为结构化展示与图内可视化。
- Scope (in/out):
  - in: marker 面板按 trace 分组展示；图内绘制 min/max 标记点；图例显隐与 marker 行联动；补测试与文档。
  - out: 交互式 marker 拖拽、更多 marker 类型（delta/reference）与持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 marker 分组/图内标记点逻辑，恢复文本 marker 展示。
- Risks: 多曲线场景下标记点文本可能局部重叠（当前为最小实现，后续可引入避让策略）。
- Acceptance criteria:
  - marker 面板按 trace 分组展示。
  - 图内可见 min/max 标记点。
  - 图例显隐后 marker 行同步状态变化。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.47 已完成 Work Unit

WU-MAINLINE-065: marker 分组排序与主曲线高亮

- Objective: 在多曲线波形预览中提升 marker 可读性与关注点定位速度。
- Scope (in/out):
  - in: marker 分组按 y 值优先级排序；主曲线在图例与 marker 面板高亮；补测试与文档。
  - out: 用户自定义排序规则、主曲线手动切换与持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端呈现增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 marker 排序与高亮样式，恢复默认原始顺序显示。
- Risks: 排序逻辑在极端同值场景下可能不稳定（当前保持主曲线优先，其他按数值降序）。
- Acceptance criteria:
  - marker 分组按 y 值优先级排序。
  - 主曲线在图例与 marker 面板可见高亮。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.48 已完成 Work Unit

WU-MAINLINE-066: 主曲线 marker 标签背景框

- Objective: 提升复杂图面（网格/多曲线叠加）下主曲线 marker 标签可读性。
- Scope (in/out):
  - in: 主曲线 marker 文本增加背景框样式；补测试与文档。
  - out: 自定义标签配色、字号偏好设置、标签避让布局优化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端样式与渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚主曲线标签背景框渲染与样式，恢复纯文本标签。
- Risks: 标签背景框尺寸估算基于字符宽度，极端字体下可能存在轻微偏差。
- Acceptance criteria:
  - 主曲线 marker 标签具有背景框。
  - 与现有图例显隐、marker 分组排序兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.49 已完成 Work Unit

WU-MAINLINE-067: 主曲线 marker 完整数值标签（min/max + x/y）

- Objective: 在图内直接提供主曲线 marker 关键读数，减少上下文切换与人工换算。
- Scope (in/out):
  - in: 主曲线 marker 标签显示 `min/max + x/y` 完整数值；保持紧凑排版；补测试与文档。
  - out: 单位动态切换、数值复制交互、标签重叠自动避让。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端展示增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚主曲线标签完整数值渲染，恢复简短标签。
- Risks: 在极端数值宽度场景下，标签长度仍可能造成局部遮挡（已限制宽度并紧凑排版）。
- Acceptance criteria:
  - 主曲线 marker 标签显示 `min/max + x/y`。
  - 与现有背景框、排序、高亮逻辑兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.50 已完成 Work Unit

WU-MAINLINE-068: 一键复制主曲线 marker 读数

- Objective: 降低人工抄录成本，支持将主曲线关键 marker 数值快速导出到外部上下文。
- Scope (in/out):
  - in: 波形页新增 `Copy Primary Marker` 按钮；Webview 向扩展发送复制消息；扩展写入系统剪贴板；补测试与文档。
  - out: 复制格式自定义模板、批量复制多 trace marker。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互与扩展侧剪贴板能力增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚复制按钮与消息处理逻辑，恢复只读展示。
- Risks: Webview 与扩展通信失败时复制动作无效（已保留浏览器剪贴板后备路径）。
- Acceptance criteria:
  - 页面可点击复制主曲线 marker 文本。
  - 扩展端可将文本写入剪贴板。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.51 已完成 Work Unit

WU-MAINLINE-069: 复制主曲线 marker 的页面内状态反馈

- Objective: 提升复制操作可感知性，在 Webview 内即时反馈复制结果。
- Scope (in/out):
  - in: 增加复制状态条；扩展端回传复制成功/失败消息；页面响应展示；补测试与文档。
  - out: 历史状态队列、可关闭通知、复制统计埋点。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚状态条渲染与复制结果消息处理，保留原有复制功能。
- Risks: 主题 token 在部分版本下可能不可用导致状态颜色退化（不影响功能）。
- Acceptance criteria:
  - 复制动作后页面可见成功/失败状态。
  - 扩展端与 Webview 消息通道稳定。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.52 已完成 Work Unit

WU-MAINLINE-070: 复制过程 `Copying...` 过渡态

- Objective: 让复制动作具备即时过程反馈，避免用户误判点击未生效。
- Scope (in/out):
  - in: 点击复制后立即显示 `Copying...` 状态。
  - out: 进度条动画与多阶段状态细分。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚复制过程过渡态逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 点击复制立即显示 `Copying...`。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.53 已完成 Work Unit

WU-MAINLINE-071: 复制状态条自动淡出

- Objective: 降低状态提示长期驻留造成的页面噪声。
- Scope (in/out):
  - in: 复制状态（成功/失败）2 秒后自动清理。
  - out: 用户可配置的持续时长设置。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚自动淡出逻辑，保持常驻状态条。
- Risks: 无关键风险。
- Acceptance criteria:
  - 状态条在 2 秒后自动隐藏。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.54 已完成 Work Unit

WU-MAINLINE-072: 快捷键复制主曲线 marker

- Objective: 提高操作效率，支持键盘快速复制关键读数。
- Scope (in/out):
  - in: 支持 `Ctrl/Cmd + C` 触发主曲线 marker 复制（非输入焦点）。
  - out: 快捷键自定义映射。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚快捷键监听逻辑。
- Risks: 需避免与输入框默认复制冲突（当前已做输入焦点保护）。
- Acceptance criteria:
  - `Ctrl/Cmd + C` 可触发复制（非输入焦点）。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU070~072 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.55 已完成 Work Unit

WU-MAINLINE-073: 复制按钮快捷键提示

- Objective: 降低学习成本，让用户在页面内可见快捷操作路径。
- Scope (in/out):
  - in: 在复制按钮旁显示 `Ctrl/Cmd + C` 提示。
  - out: 按键自定义。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚快捷键提示文本。
- Risks: 无关键风险。
- Acceptance criteria:
  - 页面可见快捷键提示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.56 已完成 Work Unit

WU-MAINLINE-074: 无主曲线时复制按钮禁用原因提示

- Objective: 在不可复制场景给出明确反馈，减少误操作疑惑。
- Scope (in/out):
  - in: 无主曲线时按钮置灰并显示原因 tooltip。
  - out: 复杂错误码体系。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚按钮禁用提示文案。
- Risks: 无关键风险。
- Acceptance criteria:
  - 无主曲线时按钮不可用且有原因提示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.57 已完成 Work Unit

WU-MAINLINE-075: 复制文本附带时间戳

- Objective: 提升复制数据可追溯性，便于日志和报告回查。
- Scope (in/out):
  - in: 复制文本前置 `timestampNs` 字段。
  - out: 时间格式本地化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚时间戳拼接逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 复制文本包含 `timestampNs`。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU073~075 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.58 已完成 Work Unit

WU-MAINLINE-076: 复制状态附带本地时间戳

- Objective: 增强状态消息可追踪性，便于区分连续多次复制结果。
- Scope (in/out):
  - in: 成功/失败状态文案追加本地时间戳。
  - out: 可配置时间格式。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚时间戳附加逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 状态文案包含本地时间信息。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.59 已完成 Work Unit

WU-MAINLINE-077: `Esc` 快速清除复制状态

- Objective: 提供快速收敛噪声提示的键盘交互能力。
- Scope (in/out):
  - in: 按 `Esc` 立即清除页面状态条。
  - out: 通用热键配置系统。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 `Esc` 清理监听逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - `Esc` 可即时清除状态条。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.60 已完成 Work Unit

WU-MAINLINE-078: 复制按钮字符数 tooltip

- Objective: 让用户复制前可预估文本长度。
- Scope (in/out):
  - in: tooltip 显示复制内容字符数。
  - out: 内容分级预警。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚字符数 tooltip 拼接逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - tooltip 展示字符数。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU076~078 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.61 已完成 Work Unit

WU-MAINLINE-079: 复制文本附带 source/channel

- Objective: 提升复制结果的上下文完整性。
- Scope (in/out):
  - in: 复制文本增加 `source` 与 `channel` 字段。
  - out: 完整会话上下文导出。
- Status: ✅ Completed (2026-02-13)

### 8.62 已完成 Work Unit

WU-MAINLINE-080: 复制防连点（500ms）

- Objective: 避免连续触发导致重复复制与状态抖动。
- Scope (in/out):
  - in: 增加 500ms 去抖保护。
  - out: 可配置节流参数。
- Status: ✅ Completed (2026-02-13)

### 8.63 已完成 Work Unit

WU-MAINLINE-081: 复制成功按钮短态 `Copied!`

- Objective: 提供更直观的按钮级反馈。
- Scope (in/out):
  - in: 复制成功后按钮短暂显示 `Copied!`。
  - out: 多状态动画体系。
- Status: ✅ Completed (2026-02-13)

### 8.64 已完成 Work Unit

WU-MAINLINE-082: 快捷键提示增强 tooltip

- Objective: 增强快捷键可发现性。
- Scope (in/out):
  - in: 快捷键提示追加说明 tooltip。
  - out: 自定义提示文案。
- Status: ✅ Completed (2026-02-13)

### 8.65 已完成 Work Unit

WU-MAINLINE-083: 状态反馈可访问性（aria-live）

- Objective: 提升状态消息对辅助技术的可感知性。
- Scope (in/out):
  - in: 状态条启用 `aria-live=polite`。
  - out: 更细粒度可访问性语义。
- Status: ✅ Completed (2026-02-13)

### 8.66 已完成 Work Unit

WU-MAINLINE-084: 批次收敛与回归保持

- Objective: 将多项简单交互增强以单批方式完成并统一验证。
- Scope (in/out):
  - in: 聚合 WU079~084 的代码/测试/文档变更并统一测试。
  - out: 跨批次依赖调整。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU079~084):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复 WU078 状态。
- Risks: 无关键风险（均为前端提示与交互细化）。
- Acceptance criteria:
  - 新增交互文案/防抖/短态/可访问性生效。
  - 插件测试通过。

- Validation result (WU079~084 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.67 已完成 Work Unit

WU-MAINLINE-085: 新增 `Clear Status` 操作

- Objective: 提供主动清理状态提示的入口。
- Scope (in/out):
  - in: 复制区新增 `Clear Status` 按钮。
  - out: 历史状态管理。
- Status: ✅ Completed (2026-02-13)

### 8.68 已完成 Work Unit

WU-MAINLINE-086: 新增 `Alt + C` 复制快捷键

- Objective: 提升键盘操作覆盖率。
- Scope (in/out):
  - in: 支持 `Alt + C` 触发复制。
  - out: 快捷键可配置。
- Status: ✅ Completed (2026-02-13)

### 8.69 已完成 Work Unit

WU-MAINLINE-087: 成功提示附带字符数

- Objective: 提供复制体积感知。
- Scope (in/out):
  - in: 成功提示附带 chars 数值。
  - out: 分级阈值告警。
- Status: ✅ Completed (2026-02-13)

### 8.70 已完成 Work Unit

WU-MAINLINE-088: Clipboard 不可用显式提示

- Objective: 明确失败原因，减少误判。
- Scope (in/out):
  - in: Clipboard API 不可用时显示明确错误。
  - out: 自动降级复制策略。
- Status: ✅ Completed (2026-02-13)

### 8.71 已完成 Work Unit

WU-MAINLINE-089: 快捷键提示文案补齐

- Objective: 强化操作可发现性。
- Scope (in/out):
  - in: 显示 `Ctrl/Cmd + C | Alt + C | Esc` 提示。
  - out: 本地化多语言提示。
- Status: ✅ Completed (2026-02-13)

### 8.72 已完成 Work Unit

WU-MAINLINE-090: 批次收敛与统一验证

- Objective: 合并处理多个简单交互 WU，降低切换成本。
- Scope (in/out):
  - in: 聚合 WU085~090 代码/测试/文档并统一回归。
  - out: 跨模块重构。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU085~090):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复 WU084 状态。
- Risks: 无关键风险。
- Acceptance criteria:
  - 新增清理入口、Alt 快捷键、字符数反馈与不可用提示可用。
  - 插件测试通过。

- Validation result (WU085~090 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.73 已完成 Work Unit

WU-MAINLINE-091: 后端回放比对诊断增强（core + service + gRPC）

- Objective: 将回放比对从“是否匹配”提升到“可诊断可定位”，支撑后端主线可验证能力。
- Scope (in/out):
  - in: `AcquisitionComparator` 输出 `max/rms` 误差统计；mismatch 输出 point/channel/value + delta 上下文；service/gRPC 透传 compare detail；补 core/service 测试。
  - out: 变更 compare RPC 契约字段（保持现有 `detail` 文本承载）。
- Files to change:
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无 proto 变更（沿用 `CompareImportedAcquisitionResponse.detail` 文本扩展诊断信息）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚 comparator 诊断扩展与 service/grpc detail 透传，恢复原有简化 compare detail。
- Risks: detail 文本更长可能影响上层日志长度；当前未改 proto 字段结构，兼容性风险低。
- Acceptance criteria:
  - compare 成功返回包含 `max/rms` 统计信息。
  - compare 不匹配返回可定位上下文与 delta。
  - core/service 定向测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.74 已完成 Work Unit

WU-MAINLINE-092: compare 详情包含 tolerance

- Objective: 提升 compare 结果可解释性。
- Scope (in/out):
  - in: compare 详情输出 tolerance。
  - out: tolerance 动态策略。
- Status: ✅ Completed (2026-02-13)

### 8.75 已完成 Work Unit

WU-MAINLINE-093: compare 详情包含分组样本计数

- Objective: 提供 receiver/sparameter 维度可观测性。
- Scope (in/out):
  - in: detail 输出 receiver_raw/receiver_comp/sparameter sample 计数。
  - out: 更细分通道级统计。
- Status: ✅ Completed (2026-02-13)

### 8.76 已完成 Work Unit

WU-MAINLINE-094: compare 增加 non-finite 值检测

- Objective: 避免 NaN/Inf 被静默比较导致误判。
- Scope (in/out):
  - in: IQ 与 S 参数复数值 non-finite 检测并返回定位信息。
  - out: 自动修复非有限值。
- Status: ✅ Completed (2026-02-13)

### 8.77 已完成 Work Unit

WU-MAINLINE-095: mismatch 上下文精细化

- Objective: 缩短故障定位路径。
- Scope (in/out):
  - in: mismatch detail 输出 point/channel/value + delta。
  - out: 二进制诊断附件。
- Status: ✅ Completed (2026-02-13)

### 8.78 已完成 Work Unit

WU-MAINLINE-096: service compare detail 透传增强

- Objective: 保持 core 诊断信息在 service 层完整可见。
- Scope (in/out):
  - in: 成功/失败 detail 均透传增强文本。
  - out: 新增 proto 结构化字段。
- Status: ✅ Completed (2026-02-13)

### 8.79 已完成 Work Unit

WU-MAINLINE-097: core/service 回归测试扩展

- Objective: 为诊断增强建立可持续回归保障。
- Scope (in/out):
  - in: comparator 与 control service 测试覆盖 tolerance/计数/non-finite/delta。
  - out: e2e 大规模回放数据集。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU092~097):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无 proto 变更（复用 `detail` 文本承载增强诊断）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU091 诊断粒度。
- Risks: detail 文本长度增加；对契约兼容性影响低。
- Acceptance criteria:
  - compare 详情含 tolerance/分组计数。
  - non-finite 值可被检测并返回定位信息。
  - core/service 定向测试通过。

- Validation result (WU092~097 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.80 已完成 Work Unit

WU-MAINLINE-098: instanceId mismatch 详情增强

- Objective: 明确实例不匹配的 expected/actual。
- Scope (in/out):
  - in: instanceId mismatch 输出 expected/actual。
  - out: 多实例自动映射修复。
- Status: ✅ Completed (2026-02-13)

### 8.81 已完成 Work Unit

WU-MAINLINE-099: 点数/通道数 mismatch 详情增强

- Objective: 快速识别结构规模差异。
- Scope (in/out):
  - in: point/channel/matrix size mismatch 输出 expected/actual 与 point index。
  - out: 自动裁剪对齐。
- Status: ✅ Completed (2026-02-13)

### 8.82 已完成 Work Unit

WU-MAINLINE-100: 频点 mismatch 上下文增强

- Objective: 提升频点差异定位效率。
- Scope (in/out):
  - in: frequency mismatch 输出 point index + expected/actual + tolerance。
  - out: 频率重采样容错。
- Status: ✅ Completed (2026-02-13)

### 8.83 已完成 Work Unit

WU-MAINLINE-101: 端口计数 mismatch 上下文增强

- Objective: 明确 n-port 结构差异。
- Scope (in/out):
  - in: portCount mismatch 输出 point index + expected/actual。
  - out: 动态端口映射。
- Status: ✅ Completed (2026-02-13)

### 8.84 已完成 Work Unit

WU-MAINLINE-102: channelId/clipped mismatch 上下文增强

- Objective: 定位通道元数据不一致问题。
- Scope (in/out):
  - in: channelId/clipped mismatch 输出 point/channel 索引与 expected/actual。
  - out: 通道重命名策略。
- Status: ✅ Completed (2026-02-13)

### 8.85 已完成 Work Unit

WU-MAINLINE-103: comparator 回归断言扩展

- Objective: 固化新增 mismatch detail 语义，避免回归。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 instanceId/pointCount/non-finite 详情断言。
  - out: 大规模随机数据 fuzz。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU098~103):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU097 诊断粒度。
- Risks: detail 文本更长但仍在单字段内，兼容性影响低。
- Acceptance criteria:
  - mismatch detail 包含 expected/actual 与定位索引。
  - core/service 定向测试通过。

- Validation result (WU098~103 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.86 已完成 Work Unit

WU-MAINLINE-104: compare 成功摘要增加 receiver raw 最大误差位置

- Objective: 在 matched 场景下提供 receiver raw 峰值误差定位信息。
- Scope (in/out):
  - in: `receiver_raw_max_at=point:<i>,channel:<j>` 摘要输出。
  - out: 结构化 proto 字段拆分。
- Status: ✅ Completed (2026-02-13)

### 8.87 已完成 Work Unit

WU-MAINLINE-105: compare 成功摘要增加 receiver compensated 最大误差位置

- Objective: 在 matched 场景下提供补偿后通道峰值误差定位信息。
- Scope (in/out):
  - in: `receiver_comp_max_at=point:<i>,channel:<j>` 摘要输出。
  - out: 自动定位历史趋势分析。
- Status: ✅ Completed (2026-02-13)

### 8.88 已完成 Work Unit

WU-MAINLINE-106: compare 成功摘要增加 s-parameter 最大误差位置

- Objective: 在 matched 场景下提供 s-parameter 维度峰值误差定位信息。
- Scope (in/out):
  - in: `sparameter_max_at=point:<i>,value:<k>` 摘要输出。
  - out: 频段聚合统计。
- Status: ✅ Completed (2026-02-13)

### 8.89 已完成 Work Unit

WU-MAINLINE-107: comparator 观测逻辑记录类别与索引

- Objective: 为最大误差位置摘要提供统一记录机制。
- Scope (in/out):
  - in: `Observe` 记录 category/point/sub-index 并更新对应最大误差位置。
  - out: 全量诊断模型重构。
- Status: ✅ Completed (2026-02-13)

### 8.90 已完成 Work Unit

WU-MAINLINE-108: core/service 回归断言补齐 max_at 字段

- Objective: 防止最大误差位置摘要在后续迭代中回归丢失。
- Scope (in/out):
  - in: comparator 与 control service 测试增加 `*_max_at` 断言。
  - out: 端到端 UI 展示校验。
- Status: ✅ Completed (2026-02-13)

### 8.91 已完成 Work Unit

WU-MAINLINE-109: 批次收敛与统一验证（WU104~109）

- Objective: 合并后端 compare 诊断简单 WU，降低切换成本并保证闭环质量。
- Scope (in/out):
  - in: 聚合 WU104~109 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU104~109):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU098~103 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含三类 `*_max_at` 位置字段。
  - core/service 定向测试通过。

- Validation result (WU104~109 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.92 已完成 Work Unit

WU-MAINLINE-110: compare 成功摘要增加 receiver raw RMS 误差

- Objective: 在 matched 场景下提供 receiver raw 整体误差强度指标。
- Scope (in/out):
  - in: `receiver_raw_rms_delta` 摘要输出。
  - out: 频段分桶 RMS 统计。
- Status: ✅ Completed (2026-02-14)

### 8.93 已完成 Work Unit

WU-MAINLINE-111: compare 成功摘要增加 receiver compensated RMS 误差

- Objective: 在 matched 场景下提供补偿后通道整体误差强度指标。
- Scope (in/out):
  - in: `receiver_comp_rms_delta` 摘要输出。
  - out: 通道分组趋势统计。
- Status: ✅ Completed (2026-02-14)

### 8.94 已完成 Work Unit

WU-MAINLINE-112: compare 成功摘要增加 s-parameter RMS 误差

- Objective: 在 matched 场景下提供 s-parameter 维度整体误差强度指标。
- Scope (in/out):
  - in: `sparameter_rms_delta` 摘要输出。
  - out: 端口对矩阵细分统计。
- Status: ✅ Completed (2026-02-14)

### 8.95 已完成 Work Unit

WU-MAINLINE-113: comparator 增加分类平方和累计

- Objective: 为分类 RMS 指标提供稳定计算基础。
- Scope (in/out):
  - in: 按类别累计 `sumSquareDelta` 并在摘要统一输出。
  - out: 诊断持久化存储。
- Status: ✅ Completed (2026-02-14)

### 8.96 已完成 Work Unit

WU-MAINLINE-114: core/service 回归断言补齐分类 RMS 字段

- Objective: 防止分类 RMS 摘要字段在后续迭代回归丢失。
- Scope (in/out):
  - in: comparator 与 control service 测试增加 `*_rms_delta` 断言。
  - out: UI 层字段展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.97 已完成 Work Unit

WU-MAINLINE-115: 批次收敛与统一验证（WU110~115）

- Objective: 合并后端 compare 诊断简单 WU，保持高频闭环效率。
- Scope (in/out):
  - in: 聚合 WU110~115 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU110~115):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU104~109 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含三类 `*_rms_delta` 字段。
  - core/service 定向测试通过。

- Validation result (WU110~115 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.98 已完成 Work Unit

WU-MAINLINE-116: compare 成功摘要增加 receiver raw 最大误差分量方向

- Objective: 在 matched 场景下识别 receiver raw 最大误差来自实部还是虚部。
- Scope (in/out):
  - in: `receiver_raw_max_component` 摘要输出（`real/imag`）。
  - out: 更细粒度分量时序分析。
- Status: ✅ Completed (2026-02-14)

### 8.99 已完成 Work Unit

WU-MAINLINE-117: compare 成功摘要增加 receiver compensated 最大误差分量方向

- Objective: 在 matched 场景下识别补偿后通道最大误差主导分量。
- Scope (in/out):
  - in: `receiver_comp_max_component` 摘要输出（`real/imag`）。
  - out: 自动分量补偿策略。
- Status: ✅ Completed (2026-02-14)

### 8.100 已完成 Work Unit

WU-MAINLINE-118: compare 成功摘要增加 s-parameter 最大误差分量方向

- Objective: 在 matched 场景下识别 s-parameter 最大误差主导分量。
- Scope (in/out):
  - in: `sparameter_max_component` 摘要输出（`real/imag`）。
  - out: 端口对分量统计图。
- Status: ✅ Completed (2026-02-14)

### 8.101 已完成 Work Unit

WU-MAINLINE-119: compare 成功摘要增加分类最大误差有符号偏差

- Objective: 提供最大误差点位的偏差方向信息，缩短定位路径。
- Scope (in/out):
  - in: `*_max_signed_delta` 摘要输出。
  - out: 历史偏差趋势模型。
- Status: ✅ Completed (2026-02-14)

### 8.102 已完成 Work Unit

WU-MAINLINE-120: core/service 回归断言补齐分量方向与有符号偏差

- Objective: 防止新增分量方向与偏差字段在后续迭代回归丢失。
- Scope (in/out):
  - in: comparator 与 control service 测试增加 `*_max_component`、`*_max_signed_delta` 断言。
  - out: UI 展示层断言。
- Status: ✅ Completed (2026-02-14)

### 8.103 已完成 Work Unit

WU-MAINLINE-121: 批次收敛与统一验证（WU116~121）

- Objective: 合并后端 compare 诊断简单 WU，保持连续闭环交付节奏。
- Scope (in/out):
  - in: 聚合 WU116~121 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU116~121):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU110~115 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含三类 `*_max_component` 与 `*_max_signed_delta` 字段。
  - core/service 定向测试通过。

- Validation result (WU116~121 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.104 已完成 Work Unit

WU-MAINLINE-122: compare 成功摘要增加 receiver raw 最大误差频点

- Objective: 在 matched 场景下直接给出 receiver raw 最大误差对应频点。
- Scope (in/out):
  - in: `receiver_raw_max_frequency_hz` 摘要输出。
  - out: 频段范围自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.105 已完成 Work Unit

WU-MAINLINE-123: compare 成功摘要增加 receiver compensated 最大误差频点

- Objective: 在 matched 场景下直接给出补偿后通道最大误差对应频点。
- Scope (in/out):
  - in: `receiver_comp_max_frequency_hz` 摘要输出。
  - out: 补偿模型自动调参。
- Status: ✅ Completed (2026-02-14)

### 8.106 已完成 Work Unit

WU-MAINLINE-124: compare 成功摘要增加 s-parameter 最大误差频点

- Objective: 在 matched 场景下直接给出 s-parameter 最大误差对应频点。
- Scope (in/out):
  - in: `sparameter_max_frequency_hz` 摘要输出。
  - out: 端口对频段热区统计。
- Status: ✅ Completed (2026-02-14)

### 8.107 已完成 Work Unit

WU-MAINLINE-125: comparator 观测逻辑记录最大误差频点

- Objective: 为最大误差频点摘要提供统一记录机制。
- Scope (in/out):
  - in: `Observe` 接收频点并在最大误差更新时同步记录。
  - out: 全量频点分布持久化。
- Status: ✅ Completed (2026-02-14)

### 8.108 已完成 Work Unit

WU-MAINLINE-126: core/service 回归断言补齐最大误差频点字段

- Objective: 防止最大误差频点字段在后续迭代回归丢失。
- Scope (in/out):
  - in: comparator 与 control service 测试增加 `*_max_frequency_hz` 断言。
  - out: UI 展示层断言。
- Status: ✅ Completed (2026-02-14)

### 8.109 已完成 Work Unit

WU-MAINLINE-127: 批次收敛与统一验证（WU122~127）

- Objective: 合并后端 compare 诊断简单 WU，保持连续交付效率。
- Scope (in/out):
  - in: 聚合 WU122~127 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU122~127):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU116~121 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含三类 `*_max_frequency_hz` 字段。
  - core/service 定向测试通过。

- Validation result (WU122~127 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.110 已完成 Work Unit

WU-MAINLINE-128: compare 成功摘要增加 overall 最大误差容差比

- Objective: 直接展示最大误差相对容差的占比。
- Scope (in/out):
  - in: `max_component_delta_ratio` 摘要输出。
  - out: 自动阈值分级策略。
- Status: ✅ Completed (2026-02-14)

### 8.111 已完成 Work Unit

WU-MAINLINE-129: compare 成功摘要增加 overall RMS 容差比

- Objective: 直接展示 RMS 误差相对容差占比。
- Scope (in/out):
  - in: `rms_component_delta_ratio` 摘要输出。
  - out: 历史趋势评估。
- Status: ✅ Completed (2026-02-14)

### 8.112 已完成 Work Unit

WU-MAINLINE-130: compare 成功摘要增加 receiver raw RMS 容差比

- Objective: 提供 receiver raw 分类 RMS 裕量指标。
- Scope (in/out):
  - in: `receiver_raw_rms_delta_ratio` 摘要输出。
  - out: 通道分层统计。
- Status: ✅ Completed (2026-02-14)

### 8.113 已完成 Work Unit

WU-MAINLINE-131: compare 成功摘要增加 receiver compensated RMS 容差比

- Objective: 提供补偿后分类 RMS 裕量指标。
- Scope (in/out):
  - in: `receiver_comp_rms_delta_ratio` 摘要输出。
  - out: 自动补偿参数修正。
- Status: ✅ Completed (2026-02-14)

### 8.114 已完成 Work Unit

WU-MAINLINE-132: compare 成功摘要增加 s-parameter RMS 容差比

- Objective: 提供 s-parameter 分类 RMS 裕量指标。
- Scope (in/out):
  - in: `sparameter_rms_delta_ratio` 摘要输出。
  - out: 端口对热点分析。
- Status: ✅ Completed (2026-02-14)

### 8.115 已完成 Work Unit

WU-MAINLINE-133: compare 成功摘要增加 receiver raw 最大误差容差比

- Objective: 提供 receiver raw 峰值误差裕量指标。
- Scope (in/out):
  - in: `receiver_raw_max_delta_ratio` 摘要输出。
  - out: 峰值点自动告警。
- Status: ✅ Completed (2026-02-14)

### 8.116 已完成 Work Unit

WU-MAINLINE-134: compare 成功摘要增加 receiver compensated 最大误差容差比

- Objective: 提供补偿后峰值误差裕量指标。
- Scope (in/out):
  - in: `receiver_comp_max_delta_ratio` 摘要输出。
  - out: 峰值回放聚合。
- Status: ✅ Completed (2026-02-14)

### 8.117 已完成 Work Unit

WU-MAINLINE-135: compare 成功摘要增加 s-parameter 最大误差容差比

- Objective: 提供 s-parameter 峰值误差裕量指标。
- Scope (in/out):
  - in: `sparameter_max_delta_ratio` 摘要输出。
  - out: 频段阈值优化。
- Status: ✅ Completed (2026-02-14)

### 8.118 已完成 Work Unit

WU-MAINLINE-136: comparator 摘要层统一 ratio 计算

- Objective: 统一 ratio 计算口径，避免各字段逻辑漂移。
- Scope (in/out):
  - in: 在 `BuildSummary` 统一按 `delta/tolerance` 计算各 ratio 字段。
  - out: 新增结构化诊断模型。
- Status: ✅ Completed (2026-02-14)

### 8.119 已完成 Work Unit

WU-MAINLINE-137: comparator 回归断言补齐 ratio 字段

- Objective: 防止 ratio 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 overall/分类 ratio 断言。
  - out: 模糊测试。
- Status: ✅ Completed (2026-02-14)

### 8.120 已完成 Work Unit

WU-MAINLINE-138: service 回归断言补齐 ratio 字段

- Objective: 确保 service compare detail 全链路透传 ratio 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 ratio 字段断言。
  - out: gRPC 客户端显示校验。
- Status: ✅ Completed (2026-02-14)

### 8.121 已完成 Work Unit

WU-MAINLINE-139: 批次收敛与统一验证（WU128~139）

- Objective: 大批次合并后端 compare 诊断简单 WU，提升单轮产出效率。
- Scope (in/out):
  - in: 聚合 WU128~139 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU128~139):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU122~127 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall 与分类 `*_delta_ratio` 字段。
  - core/service 定向测试通过。

- Validation result (WU128~139 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.122 已完成 Work Unit

WU-MAINLINE-140: compare 成功摘要增加全局最差类别标识

- Objective: 在 matched 场景下快速识别最应优先排查的数据类别。
- Scope (in/out):
  - in: `worst_category` 摘要输出。
  - out: 自动处置建议。
- Status: ✅ Completed (2026-02-14)

### 8.123 已完成 Work Unit

WU-MAINLINE-141: compare 成功摘要增加全局最差点位索引

- Objective: 在 matched 场景下直接定位全局最差误差点。
- Scope (in/out):
  - in: `worst_max_at=point:<i>/<channel|value>:<j>` 摘要输出。
  - out: 可视化高亮。
- Status: ✅ Completed (2026-02-14)

### 8.124 已完成 Work Unit

WU-MAINLINE-142: compare 成功摘要增加全局最差频点

- Objective: 在 matched 场景下直接定位全局最差误差频点。
- Scope (in/out):
  - in: `worst_max_frequency_hz` 摘要输出。
  - out: 频段聚合告警。
- Status: ✅ Completed (2026-02-14)

### 8.125 已完成 Work Unit

WU-MAINLINE-143: compare 成功摘要增加全局最差容差比

- Objective: 快速判断全局最差误差相对容差的裕量。
- Scope (in/out):
  - in: `worst_max_delta_ratio` 摘要输出。
  - out: 动态阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.126 已完成 Work Unit

WU-MAINLINE-144: compare 成功摘要增加全局最差分量方向

- Objective: 指明全局最差误差主导于实部还是虚部。
- Scope (in/out):
  - in: `worst_max_component` 摘要输出。
  - out: 分量级补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.127 已完成 Work Unit

WU-MAINLINE-145: compare 成功摘要增加全局最差有符号偏差

- Objective: 指示全局最差误差方向，缩短排查路径。
- Scope (in/out):
  - in: `worst_max_signed_delta` 摘要输出。
  - out: 历史漂移追踪。
- Status: ✅ Completed (2026-02-14)

### 8.128 已完成 Work Unit

WU-MAINLINE-146: comparator 全局最差选择逻辑统一

- Objective: 统一从三类最大误差中选取全局最差项。
- Scope (in/out):
  - in: `BuildSummary` 内部按最大 delta 选择 worst。
  - out: 独立评分模型。
- Status: ✅ Completed (2026-02-14)

### 8.129 已完成 Work Unit

WU-MAINLINE-147: comparator 回归断言补齐 worst 字段

- Objective: 防止 worst 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_*` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.130 已完成 Work Unit

WU-MAINLINE-148: service 回归断言补齐 worst 字段

- Objective: 确保 service compare detail 全链路透传 worst 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `worst_*` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.131 已完成 Work Unit

WU-MAINLINE-149: compare 成功摘要增强可读性（worst 分组）

- Objective: 将全局最差信息集中输出，提升日志可读性。
- Scope (in/out):
  - in: `worst_*` 字段集中出现在 matched 摘要。
  - out: 结构化 proto 字段重构。
- Status: ✅ Completed (2026-02-14)

### 8.132 已完成 Work Unit

WU-MAINLINE-150: 文档同步 worst 诊断语义

- Objective: 保持 README 与计划文档和实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新本批诊断字段。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.133 已完成 Work Unit

WU-MAINLINE-151: 批次收敛与统一验证（WU140~151）

- Objective: 大批次合并后端 compare 诊断简单 WU，提升单轮闭环效率。
- Scope (in/out):
  - in: 聚合 WU140~151 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU140~151):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU128~139 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含全局最差 `worst_*` 诊断字段。
  - core/service 定向测试通过。

- Validation result (WU140~151 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.134 已完成 Work Unit

WU-MAINLINE-152: compare 成功摘要增加 worst expected 实部

- Objective: 在 matched 场景下暴露全局最差点的期望实部。
- Scope (in/out):
  - in: `worst_expected_real` 摘要输出。
  - out: 历史快照持久化。
- Status: ✅ Completed (2026-02-14)

### 8.135 已完成 Work Unit

WU-MAINLINE-153: compare 成功摘要增加 worst expected 虚部

- Objective: 在 matched 场景下暴露全局最差点的期望虚部。
- Scope (in/out):
  - in: `worst_expected_imag` 摘要输出。
  - out: 结构化复数对象输出。
- Status: ✅ Completed (2026-02-14)

### 8.136 已完成 Work Unit

WU-MAINLINE-154: compare 成功摘要增加 worst actual 实部

- Objective: 在 matched 场景下暴露全局最差点的实测实部。
- Scope (in/out):
  - in: `worst_actual_real` 摘要输出。
  - out: 实时对比可视化。
- Status: ✅ Completed (2026-02-14)

### 8.137 已完成 Work Unit

WU-MAINLINE-155: compare 成功摘要增加 worst actual 虚部

- Objective: 在 matched 场景下暴露全局最差点的实测虚部。
- Scope (in/out):
  - in: `worst_actual_imag` 摘要输出。
  - out: 结构化复数对象输出。
- Status: ✅ Completed (2026-02-14)

### 8.138 已完成 Work Unit

WU-MAINLINE-156: compare 成功摘要增加 receiver raw 最大误差点 expected/actual 快照

- Objective: 提供 receiver raw 最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `receiver_raw_max_expected_*` / `receiver_raw_max_actual_*` 摘要输出。
  - out: 通道历史趋势输出。
- Status: ✅ Completed (2026-02-14)

### 8.139 已完成 Work Unit

WU-MAINLINE-157: compare 成功摘要增加 receiver compensated 最大误差点 expected/actual 快照

- Objective: 提供补偿后最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `receiver_comp_max_expected_*` / `receiver_comp_max_actual_*` 摘要输出。
  - out: 自动补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.140 已完成 Work Unit

WU-MAINLINE-158: compare 成功摘要增加 s-parameter 最大误差点 expected/actual 快照

- Objective: 提供 s-parameter 最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `sparameter_max_expected_*` / `sparameter_max_actual_*` 摘要输出。
  - out: 端口对矩阵可视化。
- Status: ✅ Completed (2026-02-14)

### 8.141 已完成 Work Unit

WU-MAINLINE-159: comparator 观测逻辑记录最大误差点复数快照

- Objective: 统一保存各类别最大误差点的 expected/actual 复数值。
- Scope (in/out):
  - in: `Observe` 更新最大误差时同步记录复数快照。
  - out: 外部快照存储。
- Status: ✅ Completed (2026-02-14)

### 8.142 已完成 Work Unit

WU-MAINLINE-160: comparator 回归断言补齐 worst expected/actual 字段

- Objective: 防止 worst 快照字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_expected/actual` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.143 已完成 Work Unit

WU-MAINLINE-161: service 回归断言补齐 expected/actual 字段

- Objective: 确保 service compare detail 全链路透传快照字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加分类与 worst 快照断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.144 已完成 Work Unit

WU-MAINLINE-162: 文档同步 expected/actual 快照诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新快照字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.145 已完成 Work Unit

WU-MAINLINE-163: 批次收敛与统一验证（WU152~163）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持连续高产闭环。
- Scope (in/out):
  - in: 聚合 WU152~163 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU152~163):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU140~151 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 worst 与分类最大误差点 expected/actual 快照字段。
  - core/service 定向测试通过。

- Validation result (WU152~163 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.146 已完成 Work Unit

WU-MAINLINE-164: compare 成功摘要增加 receiver raw 分量优势幅度

- Objective: 量化 receiver raw 最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `receiver_raw_max_component_margin` 摘要输出。
  - out: 分量告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.147 已完成 Work Unit

WU-MAINLINE-165: compare 成功摘要增加 receiver compensated 分量优势幅度

- Objective: 量化补偿后最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `receiver_comp_max_component_margin` 摘要输出。
  - out: 自动补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.148 已完成 Work Unit

WU-MAINLINE-166: compare 成功摘要增加 s-parameter 分量优势幅度

- Objective: 量化 s-parameter 最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `sparameter_max_component_margin` 摘要输出。
  - out: 端口对统计。
- Status: ✅ Completed (2026-02-14)

### 8.149 已完成 Work Unit

WU-MAINLINE-167: compare 成功摘要增加 worst 分量优势幅度

- Objective: 量化全局最差点分量主导优势，提升优先级判断效率。
- Scope (in/out):
  - in: `worst_max_component_margin` 摘要输出。
  - out: 结构化评分模型。
- Status: ✅ Completed (2026-02-14)

### 8.150 已完成 Work Unit

WU-MAINLINE-168: comparator 统一分量优势幅度计算逻辑

- Objective: 统一分量优势幅度计算口径，避免字段间语义漂移。
- Scope (in/out):
  - in: 在 `Observe` 中以 `|abs(realDelta)-abs(imagDelta)|` 计算 margin。
  - out: 独立数学库封装。
- Status: ✅ Completed (2026-02-14)

### 8.151 已完成 Work Unit

WU-MAINLINE-169: comparator 在最大误差更新时记录 margin

- Objective: 确保各类别最大误差点同步记录 margin。
- Scope (in/out):
  - in: raw/comp/sparameter 最大值更新时同步写入 `*_component_margin`。
  - out: 历史分布存储。
- Status: ✅ Completed (2026-02-14)

### 8.152 已完成 Work Unit

WU-MAINLINE-170: worst 选择逻辑透传对应 margin

- Objective: 确保 worst 诊断组与来源类别 margin 保持一致。
- Scope (in/out):
  - in: worst 选中项同步透传 `worst_max_component_margin`。
  - out: 多指标权重合成。
- Status: ✅ Completed (2026-02-14)

### 8.153 已完成 Work Unit

WU-MAINLINE-171: comparator 回归断言补齐 margin 字段

- Objective: 防止 margin 字段后续回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_component_margin` 与 `worst_max_component_margin` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.154 已完成 Work Unit

WU-MAINLINE-172: service 回归断言补齐 margin 字段

- Objective: 确保 service compare detail 全链路透传 margin 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 margin 字段断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.155 已完成 Work Unit

WU-MAINLINE-173: 文档同步 margin 诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新 margin 字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.156 已完成 Work Unit

WU-MAINLINE-174: 批次测试验证收敛

- Objective: 对本批新增 margin 字段执行定向构建与测试回归。
- Scope (in/out):
  - in: 构建 comparator/service 目标并执行 easy 单测。
  - out: 全量测试矩阵。
- Status: ✅ Completed (2026-02-14)

### 8.157 已完成 Work Unit

WU-MAINLINE-175: 批次收敛与统一验证（WU164~175）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持高频闭环产出。
- Scope (in/out):
  - in: 聚合 WU164~175 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU164~175):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU152~163 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst `*_component_margin` 字段。
  - core/service 定向测试通过。

- Validation result (WU164~175 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.158 已完成 Work Unit

WU-MAINLINE-176: compare 成功摘要增加 receiver raw 最大误差实部绝对差

- Objective: 提供 receiver raw 最大误差点的实部绝对差。
- Scope (in/out):
  - in: `receiver_raw_max_real_delta` 摘要输出。
  - out: 通道历史趋势分析。
- Status: ✅ Completed (2026-02-14)

### 8.159 已完成 Work Unit

WU-MAINLINE-177: compare 成功摘要增加 receiver raw 最大误差虚部绝对差

- Objective: 提供 receiver raw 最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `receiver_raw_max_imag_delta` 摘要输出。
  - out: 分量热图可视化。
- Status: ✅ Completed (2026-02-14)

### 8.160 已完成 Work Unit

WU-MAINLINE-178: compare 成功摘要增加 receiver compensated 最大误差实部绝对差

- Objective: 提供补偿后最大误差点的实部绝对差。
- Scope (in/out):
  - in: `receiver_comp_max_real_delta` 摘要输出。
  - out: 自动补偿修正建议。
- Status: ✅ Completed (2026-02-14)

### 8.161 已完成 Work Unit

WU-MAINLINE-179: compare 成功摘要增加 receiver compensated 最大误差虚部绝对差

- Objective: 提供补偿后最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `receiver_comp_max_imag_delta` 摘要输出。
  - out: 分量热图可视化。
- Status: ✅ Completed (2026-02-14)

### 8.162 已完成 Work Unit

WU-MAINLINE-180: compare 成功摘要增加 s-parameter 最大误差实部绝对差

- Objective: 提供 s-parameter 最大误差点的实部绝对差。
- Scope (in/out):
  - in: `sparameter_max_real_delta` 摘要输出。
  - out: 端口对分量统计。
- Status: ✅ Completed (2026-02-14)

### 8.163 已完成 Work Unit

WU-MAINLINE-181: compare 成功摘要增加 s-parameter 最大误差虚部绝对差

- Objective: 提供 s-parameter 最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `sparameter_max_imag_delta` 摘要输出。
  - out: 端口对分量统计。
- Status: ✅ Completed (2026-02-14)

### 8.164 已完成 Work Unit

WU-MAINLINE-182: compare 成功摘要增加 worst 最大误差实部绝对差

- Objective: 提供全局最差点实部绝对差，提升优先排查效率。
- Scope (in/out):
  - in: `worst_max_real_delta` 摘要输出。
  - out: 告警分级策略。
- Status: ✅ Completed (2026-02-14)

### 8.165 已完成 Work Unit

WU-MAINLINE-183: compare 成功摘要增加 worst 最大误差虚部绝对差

- Objective: 提供全局最差点虚部绝对差，补齐误差构成信息。
- Scope (in/out):
  - in: `worst_max_imag_delta` 摘要输出。
  - out: 告警分级策略。
- Status: ✅ Completed (2026-02-14)

### 8.166 已完成 Work Unit

WU-MAINLINE-184: comparator 摘要层统一实虚绝对差计算

- Objective: 统一通过 expected/actual 计算实虚绝对差，避免口径漂移。
- Scope (in/out):
  - in: `BuildSummary` 内按 `abs(actual-expected)` 输出 real/imag delta。
  - out: 独立数学库封装。
- Status: ✅ Completed (2026-02-14)

### 8.167 已完成 Work Unit

WU-MAINLINE-185: raw/comp/sparam 最大误差块补齐实虚差输出

- Objective: 在分类最大误差块内补齐实虚差字段。
- Scope (in/out):
  - in: 三类 `*_max_real_delta` / `*_max_imag_delta` 输出。
  - out: 结构化字段改造。
- Status: ✅ Completed (2026-02-14)

### 8.168 已完成 Work Unit

WU-MAINLINE-186: worst 诊断块补齐实虚差输出

- Objective: 在 worst 诊断块补齐实虚差字段。
- Scope (in/out):
  - in: `worst_max_real_delta` / `worst_max_imag_delta` 输出。
  - out: 结构化字段改造。
- Status: ✅ Completed (2026-02-14)

### 8.169 已完成 Work Unit

WU-MAINLINE-187: comparator 回归断言补齐实虚差字段

- Objective: 防止实虚差字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加分类与 worst 实虚差断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.170 已完成 Work Unit

WU-MAINLINE-188: service 回归断言补齐实虚差字段

- Objective: 确保 service compare detail 全链路透传实虚差字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加相关断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.171 已完成 Work Unit

WU-MAINLINE-189: 文档同步实虚差诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.172 已完成 Work Unit

WU-MAINLINE-190: 批次测试验证收敛

- Objective: 对本批新增实虚差字段执行定向构建与测试回归。
- Scope (in/out):
  - in: 构建 comparator/service 目标并运行 easy 单测。
  - out: 全量测试矩阵。
- Status: ✅ Completed (2026-02-14)

### 8.173 已完成 Work Unit

WU-MAINLINE-191: 批次收敛与统一验证（WU176~191）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持高频闭环产出。
- Scope (in/out):
  - in: 聚合 WU176~191 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU176~191):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU164~175 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_real_delta` / `*_max_imag_delta` 字段。
  - core/service 定向测试通过。

- Validation result (WU176~191 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.174 已完成 Work Unit

WU-MAINLINE-192: 插件频域预览根因定位（单点退化）

- Objective: 明确频域预览仅单点显示的根因。
- Scope (in/out):
  - in: 定位插件请求未携带 `start/stop/sweepPointCount` 导致后端回退单点。
  - out: 后端扫频算法重构。
- Status: ✅ Completed (2026-02-14)

### 8.175 已完成 Work Unit

WU-MAINLINE-193: ServiceClient 增加 CW 扫频配置构造函数

- Objective: 统一插件侧 CW 扫频请求参数构造。
- Scope (in/out):
  - in: 新增 `buildCwExcitationFromSampleCount`。
  - out: 用户可配置扫频 span。
- Status: ✅ Completed (2026-02-14)

### 8.176 已完成 Work Unit

WU-MAINLINE-194: Acquire Once 使用扫频配置

- Objective: 让 `Acquire Once` 在频域下返回多点结果。
- Scope (in/out):
  - in: `acquireOnce` 的 CW 请求改为扫频参数。
  - out: 命令交互改版。
- Status: ✅ Completed (2026-02-14)

### 8.177 已完成 Work Unit

WU-MAINLINE-195: Preview Waveform snapshot 使用扫频配置

- Objective: 修复 `Preview Waveform` snapshot 频域仅单点问题。
- Scope (in/out):
  - in: `acquireWaveform` 频域请求改为扫频参数。
  - out: trace 渲染逻辑重写。
- Status: ✅ Completed (2026-02-14)

### 8.178 已完成 Work Unit

WU-MAINLINE-196: Preview Waveform live 使用扫频配置

- Objective: 修复 `Preview Waveform` live 频域仅单点问题。
- Scope (in/out):
  - in: `streamWaveform` 频域请求改为扫频参数。
  - out: live 节流策略调整。
- Status: ✅ Completed (2026-02-14)

### 8.179 已完成 Work Unit

WU-MAINLINE-197: Stream Preview 使用扫频配置

- Objective: 让 `Stream Preview` 频域帧点数与 `sampleCount` 对齐为多点。
- Scope (in/out):
  - in: `streamPreview` 的 CW 请求改为扫频参数。
  - out: 进度提示格式调整。
- Status: ✅ Completed (2026-02-14)

### 8.180 已完成 Work Unit

WU-MAINLINE-198: 新增 ServiceClient 扫频配置单测

- Objective: 为扫频参数构造逻辑提供稳定回归保障。
- Scope (in/out):
  - in: 新增 `serviceClient.test.ts`，覆盖 `sweepPointCount` 边界。
  - out: gRPC 集成级插件测试。
- Status: ✅ Completed (2026-02-14)

### 8.181 已完成 Work Unit

WU-MAINLINE-199: 插件测试脚本接入新增单测

- Objective: 将新单测纳入 `npm test` 默认回归链路。
- Scope (in/out):
  - in: 更新 `package.json` test 脚本。
  - out: 引入新测试框架。
- Status: ✅ Completed (2026-02-14)

### 8.182 已完成 Work Unit

WU-MAINLINE-200: 插件 README 同步频域多点行为

- Objective: 文档化频域预览已支持多点扫频。
- Scope (in/out):
  - in: 更新 extension README 的 `Preview Waveform` 说明。
  - out: 长文档重构。
- Status: ✅ Completed (2026-02-14)

### 8.183 已完成 Work Unit

WU-MAINLINE-201: UI 框架文档同步频域多点行为

- Objective: 保持 `framework-ui.md` 与插件实际行为一致。
- Scope (in/out):
  - in: 增补 CW 预览自动扫频说明。
  - out: 视觉规范调整。
- Status: ✅ Completed (2026-02-14)

### 8.184 已完成 Work Unit

WU-MAINLINE-202: 主 README 同步本批修复进展

- Objective: 在项目总览文档记录该修复能力。
- Scope (in/out):
  - in: 增加 WU192~203 进展摘要。
  - out: 非本批能力重排。
- Status: ✅ Completed (2026-02-14)

### 8.185 已完成 Work Unit

WU-MAINLINE-203: 批次收敛与统一验证（WU192~203）

- Objective: 合并本批插件修复 WU 并完成统一回归。
- Scope (in/out):
  - in: 聚合代码/测试/文档并统一验证。
  - out: 后端 compare 契约变更。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU192~203):
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/test/serviceClient.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅请求参数构造与前端文档更新）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复修复前插件请求配置。
- Risks: 频域 sweep span 当前为固定值（100MHz），后续如需精细控制可再配置化。
- Acceptance criteria:
  - `Preview Waveform` 频域 `snapshot/live` 返回多点。
  - `Stream Preview` 频域返回多点。
  - 插件测试通过。

- Validation result (WU192~203 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.186 已完成 Work Unit

WU-MAINLINE-204: compare 成功摘要增加 receiver raw 总点数字段

- Objective: 为点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `receiver_raw_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.187 已完成 Work Unit

WU-MAINLINE-205: compare 成功摘要增加 receiver compensated 总点数字段

- Objective: 为补偿通道点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `receiver_comp_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.188 已完成 Work Unit

WU-MAINLINE-206: compare 成功摘要增加 s-parameter 总点数字段

- Objective: 为 s-parameter 点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `sparameter_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.189 已完成 Work Unit

WU-MAINLINE-207: compare 成功摘要增加 receiver raw 最大点位比例

- Objective: 快速判断 raw 最大误差点在扫频序列中的相对位置。
- Scope (in/out):
  - in: `receiver_raw_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.190 已完成 Work Unit

WU-MAINLINE-208: compare 成功摘要增加 receiver compensated 最大点位比例

- Objective: 快速判断 compensated 最大误差点相对位置。
- Scope (in/out):
  - in: `receiver_comp_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.191 已完成 Work Unit

WU-MAINLINE-209: compare 成功摘要增加 s-parameter 最大点位比例

- Objective: 快速判断 s-parameter 最大误差点相对位置。
- Scope (in/out):
  - in: `sparameter_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.192 已完成 Work Unit

WU-MAINLINE-210: compare 成功摘要增加 worst 总点数字段

- Objective: 为全局最差点位比例提供分母信息。
- Scope (in/out):
  - in: `worst_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.193 已完成 Work Unit

WU-MAINLINE-211: compare 成功摘要增加 worst 最大点位比例

- Objective: 直接判断全局最差误差点位于扫频前中后段。
- Scope (in/out):
  - in: `worst_max_point_ratio` 摘要输出。
  - out: 动态优先级策略。
- Status: ✅ Completed (2026-02-14)

### 8.194 已完成 Work Unit

WU-MAINLINE-212: comparator 统一点位比例计算口径

- Objective: 统一点位比例计算（`index/(total-1)`），避免字段口径漂移。
- Scope (in/out):
  - in: `BuildSummary` 内集中计算 point ratio。
  - out: 独立工具函数抽取。
- Status: ✅ Completed (2026-02-14)

### 8.195 已完成 Work Unit

WU-MAINLINE-213: comparator 回归断言补齐点位比例字段

- Objective: 防止点位比例字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_total_points` / `*_max_point_ratio` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.196 已完成 Work Unit

WU-MAINLINE-214: service 回归断言补齐点位比例字段

- Objective: 确保 service compare detail 全链路透传点位比例字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加相关断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.197 已完成 Work Unit

WU-MAINLINE-215: 批次收敛与统一验证（WU204~215）

- Objective: 合并后端 compare 诊断简单 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU204~215 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU204~215):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU192~203 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_total_points` / `*_max_point_ratio` 字段。
  - core/service 定向测试通过。

- Validation result (WU204~215 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.198 已完成 Work Unit

WU-MAINLINE-216: compare 成功摘要增加 overall 最大误差容差裕量

- Objective: 直接给出最大误差距离容差上限的剩余量。
- Scope (in/out):
  - in: `max_component_tolerance_margin` 摘要输出。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.199 已完成 Work Unit

WU-MAINLINE-217: compare 成功摘要增加 overall RMS 容差裕量

- Objective: 直接给出 RMS 误差距离容差上限的剩余量。
- Scope (in/out):
  - in: `rms_component_tolerance_margin` 摘要输出。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.200 已完成 Work Unit

WU-MAINLINE-218: compare 成功摘要增加 receiver raw 最大误差容差裕量

- Objective: 评估 raw 类别最大误差的容差余量。
- Scope (in/out):
  - in: `receiver_raw_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

### 8.201 已完成 Work Unit

WU-MAINLINE-219: compare 成功摘要增加 receiver compensated 最大误差容差裕量

- Objective: 评估 compensated 类别最大误差的容差余量。
- Scope (in/out):
  - in: `receiver_comp_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

### 8.202 已完成 Work Unit

WU-MAINLINE-220: compare 成功摘要增加 s-parameter 最大误差容差裕量

- Objective: 评估 s-parameter 类别最大误差的容差余量。
- Scope (in/out):
  - in: `sparameter_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

### 8.203 已完成 Work Unit

WU-MAINLINE-221: compare 成功摘要增加 worst 最大误差容差裕量

- Objective: 直接评估全局最差误差点距容差上限余量。
- Scope (in/out):
  - in: `worst_max_tolerance_margin` 摘要输出。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.204 已完成 Work Unit

WU-MAINLINE-222: core/service 回归断言补齐容差裕量字段

- Objective: 防止容差裕量字段在后续迭代回归丢失。
- Scope (in/out):
  - in: core/service compare detail 测试新增 `*_tolerance_margin` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.205 已完成 Work Unit

WU-MAINLINE-223: 批次收敛与统一验证（WU216~223）

- Objective: 合并 compare 容差裕量诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU216~223 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU216~223):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU204~215 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall/分类/worst 的 `*_tolerance_margin` 字段。
  - core/service 定向测试通过。

- Validation result (WU216~223 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.206 已完成 Work Unit

WU-MAINLINE-224: compare 成功摘要增加 receiver raw 最大点位分段字段

- Objective: 识别 raw 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `receiver_raw_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.207 已完成 Work Unit

WU-MAINLINE-225: compare 成功摘要增加 receiver compensated 最大点位分段字段

- Objective: 识别 compensated 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `receiver_comp_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.208 已完成 Work Unit

WU-MAINLINE-226: compare 成功摘要增加 s-parameter 最大点位分段字段

- Objective: 识别 s-parameter 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `sparameter_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.209 已完成 Work Unit

WU-MAINLINE-227: compare 成功摘要增加 worst 最大点位分段字段

- Objective: 识别全局最差误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `worst_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.210 已完成 Work Unit

WU-MAINLINE-228: comparator 抽象统一分段口径

- Objective: 统一 point ratio 到 point zone 的区间划分口径。
- Scope (in/out):
  - in: 统一函数 `PointZoneFromRatio`（`front/middle/back`）。
  - out: 外部可配置分段阈值。
- Status: ✅ Completed (2026-02-14)

### 8.211 已完成 Work Unit

WU-MAINLINE-229: core 回归断言补齐分段字段

- Objective: 防止 point zone 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_max_point_zone` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.212 已完成 Work Unit

WU-MAINLINE-230: service 回归断言补齐分段字段

- Objective: 确保 compare detail 全链路透传 point zone 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `*_max_point_zone` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.213 已完成 Work Unit

WU-MAINLINE-231: 批次收敛与统一验证（WU224~231）

- Objective: 合并 point zone 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU224~231 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU224~231):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU216~223 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_point_zone` 字段。
  - core/service 定向测试通过。

- Validation result (WU224~231 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.214 已完成 Work Unit

WU-MAINLINE-232: compare 成功摘要增加 overall 最大误差风险分级

- Objective: 给出 overall 最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `max_component_risk_level` 摘要输出（`low/medium/high`）。
  - out: 可配置风险阈值。
- Status: ✅ Completed (2026-02-14)

### 8.215 已完成 Work Unit

WU-MAINLINE-233: compare 成功摘要增加 overall RMS 风险分级

- Objective: 给出 overall RMS 误差相对容差的风险等级。
- Scope (in/out):
  - in: `rms_component_risk_level` 摘要输出（`low/medium/high`）。
  - out: 可配置风险阈值。
- Status: ✅ Completed (2026-02-14)

### 8.216 已完成 Work Unit

WU-MAINLINE-234: compare 成功摘要增加 receiver raw 最大误差风险分级

- Objective: 给出 raw 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `receiver_raw_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.217 已完成 Work Unit

WU-MAINLINE-235: compare 成功摘要增加 receiver compensated 最大误差风险分级

- Objective: 给出 compensated 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `receiver_comp_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.218 已完成 Work Unit

WU-MAINLINE-236: compare 成功摘要增加 s-parameter 最大误差风险分级

- Objective: 给出 s-parameter 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `sparameter_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.219 已完成 Work Unit

WU-MAINLINE-237: compare 成功摘要增加 worst 最大误差风险分级

- Objective: 给出全局最差误差点相对容差的风险等级。
- Scope (in/out):
  - in: `worst_max_risk_level` 摘要输出。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.220 已完成 Work Unit

WU-MAINLINE-238: comparator 统一风险分级口径

- Objective: 统一 delta ratio 到 risk level 的分级口径。
- Scope (in/out):
  - in: 统一函数 `RiskLevelFromRatio`（`low/medium/high`）。
  - out: 外部可配置阈值。
- Status: ✅ Completed (2026-02-14)

### 8.221 已完成 Work Unit

WU-MAINLINE-239: 批次收敛与统一验证（WU232~239）

- Objective: 合并 risk level 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU232~239 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU232~239):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU224~231 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall/分类/worst 的 `*_risk_level` 字段。
  - core/service 定向测试通过。

- Validation result (WU232~239 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.222 已完成 Work Unit

WU-MAINLINE-240: compare 成功摘要增加 receiver raw 联合画像字段

- Objective: 统一表达 raw 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `receiver_raw_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.223 已完成 Work Unit

WU-MAINLINE-241: compare 成功摘要增加 receiver compensated 联合画像字段

- Objective: 统一表达 compensated 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `receiver_comp_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.224 已完成 Work Unit

WU-MAINLINE-242: compare 成功摘要增加 s-parameter 联合画像字段

- Objective: 统一表达 s-parameter 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `sparameter_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.225 已完成 Work Unit

WU-MAINLINE-243: compare 成功摘要增加 worst 联合画像字段

- Objective: 统一表达全局最差点的风险等级与区段信息。
- Scope (in/out):
  - in: `worst_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.226 已完成 Work Unit

WU-MAINLINE-244: comparator 统一 profile 组合口径

- Objective: 统一 risk level 与 point zone 的组合规则。
- Scope (in/out):
  - in: 统一函数 `BuildRiskZoneProfile`（`risk + '/' + zone`）。
  - out: 外部可配置 profile 模板。
- Status: ✅ Completed (2026-02-14)

### 8.227 已完成 Work Unit

WU-MAINLINE-245: core 回归断言补齐 profile 字段

- Objective: 防止 profile 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_max_profile` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.228 已完成 Work Unit

WU-MAINLINE-246: service 回归断言补齐 profile 字段

- Objective: 确保 compare detail 全链路透传 profile 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `*_max_profile` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.229 已完成 Work Unit

WU-MAINLINE-247: 批次收敛与统一验证（WU240~247）

- Objective: 合并 profile 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU240~247 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU240~247):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU232~239 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_profile` 字段。
  - core/service 定向测试通过。

- Validation result (WU240~247 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.230 已完成 Work Unit

WU-MAINLINE-248: compare 成功摘要增加 worst digest 字段

- Objective: 提供可直接用于日志检索的最差点摘要短串。
- Scope (in/out):
  - in: `worst_digest` 摘要输出。
  - out: 外部告警系统索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.231 已完成 Work Unit

WU-MAINLINE-249: comparator 统一 worst digest 组装口径

- Objective: 统一 digest 字段格式，避免后续拼接漂移。
- Scope (in/out):
  - in: 统一函数 `BuildWorstDigest`（`category|profile|point/sub-index`）。
  - out: 可配置 digest 模板。
- Status: ✅ Completed (2026-02-14)

### 8.232 已完成 Work Unit

WU-MAINLINE-250: worst digest 含风险与区段上下文

- Objective: digest 中包含 `risk/zone` 联合画像，增强可读性。
- Scope (in/out):
  - in: digest 使用 `worst_max_profile`。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.233 已完成 Work Unit

WU-MAINLINE-251: worst digest 区分 channel/value 子索引

- Objective: digest 明确区分接收机通道与 S 参数矩阵值索引。
- Scope (in/out):
  - in: `cY` 与 `vY` 子索引编码。
  - out: 结构化子索引字段化。
- Status: ✅ Completed (2026-02-14)

### 8.234 已完成 Work Unit

WU-MAINLINE-252: core 回归断言补齐 worst digest 字段

- Objective: 防止 worst digest 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_digest` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.235 已完成 Work Unit

WU-MAINLINE-253: service 回归断言补齐 worst digest 字段

- Objective: 确保 compare detail 全链路透传 worst digest 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `worst_digest` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.236 已完成 Work Unit

WU-MAINLINE-254: README 同步 worst digest 能力说明

- Objective: 对外说明 worst digest 字段语义与用途。
- Scope (in/out):
  - in: README 新增进展说明。
  - out: 独立设计文档章节。
- Status: ✅ Completed (2026-02-14)

### 8.237 已完成 Work Unit

WU-MAINLINE-255: 批次收敛与统一验证（WU248~255）

- Objective: 合并 worst digest 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU248~255 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU248~255):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU240~247 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 `worst_digest` 字段。
  - core/service 定向测试通过。

- Validation result (WU248~255 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.238 已完成 Work Unit

WU-MAINLINE-256: compare 成功摘要增加 receiver raw digest 字段

- Objective: 提供 raw 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `receiver_raw_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.239 已完成 Work Unit

WU-MAINLINE-257: compare 成功摘要增加 receiver compensated digest 字段

- Objective: 提供 compensated 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `receiver_comp_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.240 已完成 Work Unit

WU-MAINLINE-258: compare 成功摘要增加 s-parameter digest 字段

- Objective: 提供 s-parameter 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `sparameter_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.241 已完成 Work Unit

WU-MAINLINE-259: compare 成功摘要增加 overall digest 字段

- Objective: 提供全局检索入口短串，统一聚合口径。
- Scope (in/out):
  - in: `overall_digest` 摘要输出。
  - out: 外部告警路由策略。
- Status: ✅ Completed (2026-02-14)

### 8.242 已完成 Work Unit

WU-MAINLINE-260: comparator 统一分类 digest 组装口径

- Objective: 复用统一函数，避免分类 digest 格式漂移。
- Scope (in/out):
  - in: 统一通过 `BuildWorstDigest` 组装分类 digest。
  - out: 可配置 digest 模板。
- Status: ✅ Completed (2026-02-14)

### 8.243 已完成 Work Unit

WU-MAINLINE-261: core 回归断言补齐 digest 一致化字段

- Objective: 防止分类/overall digest 在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 digest 字段断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.244 已完成 Work Unit

WU-MAINLINE-262: service 回归断言补齐 digest 一致化字段

- Objective: 确保 compare detail 全链路透传 digest 一致化字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 digest 字段断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.245 已完成 Work Unit

WU-MAINLINE-263: 批次收敛与统一验证（WU256~263）

- Objective: 合并 digest 一致化诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU256~263 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU256~263):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU248~255 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类 digest 与 `overall_digest` 字段。
  - core/service 定向测试通过。

- Validation result (WU256~263 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.246 已完成 Work Unit

WU-MAINLINE-264: compare 成功摘要固定输出 receiver raw digest 键序

- Objective: 固定 digest 关键字段顺序，减少文本 diff 噪声。
- Scope (in/out):
  - in: `receiver_raw_digest` 固定在 digest 区段首位输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.247 已完成 Work Unit

WU-MAINLINE-265: compare 成功摘要固定输出 receiver compensated digest 键序

- Objective: 保持 digest 区段中 receiver compensated 字段位置稳定。
- Scope (in/out):
  - in: `receiver_comp_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.248 已完成 Work Unit

WU-MAINLINE-266: compare 成功摘要固定输出 s-parameter digest 键序

- Objective: 保持 digest 区段中 s-parameter 字段位置稳定。
- Scope (in/out):
  - in: `sparameter_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.249 已完成 Work Unit

WU-MAINLINE-267: compare 成功摘要固定输出 worst digest 键序

- Objective: 保持 digest 区段中 worst 字段位置稳定。
- Scope (in/out):
  - in: `worst_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.250 已完成 Work Unit

WU-MAINLINE-268: compare 成功摘要固定输出 overall digest 键序

- Objective: 保持 digest 区段中 overall 字段位置稳定并作为收束键。
- Scope (in/out):
  - in: `overall_digest` 固定末位输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.251 已完成 Work Unit

WU-MAINLINE-269: comparator 去除条件分支内重复 digest 输出

- Objective: 避免重复输出导致的键序漂移与噪声。
- Scope (in/out):
  - in: digest 输出统一收敛到基础区段。
  - out: 其它字段重构。
- Status: ✅ Completed (2026-02-14)

### 8.252 已完成 Work Unit

WU-MAINLINE-270: core/service 回归补齐 digest 键序断言

- Objective: 防止后续迭代破坏固定键序约束。
- Scope (in/out):
  - in: core/service 测试新增 digest 键顺序断言。
  - out: 全字段顺序快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.253 已完成 Work Unit

WU-MAINLINE-271: 批次收敛与统一验证（WU264~271）

- Objective: 合并 digest 键序稳定化轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU264~271 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU264~271):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU256~263 输出形态。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情中的 digest 字段保持固定顺序输出。
  - core/service 定向测试通过。

- Validation result (WU264~271 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.254 已完成 Work Unit

WU-MAINLINE-272: compare 成功摘要增加版本与兼容元信息

- Objective: 为 compare detail 解析器演进提供稳定版本识别入口。
- Scope (in/out):
  - in: 新增 `summary_version`、`summary_schema`、`summary_compat` 字段。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.255 已完成 Work Unit

WU-MAINLINE-273: core/service 回归覆盖 summary 元信息字段

- Objective: 防止 summary 元信息字段在后续迭代回归丢失。
- Scope (in/out):
  - in: core/service compare detail 测试增加元信息字段断言。
  - out: 全字段顺序快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.256 已完成 Work Unit

WU-MAINLINE-274: 批次收敛与统一验证（WU272~274）

- Objective: 按粗粒度 WU 模式完成本批代码/测试/文档闭环。
- Scope (in/out):
  - in: 聚合本批改动并完成定向回归验证。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU272~274):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（detail 文本语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU264~271 输出形态。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 `summary_version/summary_schema/summary_compat`。
  - core/service 定向测试通过。

- Validation result (WU272~274 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

---

*版本：v2.0（AI Agent 执行版） | 日期：2026-02-13*
