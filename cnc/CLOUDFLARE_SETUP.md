# Cloudflare 公网版设置

## 目标

- 长期稳定公网网址
- 任何拿到网址的人都能直接访问
- 后续更新尽量省事

## 推荐结构

1. `Cloudflare Pages` 托管站点
2. 可选绑定你自己的正式域名

## 发布步骤

1. 登录 Cloudflare
2. 打开 `Workers & Pages`
3. 新建一个 `Pages` 项目
4. 选择当前站点目录 `cnc_param_quickfinder`
5. 构建输出目录填 `.`
6. 如果需要读取项目配置，项目里已经有 `wrangler.toml`

## 公开访问原则

- 不启用白名单
- 不启用 Access 验证页
- 不做登录拦截

只要完成发布，别人点开网址就能直接看。

## 后续更新

以后更新只需要：

1. 修改站点文件
2. 重新发布

如果后面接入 Git 仓库，还可以做成自动发布。

## 当前项目里已准备好的文件

- `wrangler.toml`
- `DEPLOY.md`
- `PUBLIC_RELEASE_PLAN.md`

## 备注

我已经把当前项目调整成公开版方向。真正生成正式公网网址，仍然需要你自己的 Cloudflare 账号完成最后一次发布动作。
