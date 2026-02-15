# 归档分卷 07（实体迁移）
### 8.241 已完成 Work Unit

WU-MAINLINE-259: compare 成功摘要增加 overall digest 字段

- Objective: 提供全局检索入口短串，统一聚合口径。
- Scope (in/out):
  - in: `overall_digest` 摘要输出。
  - out: 外部告警路由策略。
- Status: ✅ Completed (2026-02-14)

### 8.242 已完成 Work Unit

WU-MAINLINE-260: comparator 统一分类 digest 组装口径

- Objective: 复用统一函数，避免分类 digest 格式漂移。
- Scope (in/out):
  - in: 统一通过 `BuildWorstDigest` 组装分类 digest。
  - out: 可配置 digest 模板。
- Status: ✅ Completed (2026-02-14)

### 8.243 已完成 Work Unit

WU-MAINLINE-261: core 回归断言补齐 digest 一致化字段

- Objective: 防止分类/overall digest 在后续迭代回归丢失。
- Scope (in/out):
  - in: `acquisition_comparator_test` 增加 digest 字段断言。
  - out: 随机数据 fuzz。
- Status: ✅ Completed (2026-02-14)

### 8.244 已完成 Work Unit

WU-MAINLINE-262: service 回归断言补齐 digest 一致化字段

- Objective: 确保 compare detail 全链路透传 digest 一致化字段。
- Scope (in/out):
  - in: `vna_control_service_test` 增加 digest 字段断言。
  - out: gRPC 客户端展示断言。
- Status: ✅ Completed (2026-02-14)

### 8.245 已完成 Work Unit

WU-MAINLINE-263: 批次收敛与统一验证（WU256~263）

- Objective: 合并 digest 一致化诊断轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU256~263 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU256~263):
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
- Rollback plan: 回滚本批提交，恢复 WU248~255 诊断粒度。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含分类 digest 与 `overall_digest` 字段。
  - core/service 定向测试通过。

- Validation result (WU256~263 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.246 已完成 Work Unit

WU-MAINLINE-264: compare 成功摘要固定输出 receiver raw digest 键序

- Objective: 固定 digest 关键字段顺序，减少文本 diff 噪声。
- Scope (in/out):
  - in: `receiver_raw_digest` 固定在 digest 区段首位输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.247 已完成 Work Unit

WU-MAINLINE-265: compare 成功摘要固定输出 receiver compensated digest 键序

- Objective: 保持 digest 区段中 receiver compensated 字段位置稳定。
- Scope (in/out):
  - in: `receiver_comp_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.248 已完成 Work Unit

WU-MAINLINE-266: compare 成功摘要固定输出 s-parameter digest 键序

- Objective: 保持 digest 区段中 s-parameter 字段位置稳定。
- Scope (in/out):
  - in: `sparameter_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.249 已完成 Work Unit

WU-MAINLINE-267: compare 成功摘要固定输出 worst digest 键序

- Objective: 保持 digest 区段中 worst 字段位置稳定。
- Scope (in/out):
  - in: `worst_digest` 固定位置输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.250 已完成 Work Unit

WU-MAINLINE-268: compare 成功摘要固定输出 overall digest 键序

- Objective: 保持 digest 区段中 overall 字段位置稳定并作为收束键。
- Scope (in/out):
  - in: `overall_digest` 固定末位输出。
  - out: 全量字段排序重构。
- Status: ✅ Completed (2026-02-14)

### 8.251 已完成 Work Unit

WU-MAINLINE-269: comparator 去除条件分支内重复 digest 输出

- Objective: 避免重复输出导致的键序漂移与噪声。
- Scope (in/out):
  - in: digest 输出统一收敛到基础区段。
  - out: 其它字段重构。
- Status: ✅ Completed (2026-02-14)

### 8.252 已完成 Work Unit

WU-MAINLINE-270: core/service 回归补齐 digest 键序断言

- Objective: 防止后续迭代破坏固定键序约束。
- Scope (in/out):
  - in: core/service 测试新增 digest 键顺序断言。
  - out: 全字段顺序快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.253 已完成 Work Unit

WU-MAINLINE-271: 批次收敛与统一验证（WU264~271）

- Objective: 合并 digest 键序稳定化轻量 WU，保持主线高频闭环。
- Scope (in/out):
  - in: 聚合 WU264~271 的代码/测试/文档并统一回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU264~271):
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
- Rollback plan: 回滚本批提交，恢复 WU256~263 输出形态。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情中的 digest 字段保持固定顺序输出。
  - core/service 定向测试通过。

