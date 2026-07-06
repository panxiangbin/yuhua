# 搜索别名词典 (Search Alias Dictionary)

> 生成日期: 2026-07-06 | 总条目: 211 | 用途: 搜索容错/模糊匹配

---

## G代码 (G-Code)

| 规范名 | 别名 | 优先级 | 备注 |
|--------|------|--------|------|
| G00 | G0, 快速定位, 快移, 快速移动, rapid positioning, rapid traverse, G零零 | 1 | 用户常用简写和中文叫法 |
| G01 | G1, 直线插补, 直线切削, 直线走刀, linear interpolation, G零一 | 1 | FANUC/西门子通用 |
| G02 | G2, 顺时针圆弧, 圆弧插补顺时针, 顺圆, clockwise arc | 1 | CW圆弧 |
| G03 | G3, 逆时针圆弧, 圆弧插补逆时针, 逆圆, counterclockwise arc | 1 | CCW圆弧 |
| G04 | 暂停, 延时,  dwell, 停顿, G零四 | 1 | 暂停指令 |
| G10 | 参数输入, 可编程参数输入, 坐标写入, 刀补写入, programmable data input | 2 | 高级应用 |
| G11 | 取消参数输入, data input cancel | 2 | |
| G15 | 取消极坐标, polar coordinate cancel | 2 | |
| G16 | 极坐标编程, 极坐标, polar coordinate, 圆周阵列 | 2 | 常用于圆周孔 |
| G17 | XY平面, 平面选择XY, XY plane | 1 | 默认平面 |
| G18 | XZ平面, 平面选择XZ, XZ plane | 1 | 常用于车床 |
| G19 | YZ平面, 平面选择YZ, YZ plane | 1 | |
| G20 | 英制, 英制编程, inch mode, in | 1 | 单位切换 |
| G21 | 公制, 公制编程, 毫米编程, mm模式, metric mode | 1 | 国内默认 |
| G28 | 回参考点, 自动回零, 返回参考点, reference point return | 1 | 经中间点返回 |
| G29 | 从参考点返回, return from reference | 2 | |
| G30 | 第2参考点返回, 第2参考点, 2nd reference point | 2 | 常用于换刀 |
| G31 | 跳转指令, skip function, 跳过 | 2 | 测头用 |
| G32 | 螺纹切削, 单段螺纹, thread cutting, G32螺纹 | 2 | 车床螺纹 |
| G33 | 恒螺距螺纹, 恒螺距, constant lead thread | 2 | 西门子系统 |
| G34 | 变螺距螺纹, variable lead thread | 2 | |
| G35 | 自动对刀, automatic tool setting | 2 | |
| G36 | 自动刀具补偿, automatic tool compensation | 2 | |
| G37 | 自动刀具长度测量, auto tool length measurement | 2 | |
| G40 | 取消刀补, 取消刀具补偿, 半径补偿取消, cutter compensation cancel, 刀补取消 | 1 | 必须记得取消 |
| G41 | 左刀补, 刀具半径左补偿, 左补偿, cutter compensation left, 刀补左 | 1 | 顺铣 |
| G42 | 右刀补, 刀具半径右补偿, 右补偿, cutter compensation right, 刀补右 | 1 | 逆铣 |
| G43 | 刀长补偿正, 刀长补偿, 长度补偿正, 长度补偿, tool length compensation, H值, 刀长正 | 1 | 正补偿 |
| G44 | 刀长补偿负, length compensation negative, 刀长负 | 1 | 负补偿 |
| G45 | 刀具偏置增加, 刀具偏置加大 | 3 | 较少用 |
| G46 | 刀具偏置减少, 刀具偏置减小 | 3 | 较少用 |
| G49 | 取消刀长补偿, 长度补偿取消, tool length cancel, 取消刀长, G49取消 | 1 | 换刀前后注意 |
| G50 | 主轴限速, 坐标系设定, 最高转速限制, G50车床, spindle speed clamp | 2 | 车床常用 |
| G51 | 比例缩放, 缩放, scaling | 2 | |
| G52 | 局部坐标系, 局部坐标, local coordinate, G52偏置 | 2 | 临时偏置 |
| G53 | 机床坐标系, 机械坐标, machine coordinate, G53调用 | 2 | 调用机床坐标 |
| G54 | 工件坐标系1, 工件零点, G54坐标, work offset 1, 第一工件坐标, 对刀G54 | 1 | 最常用 |
| G55 | 工件坐标系2, work offset 2, 第二工件坐标, G55坐标 | 1 | 多工位 |
| G56 | 工件坐标系3, work offset 3, 第三工件坐标, G56坐标 | 1 | |
| G57 | 工件坐标系4, work offset 4, 第四工件坐标, G57坐标 | 1 | |
| G58 | 工件坐标系5, work offset 5, 第五工件坐标, G58坐标 | 1 | |
| G59 | 工件坐标系6, work offset 6, 第六工件坐标, G59坐标 | 1 | |
| G61 | 精确停止, exact stop, 准停 | 2 | 拐角精度 |
| G62 | 拐角减速, corner deceleration | 3 | |
| G63 | 攻丝模式, tapping mode | 3 | |
| G64 | 连续路径, continuous path, 轮廓加工, 连续切削 | 2 | 默认模式 |
| G65 | 宏程序调用, macro call, 宏调用, 自定义循环 | 2 | 非模态 |
| G66 | 模态宏调用, modal macro call, 模态宏 | 2 | |
| G67 | 取消模态宏, cancel modal macro | 2 | |
| G68 | 坐标旋转, coordinate rotation, 旋转坐标系 | 2 | |
| G69 | 取消坐标旋转, cancel coordinate rotation, 取消旋转 | 2 | |
| G70 | 精车循环, 精加工循环, finishing cycle | 2 | 车床 |
| G71 | 外圆粗车循环, 粗车外圆, rough turning cycle, 粗车循环 | 2 | 车床 |
| G72 | 端面粗车循环, 端面粗车, rough facing cycle | 2 | 车床 |
| G73 | 仿形粗车循环, 封闭切削循环, pattern repeating cycle, 啄钻 | 2 | 车床/铣床 |
| G74 | 端面啄钻循环, 端面钻孔, 左旋攻丝, face drilling | 2 | |
| G75 | 切槽循环, grooving cycle, 外径切槽 | 2 | 车床 |
| G76 | 螺纹循环, 精镗循环, thread cutting cycle, boring cycle, 螺纹车削 | 2 | 注意区分车床/铣床用法 |
| G80 | 取消固定循环, 固定循环取消, cancel canned cycle, G80取消 | 1 | 钻孔后必须取消 |
| G81 | 钻孔循环, 普通钻孔, spot drilling, drilling cycle, 钻孔 | 1 | 浅孔 |
| G82 | 锪孔循环, 镗阶梯孔, counterboring, 沉孔 | 2 | 孔底暂停 |
| G83 | 啄钻循环, 深孔啄钻, 排屑钻孔, deep hole drilling, 啄式钻孔, G83啄钻 | 1 | 深孔 |
| G84 | 攻丝循环, 刚性攻丝, tapping cycle, 攻丝, G84攻丝 | 1 | 注意同步 |
| G85 | 镗孔循环1, boring cycle, 镗孔 | 2 | 进退同进给 |
| G86 | 镗孔循环2, boring cycle 2 | 2 | 孔底停主轴 |
| G87 | 背镗循环, back boring cycle, 反镗 | 3 | |
| G88 | 镗孔循环4, boring cycle 4 | 3 | |
| G89 | 镗孔循环5, boring cycle 5 | 3 | |
| G90 | 绝对值编程, 绝对坐标, absolute programming, 绝对值, G90绝对 | 1 | 默认模式 |
| G91 | 增量值编程, 增量坐标, incremental programming, 增量, G91增量 | 1 | 注意模式切换 |
| G92 | 坐标预设, 螺纹循环, coordinate preset, G92坐标 | 2 | 不同系统意义不同 |
| G94 | 每分钟进给, mm/min, feed per minute, 每分进给 | 1 | 铣床常用 |
| G95 | 每转进给, mm/rev, feed per revolution, 每转进给 | 1 | 车床常用 |
| G96 | 恒线速, 恒线速度控制, constant surface speed, CSS, G96恒线速 | 1 | 车削 |
| G97 | 定转速, 固定转速, constant rpm, 取消恒线速 | 1 | |
| G98 | 返回初始平面, 返回起始点, 初始平面返回, return to initial level | 1 | 固定循环退刀 |
| G99 | 返回R平面, R平面返回, return to R level | 1 | 固定循环退刀 |

