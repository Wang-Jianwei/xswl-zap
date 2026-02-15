# 归档分卷 04（实体迁移）
### 8.121 已完成 Work Unit

WU-MAINLINE-139: 批次收敛与统一验证（WU128~139）

- Objective: 大批次合并后端 compare 诊断简单 WU，提升单轮产出效率。
- Scope (in/out):
  - in: 聚合 WU128~139 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU128~139):
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
- Rollback plan: 回滚本批提交，恢复 WU122~127 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 overall 与分类 `*_delta_ratio` 字段。
  - core/service 定向测试通过。

- Validation result (WU128~139 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.122 已完成 Work Unit

WU-MAINLINE-140: compare 成功摘要增加全局最差类别标识

- Objective: 在 matched 场景下快速识别最应优先排查的数据类别。
- Scope (in/out):
  - in: `worst_category` 摘要输出。
  - out: 自动处置建议。
- Status: ✅ Completed (2026-02-14)

### 8.123 已完成 Work Unit

WU-MAINLINE-141: compare 成功摘要增加全局最差点位索引

- Objective: 在 matched 场景下直接定位全局最差误差点。
- Scope (in/out):
  - in: `worst_max_at=point:<i>/<channel|value>:<j>` 摘要输出。
  - out: 可视化高亮。
- Status: ✅ Completed (2026-02-14)

### 8.124 已完成 Work Unit

WU-MAINLINE-142: compare 成功摘要增加全局最差频点

- Objective: 在 matched 场景下直接定位全局最差误差频点。
- Scope (in/out):
  - in: `worst_max_frequency_hz` 摘要输出。
  - out: 频段聚合告警。
- Status: ✅ Completed (2026-02-14)

### 8.125 已完成 Work Unit

WU-MAINLINE-143: compare 成功摘要增加全局最差容差比

- Objective: 快速判断全局最差误差相对容差的裕量。
- Scope (in/out):
  - in: `worst_max_delta_ratio` 摘要输出。
  - out: 动态阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.126 已完成 Work Unit

WU-MAINLINE-144: compare 成功摘要增加全局最差分量方向

- Objective: 指明全局最差误差主导于实部还是虚部。
- Scope (in/out):
  - in: `worst_max_component` 摘要输出。
  - out: 分量级补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.127 已完成 Work Unit

WU-MAINLINE-145: compare 成功摘要增加全局最差有符号偏差

- Objective: 指示全局最差误差方向，缩短排查路径。
- Scope (in/out):
  - in: `worst_max_signed_delta` 摘要输出。
  - out: 历史漂移追踪。
- Status: ✅ Completed (2026-02-14)

### 8.128 已完成 Work Unit

WU-MAINLINE-146: comparator 全局最差选择逻辑统一

- Objective: 统一从三类最大误差中选取全局最差项。
- Scope (in/out):
  - in: `BuildSummary` 内部按最大 delta 选择 worst。
  - out: 独立评分模型。
- Status: ✅ Completed (2026-02-14)

### 8.129 已完成 Work Unit

WU-MAINLINE-147: comparator 回归断言补齐 worst 字段

- Objective: 防止 worst 字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_*` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.130 已完成 Work Unit

WU-MAINLINE-148: service 回归断言补齐 worst 字段

- Objective: 确保 service compare detail 全链路透传 worst 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 `worst_*` 断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.131 已完成 Work Unit

WU-MAINLINE-149: compare 成功摘要增强可读性（worst 分组）

- Objective: 将全局最差信息集中输出，提升日志可读性。
- Scope (in/out):
  - in: `worst_*` 字段集中出现在 matched 摘要。
  - out: 结构化 proto 字段重构。
- Status: ✅ Completed (2026-02-14)

### 8.132 已完成 Work Unit

WU-MAINLINE-150: 文档同步 worst 诊断语义

- Objective: 保持 README 与计划文档和实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新本批诊断字段。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.133 已完成 Work Unit

WU-MAINLINE-151: 批次收敛与统一验证（WU140~151）

- Objective: 大批次合并后端 compare 诊断简单 WU，提升单轮闭环效率。
- Scope (in/out):
  - in: 聚合 WU140~151 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU140~151):
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
- Rollback plan: 回滚本批提交，恢复 WU128~139 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含全局最差 `worst_*` 诊断字段。
  - core/service 定向测试通过。

- Validation result (WU140~151 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.134 已完成 Work Unit

WU-MAINLINE-152: compare 成功摘要增加 worst expected 实部

- Objective: 在 matched 场景下暴露全局最差点的期望实部。
- Scope (in/out):
  - in: `worst_expected_real` 摘要输出。
  - out: 历史快照持久化。
- Status: ✅ Completed (2026-02-14)

### 8.135 已完成 Work Unit

WU-MAINLINE-153: compare 成功摘要增加 worst expected 虚部

- Objective: 在 matched 场景下暴露全局最差点的期望虚部。
- Scope (in/out):
  - in: `worst_expected_imag` 摘要输出。
  - out: 结构化复数对象输出。
- Status: ✅ Completed (2026-02-14)

### 8.136 已完成 Work Unit

WU-MAINLINE-154: compare 成功摘要增加 worst actual 实部

- Objective: 在 matched 场景下暴露全局最差点的实测实部。
- Scope (in/out):
  - in: `worst_actual_real` 摘要输出。
  - out: 实时对比可视化。
- Status: ✅ Completed (2026-02-14)

### 8.137 已完成 Work Unit

WU-MAINLINE-155: compare 成功摘要增加 worst actual 虚部

- Objective: 在 matched 场景下暴露全局最差点的实测虚部。
- Scope (in/out):
  - in: `worst_actual_imag` 摘要输出。
  - out: 结构化复数对象输出。
- Status: ✅ Completed (2026-02-14)

### 8.138 已完成 Work Unit

WU-MAINLINE-156: compare 成功摘要增加 receiver raw 最大误差点 expected/actual 快照

- Objective: 提供 receiver raw 最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `receiver_raw_max_expected_*` / `receiver_raw_max_actual_*` 摘要输出。
  - out: 通道历史趋势输出。
- Status: ✅ Completed (2026-02-14)

### 8.139 已完成 Work Unit

WU-MAINLINE-157: compare 成功摘要增加 receiver compensated 最大误差点 expected/actual 快照

- Objective: 提供补偿后最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `receiver_comp_max_expected_*` / `receiver_comp_max_actual_*` 摘要输出。
  - out: 自动补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.140 已完成 Work Unit

WU-MAINLINE-158: compare 成功摘要增加 s-parameter 最大误差点 expected/actual 快照

- Objective: 提供 s-parameter 最大误差点的期望/实测快照。
- Scope (in/out):
  - in: `sparameter_max_expected_*` / `sparameter_max_actual_*` 摘要输出。
  - out: 端口对矩阵可视化。
- Status: ✅ Completed (2026-02-14)

### 8.141 已完成 Work Unit

WU-MAINLINE-159: comparator 观测逻辑记录最大误差点复数快照

- Objective: 统一保存各类别最大误差点的 expected/actual 复数值。
- Scope (in/out):
  - in: `Observe` 更新最大误差时同步记录复数快照。
  - out: 外部快照存储。
- Status: ✅ Completed (2026-02-14)

### 8.142 已完成 Work Unit

WU-MAINLINE-160: comparator 回归断言补齐 worst expected/actual 字段

- Objective: 防止 worst 快照字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `worst_expected/actual` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.143 已完成 Work Unit

WU-MAINLINE-161: service 回归断言补齐 expected/actual 字段

- Objective: 确保 service compare detail 全链路透传快照字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加分类与 worst 快照断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.144 已完成 Work Unit

WU-MAINLINE-162: 文档同步 expected/actual 快照诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新快照字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.145 已完成 Work Unit

WU-MAINLINE-163: 批次收敛与统一验证（WU152~163）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持连续高产闭环。
- Scope (in/out):
  - in: 聚合 WU152~163 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU152~163):
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
- Rollback plan: 回滚本批提交，恢复 WU140~151 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 worst 与分类最大误差点 expected/actual 快照字段。
  - core/service 定向测试通过。

- Validation result (WU152~163 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.146 已完成 Work Unit

WU-MAINLINE-164: compare 成功摘要增加 receiver raw 分量优势幅度

- Objective: 量化 receiver raw 最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `receiver_raw_max_component_margin` 摘要输出。
  - out: 分量告警阈值策略。
- Status: ✅ Completed (2026-02-14)

### 8.147 已完成 Work Unit

WU-MAINLINE-165: compare 成功摘要增加 receiver compensated 分量优势幅度

- Objective: 量化补偿后最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `receiver_comp_max_component_margin` 摘要输出。
  - out: 自动补偿建议。
- Status: ✅ Completed (2026-02-14)

### 8.148 已完成 Work Unit

WU-MAINLINE-166: compare 成功摘要增加 s-parameter 分量优势幅度

- Objective: 量化 s-parameter 最大误差点实部/虚部主导优势。
- Scope (in/out):
  - in: `sparameter_max_component_margin` 摘要输出。
  - out: 端口对统计。
- Status: ✅ Completed (2026-02-14)

### 8.149 已完成 Work Unit

WU-MAINLINE-167: compare 成功摘要增加 worst 分量优势幅度

- Objective: 量化全局最差点分量主导优势，提升优先级判断效率。
- Scope (in/out):
  - in: `worst_max_component_margin` 摘要输出。
  - out: 结构化评分模型。
- Status: ✅ Completed (2026-02-14)

### 8.150 已完成 Work Unit

WU-MAINLINE-168: comparator 统一分量优势幅度计算逻辑

- Objective: 统一分量优势幅度计算口径，避免字段间语义漂移。
- Scope (in/out):
  - in: 在 `Observe` 中以 `|abs(realDelta)-abs(imagDelta)|` 计算 margin。
  - out: 独立数学库封装。
- Status: ✅ Completed (2026-02-14)

### 8.151 已完成 Work Unit

WU-MAINLINE-169: comparator 在最大误差更新时记录 margin

- Objective: 确保各类别最大误差点同步记录 margin。
- Scope (in/out):
  - in: raw/comp/sparameter 最大值更新时同步写入 `*_component_margin`。
  - out: 历史分布存储。
- Status: ✅ Completed (2026-02-14)

### 8.152 已完成 Work Unit

WU-MAINLINE-170: worst 选择逻辑透传对应 margin

- Objective: 确保 worst 诊断组与来源类别 margin 保持一致。
- Scope (in/out):
  - in: worst 选中项同步透传 `worst_max_component_margin`。
  - out: 多指标权重合成。
- Status: ✅ Completed (2026-02-14)

### 8.153 已完成 Work Unit

WU-MAINLINE-171: comparator 回归断言补齐 margin 字段

- Objective: 防止 margin 字段后续回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_component_margin` 与 `worst_max_component_margin` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.154 已完成 Work Unit

WU-MAINLINE-172: service 回归断言补齐 margin 字段

- Objective: 确保 service compare detail 全链路透传 margin 字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 margin 字段断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.155 已完成 Work Unit

WU-MAINLINE-173: 文档同步 margin 诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新 margin 字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.156 已完成 Work Unit

WU-MAINLINE-174: 批次测试验证收敛

- Objective: 对本批新增 margin 字段执行定向构建与测试回归。
- Scope (in/out):
  - in: 构建 comparator/service 目标并执行 easy 单测。
  - out: 全量测试矩阵。
- Status: ✅ Completed (2026-02-14)

### 8.157 已完成 Work Unit

WU-MAINLINE-175: 批次收敛与统一验证（WU164~175）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持高频闭环产出。
- Scope (in/out):
  - in: 聚合 WU164~175 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU164~175):
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
- Rollback plan: 回滚本批提交，恢复 WU152~163 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst `*_component_margin` 字段。
  - core/service 定向测试通过。

- Validation result (WU164~175 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.158 已完成 Work Unit

WU-MAINLINE-176: compare 成功摘要增加 receiver raw 最大误差实部绝对差

- Objective: 提供 receiver raw 最大误差点的实部绝对差。
- Scope (in/out):
  - in: `receiver_raw_max_real_delta` 摘要输出。
  - out: 通道历史趋势分析。
- Status: ✅ Completed (2026-02-14)

### 8.159 已完成 Work Unit

WU-MAINLINE-177: compare 成功摘要增加 receiver raw 最大误差虚部绝对差

- Objective: 提供 receiver raw 最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `receiver_raw_max_imag_delta` 摘要输出。
  - out: 分量热图可视化。
- Status: ✅ Completed (2026-02-14)

### 8.160 已完成 Work Unit

WU-MAINLINE-178: compare 成功摘要增加 receiver compensated 最大误差实部绝对差

- Objective: 提供补偿后最大误差点的实部绝对差。
- Scope (in/out):
  - in: `receiver_comp_max_real_delta` 摘要输出。
  - out: 自动补偿修正建议。
- Status: ✅ Completed (2026-02-14)

