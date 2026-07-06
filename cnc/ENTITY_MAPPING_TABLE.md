# 实体映射表与别名对照

> 文档版本: 1.0  
> 作用: 实体识别标准化依据，数据清洗去重参考  
> 对应代码: import-config.js 中的 ALIAS_MAP / TOOL_PATTERNS / MACHINE_PATTERNS / MATERIAL_PATTERNS

---

## 一、G代码映射表

G代码在知识图谱中的 ID 格式为 `gcode_G00`（统一大写，无空格）。

| 标准 ID | 代码 | 说明 | 常见别名 |
|---------|------|------|----------|
| gcode_G00 | G00 | 快速定位 | g00, G 00 |
| gcode_G01 | G01 | 直线插补 | g01, G 01 |
| gcode_G02 | G02 | 顺时针圆弧插补 | g02, G 02 |
| gcode_G03 | G03 | 逆时针圆弧插补 | g03, G 03 |
| gcode_G04 | G04 | 暂停/延时 | g04, G 04 |
| gcode_G17 | G17 | XY平面选择 | g17 |
| gcode_G18 | G18 | ZX平面选择 | g18 |
| gcode_G19 | G19 | YZ平面选择 | g19 |
| gcode_G20 | G20 | 英制单位 | g20 |
| gcode_G21 | G21 | 公制单位 | g21 |
| gcode_G28 | G28 | 返回参考点 | g28 |
| gcode_G30 | G30 | 返回第二参考点 | g30 |
| gcode_G40 | G40 | 取消刀具补偿 | g40 |
| gcode_G41 | G41 | 刀具半径左补偿 | g41 |
| gcode_G42 | G42 | 刀具半径右补偿 | g42 |
| gcode_G43 | G43 | 刀具长度正补偿 | g43 |
| gcode_G44 | G44 | 刀具长度负补偿 | g44 |
| gcode_G49 | G49 | 取消刀具长度补偿 | g49 |
| gcode_G54 | G54 | 工件坐标系1 | g54 |
| gcode_G55 | G55 | 工件坐标系2 | g55 |
| gcode_G56 | G56 | 工件坐标系3 | g56 |
| gcode_G57 | G57 | 工件坐标系4 | g57 |
| gcode_G58 | G58 | 工件坐标系5 | g58 |
| gcode_G59 | G59 | 工件坐标系6 | g59 |
| gcode_G68 | G68 | 坐标系旋转 | g68 |
| gcode_G69 | G69 | 取消坐标系旋转 | g69 |
| gcode_G73 | G73 | 高速深孔钻 | g73 |
| gcode_G74 | G74 | 左旋攻丝 | g74 |
| gcode_G76 | G76 | 精镗孔 | g76 |
| gcode_G80 | G80 | 取消固定循环 | g80 |
| gcode_G81 | G81 | 钻孔循环 | g81 |
| gcode_G82 | G82 | 钻孔循环（暂停） | g82 |
| gcode_G83 | G83 | 深孔钻循环 | g83 |
| gcode_G84 | G84 | 攻丝循环 | g84 |
| gcode_G85 | G85 | 镗孔循环 | g85 |
| gcode_G90 | G90 | 绝对坐标编程 | g90 |
| gcode_G91 | G91 | 增量坐标编程 | g91 |
| gcode_G92 | G92 | 坐标系设定 | g92 |
| gcode_G94 | G94 | 每分钟进给 | g94 |
| gcode_G95 | G95 | 每转进给 | g95 |
| gcode_G98 | G98 | 返回初始平面 | g98 |
| gcode_G99 | G99 | 返回R平面 | g99 |

---

## 二、M代码映射表

| 标准 ID | 代码 | 说明 | 常见别名 |
|---------|------|------|----------|
| mcode_M00 | M00 | 程序暂停 | m00 |
| mcode_M01 | M01 | 选择暂停 | m01 |
| mcode_M02 | M02 | 程序结束 | m02 |
| mcode_M03 | M03 | 主轴正转 | m03 |
| mcode_M04 | M04 | 主轴反转 | m04 |
| mcode_M05 | M05 | 主轴停止 | m05 |
| mcode_M06 | M06 | 自动换刀 | m06 |
| mcode_M07 | M07 | 切削液开（气冷） | m07 |
| mcode_M08 | M08 | 切削液开 | m08 |
| mcode_M09 | M09 | 切削液关 | m09 |
| mcode_M10 | M10 | 夹具夹紧 | m10 |
| mcode_M11 | M11 | 夹具松开 | m11 |
| mcode_M13 | M13 | 主轴正转+切削液 | m13 |
| mcode_M14 | M14 | 主轴反转+切削液 | m14 |
| mcode_M19 | M19 | 主轴定向 | m19 |
| mcode_M21 | M21 | 镜像 | m21 |
| mcode_M22 | M22 | 取消镜像 | m22 |
| mcode_M23 | M23 | 螺纹加工 | m23 |
| mcode_M24 | M24 | 取消螺纹加工 | m24 |
| mcode_M30 | M30 | 程序结束并返回 | m30 |
| mcode_M41 | M41 | 低速档 | m41 |
| mcode_M42 | M42 | 高速档 | m42 |
| mcode_M98 | M98 | 子程序调用 | m98 |
| mcode_M99 | M99 | 子程序返回 | m99 |

