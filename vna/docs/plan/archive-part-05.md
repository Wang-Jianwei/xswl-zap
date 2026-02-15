# 归档分卷 05（实体迁移）
### 8.161 已完成 Work Unit

WU-MAINLINE-179: compare 成功摘要增加 receiver compensated 最大误差虚部绝对差

- Objective: 提供补偿后最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `receiver_comp_max_imag_delta` 摘要输出。
  - out: 分量热图可视化。
- Status: ✅ Completed (2026-02-14)

### 8.162 已完成 Work Unit

WU-MAINLINE-180: compare 成功摘要增加 s-parameter 最大误差实部绝对差

- Objective: 提供 s-parameter 最大误差点的实部绝对差。
- Scope (in/out):
  - in: `sparameter_max_real_delta` 摘要输出。
  - out: 端口对分量统计。
- Status: ✅ Completed (2026-02-14)

### 8.163 已完成 Work Unit

WU-MAINLINE-181: compare 成功摘要增加 s-parameter 最大误差虚部绝对差

- Objective: 提供 s-parameter 最大误差点的虚部绝对差。
- Scope (in/out):
  - in: `sparameter_max_imag_delta` 摘要输出。
  - out: 端口对分量统计。
- Status: ✅ Completed (2026-02-14)

### 8.164 已完成 Work Unit

WU-MAINLINE-182: compare 成功摘要增加 worst 最大误差实部绝对差

- Objective: 提供全局最差点实部绝对差，提升优先排查效率。
- Scope (in/out):
  - in: `worst_max_real_delta` 摘要输出。
  - out: 告警分级策略。
- Status: ✅ Completed (2026-02-14)

### 8.165 已完成 Work Unit

WU-MAINLINE-183: compare 成功摘要增加 worst 最大误差虚部绝对差

- Objective: 提供全局最差点虚部绝对差，补齐误差构成信息。
- Scope (in/out):
  - in: `worst_max_imag_delta` 摘要输出。
  - out: 告警分级策略。
- Status: ✅ Completed (2026-02-14)

### 8.166 已完成 Work Unit

WU-MAINLINE-184: comparator 摘要层统一实虚绝对差计算

- Objective: 统一通过 expected/actual 计算实虚绝对差，避免口径漂移。
- Scope (in/out):
  - in: `BuildSummary` 内按 `abs(actual-expected)` 输出 real/imag delta。
  - out: 独立数学库封装。
- Status: ✅ Completed (2026-02-14)

### 8.167 已完成 Work Unit

WU-MAINLINE-185: raw/comp/sparam 最大误差块补齐实虚差输出

- Objective: 在分类最大误差块内补齐实虚差字段。
- Scope (in/out):
  - in: 三类 `*_max_real_delta` / `*_max_imag_delta` 输出。
  - out: 结构化字段改造。
- Status: ✅ Completed (2026-02-14)

### 8.168 已完成 Work Unit

WU-MAINLINE-186: worst 诊断块补齐实虚差输出

- Objective: 在 worst 诊断块补齐实虚差字段。
- Scope (in/out):
  - in: `worst_max_real_delta` / `worst_max_imag_delta` 输出。
  - out: 结构化字段改造。
- Status: ✅ Completed (2026-02-14)

### 8.169 已完成 Work Unit

WU-MAINLINE-187: comparator 回归断言补齐实虚差字段

- Objective: 防止实虚差字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加分类与 worst 实虚差断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.170 已完成 Work Unit

WU-MAINLINE-188: service 回归断言补齐实虚差字段

- Objective: 确保 service compare detail 全链路透传实虚差字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加相关断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.171 已完成 Work Unit

WU-MAINLINE-189: 文档同步实虚差诊断语义

- Objective: 保持文档与实现语义一致。
- Scope (in/out):
  - in: README 与 development-plan 更新字段说明。
  - out: 外部文档站同步。
- Status: ✅ Completed (2026-02-14)

### 8.172 已完成 Work Unit

WU-MAINLINE-190: 批次测试验证收敛

- Objective: 对本批新增实虚差字段执行定向构建与测试回归。
- Scope (in/out):
  - in: 构建 comparator/service 目标并运行 easy 单测。
  - out: 全量测试矩阵。
- Status: ✅ Completed (2026-02-14)

### 8.173 已完成 Work Unit

WU-MAINLINE-191: 批次收敛与统一验证（WU176~191）

