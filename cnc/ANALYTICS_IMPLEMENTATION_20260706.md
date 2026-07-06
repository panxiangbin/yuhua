# 分析系统实现报告

**日期**: 2026-07-06 | **模块**: CNC_ANALYTICS + CNC_ANALYTICS_DASH

## 概述
用户行为追踪系统，记录页面访问、搜索、点击、停留时间等事件，提供数据报告和可视化仪表盘。

## 功能
- `trackPageView(page)` / `trackSearch(keyword)` / `trackClick(el, ctx)` / `trackTimeSpent(section, sec)` — 四类事件追踪
- `getAnalyticsReport()` — 生成汇总报告（总事件数、页面访问、搜索次数、热门关键词、点击分布）
- `exportAnalytics()` — JSON 导出全部事件数据
- `clearAnalytics()` — 清空所有记录
- 仪表盘：渲染统计卡片、柱状图（热门关键词 Top 8）、最近操作时间线

## 存储
所有事件存储在 LocalStorage（key: `cnc_analytics_events`），上限 1000 条。超出时自动丢弃最早记录。

## 集成
```html
<script src="./analytics-tracker.js"></script>
<script src="./analytics-dashboard.js"></script>
<link rel="stylesheet" href="./styles-analytics.css">
```
页面加载时自动恢复历史事件。调用 `CNC_ANALYTICS_DASH.renderDashboard('#container')` 渲染仪表盘。

## 测试用例
1. `CNC_ANALYTICS.trackSearch('G54')` 记录搜索事件
2. `CNC_ANALYTICS.trackPageView('study')` 记录页面访问
3. `CNC_ANALYTICS.getAnalyticsReport().searches` 返回搜索次数
4. `CNC_ANALYTICS.exportAnalytics().events.length` 返回事件总数
5. `CNC_ANALYTICS.clearAnalytics()` 清空后事件数为 0
