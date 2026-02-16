# xswl-zap-vna — 开发计划（AI Agent 执行版 v2.0）

> 目标：本项目由 AI Agent 主导开发，建立“可持续迭代、可验证、可回滚”的执行体系。

## 文档拆分导航（2026-02-15）

为降低超长文档维护成本，已新增分层计划目录：

- 总索引：`vna/docs/plan/README.md`
- 治理规则：`vna/docs/plan/governance.md`
- 近期执行：`vna/docs/plan/recent-execution.md`
- 分阶段计划：`vna/docs/plan/phase-0.md` ~ `vna/docs/plan/phase-4.md`
- 归档分卷：`vna/docs/plan/archive-index.md`

## 最新进展（2026-02-15）

- 已新增工作区拓扑配置主链路（后端 + gRPC + VS Code 扩展）：支持按 workspace 保存/加载/列表/激活拓扑配置。
- 已新增 `XSWL: Edit Workspace Topology` Webview 编辑器，并升级为可视化 Card + Ports 拓扑配置模式（非手写 YAML 为主），用于 UI 方式编辑工作区拓扑并执行配置流程。

## 最新进展（2026-02-16）

- **WU-101（完成）**：契约先行，新增锁与 precheck 协议（owner/ttl/fencing/conflict + `PrecheckWorkspaceTopology`）。
- **WU-102（完成）**：服务侧落地最小可用互斥能力（内存锁表 + precheck 实现），并补并发冲突测试。
- **WU-103（完成）**：VS Code 扩展接入保存前 best-effort precheck（服务不支持时自动回退旧路径）。
- **WU-104（完成）**：控制中心/工作区编辑器接入结构化冲突展示、重试保存、只读打开、只读退出与状态透出（`READONLY` / `active-readonly`）。
- **WU-105（完成）**：文档同步更新（架构/UI/计划），确保实现与文档口径一致。
- **WU-106（完成）**：补齐 gRPC 适配层（`VnaControl.PrecheckWorkspaceTopology` + `ResourceBroker` 锁服务），并新增适配层回归测试。
- **WU-107（完成）**：扩展侧接入 `GetLockSnapshot` 诊断链路（client + control center + workspace editor），支持冲突后查看实时锁占用者。
- **WU-108（完成）**：工作区编辑器 precheck 冲突链路升级为“按全部冲突资源批量拉取锁快照并聚合提示”，减少二次操作并提升冲突定位效率。
- **WU-109（完成）**：Control Center 预检冲突面板升级为按资源/持有者分组排序展示，并对锁快照结果执行同口径聚合，提升多冲突场景可读性。
- **WU-110（完成）**：Control Center 冲突诊断新增“一键复制摘要”（含剪贴板降级路径），便于工单/IM 快速协同。
- **WU-111（完成）**：Control Center 诊断区新增上下文元信息（workspace/topology/更新时间/冲突与 lease 计数），提升问题追踪可审计性。

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

- `vna/development-plan-ai-guide.md`（AI 执行统一入口：文档分层、当前优先级、阅读顺序）
- `vna/ai-engineering-framework.md`
- `vna/framework.md`
- `vna/framework-ui.md`
- `vna/archives/docs/architecture-feasibility-assessment.md`

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

- 已迁移至：`vna/docs/plan/recent-execution.md`
- 维护口径：后续新增近期执行项优先更新上述文件；本文件仅保留归档索引入口。

### 8.0 归档分卷导航

- 分卷总索引：`vna/docs/plan/archive-index.md`
- 分卷明细：`vna/docs/plan/archive-part-01.md` ~ `vna/docs/plan/archive-part-08.md`

### 8.1 已完成 Work Unit（归档）

- 本区块已完成实体迁移至分卷文档。
- 分卷总索引：`vna/docs/plan/archive-index.md`
- 分卷明细：`vna/docs/plan/archive-part-01.md` ~ `vna/docs/plan/archive-part-08.md`

> 维护约定：新增归档优先在对应 `archive-part-*.md` 维护，并同步更新 `archive-index.md`。
