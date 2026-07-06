# 键盘快捷键系统实现报告

**日期**: 2026-07-06 | **模块**: CNC_SHORTCUTS

## 概述
统一的键盘快捷键管理，支持注册/移除/冲突检测/帮助面板，全局按键监听，输入框内自动禁用。

## 功能
- `registerShortcut(keys, action, description)` — 注册快捷键组合（如 `'ctrl+k'`）
- `removeShortcut(keys)` — 移除快捷键
- `showShortcutsHelp()` — 控制台打印快捷键帮助表格
- `enableShortcuts()` / `disableShortcuts()` — 全局开关
- `getConflicts()` — 检测冲突
- 内置快捷键：`?` 和 `/` 显示帮助

## 快捷键格式
支持组合键：`ctrl`, `alt`, `shift`, `meta`。按键名称小写。例如：`'ctrl+s'`, `'alt+1'`, `'shift+g'`。

## 测试用例
1. `CNC_SHORTCUTS.registerShortcut('ctrl+k', fn, '搜索')` 注册快捷键
2. `CNC_SHORTCUTS.removeShortcut('ctrl+k')` 移除
3. `CNC_SHORTCUTS.showShortcutsHelp()` 输出帮助
4. `CNC_SHORTCUTS.disableShortcuts()` 禁用后快捷键不触发
