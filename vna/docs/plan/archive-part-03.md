# 归档分卷 03（实体迁移）
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