### G代码复合别名

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| G28G29 | G28回零, G28参考点, G28经中间点, G29返回 | 2 |
| G52偏置 | G52局部坐标系, G52临时偏置, G52工件偏置 | 2 |
| G53坐标 | G53调用, G53机床坐标, G53绝对机床, G53非模态 | 2 |
| G71粗车 | G71循环, G71外圆粗车, G71车削循环, FANUC粗车 | 2 |
| G73啄钻 | G73循环, G73深孔啄钻, G73断屑 | 2 |
| G76螺纹 | G76螺纹循环, G76精镗, 复合螺纹循环 | 2 |
| G81钻孔 | G81循环, G81点孔, G81浅孔 | 2 |
| G83深孔 | G83循环, G83排屑钻孔, G83啄式深孔 | 2 |
| G84攻丝 | G84循环, G84刚性攻丝, G84同步攻丝 | 2 |
| G92螺纹 | G92螺纹循环, FANUC螺纹, 螺纹固定循环, 螺纹车削循环 | 2 |
| G98返回 | G98平面, G98退刀, G98初始平面 | 2 |
| G99返回 | G99平面, G99退刀, G99R平面 | 2 |

---

## M代码 (M-Code)

| 规范名 | 别名 | 优先级 | 备注 |
|--------|------|--------|------|
| M00 | 程序暂停, 无条件停止, program stop, 暂停 | 1 | 需再启动 |
| M01 | 选择性暂停, 条件暂停, optional stop | 1 | 面板打开才生效 |
| M02 | 程序结束, program end, 主程序结束 | 1 | 不回卷 |
| M03 | 主轴正转, 主轴正转CW, spindle forward, 正转 | 1 | CW |
| M04 | 主轴反转, 主轴反转CCW, spindle reverse, 反转 | 1 | CCW |
| M05 | 主轴停止, spindle stop, 主轴停, 停车 | 1 | |
| M06 | 自动换刀, 换刀, tool change, ATC, 换刀指令, M6 | 1 | 加工中心 |
| M07 | 雾状冷却, mist coolant, 喷雾冷却 | 2 | |
| M08 | 冷却开, 冷却液开, coolant on, 开冷却, 切削液开 | 1 | |
| M09 | 冷却关, 冷却液关, coolant off, 关冷却 | 1 | |
| M10 | 夹紧, clamp, clamp on | 2 | |
| M11 | 松开, unclamp, unclamp on | 2 | |
| M13 | 主轴正转+冷却, spindle forward coolant on | 2 | |
| M14 | 主轴反转+冷却, spindle reverse coolant on | 2 | |
| M17 | 主轴定向取消, spindle orientation cancel | 3 | |
| M19 | 主轴定向, 主轴定位, spindle orientation, 定向, M19定向 | 1 | 换刀前常用 |
| M21 | 镜像取消, mirror image cancel | 3 | |
| M22 | 镜像开, mirror image on | 3 | |
| M23 | 螺纹退出, thread unwind | 3 | |
| M30 | 程序结束并返回, 程序结束复位, program end and rewind, 主程序结束返回, M30复位 | 1 | 回卷到开头 |
| M41 | 主轴低速档, low gear, 主轴低速 | 2 | 变速箱 |
| M42 | 主轴高速档, high gear, 主轴高速 | 2 | 变速箱 |
| M48 | 取消倍率取消, override cancel cancel | 3 | |
| M49 | 取消倍率, 取消倍率取消, override cancel | 3 | |
| M78 | 尾座进, tailstock forward, 尾座前进 | 3 | 车床 |
| M79 | 尾座退, tailstock backward, 尾座后退 | 3 | 车床 |
| M94 | 镜像取消, mirror cancel | 3 | |
| M98 | 子程序调用, 子程序, subprogram call, 调用子程序, M98调用 | 1 | |
| M99 | 子程序返回, subprogram return, 返回主程序, 循环返回 | 1 | |

