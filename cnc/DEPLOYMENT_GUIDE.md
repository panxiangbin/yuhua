# 部署运维指南

## 概述

本文档用于指导《数控工程师工作平台》的部署、更新、备份、故障排查和卸载清理。当前项目以本地静态网页为主，可通过浏览器直接打开 `index.html`，也可以封装为 Windows 桌面程序、局域网资料站或公网受控资料站。

## 1. 软件打包部署

### 1.1 打包前准备

- 检查 `index.html`、`app.js`、CSS 文件是否存在。
- 检查 `data/` 目录中的 JSON 文件是否完整。
- 检查 `assets/images/` 图片资源是否完整。
- 执行核心测试：搜索、详情、图库、知识地图、收藏。
- 更新 `data/version.json`。
- 清理临时文件、测试截图、无用日志。
- 检查控制台无严重报错。
- 检查手机端首屏和详情页布局。

### 1.2 推荐目录结构

```text
cnc_param_quickfinder/
├── index.html
├── app.js
├── styles.css
├── styles-enhanced.css
├── ui-knowledge-tree.js
├── ui-recommendations.js
├── data/
│   ├── knowledge_entries.json
│   ├── knowledge_tree.json
│   ├── search_index.json
│   ├── recommendations.json
│   ├── learning_paths.json
│   ├── images_metadata.json
│   └── version.json
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── docs/
└── logs/
```

### 1.3 打包步骤

1. 关闭正在运行的软件或本地服务器。
2. 清理缓存目录和临时日志。
3. 压缩静态资源，如图片、CSS、JS。
4. 校验 JSON 文件格式。
5. 生成或更新搜索索引。
6. 更新 `version.json`。
7. 压缩为 ZIP 或生成安装包。
8. 在干净目录中解压测试。
9. 记录发布版本、发布时间和更新内容。

### 1.4 version.json 示例

```json
{
  "appVersion": "1.0.0",
  "dataVersion": "2026.07.03",
  "knowledgeCount": 42294,
  "imageCount": 125,
  "buildTime": "2026-07-03T22:00:00+08:00",
  "releaseNote": "完成知识库查询、知识地图、图库、推荐系统和技术文档。"
}
```

## 2. 本地单机部署

### 2.1 标准流程

