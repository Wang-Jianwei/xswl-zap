# Phase 0（2 周）— 合约与骨架

## 目标

搭建可并行开发基础，打通最小链路。

## 任务池

| 任务ID | 内容 | 产出 |
|--------|------|------|
| P0.2 | 生成 C++/TS stub | generated/cpp, generated/ts |
| P0.3 | 建立 mock service（含时域 mock） | src/service/mock_server.cpp |
| P0.5 | 硬件抽象接口与驱动工厂 | include/core/hardware_driver.h, src/core/hardware_driver_factory.* |
| P0.6 | PXI/USB mock driver | src/drivers/pxi_driver.*, src/drivers/usb_vna_driver.* |

## 里程碑

- M0：Mock + 合约稳定，前端可联调。

## 关联

- 上层入口：`vna/docs/plan/README.md`
- 治理规则：`vna/docs/plan/governance.md`
- 历史详档：`vna/development-plan.md`
