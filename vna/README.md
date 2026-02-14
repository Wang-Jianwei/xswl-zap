# xswl-zap-vna

一款矢量网络分析仪（VNA）上位机应用。

## 应用概述

xswl-zap-vna 提供对矢量网络分析仪的统一控制与测量能力，支持多厂商仪器、PXI 平台以及虚拟仪器，面向自动化测试、实验室测量和研发验证场景。

## 应用的具体需求（功能 & 非功能）

### 功能需求（MUST）

1. 仪器连接与识别
   - 支持常见接口：GPIB、USB、LAN（VXI-11/Socket）、PXI/CompactPCI
   - 支持 VISA（NI-VISA / pyvisa）互操作，支持自动发现与手动配置

2. 基本测量能力
   - 支持 S 参数测量：S11、S21、S12、S22（可扩展至 n 端口）
   - 支持接收机数据（参考/测量通道 I/Q）查看与输出；S 参数是核心输出之一但不是唯一输出
   - 支持幅度/相位、实时/平均测量、步进与连续扫描
   - 支持设置频率点、起止频率、扫点数、功率、IF 带宽等参数

3. 校准与补偿
   - 提供常用校准类型：SOLT、TRL、基于校准套件的管理与保存
   - 支持去嵌入（de-embedding）和端口延展（port extension）

4. 数据保存与导出
   - 支持导出格式：Touchstone (.sNp)、CSV、MAT、JSON
   - 支持导入测量文件以便比对与回放

5. 可视化与报告
   - 提供线图、Smith 图、极坐标、Bode 图、Marker 功能
   - 支持生成报告（PDF/HTML）并附带测量元数据

6. 自动化与脚本
   - 提供脚本或插件接口（例如 Python 插件/脚本）用于自动化测量流程与测试序列
   - 支持批量测量、参数扫描与结果汇总

7. 插件化架构
   - 支持插件加载：仪器驱动、测量算法、导出器、仪器仿真等
   - 提供清晰的插件 API 和版本兼容策略
   - 模块构建策略：各个功能模块（驱动层、测量算法、数据导出、校准器等）应作为**动态库（Shared Library）**开发与发布，UI 层使用 **Qt** 开发为可执行程序，通过动态链接或运行时加载这些模块
     - 在构建时间以动态方式链接模块（shared linking），在运行时仍应支持按需加载（例如通过插件目录或显式 LoadLibrary/dlopen）以便热插/替换与隔离测试
     - 接口设计建议使用纯虚类（C++ 抽象接口）或 C ABI 插件入口（anchor C 函数）以降低 ABI 兼容风险
     - 使用明确的导出/导入宏（如 `MYLIB_EXPORT` / `MYLIB_IMPORT`）或 CMake `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`，并考虑符号可见性（-fvisibility=hidden）以控制 API 面
     - 明确版本与兼容策略：语义化版本、ABI 兼容矩阵与向后兼容策略；在插件元数据中包含版本、依赖与接口签名
     - 运行时要求：清晰定义插件搜索路径、加载失败的回退策略、资源冲突检测（如端口/采集卡占用）以及卸载/重载策略（若支持）

8. 仪器仿真/虚拟仪器
   - 提供虚拟 VNA 驱动以便在没有实机时进行开发和 CI 测试

9. 日志与异常处理
   - 结构化日志记录（支持不同级别），错误可恢复或给出明确诊断信息

10. 多仪器与并发控制
    - 支持同时控制多台仪器并支持同步触发机制

