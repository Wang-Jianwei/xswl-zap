# SPEC — Locking & Topology Precheck (WU-101)

WU-101: Lock Contract + Topology Precheck
- Objective:
  - 定义统一的资源互斥协议（锁模型）与拓扑激活前预校验协议，支撑“Workspace 快捷编辑 + System Studio 同一编辑器”的后端一致性保障。
- Scope:
  - gRPC 契约层：新增锁对象、锁拥有者、fencing token、冲突明细、拓扑预校验请求与结果。
  - 不包含：具体锁存储引擎实现、调度策略实现、UI 组件实现。
- Files:
  - `vna/proto/vna.proto`
- Contract impact:
  - `VnaControl` 新增 `PrecheckWorkspaceTopology(TopologyPrecheckRequest)`。
  - `ResourceBroker` 新增：
    - `AcquireLock(LockAcquireRequest)`
    - `RenewLock(LockRenewRequest)`
    - `ReleaseLock(LockReleaseRequest)`
    - `GetLockSnapshot(LockSnapshotRequest)`
  - 新增锁相关模型：`LockSelector/LockOwner/LockLease/LockConflictDetail/...`。
- Test plan:
  - 单元测试（后续 WU-102 实现时）：
    - 正常加锁/续租/释放；
    - fencing token 过期写入拒绝；
    - 冲突占用返回 holder 信息。
  - 集成测试（后续 WU-102）：
    - 双 workspace 争用同一物理资源；
    - 测量中 destructive topology change 被 precheck 拒绝。
- Rollback plan:
  - 若新契约导致联调阻塞，可临时回滚到仅使用旧 `Acquire/Renew/Release`，并在 UI 层隐藏“冲突细节”展示。
- Risks:
  - 旧调用方若直接切换到新接口但未传 owner/session，可能导致逻辑拒绝。
  - 多语言 SDK（cpp/ts）若未同步生成，可能出现编译/调用不匹配。
- Acceptance criteria:
  - proto 中锁与 precheck 契约完整可用；
  - 冲突返回能定位占用者（owner + lease + token + expire）；
  - 支持 Workspace 快捷编辑所需的“保存前预校验”调用。

---

## 1. 设计动机

根据当前产品语义：
- 拓扑定义的是“虚拟 VNA 设备构成”；
- Workspace 使用“已选目标虚拟 VNA”进行测量；
- Workspace 允许快捷拓扑编辑（同一编辑器组件）。

因此必须把互斥一致性收敛到后端，避免 UI 并发编辑和测量并行导致资源冲突或脏写。

## 2. 锁模型约束

- 锁粒度：
  - 物理设备、Mock 设备、虚拟 VNA、触发线、时钟域、Workspace 会话。
- 锁模式：
  - `SHARED` / `EXCLUSIVE`。
- 锁时效：
  - `ttl_seconds` + `RenewLock` 保活。
- 反脑裂：
  - 写路径要求校验 `fencing_token`，过期 token 必须拒绝。
- 冲突可观测：
  - 返回 `LockConflictDetail`，包含 holder owner、lease、token、过期时间与建议动作。

## 3. 拓扑预校验约束

`PrecheckWorkspaceTopology` 在保存/激活前执行：
- 拓扑语义校验（结构与字段）；
- 资源占用预检查（required_resources）；
- destructive change 在运行态下拦截（由实现侧执行策略）。

## 4. 错误码建议（实现侧）

建议 `code` 使用以下集合：
- `OK`
- `LOCK_CONFLICT`
- `LOCK_STALE`
- `LOCK_EXPIRED`
- `RESOURCE_BUSY`
- `TOPOLOGY_INVALID`
- `TOPOLOGY_DESTRUCTIVE_WHILE_RUNNING`
- `INTERNAL_ERROR`

## 5. 后续衔接

- WU-102：服务端实现锁引擎与 precheck。
- WU-103：UI 双入口接入同一拓扑编辑器并联动锁状态（只读/可编辑）。
