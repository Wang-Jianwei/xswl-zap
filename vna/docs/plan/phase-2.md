# Phase 2（2-4 周）— Service 化与集成

## 目标

形成可部署后端服务，完善协议与资源流集成能力。

## 任务池（当前可见）

| 任务ID | 内容 | 产出 |
|--------|------|------|
| P2.2 | ResourceBrokerService | src/service/resource_broker_service.* |
| P2.3 | 进程管理与健康检查 | src/service/process_manager.* |
| P2.4 | 配置加载（端口/TLS/日志） | config/service.yaml |
| P2.5 | 集成测试（协议与资源流） | tests/integration/* |

## 里程碑

- M2：服务可部署，集成测试通过。

## 关联

- 上层入口：`vna/docs/plan/README.md`
- 治理规则：`vna/docs/plan/governance.md`
- 历史详档：`vna/development-plan.md`