11. VNA 实例（基于 PXI 多板卡的 VNA 实例化）
    - 支持在上位机创建多个 VNA 实例（logical VNA），每个实例展现为一个完整的 VNA 逻辑实体，用于控制并聚合多块 PXI/采集板卡
    - 板卡仅用于数据采集（IQ/raw），不承载 VNA 的业务功能；VNA 实例在上位机实现测量业务（频率扫描、S 参数计算、校准、去嵌入、报告生成等）
    - 支持端口与物理通道映射、时序与触发同步、采样时钟管理和延时对齐
    - 支持实例级校准和去嵌入，校准数据可保存并应用于该实例的后续测量
    - 支持实例的生命周期管理：创建/配置/保存/恢复/销毁，支持通过脚本接口批量管理
    - 支持将 VNA 实例与真实 VNA 仪器互换使用（一致的控制 API），并保证对上层的行为兼容
    - 支持多个实例并发运行且相互隔离（资源调度、互斥、诊断与资源占用可见）

### MUST 完成度快照（2026-02-13）

> 口径说明：以下状态基于当前已落地实现与 `development-plan.md` 完成记录。

| MUST 项 | 当前状态 | 说明 |
|---|---|---|
| 1. 仪器连接与识别 | 🟡 部分完成 | 已有 gRPC + mock/PXI 最小链路；GPIB/USB/LAN/VISA 真实互操作未闭环。 |
| 2. 基本测量能力 | 🟡 部分完成 | 已完成 `Acquire/StreamAcquisition` 最小能力；完整 S 参数流程与扫频参数体系待补齐。 |
| 3. 校准与补偿 | ⚪ 未完成 | 校准（SOLT/TRL）与去嵌入主流程尚未形成可验收闭环。 |
| 4. 数据保存与导出 | ⚪ 未完成 | 尚未形成 Touchstone/CSV/MAT 导出与导入回放闭环。 |
| 5. 可视化与报告 | ⚪ 未完成 | Qt/图形化展示（Smith/Bode/Marker）与 PDF/HTML 报告未闭环。 |
| 6. 自动化与脚本 | 🟡 部分完成 | smoke/gate/summary 自动化已完善；面向完整业务流程的批量测量脚本待补齐。 |
| 7. 插件化架构 | 🟡 部分完成 | 具备最小插件相关基础；动态库插件完整生命周期能力仍需推进。 |
| 8. 仪器仿真/虚拟仪器 | ✅ 已完成（MVP） | 已具备 mock driver + mock service，可支撑 CI 基础联调。 |
| 9. 日志与异常处理 | 🟡 部分完成 | 关键链路已有结构化错误与诊断增强；全局日志体系待统一。 |
| 10. 多仪器与并发控制 | 🟡 部分完成 | 已具备双实例并行采集最小闭环与冲突超时诊断；多仪器同步触发机制未闭环。 |
| 11. VNA 实例化能力 | 🟡 部分完成 | 已具备实例生命周期最小闭环与双实例隔离运行；完整批量管理与高级同步能力待增强。 |

结论：当前处于“主链路 MVP 可运行、应用级功能未全部完成”的阶段。

补充（WU42 进展）：已具备基于 `AcquisitionResult` 的 Touchstone/CSV 最小导出能力（core + service），当前范围不含 MAT 与导入回放。

补充（WU44 进展）：CSV 导出已内置复数派生字段 `magnitude_db`、`phase_deg`，覆盖接收机数据与 S 参数数据行。

补充（WU45/WU49 进展）：`AcquireRequest` 支持可选导出路径字段：`export_csv_path`、`export_touchstone_path`、`export_json_path`；设置后由服务端在采集成功后直接落盘导出。

补充（WU46 进展）：导出失败时会返回可诊断错误信息（例如输出路径不可写），并在 gRPC `Acquire` 错误消息中透传。

补充（WU47 进展）：关键脚本已内置 MinGW 运行时自检与 PATH 自动注入（`C:\msys64\mingw64\bin`），用于降低终端环境漂移导致的构建/测试误失败。

补充（WU48 进展）：CSV/Touchstone 导出已支持父目录自动创建（嵌套路径可直接使用），路径不可写时仍返回可诊断错误。

补充（WU49 进展）：已新增 JSON 导出能力（包含 receiver raw/compensated 与 s-parameter 点集），并支持通过 `AcquireRequest.export_json_path` 一体化触发导出。

