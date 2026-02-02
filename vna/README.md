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

---

## 后续步骤 ✅

1. 请确认哪些需求为优先（MUST/SHOULD/CAN）。
2. 基于确认的优先级拆分为 Issue，并着手实现最小可行集（MVP）。

如需，我可以把这些条目拆成具体的 GitHub Issue 模板并创建初始任务清单。
