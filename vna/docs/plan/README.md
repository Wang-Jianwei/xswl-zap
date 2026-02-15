# VNA 开发计划索引（拆分版）

> 目的：把超长 `development-plan.md` 拆成“可导航、可维护、可追踪”的分层文档。

## 文档入口

- 执行与门禁规则：`vna/docs/plan/governance.md`
- 近期执行清单：`vna/docs/plan/recent-execution.md`
- 阶段计划：
  - `vna/docs/plan/phase-0.md`
  - `vna/docs/plan/phase-1.md`
  - `vna/docs/plan/phase-2.md`
  - `vna/docs/plan/phase-3.md`
  - `vna/docs/plan/phase-4.md`
- 历史归档说明：`vna/docs/plan/archive.md`
- 历史归档分卷：`vna/docs/plan/archive-index.md`

## 使用约定

1. 新增/修改规则时，优先更新 `governance.md`。
2. 阶段目标、里程碑、任务池按 phase 文档维护。
3. 详细历史 WU 档案已迁移到 `archive-part-01.md` ~ `archive-part-08.md`。
4. `vna/development-plan.md` 保持“主入口 + 指针”角色。

## 迁移状态

- 状态：第 2 阶段完成（高频区迁移 + 8.x 归档实体分卷）
- 下一步：按功能主题将分卷归档再抽象为专题索引（例如 gRPC、插件、mainline）。

*版本：v1.0 | 日期：2026-02-15*