补充（WU50 进展）：已新增 `MeasurementExporter::ImportJson`，可将 JSON 导出结果回读为 `AcquisitionResult`（导入回放基础能力，当前为 core 层 MVP）。

补充（WU51 进展）：已新增 service 层导入入口 `VnaControlService::ImportAcquisitionResult`，可直接通过 JSON 路径读取测量结果并返回统一错误信息。

补充（WU52 进展）：已新增 gRPC `ImportAcquisition` RPC（输入 `json_path`，返回 `AcquisitionResult`），并纳入 gRPC smoke client 回归路径。

补充（WU53 进展）：导入路径已增加安全约束（仅允许 workspace 相对路径、禁止 `..` 穿越、限定 `.json` 扩展名），错误信息使用 `IMPORT_PATH_*` 前缀，便于脚本与调用方分类处理。

补充（WU54 进展）：新增最小“导入 vs 当前采集”比对能力（receiver/s-parameter 数据产品），支持容差比较并输出 `COMPARE_*` 诊断前缀。

补充（WU55 进展）：已新增 gRPC `CompareImportedAcquisition` RPC（导入文件 + 当前采集参数 + 容差），支持返回 `matched` 与对比详情，用于远程回放比对。

补充（WU56 进展）：VS Code 插件已新增 `XSWL: Preview Waveform`，可在 Webview 直接查看采集波形（MVP 折线图），主线可见能力已从“摘要文本”升级为“图形预览”。

补充（WU57 进展）：插件波形预览支持频域/时域模式选择，并新增基础 marker（min/max）显示，便于快速定位峰谷点。

补充（WU58 进展）：插件波形预览新增 `live` 短时自动刷新模式，并加入性能保护（渲染点下采样 + 刷新节流），提升连续观察可用性。

补充（WU59 进展）：插件频域波形预览新增 trace source 选择（`frame` / `receiverRaw` / `receiverCompensated` / `sParameterS11` / `all`），其中 `all` 支持多曲线叠加与图例展示，便于同屏对比数据产品。

补充（WU60 进展）：插件频域接收机曲线新增 `channel index` 选择能力（适用于 `receiverRaw` / `receiverCompensated` / `all`），可按通道查看原始/补偿波形，提升多通道调试效率。

补充（WU61 进展）：插件在 `all` 模式新增曲线显隐选择，可按需勾选 `frame/receiverRaw/receiverCompensated/s11`，减少同屏噪声并聚焦目标数据。

补充（WU62 进展）：插件波形页图例支持点击临时显隐曲线（无需重新执行命令），用于快速对比多曲线叠加场景。

补充（WU63 进展）：插件波形图坐标轴新增基础刻度文本（x/y 的 min/max），提升多模式下的读数直观性。

补充（WU64 进展）：插件 marker 展示升级为“按曲线分组列表 + 图内 min/max 标记点”，并与图例显隐保持联动。

补充（WU65 进展）：插件 marker 分组支持按 y 值优先级排序，并对当前主曲线进行高亮，提升多曲线场景的定位效率。

补充（WU66 进展）：插件主曲线 marker 标签新增背景框显示，改善网格与多曲线叠加时的读数可见性。

补充（WU67 进展）：主曲线 marker 标签显示 `min/max + x/y` 完整数值，并采用紧凑布局，进一步提升快速读数效率。

补充（WU68 进展）：插件波形页新增 `Copy Primary Marker` 按钮，可一键复制主曲线 marker 读数到剪贴板，便于记录与汇报。

补充（WU69 进展）：复制主曲线 marker 后，页面内新增成功/失败状态条反馈，提升交互闭环感知。

补充（WU70~WU72 进展）：复制交互进一步增强，新增 `Copying...` 过渡态、状态条 2 秒自动淡出，以及 `Ctrl/Cmd + C` 快捷复制主曲线 marker。

