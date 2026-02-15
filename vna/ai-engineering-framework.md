# xswl-zap-vna — AI Agent 工程框架 (v1.0)

> 目标：让本项目可由 AI Agent 端到端开发，保证可追踪、可回滚、可测试、可持续迭代。

---

## 1. 设计原则

1. **规格先行**：所有代码任务先有契约（proto/header/schema）再实现。
2. **小步快跑**：每次 PR 聚焦单一能力，建议 200-500 行净变更。
3. **测试护栏**：无测试不合并；先单测，再集成，再 E2E。
4. **可回滚**：新能力默认 feature flag/配置开关可关闭。
5. **可观测性**：关键路径必须暴露日志、指标、错误码。
6. **人工可审计**：每次 Agent 产出必须附带变更摘要与验证结果。
7. **预发布去冗余优先**：产品正式发布前，不要求向后兼容；允许直接重构/替换旧接口，并清理废弃实现，避免“兼容包袱”。

> 阶段策略：Pre-GA（当前阶段）= 简洁优先；Post-GA = 兼容优先。

---

## 2. AI-First 仓库分层

```text
xswl-zap/
├─ .github/
│  ├─ copilot-instructions.md        # Agent 开发规范（强约束）
│  ├─ pull_request_template.md       # PR 验收模板
│  └─ workflows/                     # CI 门禁
├─ docs/
│  ├─ adr/                           # Architecture Decision Records
│  ├─ specs/                         # proto / schema / API 合约
│  └─ runbooks/                      # 运维与故障手册
├─ vna/
│  ├─ framework.md                   # 总体架构
│  ├─ framework-ui.md                # UI 架构
│  ├─ development-plan.md            # 开发计划（AI执行版）
│  ├─ archives/docs/architecture-feasibility-assessment.md
│  └─ ai-engineering-framework.md    # 本文档
└─ src/（后续）
   ├─ core/
   ├─ service/
   ├─ drivers/
   ├─ plugins/
   └─ apps/
```

---

## 3. Agent 角色模型

### 3.1 架构 Agent

- 维护 `framework.md`、`framework-ui.md`、ADR。
- 约束：不能直接改业务代码，只输出接口与决策。

### 3.2 合约 Agent

- 维护 `proto/*.proto`、配置 schema、C++ headers。
- 约束：任何破坏兼容的改动必须新增版本字段或 V2 接口。

### 3.3 实现 Agent

- 按合约实现 `core/service/drivers/plugins/apps`。
- 约束：提交必须附对应测试。

### 3.4 测试 Agent

- 负责单测/集成/E2E、基准与回归。
- 约束：禁止修改业务逻辑（除修复明显测试夹具错误）。

### 3.5 文档 Agent

- 同步更新变更文档、迁移指南、故障排查。
- 约束：必须与代码版本一致。

---

## 4. AI 任务最小单元（Work Unit）

每个 Work Unit 必须包含：

1. **输入**：需求、影响文件、边界条件。
2. **输出**：代码/文档变更清单。
3. **验证**：执行的测试与结果。
4. **回滚**：如何关闭/撤销变更。
5. **风险**：最可能失败点与监控项。

模板：

```markdown
WU-<ID>: <Title>
- Scope:
- Files:
- Contract:
- Tests:
- Rollback:
- Risk:
```

---

## 5. 分支与提交流程（适配 AI）

### 5.1 分支命名

- `feature/<domain>-<capability>`
- `fix/<domain>-<bug>`
- `refactor/<domain>-<goal>`

示例：

- `feature/core-time-domain`
- `feature/drivers-hardware-abstraction`

### 5.2 PR 结构

每个 PR 必须包含：

- 变更目的（1 段）
- 契约变更（若有）
- 风险与回滚
- 测试证据（命令 + 结果）
- 对应 Work Unit 列表

### 5.3 合并策略

- Squash merge
- 受保护分支：`main`
- 必须通过 CI 全部门禁

---

## 6. 质量门禁（Definition of Done）

### 6.1 代码层

- 编译通过
- 无新增 lint error
- 有错误处理（输入校验、外设超时、资源释放）
- 公共 API 带注释

### 6.2 测试层

- 新能力至少 1 个单元测试
- 关键路径至少 1 个集成测试
- 高风险功能（多板卡/同步）需回归测试

### 6.3 文档层

- 变更涉及架构必须更新 `framework.md`
- 变更涉及 UI 必须更新 `framework-ui.md`
- 变更涉及计划必须更新 `development-plan.md`

---

## 7. AI 友好的接口演进规范

1. **Pre-GA（未发布）**：允许破坏式演进，优先删除旧字段/旧接口，不保留临时兼容层。
2. **Post-GA（已发布）**：proto 仅追加字段，不复用 tag。
3. 配置 schema 使用 `version` 字段。
4. C++ 接口在 Post-GA 阶段新增默认实现以减少破坏性。
5. 插件 ABI 在 Post-GA 阶段维持向后兼容（C ABI + version handshake）。

---

## 8. 可观测性标准

### 8.1 日志

- 统一字段：`timestamp, level, module, instance_id, workspace_id, message, error_code`
- 错误日志必须包含根因与建议动作。

### 8.2 指标（最小集）

- `acquisition_latency_ms`
- `sync_skew_ns`
- `trigger_jitter_ns`
- `resource_lease_wait_ms`
- `plugin_exec_time_ms`

### 8.3 追踪

- 关键链路：`UI/Extension -> gRPC -> pipeline -> driver`

---

## 9. 安全与鲁棒性基线

- 所有外部输入必须校验（proto、YAML、CLI 参数）。
- 驱动调用必须有 timeout/retry/backoff。
- 资源租约必须有 TTL 与崩溃回收。
- 长任务支持取消（CancellationToken）。

---

## 10. 里程碑建议（AI执行）

- **M0（2周）**：合约 + Mock + 驱动抽象 + 时域接口。
- **M1（4-6周）**：core 稳定 + 单测覆盖率 ≥ 80%。
- **M2（2周）**：service 化 + 集成测试。
- **M3（4-6周）**：Qt UI 可用闭环。
- **M4（4-6周）**：VS Code Extension 可用闭环。
- **M5（持续）**：性能优化与高级功能插件化。

---

## 11. 立即执行清单

1. 建立 `docs/specs/` 与 `docs/adr/`。
2. 建立 Work Unit 模板与 PR 模板。
3. 在 CI 中加入三段门禁：build、test、docs-check。
4. 按 `development-plan.md` 的 P0 开始首批实现任务。

---

*版本：v1.0 | 日期：2026-02-12 | 适用范围：xswl-zap 全仓库*