---

## 操作 (Operation)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 回零 | 回参考点, 开机回零, 归零, home return, reference return, 回机械原点, home, 复位 | 1 |
| 对刀 | 找零点, 设定工件原点, tool setting, work offset setting, 寻边, 碰数, 分中, 校表, tool presetting, 刀补设定 | 1 |
| G54对刀 | 工件零点设定, 设定G54, 工件坐标设定, G54录入, work zero setting | 1 |
| 刀长补偿 | 刀长偏置, 长度补偿, 刀具长度补偿, tool length offset, H补偿, H值 | 1 |
| 刀补 | 刀具补偿, 半径补偿, cutter compensation, D值, D补偿, 刀具半径补偿 | 1 |
| 强制换刀 | 手动换刀, 刀库手动操作, 刀库调试, manual tool change, 刀库维护 | 2 |

---

## 报警 (Alarm)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 超程 | 超行程, over travel, 限位, 超限, 硬限位, 软限位, OT报警 | 1 |
| 伺服报警 | 伺服故障, 轴报警, 伺服异常, servo alarm, SV报警, 伺服驱动, 驱动器报警 | 1 |
| 主轴报警 | 主轴故障, 主轴不转, spindle alarm, SP报警, 主轴驱动, 主轴异常 | 1 |
| 换刀故障 | ATC故障, 刀库故障, 换刀报警, 刀库报警, 换刀卡住, ATC alarm, 换刀失败, ATC错误 | 1 |
| 回零失败 | 回参考点失败, 不回零, home fail, reference fail, 回零报警, 找不到零点 | 1 |
| PS报警 | 编程报警, program alarm, 程序错误, 编程错误, PS code | 2 |
| OT报警 | 超程报警, over travel alarm, 限位报警, 行程超限 | 1 |