补充（WU73~WU75 进展）：复制体验补齐细节，复制文本包含时间戳、页面显示快捷键提示、无主曲线时按钮置灰并给出原因提示。

补充（WU76~WU78 进展）：复制反馈新增本地时间戳、支持 `Esc` 立即清除状态，并在复制按钮 tooltip 展示字符数信息。

补充（WU79~WU84 进展）：复制流程继续细化，新增 `source/channel` 上下文、防连点、`Copied!` 按钮短态以及 `aria-live` 可访问性反馈。

补充（WU85~WU90 进展）：复制交互再增强，新增 `Clear Status`、`Alt + C` 快捷键、字符数回显和无 Clipboard API 显式提示。

补充（WU91 进展）：后端 core 回放比对能力增强，`AcquisitionComparator` 增加 `max/rms` 误差统计与精确 mismatch 上下文（point/channel/value + delta），并贯通到 service/gRPC compare detail。

补充（WU92~WU97 进展）：后端 compare 诊断继续增强，新增 tolerance/分组样本计数摘要、非有限值检测（NaN/Inf），并在 core/service 测试中覆盖成功与异常路径。

补充（WU98~WU103 进展）：后端 compare mismatch detail 进一步细化，新增 expected/actual、索引位置与容差上下文，覆盖 instanceId/计数/频点/端口等关键差异定位。

补充（WU104~WU109 进展）：后端 compare 成功摘要新增各数据类别最大误差位置（`receiver_raw_max_at` / `receiver_comp_max_at` / `sparameter_max_at`），便于在 matched 场景下快速定位“误差峰值点位”。

补充（WU110~WU115 进展）：后端 compare 成功摘要新增分类 RMS 误差字段（`receiver_raw_rms_delta` / `receiver_comp_rms_delta` / `sparameter_rms_delta`），用于快速判断不同数据类别的整体误差水平。

补充（WU116~WU121 进展）：后端 compare 成功摘要新增最大误差分量方向与有符号偏差字段（如 `receiver_raw_max_component`、`receiver_raw_max_signed_delta`），用于在 matched 场景下识别误差主要来自实部/虚部及偏差方向。

补充（WU122~WU127 进展）：后端 compare 成功摘要新增最大误差对应频点字段（`receiver_raw_max_frequency_hz` / `receiver_comp_max_frequency_hz` / `sparameter_max_frequency_hz`），便于直接定位误差峰值频点。

补充（WU128~WU139 进展）：后端 compare 成功摘要新增误差/容差比率字段（overall 与各数据类别的 `*_delta_ratio`），可直接评估当前误差相对容差的裕量。

补充（WU140~WU151 进展）：后端 compare 成功摘要新增全局最差类别诊断（`worst_category`、`worst_max_at`、`worst_max_frequency_hz`、`worst_max_delta_ratio`），用于快速锁定优先排查的数据类别与点位。

补充（WU152~WU163 进展）：后端 compare 成功摘要新增全局最差点及分类最大误差点的 expected/actual 快照字段（如 `worst_expected_real`、`worst_actual_real`），便于在 matched 场景下直接观察最差点偏差形态。

补充（WU164~WU175 进展）：后端 compare 成功摘要新增分量主导优势幅度字段（如 `receiver_raw_max_component_margin`、`worst_max_component_margin`），用于判断误差是由单一分量明显主导还是实部/虚部接近并列。

补充（WU176~WU191 进展）：后端 compare 成功摘要新增分类与全局最差点的实部/虚部绝对误差拆分字段（如 `receiver_raw_max_real_delta`、`receiver_raw_max_imag_delta`、`worst_max_real_delta`、`worst_max_imag_delta`），便于快速识别误差构成。

补充（WU192~WU203 进展）：VS Code 插件已修复频域波形仅单点显示问题，`Preview Waveform`/`Stream Preview` 的 CW 请求现会携带扫频参数（`start/stop/sweepPointCount`），`sampleCount` 可映射为多点频域预览。

