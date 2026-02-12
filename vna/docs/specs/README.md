# Specs

本目录用于存放功能规格说明（Feature Spec）。

## 使用方式

1. 复制 `SPEC_TEMPLATE.md` 新建规格文件。
2. 文件命名建议：`SPEC-<模块>-<能力>.md`。
3. 规格通过评审后，再进入实现与测试。

## 与执行规范对齐

- 遵循 `copilot-instructions.md` 的 Work Unit 结构与验收要求。
- 一项能力对应一个规格，避免在单文件中混入多个不相关目标。
- 涉及契约改动时，必须明确 `Contract impact` 与回滚策略。
