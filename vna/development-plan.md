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
|--------|------|------|
| P0.1 | 定义 `proto/vna.proto`（含时域与激励） | `proto/vna.proto` |
| P0.2 | 生成 C++/TS stub | `generated/cpp`, `generated/ts` |
| P0.3 | 建立 mock service（含时域 mock） | `src/service/mock_server.cpp` |
| P0.4 | 定义 `ExcitationConfig` / `AcquisitionResult` | `include/core/excitation_mode.h`, `include/core/measurement_data.h` |
| P0.5 | 硬件抽象接口与驱动工厂 | `include/core/hardware_driver.h`, `src/core/hardware_driver_factory.*` |
| P0.6 | PXI/USB mock driver | `src/drivers/pxi_driver.*`, `src/drivers/usb_vna_driver.*` |
| P0.7 | TimeDomainProcessor stub | `src/core/processors/time_domain_processor.*` |
| P0.8 | TriggerChainValidator 接口 | `include/core/trigger_chain_validator.h` |

**里程碑 M0**：前端可调用 mock 服务，覆盖 `ValidateTopology` 与流式数据接口。

---

### Phase 1（4-6 周）— Core 能力稳定

**目标**：形成可测试、可复用的 `vna-core-lib`。

| 任务ID | 内容 | 产出 |
|--------|------|------|
| P1.1 | TopologyManager 实现与验证 | `src/core/topology_manager.*` |
| P1.2 | HardwareCoordinator（基于 driver 抽象） | `src/core/hardware_coordinator.*` |
| P1.3 | MeasurementPipeline（频域+时域路由） | `src/core/measurement_pipeline.*` |
| P1.4 | CalibrationSession 与 CalibrationDB | `src/core/calibration_session.*` |
| P1.5 | PluginManager（依赖解析/生命周期） | `src/core/plugin_manager.*` |
| P1.6 | ResourceManager（租约/冲突/回收） | `src/core/resource_manager.*` |
| P1.7 | Core 单元测试与覆盖率提升 | `tests/core/*` |

**里程碑 M1**：`vna-core-lib` 稳定，单测覆盖率 ≥ 80%。

---

### Phase 2（2 周）— Service 化与集成

**目标**：形成可部署后端服务。

| 任务ID | 内容 | 产出 |
|--------|------|------|
| P2.1 | VnaControlService | `src/service/vna_control_service.*` |
| P2.2 | ResourceBrokerService | `src/service/resource_broker_service.*` |
| P2.3 | 进程管理与健康检查 | `src/service/process_manager.*` |
| P2.4 | 配置加载（端口/TLS/日志） | `config/service.yaml` |
| P2.5 | 集成测试（协议与资源流） | `tests/integration/*` |

**里程碑 M2**：`vna-core-service` 可独立运行，主接口可通过自动化测试。

---

### Phase 3A（4-6 周）— Qt 客户端闭环

**目标**：完成操作员向 UI 的完整流程。

- MainWindow / Workspace / Topology / Measurement / Plot / Calibration / Diagnostics
- 与 gRPC 后端联调
- UI 回归测试

**里程碑 M3A**：Qt UI 可完成“拓扑配置 → 测量 → 结果显示 → 保存”。

---

### Phase 3B（4-6 周）— VS Code 扩展闭环

**目标**：完成开发者向工作流（脚本/自动化）。

- Extension Core / grpc-web client / webviews
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

---

*版本：v2.0（AI Agent 执行版） | 日期：2026-02-12*