- Validation result (WU264~271 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.254 已完成 Work Unit

WU-MAINLINE-272: compare 成功摘要增加版本与兼容元信息

- Objective: 为 compare detail 解析器演进提供稳定版本识别入口。
- Scope (in/out):
  - in: 新增 `summary_version`、`summary_schema`、`summary_compat` 字段。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.255 已完成 Work Unit

WU-MAINLINE-273: core/service 回归覆盖 summary 元信息字段

- Objective: 防止 summary 元信息字段在后续迭代回归丢失。
- Scope (in/out):
  - in: core/service compare detail 测试增加元信息字段断言。
  - out: 全字段顺序快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.256 已完成 Work Unit

WU-MAINLINE-274: 批次收敛与统一验证（WU272~274）

- Objective: 按粗粒度 WU 模式完成本批代码/测试/文档闭环。
- Scope (in/out):
  - in: 聚合本批改动并完成定向回归验证。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU272~274):
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
- Rollback plan: 回滚本批提交，恢复 WU264~271 输出形态。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 `summary_version/summary_schema/summary_compat`。
  - core/service 定向测试通过。

- Validation result (WU272~274 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.257 已完成 Work Unit

WU-MAINLINE-275: compare 成功摘要新增加速诊断字段

- Objective: 一次性提升 summary 的可检索与可判读效率。
- Scope (in/out):
  - in: 新增 `summary_token`、`summary_primary_profile`、`summary_health_level`。
  - out: proto 结构化字段化。
- Status: ✅ Completed (2026-02-14)

### 8.258 已完成 Work Unit

WU-MAINLINE-276: core/service 回归覆盖加速诊断字段

- Objective: 防止新增字段在后续迭代回归丢失。
- Scope (in/out):
  - in: core/service compare detail 测试增加字段断言。
  - out: 全字段顺序快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.259 已完成 Work Unit

WU-MAINLINE-277: 批次收敛与统一验证（WU275~277）

- Objective: 以粗粒度 WU 完成本批代码/测试/文档闭环并提升单次吞吐。
- Scope (in/out):
  - in: 聚合本批改动并执行定向回归。
  - out: compare RPC 契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU275~277):
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
- Rollback plan: 回滚本批提交，恢复 WU272~274 输出形态。
- Risks: detail 文本持续增长；当前仍维持单字段透传，兼容性风险低。
- Acceptance criteria:
  - compare 成功详情包含 `summary_token/summary_primary_profile/summary_health_level`。
  - core/service 定向测试通过。

