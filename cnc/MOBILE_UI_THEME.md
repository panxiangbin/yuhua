# 移动端UI重构 — 主题配色与视觉规范

> 文档版本: 1.0  
> 设计风格: 深蓝科技风  
> 设计基线: 375×667px  
> 适配目标: iOS / Android / 微信内置浏览器

---

## 一、配色方案

### 1.1 主色调

| 色值 | CSS 变量 | 用途 | 色块 |
|------|----------|------|------|
| #0c2340 | --color-primary | 主色(深蓝) | ██ |
| #1565c0 | --color-primary-light | 主色亮(按钮/链接) | ██ |
| #0d47a1 | --color-primary-dark | 主色暗(标题栏) | ██ |
| #2196f3 | --color-accent | 强调色(活跃/选中) | ██ |
| #64b5f6 | --color-accent-light | 强调色亮(悬停) | ██ |
| #1976d2 | --color-accent-dark | 强调色暗(按压) | ██ |

### 1.2 功能色

| 色值 | CSS 变量 | 用途 |
|------|----------|------|
| #43a047 | --color-success | 成功/完成 |
| #f57c00 | --color-warning | 警告/进行中 |
| #e53935 | --color-error | 错误/未通过 |
| #00bcd4 | --color-info | 信息/提示 |
| #1565c0 | --color-link | 链接文字 |

### 1.3 中性色

| 色值 | CSS 变量 | 用途 |
|------|----------|------|
| #ffffff | --color-bg | 页面背景 |
| #f5f5f5 | --color-bg-secondary | 卡片背景/替代背景 |
| #eeeeee | --color-bg-tertiary | 禁用/分割线背景 |
| #e0e0e0 | --color-border | 边框/分割线 |
| #212121 | --color-text-primary | 主文字 |
| #616161 | --color-text-secondary | 次级文字 |
| #9e9e9e | --color-text-tertiary | 禁用/说明文字 |
| #ffffff | --color-text-inverse | 深色背景上文字 |
| #ffffff | --color-surface | 卡片/弹窗背景 |
| #1a1a2e | --color-code-bg | 代码块背景 |
| #e8f5e9 | --color-code-inline-bg | 行内代码背景 |

### 1.4 深色模式

| 色值 | CSS 变量 | 用途 |
|------|----------|------|
| #121212 | --color-dark-bg | 深色页面背景 |
| #1e1e1e | --color-dark-surface | 深色卡片背景 |
| #2c2c2c | --color-dark-elevated | 深色弹窗背景 |
| #e0e0e0 | --color-dark-text-primary | 深色主文字 |
| #9e9e9e | --color-dark-text-secondary | 深色次级文字 |
| #616161 | --color-dark-text-tertiary | 深色禁用文字 |
| #333333 | --color-dark-border | 深色边框 |
| #1565c0 | --color-dark-accent | 深色强调色 (不变) |

### 1.5 实体类型色

| 实体类型 | 色值 | CSS 变量 |
|----------|------|----------|
| G代码 | #e74c3c | --entity-gcode |
| M代码 | #e67e22 | --entity-mcode |
| 刀具 | #3498db | --entity-tool |
| 机床 | #9b59b6 | --entity-machine |
| 材料 | #27ae60 | --entity-material |
| 工艺 | #1abc9c | --entity-process |
| 概念 | #f39c12 | --entity-concept |
| 品牌 | #34495e | --entity-brand |
| 参数 | #7f8c8d | --entity-parameter |
| 案例 | #e91e63 | --entity-case |
| 故障 | #c0392b | --entity-problem |
| 考点 | #00bcd4 | --entity-exam |

### 1.6 颜色使用规则

```
页面背景:     --color-bg (#ffffff)
卡片/导航:    --color-surface (#ffffff)
分割线:       --color-border (#e0e0e0)
底部导航背景: rgba(255,255,255,0.92) + backdrop-filter: blur

强调/活跃色:  --color-accent (#2196f3)
链接色:       --color-link (#1565c0)
按钮主色:     --color-primary (#0c2340) 或 --color-accent (#2196f3)

大标题:       --color-text-primary (#212121)
正文:         --color-text-secondary (#616161)
辅助说明:     --color-text-tertiary (#9e9e9e)

深色模式:
  背景:       --color-dark-bg (#121212)
  卡片:       --color-dark-surface (#1e1e1e)
  文字:       --color-dark-text-primary (#e0e0e0)
```

---

## 二、字体规范

### 2.1 字体族

```css
:root {
  --font-system: -apple-system, BlinkMacSystemFont, "PingFang SC", 
                 "Helvetica Neue", "Microsoft YaHei", sans-serif;
  --font-code: "SF Mono", "Cascadia Code", "Fira Code", 
               "Source Code Pro", Consolas, monospace;
}
```

### 2.2 字号层级