补充（WU204~WU215 进展）：后端 compare 成功摘要新增最大误差点位的序列相对位置字段（分类与全局 `*_max_point_ratio`，并附 `*_total_points`），可快速判断误差峰值位于扫频前段/中段/后段。

补充（WU216~WU223 进展）：后端 compare 成功摘要新增容差裕量字段（overall/分类/worst 的 `*_tolerance_margin`），用于直接评估当前 matched 结果距容差上限的剩余空间。

### 非功能需求（SHOULD/CAN）

1. 性能与响应：GUI 响应 < 200ms（一般交互），测量吞吐满足指定扫点配置
2. 可移植性：以 Windows 为主要支持平台，优先考虑 Linux/macOS 可选支持
3. 可扩展性：模块化设计，便于新增仪器与测量模块
4. 可维护性：提供单元测试、集成测试与文档
5. 安全与管理：必要时支持用户角色与本地认证，安全存储凭据
6. 国际化：支持中文/英文界面

## 验收标准（Acceptance Criteria）

- 必须能通过配置连接至少两款不同厂商的真实 VNA 完成 S 参数测量并导出 Touchstone 文件。
- 必须能在上位机创建至少一个 VNA 实例并绑定至少两块 PXI 板卡，完成一次 S 参数测量流程，其中板卡仅负责采集，实例完成信号处理与导出 Touchstone 文件。
- 必须支持实例级校准（例如 SOLT）并能保存校准结果到实例并用于后续测量。
- 能通过脚本接口自动创建/配置/运行一个 VNA 实例并生成测量报告。
- 能同时运行两个互不干扰的 VNA 实例（或若受限则提供明确的资源占用与降级策略）。
- 插件机制能够加载/卸载自定义仪器驱动且不需重启主程序（或有明确降级策略）。

## 测试与持续集成

- 提供虚拟仪器供 CI 使用的集成测试套件。
- 自动化单元测试覆盖核心库（驱动层、测量流程、数据导出）。

## 兼容与依赖（示例）

- 开发语言与构建
  - **核心开发采用 C++11** 标准（保证在较老编译器上兼容 C++11 功能集）。
  - **构建系统使用 CMake（>=3.10）**，支持 out-of-source 构建和多种生成器。
  - **推荐工具链（Windows）**：MinGW-w64（建议搭配 MSYS2），同时兼容 Linux/macOS 上的 GCC/Clang。

- 模块构建与链接策略（Shared Libraries + Qt UI）
  - 各功能模块以 **共享库（.dll/.so/.dylib）** 发布，UI 使用 **Qt** 开发为可执行程序，通过动态链接或运行时加载模块。
  - CMake 建议：显式创建共享库（`add_library(foo SHARED ...)`）并导出目标接口；设置统一的导出宏与符号可见性。
  - Windows 注意事项（MinGW）：确保导出/导入宏（`__declspec(dllexport/dllimport)`）或使用 `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`；部署时处理 DLL 依赖和搜索路径（PATH、应用目录或 manifest）。
  - 运行时加载：使用 `LoadLibrary` / `GetProcAddress`（Windows）或 `dlopen` / `dlsym`（POSIX）作为插件后备加载方案，或使用 Qt 的 `QLibrary`/`QPluginLoader`。

  CMake 示例（简化）:

  ```cmake
  # 在库项目中
  add_library(myvna_driver SHARED src/driver.cpp)
  target_include_directories(myvna_driver PUBLIC include)
  # 导出宏或使用 CMake helper
  target_compile_definitions(myvna_driver PRIVATE MYVNA_DRIVER_EXPORTS)

  # 在 UI 程序中（动态链接）
  add_executable(vna_ui src/main.cpp)
  target_link_libraries(vna_ui PRIVATE myvna_driver Qt5::Widgets)
  ```

  - 建议为插件提供一个最小的 C API 入口（例如 `extern "C" IPlugin* create_plugin()`）以避免 C++ ABI 问题。

