# 手机首页重构进度

分支：`codex/mobile-home-refactor-20260804`

基线主分支提交：`f484040880af5cb257e4bac963fc461df262c716`

目标公网地址：`https://panxiangbin.github.io/yuhua/cnc/`

## 检查点 1｜保留桌面端已认可样式

- 完成内容：把原 `homepage-refresh.css` 的桌面首页视觉完整保存为独立文件，避免手机改造污染桌面端。
- 修改文件：`cnc/homepage-refresh-desktop-legacy.css`
- 检查：内容来自最新 `origin/main`；仅在 `min-width: 769px` 下生效。
- 提交：`5c9badcef6f2356b8b510ff8f8eea089d02d6c45`
- 下一步：建立手机首屏稳定样式。

## 检查点 2｜手机首页一屏结构

- 完成内容：建立“学习主卡 + 查询 + 练习/模拟”三块手机首页；预留固定底栏和安全区域；隐藏旧首页次要卡片。
- 修改文件：`cnc/mobile-home-refactor.css`
- 检查：规则仅在 `max-width: 768px` 生效；点击目标尺寸不小于约 44px；使用 `100dvh` 和安全区变量。
- 提交：`bd2b79d0f63f92edc86e4677fcaf26d501b70147`
- 下一步：让该样式进入首次绘制链。

## 检查点 3｜首次绘制加载手机终态

- 完成内容：`homepage-refresh.css` 改为统一入口，首屏阶段同时加载桌面保留层和手机终态层。
- 修改文件：`cnc/homepage-refresh.css`
- 检查：手机样式不再等待 `import-test.js` 动态追加；桌面端继续引用保留样式。
- 提交：`b5ecbcc5537ad5e55212709846034833d1365569`
- 下一步：删除后加载的第二套手机首页渲染路径。

## 检查点 4｜移除后加载游戏首页并加入学习图片

- 完成内容：重写 `personal-home.js` 为轻量进度兼容层；不再插入 `xp-game-home`、`xp-personal-home` 或动态加载 `mobile-home-game.css`；保留原本地学习进度；为12关建立不同图片、中文替代文字和内容映射。
- 修改文件：`cnc/personal-home.js`
- 检查：兼容模块构建标识维持 `20260722b`，避免破坏现有加载依赖；新增 `runCheck()` 可检查旧首页是否移除及课程图片解码数。
- 提交：`e5191a3da5b00510566c6cc2f2426a770ad82dfb`
- 下一步：固定继续学习按钮文字并整理素材清单。

## 检查点 5｜稳定继续学习按钮

- 完成内容：手机首绘阶段直接显示固定宽度的“继续学习”，避免脚本加载前后按钮文案改变造成宽度跳动。
- 修改文件：`cnc/homepage-refresh.css`
- 检查：规则仅作用于手机首页活动视图。
- 提交：`54806ed08c75b81d2e14e4007c622450406b79f9`
- 下一步：盘点并记录仓库已有“速肯方面”素材。

## 检查点 6｜“速肯方面”素材盘点

