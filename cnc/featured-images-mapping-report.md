# 精准图片映射统计

- 本轮新增精准映射：520 条
- 现有手工精选映射：32 条
- `featured-images-part2.js` 新增后，可直接参与详情页配图与“只看带图”筛选

## 分类分布

- `G代码/M代码`：120
- `刀具相关`：90
- `机床系统`：100
- `加工工艺`：140
- `CAM软件`：70

## 映射策略

- 先从 `knowledge-core-01.js` 到 `knowledge-core-03.js` 提取标题、分类、标签、别名。
- 再根据 `gallery-library.js` 中 120 张有效 `.webp` 图的文件名语义做关键词匹配。
- 对高频主题优先做“标题直连图片”映射；找不到专属图的条目，再落到同主题工艺图或系统图。

## 代表性样例

- `G02/G03 圆弧插补完全指南` → `gcode-g02-g03-001.webp`, `arc-r-vs-ik-001.webp`
- `G43/G44/G49 刀长补偿完全指南` → `gcode-g43-g49-001.webp`, `tool-offset-table-001.webp`
- `BT40刀柄系统选型指南` → `bt-er-holder-overview-001.webp`, `tool-holder-reach-rigidity-001.webp`
- `FANUC 31i-B5 高级操作指南` → `panel-control-overview-001.webp`, `screen-coordinate-reading-001.webp`
- `薄壁零件加工变形控制与装夹工艺完全指南` → `turning-thin-wall-001.webp`
- `Fusion360 CAM入门到精通` → `milling-process-overview-001.webp`, `milling-contour-001.webp`

## 本轮涉及文件

- `F:\AI工作台\cnc_param_quickfinder\featured-images-part2.js`
- `F:\AI工作台\cnc_param_quickfinder\index.html`
- `F:\AI工作台\cnc_param_quickfinder\app.js`
- `F:\AI工作台\cnc_param_quickfinder\generate_featured_image_mappings.js`