---

## 机床类型 (Machine)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 加工中心 | MC, machining center, 加工中心机, 立加, 卧加, VMC, HMC, CNC铣床 | 1 |
| 数控车床 | 车床, CNC车床, lathe, 数控车, 斜导轨车床, 平导轨车床, turning center, 车削中心 | 1 |
| 数控铣床 | 铣床, CNC铣床, milling machine, 数控铣 | 1 |
| 五轴 | 五轴加工中心, 5-axis, 五轴联动, 五轴机床, 5轴 | 2 |

---

## 工艺 (Process)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 顺铣 | down milling, 同向铣, climb milling, 顺铣加工 | 2 |
| 逆铣 | up milling, 反向铣, conventional milling, 逆铣加工 | 2 |
| 粗加工 | 开粗, roughing, 粗铣, 粗车, 粗加工阶段 | 1 |
| 精加工 | finishing, 精铣, 精车, 光刀, 精加工阶段, finish | 1 |
| 半精加工 | semi-finishing, 半精铣, 半精车 | 2 |
| 刚性强力铣削 | 重切削, heavy cutting, heavy milling, 大切削量 | 2 |
| 高速切削 | 高速加工, HSM, high speed machining, 高速铣削 | 2 |
| 干切 | 干切削, dry machining, 无冷却加工 | 2 |
| 湿切 | 湿切削, wet machining, 冷却液加工 | 2 |
| 攻丝 | tapping, 套丝, 螺孔加工, 螺纹孔, 攻螺纹, M牙 | 1 |
| 刚性攻丝 | rigid tap, 同步攻丝, M29, 刚性攻牙, 刚攻 | 2 |
| 弹性攻丝 | flexible tap, 浮动攻丝, 浮动夹头攻丝, 普通攻丝 | 3 |

---

## 材料 (Material)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 不锈钢 | stainless steel, 不锈钢加工, 304, 316, sus304, sus316, 不锈钢材料, SUS | 1 |
| 铝合金 | 铝, 铝件, aluminum, 6061, 7075, 铝材, aluminium, 铝加工, ADC12, 压铸铝 | 1 |
| 45号钢 | 45钢, 45#, 碳钢, 中碳钢, S45C, C45, 碳素钢 | 1 |
| 模具钢 | tool steel, 模钢, Cr12, Cr12MoV, SKD11, DC53, H13, P20, 模具钢材 | 2 |
| 高温合金 | 耐热合金, inconel, 哈氏合金, 钛合金, 钛, titanium, 超合金, 镍基合金, Ti6Al4V | 2 |
| 铸铁 | cast iron, 灰口铸铁, 球墨铸铁, HT200, QT500, 铸铁件, FC | 2 |
| 铜 | 铜合金, 黄铜, 紫铜, 青铜, brass, copper, Cu, 铍铜 | 2 |
| 塑料 | 工程塑料, POM, 亚克力, 尼龙, peek, 塑料件, 有机玻璃, PVC, 特氟龙, PTFE | 2 |