- 构建与运行快速指南（Windows / MinGW）
  - 安装 MinGW-w64（建议使用 MSYS2）并确保 gcc/g++ 可用于 PATH。
  - 在项目根目录执行：
    - `cmake -S . -B build -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release`
    - `mingw32-make -C build`
    - `ctest --test-dir build`

- 推荐依赖
  - NI-VISA（与真实仪器互通）或 pyvisa（在采用 Python 插件方案时）。
  - 数值与矩阵库：Eigen 或 Armadillo（C++）；numpy/scipy（Python）。
  - 可选工具库：Boost、fmt、spdlog、pybind11（用于 Python 绑定/插件）。
  - 报告相关：reportlab（Python）或其它 C++ PDF 库（可选）。

- 测试与 CI 建议
  - 使用 CTest 配合 GoogleTest 或 Catch2 进行单元/集成测试。
  - 在 CI 中搭建 MinGW/ GCC/Clang 的构建矩阵，并使用虚拟仪器进行集成测试。

## TypeScript Stub 最小示例

- 已生成文件：`generated/ts/vna.ts`
- 主要类型：`Topology`、`ValidationResult`、`TopologyErrorDetail`

```ts
import { Topology, ValidationResult } from "./generated/ts/vna";

const topology: Topology = {
   id: "t0",
   yaml: "instances:\n  - id: inst0\n    driver: pxi\n    device: pxi-mock-0\n    resource: dev0\n",
};

function handleValidation(result: ValidationResult): void {
   if (result.ok) {
      console.log("topology valid");
      return;
   }

   for (const detail of result.errorDetails) {
      console.error(`[${detail.code}] ${detail.field}: ${detail.message}`);
   }
}
```

生成命令（Windows PowerShell）：

```powershell
$env:PATH = "C:\protoc\bin;C:\msys64\mingw64\bin;C:\Program Files\nodejs;C:\Users\Administrator\AppData\Roaming\npm;" + $env:PATH
.\scripts\generate_proto.ps1
```

gRPC C++ 适配层隔离构建（不影响主线 `ninja-mingw`）：

```powershell
.\scripts\build_grpc_adapter.ps1
```

说明：该脚本使用 `grpc-mingw64` preset（`build-grpc/`）与 MSYS2 MinGW64 工具链，避免与主线编译器产生版本耦合。

最小 gRPC server 启动（仅 `ValidateTopology` + `GetServiceStatus`）：

```powershell
.\build-grpc\easy_grpc_server.exe
```

最小 gRPC client smoke（默认访问 `127.0.0.1:50051`，调用 `GetServiceStatus` + `ValidateTopology` + `Acquire`）：

```powershell
.\build-grpc\easy_grpc_client_smoke.exe
```

说明：`Acquire` 响应除 `frequency_frame/time_frame` 外，还会返回：

- `receiver_raw_points`：接收机原始通道数据（参考/测量通道 I/Q）
- `receiver_compensated_points`：应用出厂补偿后的接收机通道数据
- `s_parameter_points`：按频点组织的 n 端口 S 参数矩阵点集

说明：`GetServiceStatus` 会额外校验 `bootstrap_mode` 与 `config_path` 为非空，若为空将返回非 0 退出码。

如需指定地址：

```powershell
.\build-grpc\easy_grpc_client_smoke.exe 127.0.0.1:50051
```

最小 gRPC stream smoke（调用 `StreamAcquisition`，默认接收 3 帧后主动取消流，验证持续 server streaming）：

```powershell
.\build-grpc\easy_grpc_stream_smoke.exe
```

可选参数：`<endpoint> <maxFrames>`，例如接收 5 帧：

```powershell
.\build-grpc\easy_grpc_stream_smoke.exe 127.0.0.1:50051 5
```

