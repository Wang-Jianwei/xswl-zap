# 归档分卷 06（实体迁移）
### 8.201 已完成 Work Unit

WU-MAINLINE-219: compare 成功摘要增加 receiver compensated 最大误差容差裕量

- Objective: 评估 compensated 类别最大误差的容差余量。
- Scope (in/out):
  - in: `receiver_comp_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

### 8.202 已完成 Work Unit

WU-MAINLINE-220: compare 成功摘要增加 s-parameter 最大误差容差裕量

- Objective: 评估 s-parameter 类别最大误差的容差余量。
- Scope (in/out):
  - in: `sparameter_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

### 8.203 已完成 Work Unit

WU-MAINLINE-221: compare 成功摘要增加 worst 最大误差容差裕量

- Objective: 直接评估全局最差误差点距容差上限余量。
- Scope (in/out):
  - in: `worst_max_tolerance_margin` 摘要输出。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.204 已完成 Work Unit

WU-MAINLINE-222: core/service 回归断言补齐容差裕量字段

- Objective: 防止容差裕量字段在后续迭代回归丢失。
- Scope (in/out):
  - in: core/service compare detail 测试新增 `*_tolerance_margin` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.205 已完成 Work Unit

WU-MAINLINE-223: 批次收敛与统一验证（WU216~223）

- Objective: 合并 compare 容差裕量诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU216~223 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU216~223):
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
- Rollback plan: 回滚本批提交，恢复 WU204~215 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall/分类/worst 的 `*_tolerance_margin` 字段。
  - core/service 定向测试通过。

- Validation result (WU216~223 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.206 已完成 Work Unit

WU-MAINLINE-224: compare 成功摘要增加 receiver raw 最大点位分段字段

- Objective: 识别 raw 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `receiver_raw_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.207 已完成 Work Unit

WU-MAINLINE-225: compare 成功摘要增加 receiver compensated 最大点位分段字段

- Objective: 识别 compensated 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `receiver_comp_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.208 已完成 Work Unit

WU-MAINLINE-226: compare 成功摘要增加 s-parameter 最大点位分段字段

- Objective: 识别 s-parameter 最大误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `sparameter_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.209 已完成 Work Unit

WU-MAINLINE-227: compare 成功摘要增加 worst 最大点位分段字段

- Objective: 识别全局最差误差点位于扫频前/中/后段。
- Scope (in/out):
  - in: `worst_max_point_zone` 摘要输出（`front/middle/back`）。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.210 已完成 Work Unit

WU-MAINLINE-228: comparator 抽象统一分段口径

- Objective: 统一 point ratio 到 point zone 的区间划分口径。
- Scope (in/out):
  - in: 统一函数 `PointZoneFromRatio`（`front/middle/back`）。
  - out: 外部可配置分段阈值。
- Status: ✅ Completed (2026-02-14)

### 8.211 已完成 Work Unit

WU-MAINLINE-229: core 回归断言补齐分段字段

- Objective: 防止 point zone 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_max_point_zone` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.212 已完成 Work Unit

WU-MAINLINE-230: service 回归断言补齐分段字段

- Objective: 确保 compare detail 全链路透传 point zone 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `*_max_point_zone` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.213 已完成 Work Unit

WU-MAINLINE-231: 批次收敛与统一验证（WU224~231）

- Objective: 合并 point zone 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU224~231 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU224~231):
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
- Rollback plan: 回滚本批提交，恢复 WU216~223 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_point_zone` 字段。
  - core/service 定向测试通过。

- Validation result (WU224~231 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.214 已完成 Work Unit

WU-MAINLINE-232: compare 成功摘要增加 overall 最大误差风险分级

- Objective: 给出 overall 最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `max_component_risk_level` 摘要输出（`low/medium/high`）。
  - out: 可配置风险阈值。
- Status: ✅ Completed (2026-02-14)

### 8.215 已完成 Work Unit

WU-MAINLINE-233: compare 成功摘要增加 overall RMS 风险分级

- Objective: 给出 overall RMS 误差相对容差的风险等级。
- Scope (in/out):
  - in: `rms_component_risk_level` 摘要输出（`low/medium/high`）。
  - out: 可配置风险阈值。
- Status: ✅ Completed (2026-02-14)

### 8.216 已完成 Work Unit

WU-MAINLINE-234: compare 成功摘要增加 receiver raw 最大误差风险分级

- Objective: 给出 raw 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `receiver_raw_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.217 已完成 Work Unit

WU-MAINLINE-235: compare 成功摘要增加 receiver compensated 最大误差风险分级

- Objective: 给出 compensated 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `receiver_comp_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.218 已完成 Work Unit

WU-MAINLINE-236: compare 成功摘要增加 s-parameter 最大误差风险分级

- Objective: 给出 s-parameter 类别最大误差相对容差的风险等级。
- Scope (in/out):
  - in: `sparameter_max_risk_level` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.219 已完成 Work Unit

WU-MAINLINE-237: compare 成功摘要增加 worst 最大误差风险分级

- Objective: 给出全局最差误差点相对容差的风险等级。
- Scope (in/out):
  - in: `worst_max_risk_level` 摘要输出。
  - out: 动态告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.220 已完成 Work Unit

WU-MAINLINE-238: comparator 统一风险分级口径

- Objective: 统一 delta ratio 到 risk level 的分级口径。
- Scope (in/out):
  - in: 统一函数 `RiskLevelFromRatio`（`low/medium/high`）。
  - out: 外部可配置阈值。
- Status: ✅ Completed (2026-02-14)

### 8.221 已完成 Work Unit

WU-MAINLINE-239: 批次收敛与统一验证（WU232~239）

- Objective: 合并 risk level 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU232~239 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU232~239):
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
- Rollback plan: 回滚本批提交，恢复 WU224~231 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall/分类/worst 的 `*_risk_level` 字段。
  - core/service 定向测试通过。

- Validation result (WU232~239 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.222 已完成 Work Unit

WU-MAINLINE-240: compare 成功摘要增加 receiver raw 联合画像字段

- Objective: 统一表达 raw 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `receiver_raw_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.223 已完成 Work Unit