---

## 三、刀具类型映射表

| 类型ID | 标准名称 | 常见别名/写法 |
|--------|----------|---------------|
| endmill | 端铣刀 | 平刀, 平底刀, 平底铣刀, 立铣刀, end mill |
| ballnose | 球头铣刀 | 球刀, R刀, 球头刀, ball nose, bull nose |
| facemill | 面铣刀 | 盘刀, 飞刀, 盘铣刀, face mill |
| drill | 钻头 | 麻花钻, 中心钻, 定点钻, twist drill |
| reamer | 铰刀 | reamer, 铰刀 |
| tap | 丝锥 | 攻丝, 丝攻, tap, screw tap |
| insert | 刀片 | 刀粒, 合金刀片, carbide insert |
| toolholder | 刀柄 | 筒夹, 夹头, BT刀柄, HSK刀柄 |
| boringbar | 镗刀 | 精镗刀, 粗镗刀, boring bar |
| chamfertool | 倒角刀 | chamfer mill, 倒角铣刀 |
| threadmill | 螺纹铣刀 | thread mill, 螺纹刀 |

---

## 四、机床品牌映射表

| 系统ID | 标准名称 | 常见别名/型号 |
|--------|----------|---------------|
| FANUC | FANUC | 发那科, 0i, 0i-MF, 0i-TF, 31i, 30i, 18i, 21i |
| SIEMENS | SIEMENS | 西门子, Sinumerik, 802D, 802S, 828D, 840D, 840Dsl |
| MITSUBISHI | MITSUBISHI | 三菱, M70, M70V, M80, E68, E70, M64 |
| HEIDENHAIN | HEIDENHAIN | 海德汉, TNC, TNC620, TNC640, iTNC530 |
| BROTHER | BROTHER | 兄弟, TC系列, S500, S700 |
| MAZAK | MAZAK | 马扎克, Mazatrol, SmoothG, Matrix |
| OKUMA | OKUMA | 大隈, OSP, OSP-P200, OSP-P300 |
| HAAS | HAAS | 哈斯, VF系列, ST系列 |

---

## 五、材料类型映射表

| 材料ID | 标准名称 | 常见牌号/别名 |
|--------|----------|---------------|
| steel | 钢 | 45号钢, S45C, SKD11, SKD61, NAK80, P20, 718H, Cr12, Cr12MoV, 模具钢, 碳钢, 合金钢, 不锈钢, 304, 316 |
| aluminum | 铝合金 | 铝, 6061, 7075, 5052, 2024, ADC12, A356, 铸铝, 硬铝 |
| copper | 铜 | 紫铜, 黄铜, 铍铜, 红铜, 铜合金, brass |
| titanium | 钛合金 | 钛, TC4, Ti6Al4V, TA2, TA15 |
| plastic | 塑料 | 亚克力, PMMA, 尼龙, POM, ABS, PC, PVC, PE, PTFE, 特氟龙 |
| wood | 木材 | 木, 红木, 榉木, 橡木 |
| composite | 复合材料 | 碳纤维, 玻璃纤维, CFRP, GFRP |
| cast_iron | 铸铁 | 灰铸铁, 球墨铸铁, HT250, QT500 |

---

## 六、核心概念映射表

| 概念ID | 标准名称 | 常见别名 |
|--------|----------|----------|
| concept_坐标系 | 坐标系 | 工件坐标系, 机床坐标系, 编程坐标系, 绝对坐标系 |
| concept_对刀 | 工件对刀 | 对刀, 寻边, 分中, 寻边器对刀 |
| concept_刀具补偿 | 刀具补偿 | 刀补, 半径补偿, 长度补偿, 磨耗补偿 |
| concept_刀具半径补偿 | 刀具半径补偿 | 半径补偿, G41/G42, 刀径补偿 |
| concept_刀具长度补偿 | 刀具长度补偿 | 长度补偿, G43/G44, 刀长补 |
| concept_零点偏移 | 零点偏移 | G54-G59, 工件零点, 编程原点 |
| concept_安全高度 | 安全高度 | 抬刀高度, R平面, 参考高度 |
| concept_进退刀 | 进退刀 | 进刀方式, 退刀方式, 螺旋进刀, 斜向进刀 |
| concept_切削三要素 | 切削三要素 | 切削速度, 进给量, 切削深度, Vc, f, ap |
| concept_切削速度 | 切削速度 | 线速度, Vc, 主轴转速 |
| concept_进给速度 | 进给速度 | F值, 进给率, feed rate |
| concept_切削深度 | 切削深度 | ap, 吃刀量, 切深 |
| concept_顺铣 | 顺铣加工 | 顺铣, climb milling |
| concept_逆铣 | 逆铣加工 | 逆铣, conventional milling |
| concept_等高加工 | 等高加工 | Z-level, 层切, 等高线加工 |
| concept_轮廓加工 | 轮廓加工 |  contouring, 外形加工 |
| concept_型腔加工 | 型腔加工 | pocketing, 挖槽, 型腔铣 |
| concept_加工精度 | 加工精度 | 公差, 尺寸精度, IT等级 |
| concept_粗糙度 | 表面粗糙度 | Ra, Rz, 光洁度, 表面质量 |
| concept_切削液 | 切削冷却 | 冷却, 切削油, 乳化液, 切削液 |

