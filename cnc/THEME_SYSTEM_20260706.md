# 主题系统实现报告

**日期**: 2026-07-06 | **模块**: CNC_THEME + themes/*.css

## 概述
主题管理器支持浅色/深色/高对比度三种主题的切换，通过 CSS 变量实现即时换肤。数据持久化到 LocalStorage。

## 功能
- `switchTheme(name)` — 切换主题，设置 `data-theme` 属性
- `registerTheme(name, config)` — 注册自定义主题（注入 CSS 变量）
- `getCurrentTheme()` / `isDarkMode()` / `toggleDarkMode()` — 查询状态
- `exportTheme()` / `importTheme(config)` — 主题配置导入导出
- `onChange(callback)` — 主题切换监听
- 内置主题：light（默认）、dark、high-contrast

## 主题文件
| 文件 | 内容 |
|------|------|
| themes/theme-light.css | 浅色主题，暖色底色 + 橙色强调色 |
| themes/theme-dark.css | 深色主题，深蓝底色 + 亮橙强调色 |
| themes/theme-high-contrast.css | 黑色背景 + 白色文字 + 黄色强调色 |

## 原理
通过 `document.documentElement.setAttribute('data-theme', name)` 切换 CSS 变量作用域。所有使用 `var(--xxx)` 的样式自动跟随主题变更。

## 集成
```html
<link rel="stylesheet" href="./themes/theme-light.css">
<link rel="stylesheet" href="./themes/theme-dark.css">
<link rel="stylesheet" href="./themes/theme-high-contrast.css">
<script src="./theme-manager.js"></script>
```

## 测试用例
1. `CNC_THEME.switchTheme('dark')` 切换到深色
2. `CNC_THEME.switchTheme('light')` 恢复浅色
3. `CNC_THEME.isDarkMode()` 返回布尔值
4. `CNC_THEME.getAvailableThemes()` 返回所有主题列表
5. `CNC_THEME.toggleDarkMode()` 切换深色/浅色