流式节流参数可在 `config/service.yaml` 中配置：

- `stream_throttle_every_n_frames`：每发送 N 帧后触发一次节流休眠。
- `stream_throttle_ms`：每次节流休眠毫秒数（`0` 表示不休眠）。

一键节流矩阵 smoke（自动切换配置并执行 unary + stream 验证）：

```powershell
.\scripts\run_grpc_smoke_matrix.ps1
```

如已完成构建，可跳过重建：

```powershell
.\scripts\run_grpc_smoke_matrix.ps1 -SkipBuild
```

说明：矩阵脚本会自动抑制已知重复的 gRPC `resource_quota` 指标告警噪声，保留关键通过/失败输出。

如需在 CI 中启用更严格检查（未知 stderr 直接判失败）：

```powershell
.\scripts\run_grpc_smoke_matrix.ps1 -SkipBuild -FailOnUnknownStderr
```

如需限制单次 smoke 子进程最长执行时间（默认 `20` 秒）：

```powershell
.\scripts\run_grpc_smoke_matrix.ps1 -SkipBuild -SmokeTimeoutSec 30
```

如需输出结构化回归结果（JSON）：

```powershell
.\scripts\run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath .\build-grpc\smoke-matrix-report.json
```

报告 JSON 顶层包含 `failureSummary` 分类统计：

- `totalFailedCases`：失败 case 总数
- `exitCode`：由非 0 退出码导致的失败数
- `timeout`：由超时导致的失败数
- `unknownStderr`：严格模式下由未知 stderr 导致的失败数

`failureSummary` 还包含占比字段（范围 `0.0~1.0`）：

- `failureRate`
- `exitCodeRate`
- `timeoutRate`
- `unknownStderrRate`

`failureSummary.failedCaseNamesByReason` 提供按失败原因分组的 case 名单：

- `exitCode[]`
- `timeout[]`
- `unknownStderr[]`

报告还包含以下元数据：

- `reportVersion`：报告结构版本（当前 `1.6`）
- `durationMs`：整次矩阵执行耗时（毫秒）
- `status`：本次矩阵结果状态（`PASS`/`FAIL`）
- `reportDigest`：顶层摘要字符串（通过/失败/噪声/告警计数）
- `generatedBy`：报告生成器信息（脚本名与运行时）
- `failedCaseNames`：失败 case 名称列表
- `noiseSuppressedTotal`：本次执行被抑制的已知噪声总条数
- `warnings[]`：结构化告警摘要（如噪声抑制、非严格模式下未知 stderr）
- `executionOptions`：本次执行参数快照（`skipBuild/failOnUnknownStderr/smokeTimeoutSec/endpoint/configPath/configHashSha256/reportJsonPath*`）
- `cases[*].durationMs`：单个 case 执行耗时（毫秒）
- `cases[*].caseIndex`：case 在矩阵中的稳定序号（从 1 开始）
- `cases[*].resultDigest`：单 case 摘要字符串（原因与关键计数）

`ReportJsonPath` 支持时间戳占位符：`{timestamp}` / `{timestampUtc}` / `{timestampLocal}`。

注意：在 PowerShell 中使用占位符时请给路径加引号，避免 `{}` 被表达式语法解析。

```powershell
.\scripts\run_grpc_smoke_matrix.ps1 -SkipBuild -ReportJsonPath '.\build-grpc\smoke-matrix-{timestamp}.json'
```

校验报告字段与结构快照（含 schema 必填项 + snapshot key-set）：

```powershell
.\scripts\validate_smoke_matrix_report.ps1 -ReportPath .\build-grpc\smoke-matrix-summary-v16.json -SchemaPath .\scripts\smoke_matrix_report.schema.json -Snapshot
```

CI 门禁一键执行（生成报告 + 校验报告）：

```powershell
.\scripts\run_smoke_report_gate.ps1 -SkipBuild
```

