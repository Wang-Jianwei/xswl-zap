# xswl-zap-vna — AI 深度开发导航（统一入口）

> 目标：把“文档多、状态散、任务难追踪”收敛为一个可执行入口，供 AI Agent 与开发者按同一口径推进。
> 
> 适用阶段：Pre-GA（未正式发布，优先删旧用新，不保留兼容层）。

---

## 1. 推荐阅读顺序（先看这里）

1. 本文档：`vna/development-plan-ai-guide.md`（统一导航 + 当前优先级）
2. 计划索引：`vna/docs/plan/README.md`（日常编辑入口）
3. 执行主计划：`vna/development-plan.md`（主入口 + 历史归档）
4. 近期执行清单：`vna/docs/plan/recent-execution.md`（高频更新区）
5. 架构边界：`vna/framework.md`、`vna/framework-ui.md`
6. 工程约束：`vna/ai-engineering-framework.md` + `.github/copilot-instructions.md`
7. 市场功能参考：`vna/vna-features-inventory.md`（仅做能力池，不作为实现状态）
8. 归档分卷索引：`vna/docs/plan/archive-index.md`（8.x 历史快速定位）

---

## 2. 文档分层与职责（Single Source of Truth）

| 层级 | 文档 | 作用 | 是否状态真源 |
|---|---|---|---|
| L0 导航层 | `vna/development-plan-ai-guide.md` | AI 执行入口、优先级、文档使用顺序 | ✅ |
| L0.5 计划索引层 | `vna/docs/plan/README.md` | 计划分文档入口与维护约定 | ✅ |
| L1 计划层 | `vna/development-plan.md` | Work Unit 计划、状态、验证结果、风险回滚 | ✅ |
| L2 架构层 | `vna/framework.md` / `vna/framework-ui.md` | 模块边界、接口职责、UI 交互设计 | ✅（设计真源） |
| L2 规范层 | `vna/ai-engineering-framework.md` / `.github/copilot-instructions.md` | Agent 行为、质量门禁、DoD | ✅（流程真源） |
| L3 参考层 | `vna/vna-features-inventory.md` | 行业功能池、长期能力地图 | ❌（非当前实现状态） |
| L3 历史层 | `vna/docs/plan/archive-index.md`、`archive-part-*.md`、`vna/archives/reports/*` | 追溯证据与审计 | ❌ |

> 规则：
> - “是否已完成”只写在 `development-plan.md`。
> - “怎么设计”只写在 `framework*.md`。
> - “行业有哪些功能”只在 `vna-features-inventory.md` 维护。

---

## 3. 当前能力分层（面向 AI 任务拆解）

### 3.1 已形成主链路 MVP（可继续加深）

- gRPC 基础服务链路：`ValidateTopology` / `GetServiceStatus` / `Acquire` / `StreamAcquisition`
- 导出与回放比对链路：JSON 导出、`ImportAcquisition`、`CompareImportedAcquisition`
- 批量对比工程化：batch compare 报告生成、schema/语义校验、gate 消费与 strict/ci 约束
- VS Code 扩展主线：基础采集、流式预览、波形可视、比对与批量操作入口
- 多实例最小闭环：双实例并行采集与基础隔离能力

### 3.2 部分完成（需收敛为应用级闭环）

- 仪器连接生态：mock/PXI 已有，真实 VISA/GPIB/USB/LAN 互操作待补齐
- 基本测量体系：最小采集能力可用，完整扫频参数与 S 参数应用层流程仍需扩展
- 插件化：已有基础机制，完整动态库插件生命周期与治理能力待完善
- 日志与诊断：关键路径已有增强，全局统一日志/指标规范仍需收敛

### 3.3 关键缺口（MUST 视角）

- 校准与补偿完整闭环（SOLT/TRL、去嵌入、实例级复用）
- 导入导出完整矩阵（Touchstone/MAT + 报告链路一致性）
- UI 产品闭环（Qt 主客户端流程 + 报告输出）
- 发布与运营能力（安装包、VSIX 流程、端到端验收）

---

## 4. 下一阶段优先级（建议按批次推进）

### P0（先做，直接影响“主应用可用”）

1. 校准与去嵌入主流程闭环（core + service + grpc + 回归）
2. 真实仪器连接最小闭环（至少 1 条 VISA 路径）
3. 数据导入导出闭环完善（Touchstone/MAT + 互验）

### P1（增强“稳定可交付”）

1. 多仪器同步触发与观测（指标、日志、对齐诊断）
2. 插件生命周期治理（加载失败回退、冲突检测、版本握手）
3. 批量自动化主入口收敛（一键生成 + 校验 + gate）

### P2（形成“完整应用体验”）

1. Qt 客户端闭环（拓扑 → 测量 → 显示 → 保存）
2. 报告能力完善（HTML/PDF）
3. 发布产物链路（安装包、VSIX、发布说明）

---

## 5. AI 执行方式（避免碎片化）

- 每次按“同主题 1~3 个 WU”成批交付：实现 + 测试 + 文档 + 收尾。
- 每个批次必须包含：
  - `Contract impact`（无则显式写“无”）
  - `Test plan` 与结果
  - `Rollback plan`
  - `Risk`
- 若属于“状态更新”，只改 `development-plan.md`；其余文档只做引用与边界更新。

---

## 6. AI 快速定位清单（开工即用）

- 架构边界：`vna/framework.md`
- UI 边界：`vna/framework-ui.md`
- 计划编辑入口：`vna/docs/plan/README.md`
- 当前任务与完成态：`vna/development-plan.md`
- 自动化脚本入口：`vna/scripts/`
- gRPC 合约：`vna/proto/vna.proto`
- 核心实现：`vna/src/core/`, `vna/src/service/`
- 测试入口：`vna/tests/core/`, `vna/tests/integration/`

---

## 7. 维护规则

- 每完成一个开发批次，只做三件事：
  1. 在 `development-plan.md` 更新 WU 状态与验证结果。
  2. 若边界变化，更新 `framework.md` 或 `framework-ui.md`。
  3. 若优先级变化，更新本文档第 4 节。
- 禁止在多个文档重复维护同一状态字段，避免“多源冲突”。

---

*版本：v1.0 | 日期：2026-02-15*