- Validation result (WU275~277 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.260 已完成 Work Unit

WU-MAINLINE-278: 仿真波形生成模型动态化增强

- Objective: 解决仿真模式波形“平直无波动”的体验问题。
- Scope (in/out):
  - in: PXI/USB mock 驱动引入频率相关起伏、谐波成分与帧间动态。
  - out: 真实硬件驱动行为重构。
- Status: ✅ Completed (2026-02-14)

### 8.261 已完成 Work Unit

WU-MAINLINE-279: 服务层新增非平坦波形回归断言

- Objective: 防止仿真波形再次退化为近似常量曲线。
- Scope (in/out):
  - in: `vna_control_service_test` 增加多点扫频起伏断言。
  - out: 插件端视觉快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.262 已完成 Work Unit

WU-MAINLINE-280: 批次收敛与统一验证（WU278~280）

- Objective: 以粗粒度 WU 完成仿真波形端到端增强闭环。
- Scope (in/out):
  - in: 聚合 mock 驱动、服务测试、文档并完成定向回归。
  - out: gRPC/插件契约升级。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU278~280):
  - `vna/include/drivers/pxi_driver.h`
  - `vna/include/drivers/usb_vna_driver.h`
  - `vna/src/drivers/pxi_driver.cpp`
  - `vna/src/drivers/usb_vna_driver.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 无（仿真数据语义增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复上一版 mock 信号模型。
- Risks: 仿真数据形态变化可能影响依赖“固定曲线”的外部截图比对。
- Acceptance criteria:
  - 仿真扫频结果在服务层可观测到非平坦起伏。
  - 核心定向测试通过。

- Validation result (WU278~280 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.263 已完成 Work Unit

WU-MAINLINE-281: VS Code 波形渲染质量增强

- Objective: 快速提升仿真模式在插件端的可视化可读性与真实性。
- Scope (in/out):
  - in: 频域平滑曲线、噪声包络阴影、自适应纵轴、共享坐标渲染。
  - out: 新图表框架替换。
- Status: ✅ Completed (2026-02-14)

### 8.264 已完成 Work Unit

WU-MAINLINE-282: 插件回归测试补齐渲染增强断言

- Objective: 防止渲染增强在后续迭代中回归丢失。
- Scope (in/out):
  - in: `waveformPreview.test.ts` 增加包络渲染断言。
  - out: 像素级快照测试。
- Status: ✅ Completed (2026-02-14)

### 8.265 已完成 Work Unit

WU-MAINLINE-283: 批次收敛与统一验证（WU281~283）

- Objective: 以粗粒度 WU 完成插件波形渲染增强闭环。
- Scope (in/out):
  - in: 聚合插件代码、测试、文档并统一回归。
  - out: 插件命令交互流程重构。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU281~283):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件渲染与仿真展示增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复上一版波形渲染逻辑。
- Risks: 频域平滑会弱化尖峰细节；通过保持原始 marker 读数降低误导风险。
- Acceptance criteria:
  - 频域预览支持平滑、包络阴影与自适应纵轴。
  - 插件测试通过。

- Validation result (WU281~283 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.266 已完成 Work Unit

WU-MAINLINE-284: VS Code live 波形叠加分析增强

- Objective: 在 live 预览中补齐峰值与趋势观测能力。
- Scope (in/out):
  - in: 新增 `peak hold` 与最近 N 帧均值叠加曲线。
  - out: 频谱分析工具页重构。
- Status: ✅ Completed (2026-02-14)

### 8.267 已完成 Work Unit

WU-MAINLINE-285: 插件回归补齐 live 叠加逻辑测试

- Objective: 防止 live 叠加能力在后续迭代回归。
- Scope (in/out):
  - in: 新增 `liveWaveformOverlay.test.ts` 并接入测试脚本。
  - out: 端到端 UI 自动化测试。
- Status: ✅ Completed (2026-02-14)

### 8.268 已完成 Work Unit

WU-MAINLINE-286: 批次收敛与统一验证（WU284~286）

- Objective: 以粗粒度 WU 完成 live 波形叠加增强闭环。
- Scope (in/out):
  - in: 聚合插件代码、测试、文档并统一回归。
  - out: 插件命令交互流程重构。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU284~286):
  - `vna/tools/vscode-extension/src/liveWaveformOverlay.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/liveWaveformOverlay.test.ts`
  - `vna/tools/vscode-extension/package.json`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件可视化增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复上一版 live 预览逻辑。
- Risks: 叠加曲线增多会提高图面信息密度；通过颜色和图例区分降低认知负担。
- Acceptance criteria:
  - live 预览包含 `peak hold` 与最近 N 帧均值曲线。
  - 插件测试通过。

- Validation result (WU284~286 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.269 已完成 Work Unit

WU-MAINLINE-287: VS Code live 波形开关能力与默认策略优化

- Objective: 提升 live 波形分析效率并减少图面干扰。
- Scope (in/out):
  - in: 新增 `Raw/Smooth`、`Peak Hold`、`Recent Avg`、`Envelope` 快捷开关；优化默认显示策略。
  - out: 插件命令交互重构。
- Status: ✅ Completed (2026-02-14)

### 8.270 已完成 Work Unit

WU-MAINLINE-288: 插件回归覆盖 live 开关与默认策略

- Objective: 防止 live 开关能力在后续迭代回归。
- Scope (in/out):
  - in: 更新 `waveformPreview.test.ts` 与 `liveWaveformOverlay.test.ts` 断言。
  - out: 端到端 UI 自动化测试。
- Status: ✅ Completed (2026-02-14)

### 8.271 已完成 Work Unit

WU-MAINLINE-289: 批次收敛与统一验证（WU287~289）

- Objective: 以粗粒度 WU 完成 live 开关增强闭环。
- Scope (in/out):
  - in: 聚合插件代码、测试、文档并统一回归。
  - out: 插件协议变更。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU287~289):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/liveWaveformOverlay.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/test/liveWaveformOverlay.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件可视化增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复上一版 live 预览显示策略。
- Risks: 开关项增多会提高初次学习成本；通过默认策略和文档说明降低门槛。
- Acceptance criteria:
  - live 预览支持快捷显隐开关与优化后的默认显示策略。
  - 插件测试通过。

- Validation result (WU287~289 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.272 已完成 Work Unit

WU-MAINLINE-290: VS Code live 多帧统计面板

- Objective: 为 live 波形提供可持续观测的统计摘要。
- Scope (in/out):
  - in: 在 live 预览输出中增加 `peak-to-peak`、`mean`、`std`、`cv`、`window` 统计。
  - out: 后端统计协议扩展。
- Status: ✅ Completed (2026-02-14)

### 8.273 已完成 Work Unit

WU-MAINLINE-291: live 阈值高亮分级

- Objective: 提升异常波动识别速度。
- Scope (in/out):
  - in: 统计面板增加 `normal/warning/critical` 阈值高亮。
  - out: 用户可配置阈值。
- Status: ✅ Completed (2026-02-14)

### 8.274 已完成 Work Unit

WU-MAINLINE-292: 批次收敛与统一验证（WU290~292）

- Objective: 以粗粒度 WU 完成 live 统计与高亮能力闭环。
- Scope (in/out):
  - in: 聚合插件代码、测试、文档并统一回归。
  - out: 插件协议变更。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU290~292):
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/liveWaveformOverlay.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/liveWaveformOverlay.test.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 仅插件内部数据结构新增 `liveStats` 字段（无后端协议变更）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复上一版 live 预览呈现逻辑。
- Risks: 阈值为默认经验值，复杂场景下可能产生误报。
- Acceptance criteria:
  - live 预览显示多帧统计面板。
  - 统计面板随阈值分级高亮。
  - 插件测试通过。

- Validation result (WU290~292 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.275 已完成 Work Unit

WU-MAINLINE-293: live 扫描状态手动配置

- Objective: 支持在波形页内手动切换扫描状态，减少参数反复输入。
- Scope (in/out):
  - in: 新增 `continuous/single/hold` UI 按钮并接入 live 渲染状态机。
  - out: 后端采集协议变更。
- Status: ✅ Completed (2026-02-14)

### 8.276 已完成 Work Unit

WU-MAINLINE-294: 持续扫描状态可见化

- Objective: 让用户可直接查看持续扫描运行状态。
- Scope (in/out):
  - in: 增加状态栏显示扫描模式、stream 状态与帧计数。
  - out: 历史帧持久化统计。
- Status: ✅ Completed (2026-02-14)

### 8.277 已完成 Work Unit

WU-MAINLINE-295: 批次收敛与统一验证（WU293~295）

- Objective: 以粗粒度 WU 完成扫描状态 UI 能力闭环。
- Scope (in/out):
  - in: 聚合插件代码、测试、文档并统一回归。
  - out: 插件命令体系重构。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU293~295):
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/development-plan.md`
- Contract impact: 无后端协议变更（插件内部预览数据增加扫描状态元信息）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复参数驱动的原有扫描行为。
- Risks: `single` 到 `hold` 的自动切换为固定策略，后续可能需要可配置化。
- Acceptance criteria:
  - 波形页支持 `continuous/single/hold` 手动切换。
  - 可见扫描状态与持续扫描帧计数。
  - 插件测试通过。