如需机器可解析输出（JSON）：

```powershell
.\scripts\run_smoke_report_gate.ps1 -SkipBuild -AsJson
```

如需将 gate 结果 JSON 同步写入文件（支持 `{timestamp}` / `{timestampUtc}` / `{timestampLocal}` 占位符）：

```powershell
.\scripts\run_smoke_report_gate.ps1 -SkipBuild -AsJson -ResultJsonPath '.\build-grpc\gate-result-{timestamp}.json'
```

`run_smoke_report_gate.ps1` 的机器结果字段包含：

- `status`（`PASS`/`FAIL`）
- `exitCode`（`0`/`1`）
- `durationMs`
- `startedAtUtc` / `finishedAtUtc`
- `reportPath` / `resultJsonPath`
- `failOnUnknownStderr` / `smokeTimeoutSec`
- `failOnWarningCodes` / `matchedWarningCodes`
- `error`

如需在门禁中把特定告警码升级为失败（例如已知噪声也视为失败）：

```powershell
.\scripts\run_smoke_report_gate.ps1 -SkipBuild -FailOnWarningCodes known_noise_suppressed
```

输出报告摘要（适合 CI 日志单行展示）：

```powershell
.\scripts\summarize_smoke_matrix_report.ps1 -ReportPath .\build-grpc\smoke-matrix-summary-v17-fail.json
```

输出摘要 JSON：

```powershell
.\scripts\summarize_smoke_matrix_report.ps1 -ReportPath .\build-grpc\smoke-matrix-summary-v17-fail.json -AsJson
```

输出压缩摘要 JSON 并写入文件：

```powershell
.\scripts\summarize_smoke_matrix_report.ps1 -ReportPath .\build-grpc\smoke-matrix-summary-v17-fail.json -AsJson -CompactJson -OutputJsonPath '.\build-grpc\smoke-summary-{timestamp}.json'
```

## 报告演进策略

- 报告字段采用“新增优先，不破坏旧字段”的演进方式。
- 每次新增顶层或关键嵌套字段时递增 `reportVersion`。
- 变更后必须同步更新：
   - `scripts/smoke_matrix_report.schema.json`
   - `scripts/validate_smoke_matrix_report.ps1` 的 snapshot key-set
   - README 报告字段说明与示例命令
- CI 建议固定使用 `run_smoke_report_gate.ps1`，避免脚本与校验规则脱节。

## VS Code 插件联调快速开始

在使用 `vna/tools/vscode-extension` 命令前，先确保 gRPC 后端已在 `vna` 目录启动：

```powershell
cd vna
.\scripts\start_grpc_for_vscode.ps1
```

如已完成构建，可跳过重建：

```powershell
.\scripts\start_grpc_for_vscode.ps1 -SkipBuild
```

停止后端：

```powershell
.\scripts\stop_grpc_for_vscode.ps1
```

重启后端：

```powershell
.\scripts\restart_grpc_for_vscode.ps1
```

如已完成构建，可跳过重建：

```powershell
.\scripts\restart_grpc_for_vscode.ps1 -SkipBuild
```

插件默认连接参数：

- `xswlZapVna.grpcAddress`: `127.0.0.1:50051`
- `xswlZapVna.grpcDeadlineMs`: `2000`

然后在插件目录执行：

```powershell
cd vna\tools\vscode-extension
npm install
npm run test
```

在 VS Code 中按 `F5` 启动 Extension Development Host 后，可运行：

- `XSWL: Get Service Status`
- `XSWL: Validate Topology`
- `XSWL: Acquire Once`
- `XSWL: Stream Preview`

---

## 后续步骤 ✅

1. 请确认哪些需求为优先（MUST/SHOULD/CAN）。
2. 基于确认的优先级拆分为 Issue，并着手实现最小可行集（MVP）。

如需，我可以把这些条目拆成具体的 GitHub Issue 模板并创建初始任务清单。