---

## 刀具 & 工具 (Tool)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 硬质合金 | 钨钢, carbide, 合金刀刃, 硬质合金刀片, cemented carbide | 2 |
| 涂层 | 刀具涂层, coating, TiAlN, TiN, DLC, AlTiN, 氮铝钛, 氮化钛, 类金刚石 | 2 |
| 球刀 | 球头刀, ball end mill, 球头铣刀, R刀, ballnose | 2 |
| 立铣刀 | end mill, 平底刀, 平刀, 直柄铣刀, 平底铣刀, 方肩铣刀 | 1 |
| 钻头 | twist drill, 麻花钻, 定心钻, center drill, 钻花, 直柄钻头, 钻尖 | 1 |
| 丝锥 | tap, 丝攻, 螺旋丝锥, 先端丝锥, 挤压丝锥, 机用丝锥, 手用丝锥, 螺攻 | 1 |
| 镗刀 | boring bar, boring tool, 精镗刀, 粗镗刀, 微调镗刀 | 2 |
| 刀柄 | tool holder, BT30, BT40, BT50, HSK, HSK63, HSK100, 刀把, 弹簧夹头, 筒夹, ER夹头, 强力铣夹 | 2 |
| 刀盘 | face mill, 面铣刀, 铣刀盘, shell mill | 2 |
| 车刀 | turning tool, 外圆车刀, 内孔车刀, 切断刀, 切槽刀, 螺纹车刀, 成型刀 | 2 |
| 刀片 | insert, 机夹刀片, 可转位刀片, 车刀片, 铣刀片, CNMG, WNMG, TNMG, APMT, RPMT | 2 |
| 寻边器 | edge finder, 碰数器, 找边器, 偏心寻边器, 电子寻边器 | 2 |
| 对刀仪 | tool presetter, Z轴设定器, 对刀块, 对刀规 | 2 |
| 卡尺 | 游标卡尺, 数显卡尺, vernier caliper, dial caliper, 电子卡尺, 带表卡尺 | 1 |
| 千分尺 | micrometer, 外径千分尺, 内径千分尺, 数显千分尺, 微分筒, 分厘卡 | 1 |
| 百分表 | dial indicator, 千分表, 杠杆表, dial gauge, 杠杆百分表, 电子百分表 | 2 |

---

## 数控系统 (System)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| FANUC | 发那科, 法那科, 法兰克, FANUC数控, FANUC系统, 发那科系统, Fanuc, fanuc | 1 |
| 西门子 | Siemens, SINUMERIK, sinumerik, 西门子系统, 840D, 802D, 828D, siemens | 1 |
| 三菱 | Mitsubishi, M70, M80, 三菱系統, MELDAS, 三菱数控, mitsubishi | 1 |
| 广数 | GSK, 广州数控, GSK980, 广数系统, 980TDi, GSK数控 | 2 |
| 华中数控 | 华中系统, HNC, 华中世纪星, 华中, HuaZhong | 3 |
| 新代 | SYNTEC, 新代系统, 新代数控, Syntec | 3 |
| 海德汉 | Heidenhain, 海德汉系统, heidenhain, TNC, iTNC | 3 |
| 宝元 | LNC, 宝元数控, 宝元系统 | 3 |
| 凯恩帝 | KND, 凯恩帝系统, KND数控 | 3 |
| 哈斯 | HAAS, haas, Haas, 哈斯系统, HAAS数控 | 3 |
| OKUMA | 大隈, 欧克马, OKUMA系统, okuma, OKUMA数控 | 3 |
| 马扎克 | Mazak, MAZAK, mazak, Mazatrol, 马扎克系统, 对话式编程 | 3 |

---

## 通用术语 (Common)

