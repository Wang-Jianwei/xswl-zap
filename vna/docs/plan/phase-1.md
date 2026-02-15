# Phase 1（4-6 周）— Core 能力稳定

## 目标

形成可测试、可复用的 vna-core-lib。

## 任务池

| 任务ID | 内容 | 产出 |
|--------|------|------|
| P1.1 | TopologyManager 实现与验证 | src/core/topology_manager.* |
| P1.2 | HardwareCoordinator（基于 driver 抽象） | src/core/hardware_coordinator.* |
| P1.3 | MeasurementPipeline（频域 + 时域路由） | src/core/measurement_pipeline.* |
| P1.4 | CalibrationSession 与 CalibrationDB | src/core/calibration_session.* |
| P1.5 | PluginManager（依赖解析/生命周期） | src/core/plugin_manager.* |

## 里程碑

- M1：vna-core-lib 稳定，单测覆盖率 ≥ 80%。

## 关联

- 上层入口：`vna/docs/plan/README.md`
- 治理规则：`vna/docs/plan/governance.md`
- 历史详档：`vna/development-plan.md`