---

## 七、工艺分类映射表

| 工艺ID | 标准名称 | 说明 |
|--------|----------|------|
| process_铣削 | 铣削 | milling, 使用旋转刀具加工平面/轮廓/型腔 |
| process_车削 | 车削 | turning, 工件旋转，刀具进给 |
| process_钻孔 | 钻孔 | drilling, 使用钻头加工圆孔 |
| process_镗孔 | 镗孔 | boring, 扩大/精加工已有孔 |
| process_攻丝 | 攻丝 | tapping, 加工内螺纹 |
| process_磨削 | 磨削 | grinding, 使用砂轮精加工 |
| process_线切割 | 线切割 | wire EDM, 电火花线切割 |
| process_电火花 | 电火花 | EDM, 放电加工 |
| process_激光切割 | 激光切割 | laser cutting |
| process_粗加工 | 粗加工 | roughing, 快速去除余量 |
| process_精加工 | 精加工 | finishing, 保证尺寸和表面质量 |
| process_半精加工 | 半精加工 | semi-finishing, 中间工序 |
| process_开粗 | 开粗 | 粗加工的同义词 |
| process_光刀 | 光刀 | 精加工的同义词 |
| process_清根 | 清根 | 清理角落残留材料 |
| process_倒角 | 倒角 | chamfering, 加工棱边倒角 |
| process_螺纹加工 | 螺纹加工 | thread cutting/milling |

---

## 八、文件名前缀映射

| 前缀 | 类型ID | 说明 |
|------|--------|------|
| 知识_ | knowledge | 知识性内容文档 |
| 教学_ | tutorial | 教程/教学类文档 |
| 案例_ | case | 加工案例文档 |
| 题库_ | exam | 考试题库文档 |
| 手册_ | manual | 操作/参考手册 |
| 指南_ | guide | 操作指南 |
| 教程_ | tutorial | 教程文档 |
| 汇总_ | summary | 知识点汇总 |
| 速查_ | quickref | 快速参考表 |
| 对比_ | comparison | 对比分析文档 |
| 默认 (无前缀) | knowledge | 默认归类为知识性文档 |

---

## 九、实体类型与CSS类映射

| 实体类型 | 颜色标识 | CSS类 | 图标建议 |
|----------|----------|-------|----------|
| gcode | #e74c3c (红) | entity-gcode | G |
| mcode | #e67e22 (橙) | entity-mcode | M |
| tool | #3498db (蓝) | entity-tool | 🔧 |
| machine | #9b59b6 (紫) | entity-machine | ⚙️ |
| material | #27ae60 (绿) | entity-material | 🔩 |
| process | #1abc9c (青) | entity-process | 🔄 |
| concept | #f39c12 (黄) | entity-concept | 💡 |
| brand | #34495e (深蓝) | entity-brand | 🏷️ |
| parameter | #7f8c8d (灰) | entity-parameter | 📐 |
| case | #e91e63 (粉) | entity-case | 📋 |
| problem | #c0392b (深红) | entity-problem | ⚠️ |
| exam | #00bcd4 (亮青) | entity-exam | 📝 |
| category | #795548 (棕) | entity-category | 📁 |
| file | #607d8b (蓝灰) | entity-file | 📄 |

---

## 十、别名处理规则

1. **G代码/M代码**: 统一大写，去空格 (`g00` → `G00`, `G 54` → `G54`)
2. **刀具名称**: 使用行业通用名 (`平刀` → `端铣刀`, `球刀` → `球头铣刀`)
3. **概念名称**: 使用完整术语 (`刀补` → `刀具补偿`, `对刀` → `工件对刀`)
4. **材料**: 使用类型名+代表性牌号 (`45号钢` → `钢`, `6061` → `铝合金`)
5. **机床**: 使用国际品牌名 (`发那科` → `FANUC`, `西门子` → `SIEMENS`)
6. **品牌名称**: 保留原始英文大写形式
7. **去重规则**: 同类型+同标签视为重复实体，保留置信度高的
8. **内容哈希**: 完全相同内容去重（基于简化哈希函数）

---

*此表作为数据清洗和实体识别的权威参考，代码实现参见 import-config.js 中的 ALIAS_MAP 和各 PATTERNS 常量。*