- Validation result (WU293~295 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.278 已完成 Work Unit

WU-MAINLINE-296: 后端服务配置状态变更日志

- Objective: 在后台可观测服务配置与健康状态的变更过程。
- Scope (in/out):
  - in: `ServiceStatusService` 输出配置/健康/启动上下文状态变更日志。
  - out: 引入第三方日志框架。
- Status: ✅ Completed (2026-02-14)

### 8.279 已完成 Work Unit

WU-MAINLINE-297: 采集请求配置变更日志

- Objective: 在持续测试中快速识别采集配置切换。
- Scope (in/out):
  - in: gRPC `Acquire/StreamAcquisition` 输出请求配置初始化与变更日志，记录 stream 启停。
  - out: RPC 契约字段变更。
- Status: ✅ Completed (2026-02-14)

### 8.280 已完成 Work Unit

WU-MAINLINE-298: 批次收敛与统一验证（WU296~298）

- Objective: 以粗粒度 WU 完成后端配置状态日志能力闭环。
- Scope (in/out):
  - in: 聚合后端代码、测试、文档并统一回归。
  - out: 跨模块日志体系重构。
- Status: ✅ Completed (2026-02-14)

- Files to change (WU296~298):
  - `vna/src/service/service_status_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/service_status_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅日志与测试增强）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_service_status_service_test`
  - `cd vna && .\build\easy_service_status_service_test.exe`
- Rollback plan: 回滚本批提交，恢复原有无变更日志输出行为。
- Risks: 日志量在高频状态切换场景可能增大；当前仅在状态变化时输出以控制噪声。
- Acceptance criteria:
  - 后台可见服务配置/健康/启动上下文变更日志。
  - 后台可见 Acquire/Stream 配置变更与 stream 启停日志。
  - 对应后端测试通过。

- Validation result (WU296~298 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_service_status_service_test` 通过
  - `cd vna && .\build\easy_service_status_service_test.exe` 通过