| 层级 | 字号 | 行高 | 字重 | 应用场景 |
|------|------|------|------|----------|
| H1 | clamp(24px, 6.4vw, 32px) | 1.3 | 700 | 页面大标题 |
| H2 | clamp(20px, 5.33vw, 28px) | 1.35 | 600 | 区块标题 |
| H3 | clamp(18px, 4.8vw, 24px) | 1.4 | 600 | 卡片标题 |
| Body | clamp(16px, 4.27vw, 20px) | 1.6 | 400 | 正文阅读 |
| Small | clamp(13px, 3.47vw, 16px) | 1.5 | 400 | 辅助文字 |
| Label | clamp(11px, 2.93vw, 14px) | 1.4 | 500 | 标签/按钮文字 |
| Code | clamp(14px, 3.73vw, 18px) | 1.6 | 400 | 代码块 |

### 2.3 标题与正文的实际对照 (375px 屏幕)

```
H1: 24px (大标题)
H2: 20px (区块标题)
H3: 18px (卡片标题)
正文: 16px (最小可读)
小字: 13px (标签/说明)
导航栏: 11px (底部Tab)

实际测试结论：
  16px 在 375px 屏幕上每行可显示约 22-24 个中文字
  这是车间环境下可接受的最小子号
  建议详情页内容使用 18px 字号
```

### 2.4 字体颜色规范

```css
/* 亮色模式 */
--color-heading: #212121;
--color-body: #424242;
--color-caption: #757575;
--color-disabled: #9e9e9e;
--color-link: #1565c0;
--color-on-primary: #ffffff;

/* 深色模式 */
--color-dark-heading: #eeeeee;
--color-dark-body: #bdbdbd;
--color-dark-caption: #757575;
--color-dark-disabled: #616161;
--color-dark-link: #64b5f6;
--color-dark-on-primary: #ffffff;
```

---

## 三、间距规范

### 3.1 间距比例

```css
:root {
  --space-2xs: 2px;  /* 极微间隔 */
  --space-xs: 4px;   /* 微间隔 */
  --space-sm: 8px;   /* 小间隔 */
  --space-md: 12px;  /* 中间隔 (标准) */
  --space-lg: 16px;  /* 大间隔 */
  --space-xl: 20px;  /* 章节间隔 */
  --space-2xl: 24px; /* 页面段落间隔 */
  --space-3xl: 32px; /* 大章节间隔 */
  --space-4xl: 48px; /* 页面顶部/底部间隔 */
}
```

### 3.2 各组件间距

| 组件 | 内边距 | 外边距 | 间隔 |
|------|--------|--------|------|
| 页面 | 16px (左右) | - | - |
| 卡片 | 16px | 12px (上下) | 12px |
| 列表项 | 16px | 1px (分割线) | - |
| 按钮 | 12px 24px | 8px | 12px |
| 标签 | 6px 12px | 4px | 8px |
| 搜索框 | 0 16px | 8px 16px | - |
| 底部导航 | 0 | 0 | 等分 |
| 弹窗 | 20px | 16px | - |
| 表格单元格 | 12px 16px | 0 | 0 |

### 3.3 布局间距

```
内容宽度: 100% - 32px (左右各 16px padding)
卡片圆角: 12px
按钮圆角: 8px (常规) / 22px (搜索框)
标签圆角: 16px
图标圆角: 12px (快捷入口)
弹窗圆角: 16px
代码块圆角: 8px
```

---

## 四、阴影规范

```css
:root {
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.12);
  --shadow-xl: 0 8px 32px rgba(0,0,0,0.16);
  --shadow-fab: 0 4px 12px rgba(21, 101, 192, 0.4);
}

/* 使用场景 */
.card { box-shadow: var(--shadow-sm); }
.card:active { box-shadow: var(--shadow-md); }
.modal { box-shadow: var(--shadow-lg); }
.bottom-nav { box-shadow: 0 -1px 3px rgba(0,0,0,0.06); }
.fab { box-shadow: var(--shadow-fab); }
```

---

## 五、图标规范

### 5.1 图标尺寸

| 场景 | 尺寸 | 说明 |
|------|------|------|
| 底部导航 | 24×24px | Tab 图标 |
| 快捷入口 | 36×36px | 宫格图标背景 |
| 列表图标 | 24×24px | 项辅助图标 |
| 按钮图标 | 20×20px | 按钮内图标 |
| 标题图标 | 18×18px | 标题旁装饰 |
| 标签图标 | 14×14px | 标签内图标 |
| 搜索图标 | 20×20px | 搜索框内图标 |

### 5.2 图标风格

- 使用 SVG 图标（矢量，无锯齿）
- 默认填充模式（选中态）和线框模式（未选中态）
- 颜色继承当前文字颜色或使用实体类型色
- 导航图标使用简洁线性风格
- 快捷入口使用 emoji 作为过渡方案（后续替换为 SVG）

