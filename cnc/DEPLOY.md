# 正式网页版部署说明

当前目录已经是标准静态站点结构，可以直接部署。

## 最推荐的公开部署方式

优先推荐：

- `Cloudflare Pages`

也兼容：

- `GitHub Pages`
- `Vercel`
- `Netlify`
- 任意静态文件服务器

## 最简单的做法

把整个 `cnc_param_quickfinder` 目录作为站点根目录上传或连接到托管平台。

## GitHub Pages

项目里已经带有：

- `.github/workflows/pages.yml`

如果仓库连接到 GitHub Pages，后续推送更新后可以自动重新发布。

## Cloudflare Pages

项目里已经带有：

- `wrangler.toml`

发布时把输出目录设为 `.` 即可。

## 本地预览

双击 `preview-local.bat`，浏览器会打开 `http://localhost:8000`。

用这种方式预览时，`service-worker.js` 才会真正生效。

## 当前已准备好的能力

- `manifest.webmanifest`：支持手机添加到主屏
- `service-worker.js`：基础缓存
- `vercel.json`：可直接部署到 Vercel
- `.github/workflows/pages.yml`：可直接部署到 GitHub Pages
- `wrangler.toml`：可直接部署到 Cloudflare Pages

## 后续建议

1. 绑定正式域名
2. 持续补图片和知识库
3. 每次更新后重新发布
4. 后面再考虑统计、反馈入口和搜索优化