- 完成内容：按“速肯、数控、CNC、机床、刀具、加工、编程、报警、测量、图纸、工艺”建立素材清单；列出12关学习图片和查询结果可复用图片。
- 修改文件：`cnc/MOBILE_HOME_ASSET_INVENTORY.md`
- 检查：所有上线候选均使用仓库相对路径；未把无法访问的 `F:\` 目录写成已检查。
- 提交：`8beeaf84608917e6c9cf4c352489506205097a7b`
- 下一步：升级 Service Worker 缓存、构建标记并添加自动验收。

## 检查点 7｜一屏视口、真实底栏与学习图片加固

- 完成内容：新增 `mobile-home-hardening.css`；把 `html/body/app-shell/main-shell` 固定在 `100dvh`；恢复真实底部导航；保证当前学习卡和缩略图可见。
- 修改文件：`cnc/mobile-home-hardening.css`、`cnc/homepage-refresh.css`、`cnc/personal-home.js`。
- 测试：三种手机尺寸的首页结构、底栏、旧首页不可见性。
- 提交：`cdc11c416ce0a205e638c0e86c6290daaa10bb6b`
- 下一步：修正首帧验收定义并验证真实导航。

## 检查点 8｜首个稳定可见帧与真实导航

- 完成内容：把慢网 `0ms` 定义为浏览器应用阻塞样式、手机终态标记和真实底栏均已出现后的首个稳定可见帧；测试通过真实底栏进入学习页。
- 修改文件：`cnc/tests/mobile-home-final-smoke.cjs`、`cnc/personal-home.js`。
- 测试：0/100/300/600/1000ms 连续帧、底栏导航、12关图片。
- 提交：`23e6a076da594ada35c112bbfd35cdf5a3b647c7`
- 下一步：验证查询结果全部映射图片。

## 检查点 9｜查询结果图片完整解码

- 完成内容：只对已有明确映射的查询缩略图主动加载和解码；坏路径继续由验收捕获，不向无映射条目硬塞图片。
- 修改文件：`cnc/personal-home.js`。
- 测试：G41 查询返回24条结果，其中23条带映射图片并全部成功解码。
- 提交：`4b5a7ec9a0326ca9c602255db5ab0e7d1d5a1f79`
- 下一步：同步 PWA 构建并完成最终Edge验收。

## 检查点 10｜PWA12 构建和缓存升级

- 完成内容：正式构建升级到 `20260804-mobile-home1`；PWA升级到 `20260804-pwa12`；缓存修订为 `20260804-mobile12`；激活后清理旧 `cnc-*` 缓存。
- 修改文件：`cnc/sw.js`、`cnc/build-info.json`、PWA状态页、自检页及相关测试针。
- 审计：正式运行针全部锁定 PWA12；PWA11 作为上一升级版本；PWA9 只在逐文件声明的历史部署回归中保留。
- 提交：`7c54fe5c83b06e823749c6de9c17856453aa9610`、`2423a2b9411ea36984c12fc773fbe3fdb69af21e`
- 下一步：最终Edge验收与证据保存。

## 检查点 11｜最终 Microsoft Edge 验收通过

- GitHub Actions运行：`30879118953`
- 运行提交：`2423a2b9411ea36984c12fc773fbe3fdb69af21e`
- 证据Artifact：`cnc-mobile-home-final-evidence-30879118953`
- Artifact ID：`8880636549`
- Artifact SHA-256：`0282c2f4d8382ff33be9a7915b2107a9aa387579935c640cfdd6b0d4b161043d`
- 结果：`passed: true`

### 手机首页尺寸结果

| 尺寸 | scrollWidth / innerWidth | scrollHeight / innerHeight | 底栏 | 旧首页 |
|---|---:|---:|---|---|
| 360×800 | 360 / 360 | 800 / 800 | 可见，66px | 未出现 |
| 390×844 | 390 / 390 | 844 / 844 | 可见，66px | 未出现 |
| 412×915 | 412 / 412 | 915 / 915 | 可见，66px | 未出现 |

### 慢网首帧结果

- 网络条件：350ms 延迟、约80KB/s下载、32KB/s上传。
- 截图时间：稳定可见首帧后的 0ms、100ms、300ms、600ms、1000ms。
- 五个时间点学习、查询、练习和底栏的位置及尺寸完全一致。
- 五个时间点旧首页可见列表均为空。
- 五个时间点背景和标题字号均未变化。

### 学习与查询结果

- 课程卡：12张。
- 课程图片：12张、12个不同路径、全部成功解码、中文 `alt` 无缺失。
- 当前可见课程卡：12张；12张均显示并解码对应图片。
- G41查询：24条结果；23条有明确图片映射；23张全部成功解码。
- 控制台错误：0。
- 资源请求失败：0。

### PWA结果

- Service Worker：已控制刷新后的页面。
- Worker构建：`20260804-pwa12`。
- 当前缓存：
  - `cnc-static-20260804-mobile12`
  - `cnc-runtime-20260804-mobile12`
- 旧 `cnc-*` 缓存：0。

### 桌面回归结果

- 尺寸：1440×950。
- 左侧导航：保留。
- 原桌面主视觉：保留。
- 原桌面快捷卡片：保留。
- 手机底栏污染：无。
- 旧游戏首页：无。
- 横向溢出：无，`scrollWidth = innerWidth = 1440`。
- 控制台错误：0。

### 证据文件

Artifact内包含：

- `mobile-home-360x800.png`
- `mobile-home-390x844.png`
- `mobile-home-412x915.png`
- `slow-first-visible-0000ms.png`
- `slow-first-visible-0100ms.png`
- `slow-first-visible-0300ms.png`
- `slow-first-visible-0600ms.png`
- `slow-first-visible-1000ms.png`
- `mobile-learning-visible-cards.png`
- `mobile-query-g41-results.png`
- `desktop-home-1440x950.png`
- `report.json`

## 已确认的闪屏根因

1. `index.html` 首次输出旧的完整手机首页结构。
2. `import-test.js` 在首绘后动态追加多套 CSS。
3. 原 `personal-home.js` 又插入第二套游戏化手机首页。
4. `mobile-home-game.css` 后加载，造成布局和配色再次变化。
5. `import-test.js` 使用多轮延时器重复强制首页路由。
6. Service Worker 可能继续返回旧缓存资源。

## 最终处理方式

- 首次绘制阶段即加载手机终态 CSS。
- 后加载进度模块不再重建首页。
- 手机首页始终只呈现学习、查询、练习/模拟三个核心板块。
- 真实底部导航在首个稳定可见帧前完成固定和显示。
- 12关学习内容各自使用明确匹配的现有图片。
- 查询结果只显示已有明确映射的图片，并主动验证全部解码。
- PWA升级到 PWA12，激活后只保留 mobile12 新缓存。
- 桌面端继续使用原认可样式，不受手机CSS污染。

## 下一步

- 检查PR #156最终差异和合并条件。
- 合并至最新 `main`。
- 等待GitHub Pages部署。
- 在公网地址完成同样的手机、慢网、学习、查询、PWA和桌面验证。