---

## 六、暗色模式规范

### 6.1 实现方式

```css
/* CSS 变量方式实现 */
:root {
  --bg: #ffffff;
  --text: #212121;
  --surface: #ffffff;
  --border: #e0e0e0;
  /* ... */
}

[data-theme="dark"] {
  --bg: #121212;
  --text: #e0e0e0;
  --surface: #1e1e1e;
  --border: #333333;
  /* ... */
}

/* 自动跟随系统 */
@media (prefers-color-scheme: dark) {
  :root { /* 深色变量 */ }
}
```

### 6.2 深色模式规则

```
背景:  #121212 (而非纯黑，避免刺眼)
卡片:  #1e1e1e (略亮于背景，产生层次)
强调色: 保持不变 (#2196f3 / #1565c0)
文字:  #e0e0e0 (高对比度)
次级文字: #9e9e9e
图片:  降低透明度 0.8 (避免过亮)
阴影:  改为发光效果 (box-shadow: 0 0 8px rgba(33,150,243,0.1))
```

---

## 七、视觉设计原则

### 7.1 简洁性

- 每个页面不超过 5 个信息区块
- 每个卡片不超过 3 行信息
- 删除所有装饰性元素（仅保留功能元素）
- 空白是设计的一部分，不要用密集填充

### 7.2 一致性

- 所有按钮使用相同的高度和圆角
- 所有卡片使用相同的阴影和内边距
- 所有列表项使用相同的行高和分割线
- 所有图标使用相同的线条风格

### 7.3 层次性

- 标题 → 卡片 → 列表 → 标签，字号递减
- 主要操作按钮使用填充样式，次要操作用线框
- 禁用状态使用低透明度 (0.38)
- 选中状态使用强调色高亮

### 7.4 可读性

- 正文对比度 ≥ 4.5:1 (WCAG AA 标准)
- 大标题对比度 ≥ 3:1
- 代码块使用深色背景 + 绿色文字 (终端风格)
- 链接使用蓝色 + 下划线 (可选)

---

## 八、完整 CSS 变量表

```css
:root {
  /* ── 颜色 ── */
  --color-primary: #0c2340;
  --color-primary-light: #1565c0;
  --color-primary-dark: #0d47a1;
  --color-accent: #2196f3;
  --color-accent-light: #64b5f6;
  --color-accent-dark: #1976d2;
  --color-success: #43a047;
  --color-warning: #f57c00;
  --color-error: #e53935;
  --color-info: #00bcd4;
  --color-link: #1565c0;
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-surface: #ffffff;
  --color-border: #e0e0e0;
  --color-text-primary: #212121;
  --color-text-secondary: #616161;
  --color-text-tertiary: #9e9e9e;
  --color-text-inverse: #ffffff;
  --color-code-bg: #1a1a2e;
  --color-code-text: #00ff00;

  /* ── 字体 ── */
  --font-system: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  --font-code: "SF Mono", "Cascadia Code", "Fira Code", "Source Code Pro", Consolas, monospace;
  --font-size-h1: clamp(24px, 6.4vw, 32px);
  --font-size-h2: clamp(20px, 5.33vw, 28px);
  --font-size-h3: clamp(18px, 4.8vw, 24px);
  --font-size-body: clamp(16px, 4.27vw, 20px);
  --font-size-small: clamp(13px, 3.47vw, 16px);
  --font-size-label: clamp(11px, 2.93vw, 14px);
  --font-size-code: clamp(14px, 3.73vw, 18px);
  --line-height-tight: 1.3;
  --line-height-normal: 1.5;
  --line-height-loose: 1.6;

  /* ── 间距 ── */
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;
  --space-4xl: 48px;
  --page-padding: 16px;
  --card-padding: 16px;
  --card-radius: 12px;
  --btn-radius: 8px;
  --search-radius: 22px;
  --tag-radius: 16px;

  /* ── 阴影 ── */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.12);
  --shadow-xl: 0 8px 32px rgba(0,0,0,0.16);

  /* ── 动画 ── */
  --anim-fast: 150ms;
  --anim-normal: 250ms;
  --anim-slow: 300ms;
  --ease-out: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in: cubic-bezier(0.42, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* ── 布局 ── */
  --nav-height: 56px;
  --tab-height: 56px;
  --topbar-height: 44px;
  --search-height: 44px;
  --touch-target: 44px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## 总结

本主题规范定义了深蓝科技风的完整配色系统（亮色+深色）、字体层级（6 级）、间距比例（10 级）、阴影系统（4 级）和完整的 CSS 变量表。所有设计以车间实际使用场景为前提，确保高对比度、大可触摸面积和一致的视觉语言。实体类型色用于知识图谱节点区分，功能色用于状态反馈。