- Objective: 大批次合并后端 compare 诊断简单 WU，保持高频闭环产出。
- Scope (in/out):
  - in: 聚合 WU176~191 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU176~191):
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
- Rollback plan: 回滚本批提交，恢复 WU164~175 诊断粒度。
- Risks: detail 文本继续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_max_real_delta` / `*_max_imag_delta` 字段。
  - core/service 定向测试通过。

- Validation result (WU176~191 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.174 已完成 Work Unit

WU-MAINLINE-192: 插件频域预览根因定位（单点退化）

- Objective: 明确频域预览仅单点显示的根因。
- Scope (in/out):
  - in: 定位插件请求未携带 `start/stop/sweepPointCount` 导致后端回退单点。
  - out: 后端扫频算法重构。
- Status: ✅ Completed (2026-02-14)

### 8.175 已完成 Work Unit

WU-MAINLINE-193: ServiceClient 增加 CW 扫频配置构造函数

- Objective: 统一插件侧 CW 扫频请求参数构造。
- Scope (in/out):
  - in: 新增 `buildCwExcitationFromSampleCount`。
  - out: 用户可配置扫频 span。
- Status: ✅ Completed (2026-02-14)

### 8.176 已完成 Work Unit

WU-MAINLINE-194: Acquire Once 使用扫频配置

- Objective: 让 `Acquire Once` 在频域下返回多点结果。
- Scope (in/out):
  - in: `acquireOnce` 的 CW 请求改为扫频参数。
  - out: 命令交互改版。
- Status: ✅ Completed (2026-02-14)

### 8.177 已完成 Work Unit

WU-MAINLINE-195: Preview Waveform snapshot 使用扫频配置

- Objective: 修复 `Preview Waveform` snapshot 频域仅单点问题。
- Scope (in/out):
  - in: `acquireWaveform` 频域请求改为扫频参数。
  - out: trace 渲染逻辑重写。
- Status: ✅ Completed (2026-02-14)

### 8.178 已完成 Work Unit

WU-MAINLINE-196: Preview Waveform live 使用扫频配置

- Objective: 修复 `Preview Waveform` live 频域仅单点问题。
- Scope (in/out):
  - in: `streamWaveform` 频域请求改为扫频参数。
  - out: live 节流策略调整。
- Status: ✅ Completed (2026-02-14)

### 8.179 已完成 Work Unit

WU-MAINLINE-197: Stream Preview 使用扫频配置

- Objective: 让 `Stream Preview` 频域帧点数与 `sampleCount` 对齐为多点。
- Scope (in/out):
  - in: `streamPreview` 的 CW 请求改为扫频参数。
  - out: 进度提示格式调整。
- Status: ✅ Completed (2026-02-14)

### 8.180 已完成 Work Unit

WU-MAINLINE-198: 新增 ServiceClient 扫频配置单测

- Objective: 为扫频参数构造逻辑提供稳定回归保障。
- Scope (in/out):
  - in: 新增 `serviceClient.test.ts`，覆盖 `sweepPointCount` 边界。
  - out: gRPC 集成级插件测试。
- Status: ✅ Completed (2026-02-14)

### 8.181 已完成 Work Unit

WU-MAINLINE-199: 插件测试脚本接入新增单测

- Objective: 将新单测纳入 `npm test` 默认回归链路。
- Scope (in/out):
  - in: 更新 `package.json` test 脚本。
  - out: 引入新测试框架。
- Status: ✅ Completed (2026-02-14)

### 8.182 已完成 Work Unit

WU-MAINLINE-200: 插件 README 同步频域多点行为

- Objective: 文档化频域预览已支持多点扫频。
- Scope (in/out):
  - in: 更新 extension README 的 `Preview Waveform` 说明。
  - out: 长文档重构。
- Status: ✅ Completed (2026-02-14)

### 8.183 已完成 Work Unit

WU-MAINLINE-201: UI 框架文档同步频域多点行为

- Objective: 保持 `framework-ui.md` 与插件实际行为一致。
- Scope (in/out):
  - in: 增补 CW 预览自动扫频说明。
  - out: 视觉规范调整。
- Status: ✅ Completed (2026-02-14)

### 8.184 已完成 Work Unit

WU-MAINLINE-202: 主 README 同步本批修复进展

- Objective: 在项目总览文档记录该修复能力。
- Scope (in/out):
  - in: 增加 WU192~203 进展摘要。
  - out: 非本批能力重排。
- Status: ✅ Completed (2026-02-14)

### 8.185 已完成 Work Unit

WU-MAINLINE-203: 批次收敛与统一验证（WU192~203）

- Objective: 合并本批插件修复 WU 并完成统一回归。
- Scope (in/out):
  - in: 聚合代码/测试/文档并统一验证。
  - out: 后端 compare 契约变更。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU192~203):
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/test/serviceClient.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅请求参数构造与前端文档更新）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复修复前插件请求配置。
- Risks: 频域 sweep span 当前为固定值（100MHz），后续如需精细控制可再配置化。
- Acceptance criteria:
  - `Preview Waveform` 频域 `snapshot/live` 返回多点。
  - `Stream Preview` 频域返回多点。
  - 插件测试通过。

- Validation result (WU192~203 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.186 已完成 Work Unit

WU-MAINLINE-204: compare 成功摘要增加 receiver raw 总点数字段

- Objective: 为点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `receiver_raw_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.187 已完成 Work Unit