| 规范名 | 别名 | 优先级 |
|--------|------|--------|
| 转速 | S值, 主轴转速, RPM, r/min, 转每分钟, S指令, 转数 | 1 |
| 进给 | F值, 进给速度, feed rate, 走刀速度, F指令, 进给量, 进给率 | 1 |
| 切深 | ap, 切削深度, 吃刀量, 背吃刀量, depth of cut, DOC, 切深量, 轴向切深, 径向切深, ae, 切削宽度 | 1 |
| 线速度 | Vc, 切削速度, cutting speed, 切削线速度, surface speed, 米每分钟, m/min | 1 |
| 每齿进给 | Fz, 每刃进给, 进给每齿, feed per tooth, mm/z, mm/齿 | 1 |
| 工件坐标 | 工件坐标系, work coordinate, 工件零点, WCS, 零件坐标, program zero | 1 |
| 机床坐标 | 机床坐标系, machine coordinate, MCS, 机械坐标, 绝对坐标, machine zero | 1 |
| 参考点 | 零位, 零点, home position, reference point, 原点, 机械原点, 机床零点 | 1 |
| 螺纹底孔 | 底孔, 螺纹底径, tap drill, 底孔直径, 预钻孔 | 1 |
| 螺距 | pitch, 牙距, 螺纹螺距, 螺纹导程, 丝距 | 1 |
| 撞刀 | 撞机, 撞车, 碰撞, crash, tool crash, 刀具碰撞, 机床碰撞 | 1 |
| 过切 | overcut, 过量切削, 切过头, 尺寸超差 | 2 |
| 振纹 | 震动纹, chatter mark, 加工振纹, 切削振动, chatter, 颤振 | 2 |
| 毛刺 | burr, 飞边, 披锋, 去毛刺, deburr, 毛边, 锐边 | 2 |
| 公差 | tolerance, 尺寸公差, 形位公差, GD&T, 允许偏差, 精度要求, ± | 1 |
| 粗糙度 | surface roughness, 表面粗糙度, Ra, Rz, 光洁度, 表面质量, 粗糙度等级 | 1 |
| 同轴度 | coaxiality, 同心度, concentricity, 同轴, 同心 | 2 |
| 垂直度 | perpendicularity, squareness, 垂直 | 2 |
| 平行度 | parallelism, 平行 | 2 |
| 位置度 | position, position tolerance, 位置公差 | 2 |
| 圆跳动 | circular runout, runout, 跳动, 偏摆 | 2 |

---

## 参数 (Parameter)

| 规范名 | 别名 | 优先级 | 备注 |
|--------|------|--------|------|
| 参数1815 | 1815号参数, PRM1815, #1815, FANUC1815, APC设定, 绝对编码器设置 | 2 | 回零相关高频参数 |
| 参数1320 | 1320号参数, PRM1320, #1320, 行程极限, 存储行程极限正 | 2 | |
| 参数1321 | 1321号参数, PRM1321, #1321, 行程极限负 | 2 | |
| 参数1420 | 1420号参数, PRM1420, #1420, 快速进给速度, 快移速度, rapid traverse | 2 | |
| 参数1421 | 1421号参数, PRM1421, #1421, 快速进给倍率 | 2 | |
| 参数1422 | 1422号参数, PRM1422, #1422, 最大切削进给速度 | 2 | |
| 参数1423 | 1423号参数, PRM1423, #1423, 手动进给速度 | 2 | |
| 参数1424 | 1424号参数, PRM1424, #1424, 手动快速进给速度 | 2 | |
| 参数1850 | 1850号参数, PRM1850, #1850, 反向间隙, backlash, 丝杠间隙补偿 | 2 | |
| 参数1851 | 1851号参数, PRM1851, #1851, 反向间隙2 | 2 | |
| 参数1936 | 1936号参数, PRM1936, #1936, 位置环路增益, position loop gain | 2 | |
| 参数1825 | 1825号参数, PRM1825, #1825, 伺服增益, servo gain | 2 | |
| 参数2021 | 2021号参数, PRM2021, #2021, 速度环路增益 | 2 | |
| 参数2022 | 2022号参数, PRM2022, #2022, 速度环积分增益 | 2 | |
| 参数2060 | 2060号参数, PRM2060 | 3 | |

---

> 类别分布: G代码(82) | M代码(29) | 操作(6) | 报警(7) | 机床(4) | 工艺(11) | 材料(8) | 刀具(16) | 系统(12) | 通用(21) | 参数(15)