1. 将完整项目文件夹复制到目标电脑。
2. 建议路径：`F:\AI工作台\cnc_param_quickfinder\` 或 `D:\CNC_Platform\`。
3. 双击打开 `index.html`。
4. 如果浏览器限制本地文件读取，使用本地服务器启动。
5. 首次打开后搜索 `G54`，确认数据加载正常。
6. 为 `index.html` 或启动脚本创建桌面快捷方式。

### 2.2 本地服务器启动

#### Python 方式

```bash
cd /d F:\AI工作台\cnc_param_quickfinder
python -m http.server 8080
```

浏览器访问：

```text
http://localhost:8080
```

#### Node.js 方式

```bash
cd /d F:\AI工作台\cnc_param_quickfinder
npx serve .
```

### 2.3 启动脚本

```bat
@echo off
cd /d F:\AI工作台\cnc_param_quickfinder
start http://localhost:8080
python -m http.server 8080
```

保存为：

```text
启动数控工程师工作平台.bat
```

## 3. 客户端安装部署

### 3.1 标准安装流程

1. 下载安装包 `CNC_Platform_Setup_v1.0.exe`。
2. 右键“以管理员身份运行”。
3. 选择安装路径。
4. 创建桌面快捷方式。
5. 安装完成后首次启动。
6. 检查首页统计、搜索、图库是否正常。

### 3.2 静默安装

```bash
CNC_Platform_Setup.exe /S /D=C:\Program Files\CNC_Platform
```

注意：

- `/S` 表示静默安装。
- `/D=` 后面为安装路径。
- 路径参数通常放在命令最后。
- 静默安装后建议写入日志，方便排查失败原因。

### 3.3 企业批量部署

- 网络共享安装：安装包放到共享目录，各电脑运行。
- 组策略推送：适合域控环境。
- U盘离线安装：适合车间电脑无法联网。
- 预配置安装：提前写好主题、资料库路径、权限策略。

### 3.4 预配置文件

```json
{
  "defaultTheme": "dark-blue",
  "dataPath": "data/",
  "enablePrivateLibrary": true,
  "libraryPath": "library/",
  "enableSearchHistory": true,
  "enableAutoUpdate": false
}
```

## 4. 局域网部署

### 4.1 适用场景

- 公司内部多人使用。
- 车间电脑、办公室电脑都要访问。
- 希望数据统一维护，不想每台电脑单独复制。

### 4.2 部署方式

1. 选择一台稳定电脑作为局域网服务器。
2. 将项目放到服务器电脑，例如 `D:\CNC_Platform\`。
3. 启动静态服务器。
4. 开放防火墙端口。
5. 其他电脑通过服务器 IP 访问。

### 4.3 Python 简易局域网服务

```bash
cd /d D:\CNC_Platform
python -m http.server 8080 --bind 0.0.0.0
```

其他电脑访问：

```text
http://服务器IP:8080
```

例如：

```text
http://192.168.1.100:8080
```

### 4.4 Windows 防火墙设置

1. 打开“Windows Defender 防火墙”。
2. 进入“高级设置”。
3. 新建入站规则。
4. 选择“端口”。
5. TCP 端口填写 `8080`。
6. 允许连接。
7. 应用到专用网络。
8. 命名为“CNC平台8080”。

## 5. 公网资料站部署

### 5.1 适用场景

- 需要让外部用户访问公开资料。
- 后续加入授权资料库。
- 希望形成长期资料站。

### 5.2 可选环境

- Nginx 静态网站
- Cloudflare Pages
- Vercel
- Netlify
- 自有服务器
- 对象存储静态网站

### 5.3 Nginx 示例配置

```nginx
server {
    listen 80;
    server_name cnc.example.com;

    root /var/www/cnc_param_quickfinder;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    location /data/ {
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

### 5.4 受控资料库注意事项

如果资料库需要授权访问，不要直接把私有文件放在公开静态目录中。正确方式：

- 公开资料可以放静态目录。
- 私有资料必须走权限接口。
- 下载链接必须有过期时间。
- 不要在前端写死管理员密码或邀请码。
- 不要把完整私有文件列表暴露给未授权用户。

## 6. 软件更新机制

### 6.1 更新类型

| 类型 | 内容 | 风险 |
|---|---|---|
| 小更新 | 修复样式、文案、少量数据 | 低 |
| 数据更新 | 增加知识点、图片、索引 | 中 |
| 功能更新 | 修改 JS 逻辑和页面结构 | 中高 |
| 重大更新 | 数据结构变化、权限系统变化 | 高 |

### 6.2 手动更新步骤

1. 备份当前目录。
2. 下载新版本 ZIP。
3. 解压到临时目录。
4. 对比 `version.json`。
5. 保留用户数据目录或浏览器数据。
6. 替换应用文件。
7. 启动测试。
8. 确认无误后删除旧版本备份。

### 6.3 增量更新方案

```text
updates/
├── 1.0.1/
│   ├── app.js
│   ├── styles-enhanced.css
│   └── data/patch-20260703.json
└── manifest.json
```

`manifest.json` 示例：

```json
{
  "latestVersion": "1.0.1",
  "minVersion": "1.0.0",
  "files": [
    {
      "path": "app.js",
      "sha256": "xxxx",
      "url": "updates/1.0.1/app.js"
    }
  ]
}
```

## 7. 数据备份与恢复

### 7.1 需要备份的内容

| 内容 | 位置 | 说明 |
|---|---|---|
| 收藏夹 | IndexedDB / LocalStorage | 用户常用内容 |
| 浏览历史 | IndexedDB / LocalStorage | 最近查看 |
| 搜索历史 | IndexedDB / LocalStorage | 最近搜索 |
| 学习进度 | IndexedDB | 学习路径进度 |
| 用户设置 | LocalStorage | 主题、布局等 |
| 用户笔记 | IndexedDB | 后续扩展 |

### 7.2 手动备份流程

1. 打开设置。
2. 进入“数据管理”。
3. 点击“导出用户数据”。
4. 保存为 `cnc_platform_backup_日期.json`。
5. 将备份文件放到安全位置。

### 7.3 恢复流程

1. 打开设置。
2. 进入“数据管理”。
3. 点击“导入用户数据”。
4. 选择备份 JSON 文件。
5. 系统校验版本和格式。
6. 导入完成后刷新页面。
7. 检查收藏、历史、学习进度是否恢复。

### 7.4 备份文件格式

```json
{
  "backupVersion": "1.0",
  "appVersion": "1.0.0",
  "createdAt": "2026-07-03T22:00:00+08:00",
  "favorites": [],
  "history": [],
  "learningProgress": [],
  "settings": {}
}
```

## 8. 故障排查

### 8.1 启动失败

**现象**：双击 `index.html` 后白屏、提示数据加载失败、控制台出现 CORS 或 fetch 错误。

**可能原因**：

- 浏览器限制本地文件读取。
- 数据文件路径错误。
- JSON 文件损坏。
- 核心 JS 文件缺失。

**处理步骤**：

1. 按 F12 打开控制台查看报错。
2. 检查 `data/` 目录是否存在。
3. 检查 `knowledge_entries.json` 是否可打开。
4. 使用本地服务器启动：

```bash
cd /d F:\AI工作台\cnc_param_quickfinder
python -m http.server 8080
```

### 8.2 搜索功能异常

**现象**：搜索无结果、搜索很慢、输入关键词后页面卡住。

**可能原因**：

- 搜索索引未加载。
- 索引文件损坏。
- 数据量过大但未分页。
- 浏览器缓存了旧数据。

**处理步骤**：

1. 搜索常用词 `G54` 测试。
2. 检查 `search_index.json` 是否存在。
3. 清除浏览器缓存后重试。
4. 打开控制台查看是否有 JSON 解析错误。
5. 如索引损坏，重新生成搜索索引。
6. 大数据量场景开启分页或虚拟滚动。

### 8.3 图片不显示

**可能原因**：

- 图片路径错误。
- 图片文件缺失。
- 文件名大小写不一致。
- 浏览器缓存旧路径。
- 图片格式浏览器不支持。

**处理步骤**：

1. 检查 `assets/images/` 是否存在。
2. 在浏览器直接打开图片路径测试。
3. 检查 `images_metadata.json` 中的路径。
4. 确认缩略图和原图都存在。
5. 清理缓存后刷新。

### 8.4 收藏和历史丢失

**可能原因**：

- 浏览器禁用本地存储。
- 使用无痕模式。
- LocalStorage/IndexedDB 被清理。
- 域名或访问路径改变导致存储隔离。

**处理步骤**：

1. 检查是否使用无痕窗口。
2. 检查浏览器是否允许本地存储。
3. 固定访问地址，不要频繁更换路径。
4. 使用“导出用户数据”功能定期备份。
5. 从备份文件恢复。

### 8.5 页面样式错乱

**处理步骤**：

1. 强制刷新：`Ctrl + F5`。
2. 检查 CSS 文件是否加载。
3. 使用 Chrome/Edge 测试对比。
4. 检查长标题、长代码是否设置换行。
5. 手机端检查是否有固定宽度元素。

### 8.6 性能卡顿

**处理步骤**：

1. 首页只加载轻量索引。
2. 搜索结果分页或虚拟滚动。
3. 图片使用缩略图和延迟加载。
4. 压缩图片和 JSON 文件。
5. 避免首屏一次加载完整知识库。
6. 清理浏览器缓存。

## 9. 日志管理

### 9.1 日志类型

| 类型 | 说明 |
|---|---|
| 启动日志 | 应用启动、版本、数据加载 |
| 错误日志 | JS异常、数据加载失败 |
| 搜索日志 | 搜索关键词、耗时、结果数量 |
| 用户操作日志 | 收藏、历史、学习进度 |
| 更新日志 | 版本更新记录 |

### 9.2 本地错误日志示例

```javascript
function logError(error, context = {}) {
  const item = {
    message: error.message,
    stack: error.stack,
    context,
    time: new Date().toISOString()
  };

  console.error('[CNC Platform Error]', item);

  const logs = JSON.parse(localStorage.getItem('cnc_error_logs') || '[]');
  logs.unshift(item);
  localStorage.setItem('cnc_error_logs', JSON.stringify(logs.slice(0, 50)));
}
```

## 10. 卸载指南

### 10.1 标准卸载

ZIP 版：

1. 备份用户数据。
2. 关闭浏览器页面或本地服务器。
3. 删除项目文件夹。
4. 删除桌面快捷方式。

安装包版：

1. 打开“控制面板”。
2. 进入“程序和功能”。
3. 找到“数控工程师工作平台”。
4. 点击卸载。
5. 按提示完成。

### 10.2 完全清理

1. 删除安装目录。
2. 删除桌面快捷方式。
3. 清理浏览器缓存。
4. 清理 LocalStorage 和 IndexedDB。
5. 删除本地备份文件。

Chrome 中清理：

1. 打开软件页面。
2. 按 F12。
3. 进入 Application。
4. 找到 Storage。
5. 点击 Clear site data。

## 11. 运维检查清单

### 每次发布前

- [ ] 首页可正常打开。
- [ ] 搜索 `G54` 有结果。
- [ ] 知识详情可打开。
- [ ] 图库图片可显示。
- [ ] 知识地图可切换。
- [ ] 收藏刷新后保留。
- [ ] 手机端首屏无错位。
- [ ] 控制台无严重报错。
- [ ] version.json 已更新。
- [ ] 发布包已在干净目录测试。

### 每次数据更新后

- [ ] JSON 格式校验通过。
- [ ] 知识条目数量正确。
- [ ] 搜索索引已更新。
- [ ] 图片路径无缺失。
- [ ] 关联知识点 ID 有效。
- [ ] 推荐关系无死链。
- [ ] 学习路径可正常打开。

## 12. 常用命令汇总

### 启动本地服务

```bash
cd /d F:\AI工作台\cnc_param_quickfinder
python -m http.server 8080
```

### 检查 JSON 格式

```bash
python -m json.tool data\knowledge_entries.json > nul
```

### 压缩发布包

```bash
powershell Compress-Archive -Path .\cnc_param_quickfinder\* -DestinationPath .\cnc_platform_release.zip -Force
```

### 清理临时文件

```bash
del /s /q *.tmp
del /s /q *.log
```

## 13. 推荐发布流程

```text
开发完成
   ↓
本地自测
   ↓
生成测试包
   ↓
执行核心测试用例
   ↓
修复缺陷
   ↓
更新版本号和文档
   ↓
生成正式发布包
   ↓
干净环境验证
   ↓
交付用户 / 部署服务器
   ↓
收集反馈
```

## 14. 结论

当前项目最稳妥的部署路线是：

1. 开发阶段使用本地静态服务器。
2. 内部试用阶段使用局域网部署。
3. 对外使用阶段封装安装包或部署公网资料站。
4. 授权资料库上线前，必须先完成权限接口和私有文件保护。
5. 每次更新前都要备份用户数据和旧版本文件。

只要数据目录、搜索索引、图片路径和本地存储这四件事稳定，软件运行体验就会比较可靠。
