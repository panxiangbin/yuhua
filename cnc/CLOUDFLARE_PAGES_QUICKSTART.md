# Cloudflare Pages 快速发布

这个项目已经是标准静态网站，最适合直接发到 `Cloudflare Pages`。

## 目标

- 做成公网网址
- 手机和电脑都能直接打开
- 后续更新简单
- 网址尽量长期稳定

## 最省事的发布方式

1. 打开 [Cloudflare Pages](https://pages.cloudflare.com/)
2. 登录 Cloudflare 账号
3. 选择 `Create a project`
4. 选择 `Direct Upload`
5. 把整个 `F:\AI工作台\cnc_param_quickfinder` 目录上传
6. 等待发布完成
7. 拿到一个类似 `xxx.pages.dev` 的公网网址

## 上传前要带上的文件

至少保留这些：

- `index.html`
- `app.js`
- `data.js`
- `kb-extra.js`
- `styles.css`
- `manifest.webmanifest`
- `service-worker.js`
- `robots.txt`
- `assets/`

## 以后更新怎么做

每次有新版本时：

1. 在本地继续改这个项目
2. 确认网页能正常打开
3. 重新上传新版本到同一个 Pages 项目
4. 原网址不变，内容自动更新

## 当前建议

- 先继续把高频条目图片补全
- 再正式做第一次 Cloudflare Pages 发布
- 发布完成后，再看要不要绑定你自己的独立域名
