# 近期执行清单（迁移版）

> 来源：`vna/development-plan.md` 的原第 8 节（2026-02-15 迁移）。
> 
> 用途：作为高频更新区，后续新增近期执行项优先维护在本文件。

## 近期执行清单（未来 2 周）

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

## 维护约定

- 新增“近期执行项”直接追加在本文件。
- 对应 WU 的详细档案仍写入 `vna/development-plan.md` 的归档区。
- 若存在阶段归属明确的新增项，可同步摘要到对应 `phase-*.md`。

*版本：v1.0 | 日期：2026-02-15*