WU-MAINLINE-241: compare 成功摘要增加 receiver compensated 联合画像字段

- Objective: 统一表达 compensated 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `receiver_comp_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.224 已完成 Work Unit

WU-MAINLINE-242: compare 成功摘要增加 s-parameter 联合画像字段

- Objective: 统一表达 s-parameter 最大误差的风险等级与区段信息。
- Scope (in/out):
  - in: `sparameter_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.225 已完成 Work Unit

WU-MAINLINE-243: compare 成功摘要增加 worst 联合画像字段

- Objective: 统一表达全局最差点的风险等级与区段信息。
- Scope (in/out):
  - in: `worst_max_profile` 摘要输出（格式 `risk/zone`）。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.226 已完成 Work Unit

WU-MAINLINE-244: comparator 统一 profile 组合口径

- Objective: 统一 risk level 与 point zone 的组合规则。
- Scope (in/out):
  - in: 统一函数 `BuildRiskZoneProfile`（`risk + '/' + zone`）。
  - out: 外部可配置 profile 模板。
- Status: ✅ Completed (2026-02-14)

### 8.227 已完成 Work Unit

WU-MAINLINE-245: core 回归断言补齐 profile 字段

- Objective: 防止 profile 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_max_profile` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.228 已完成 Work Unit

WU-MAINLINE-246: service 回归断言补齐 profile 字段

- Objective: 确保 compare detail 全链路透传 profile 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `*_max_profile` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.229 已完成 Work Unit

WU-MAINLINE-247: 批次收敛与统一验证（WU240~247）

- Objective: 合并 profile 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU240~247 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU240~247):
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
- Rollback plan: 回滚本批提交，恢复 WU232~239 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_profile` 字段。
  - core/service 定向测试通过。

- Validation result (WU240~247 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.230 已完成 Work Unit

WU-MAINLINE-248: compare 成功摘要增加 worst digest 字段

- Objective: 提供可直接用于日志检索的最差点摘要短串。
- Scope (in/out):
  - in: `worst_digest` 摘要输出。
  - out: 外部告警系统索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.231 已完成 Work Unit

WU-MAINLINE-249: comparator 统一 worst digest 组装口径

- Objective: 统一 digest 字段格式，避免后续拼接漂移。
- Scope (in/out):
  - in: 统一函数 `BuildWorstDigest`（`category|profile|point/sub-index`）。
  - out: 可配置 digest 模板。
- Status: ✅ Completed (2026-02-14)

### 8.232 已完成 Work Unit

WU-MAINLINE-250: worst digest 含风险与区段上下文

- Objective: digest 中包含 `risk/zone` 联合画像，增强可读性。
- Scope (in/out):
  - in: digest 使用 `worst_max_profile`。
  - out: 外部 profile 统计聚合。
- Status: ✅ Completed (2026-02-14)

### 8.233 已完成 Work Unit

WU-MAINLINE-251: worst digest 区分 channel/value 子索引

- Objective: digest 明确区分接收机通道与 S 参数矩阵值索引。
- Scope (in/out):
  - in: `cY` 与 `vY` 子索引编码。
  - out: 结构化子索引字段化。
- Status: ✅ Completed (2026-02-14)

### 8.234 已完成 Work Unit

WU-MAINLINE-252: core 回归断言补齐 worst digest 字段

- Objective: 防止 worst digest 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_digest` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.235 已完成 Work Unit

WU-MAINLINE-253: service 回归断言补齐 worst digest 字段

- Objective: 确保 compare detail 全链路透传 worst digest 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `worst_digest` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.236 已完成 Work Unit

WU-MAINLINE-254: README 同步 worst digest 能力说明

- Objective: 对外说明 worst digest 字段语义与用途。
- Scope (in/out):
  - in: README 新增进展说明。
  - out: 独立设计文档章节。
- Status: ✅ Completed (2026-02-14)

### 8.237 已完成 Work Unit

WU-MAINLINE-255: 批次收敛与统一验证（WU248~255）

- Objective: 合并 worst digest 诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU248~255 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU248~255):
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
- Rollback plan: 回滚本批提交，恢复 WU240~247 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 `worst_digest` 字段。
  - core/service 定向测试通过。

- Validation result (WU248~255 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.238 已完成 Work Unit

WU-MAINLINE-256: compare 成功摘要增加 receiver raw digest 字段

- Objective: 提供 raw 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `receiver_raw_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.239 已完成 Work Unit

WU-MAINLINE-257: compare 成功摘要增加 receiver compensated digest 字段

- Objective: 提供 compensated 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `receiver_comp_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

### 8.240 已完成 Work Unit

WU-MAINLINE-258: compare 成功摘要增加 s-parameter digest 字段

- Objective: 提供 s-parameter 类别最大误差的短串摘要，便于日志检索。
- Scope (in/out):
  - in: `sparameter_digest` 摘要输出。
  - out: 外部索引策略。
- Status: ✅ Completed (2026-02-14)

