# GitHub Pages 快速发布

如果你想走和 `panxiangbin.github.io/yuhua/` 一样的方式，这个项目已经准备成可直接上 `GitHub Pages` 的版本。

## 你现在已有的东西

- GitHub Pages 工作流：`.github/workflows/pages.yml`
- GitHub 专用发布包脚本：`build_github_pages_package.ps1`
- GitHub 专用发布包 zip：生成后可直接上传到仓库

## 最省事的方式

1. 新建一个 GitHub 仓库
2. 把 `cnc_param_quickfinder_github_repo` 里的全部文件上传到仓库根目录
3. 仓库默认分支保持 `main`
4. 打开仓库 `Settings -> Pages`
5. 在 `Build and deployment` 里选择 `GitHub Actions`
6. 等待自动发布完成
7. 得到一个类似下面的网址：
   - `https://你的用户名.github.io/仓库名/`

## 如果你想挂到已有站点子目录

如果你已经有像 `https://panxiangbin.github.io/yuhua/` 这样的站点，可以：

1. 把这个项目放到一个新的仓库里，单独发
2. 或者把它并到原仓库的一个子目录后再改路由

当前最稳的做法：
- 单独一个仓库
- 单独一个 GitHub Pages 地址

## 当前建议

- 先单独发一个仓库，先让公网跑起来
- 后面如果你要，我再帮你做并入已有站点版本