WU-MAINLINE-205: compare 成功摘要增加 receiver compensated 总点数字段

- Objective: 为补偿通道点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `receiver_comp_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.188 已完成 Work Unit

WU-MAINLINE-206: compare 成功摘要增加 s-parameter 总点数字段

- Objective: 为 s-parameter 点位比例诊断提供分母信息。
- Scope (in/out):
  - in: `sparameter_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.189 已完成 Work Unit

WU-MAINLINE-207: compare 成功摘要增加 receiver raw 最大点位比例

- Objective: 快速判断 raw 最大误差点在扫频序列中的相对位置。
- Scope (in/out):
  - in: `receiver_raw_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.190 已完成 Work Unit

WU-MAINLINE-208: compare 成功摘要增加 receiver compensated 最大点位比例

- Objective: 快速判断 compensated 最大误差点相对位置。
- Scope (in/out):
  - in: `receiver_comp_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.191 已完成 Work Unit

WU-MAINLINE-209: compare 成功摘要增加 s-parameter 最大点位比例

- Objective: 快速判断 s-parameter 最大误差点相对位置。
- Scope (in/out):
  - in: `sparameter_max_point_ratio` 摘要输出。
  - out: 频段热区自动聚类。
- Status: ✅ Completed (2026-02-14)

### 8.192 已完成 Work Unit

WU-MAINLINE-210: compare 成功摘要增加 worst 总点数字段

- Objective: 为全局最差点位比例提供分母信息。
- Scope (in/out):
  - in: `worst_total_points` 摘要输出。
  - out: 结构化 proto 字段化。
- Status: ✅ Completed (2026-02-14)

### 8.193 已完成 Work Unit

WU-MAINLINE-211: compare 成功摘要增加 worst 最大点位比例

- Objective: 直接判断全局最差误差点位于扫频前中后段。
- Scope (in/out):
  - in: `worst_max_point_ratio` 摘要输出。
  - out: 动态优先级策略。
- Status: ✅ Completed (2026-02-14)

### 8.194 已完成 Work Unit

WU-MAINLINE-212: comparator 统一点位比例计算口径

- Objective: 统一点位比例计算（`index/(total-1)`），避免字段口径漂移。
- Scope (in/out):
  - in: `BuildSummary` 内集中计算 point ratio。
  - out: 独立工具函数抽取。
- Status: ✅ Completed (2026-02-14)

### 8.195 已完成 Work Unit

WU-MAINLINE-213: comparator 回归断言补齐点位比例字段

- Objective: 防止点位比例字段在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 `*_total_points` / `*_max_point_ratio` 断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.196 已完成 Work Unit

WU-MAINLINE-214: service 回归断言补齐点位比例字段

- Objective: 确保 service compare detail 全链路透传点位比例字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加相关断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.197 已完成 Work Unit

WU-MAINLINE-215: 批次收敛与统一验证（WU204~215）

- Objective: 合并后端 compare 诊断简单 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU204~215 代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU204~215):
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
- Rollback plan: 回滚本批提交，恢复 WU192~203 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类与 worst 的 `*_total_points` / `*_max_point_ratio` 字段。
  - core/service 定向测试通过。

- Validation result (WU204~215 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.198 已完成 Work Unit

WU-MAINLINE-216: compare 成功摘要增加 overall 最大误差容差裕量

- Objective: 直接给出最大误差距离容差上限的剩余量。
- Scope (in/out):
  - in: `max_component_tolerance_margin` 摘要输出。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.199 已完成 Work Unit

WU-MAINLINE-217: compare 成功摘要增加 overall RMS 容差裕量

- Objective: 直接给出 RMS 误差距离容差上限的剩余量。
- Scope (in/out):
  - in: `rms_component_tolerance_margin` 摘要输出。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.200 已完成 Work Unit

WU-MAINLINE-218: compare 成功摘要增加 receiver raw 最大误差容差裕量

- Objective: 评估 raw 类别最大误差的容差余量。
- Scope (in/out):
  - in: `receiver_raw_max_tolerance_margin` 摘要输出。
  - out: 热区聚类与分段统计。
- Status: ✅ Completed (2026-02-14)

