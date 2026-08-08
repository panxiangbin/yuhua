# CNC 固定12关“真实80分”门禁审计与改造验收标准

## 审计结论

当前 `cnc/training-practice.js` 使用 `PASS_SCORE=80`，但固定12关的 `LESSON_REQUIREMENTS` 每关只有2道必答题；成绩按“答对数 / 题数 × 100”取整，所以单关只可能得到 0、50、100 三档。当前通关条件还同时要求 `passed.length === ids.length`，因此页面所说“达到80分才算掌握”在真实执行中实际等价于“两题全部答对，即100分”。

这不是降低及格线的问题。目标是让80分成为真实可实现、可区分的成绩，同时保留甚至加强安全门禁，不能通过删除题目、降低断言或放松高风险题来解决。

## 目标模型

固定12关每关调整为 **5道专属题**，每道题只属于一关，不跨关复用。这样普通成绩粒度为 0、20、40、60、80、100，4/5 答对时可以真实形成80分。

通关必须同时满足两类条件：

1. 总体答对率达到80分；
2. 本关所有“关键题”全部答对。

高风险题必须全部纳入关键题硬门禁。若用户4/5答对形成原始80分，但漏掉关键题，系统不得记为掌握；闯关成绩应保持在80分以下，并明确提示“关键题未通过”，避免成长档案、每日训练和AI老师只看数值时误判已经掌握。

部分纯安全或高风险密集课程可以因为“5题均为关键题”而实际要求100分，这属于明确的安全加严，不属于“80分文案与评分粒度不一致”的旧问题；页面必须把这一规则说清楚。

## 固定12关题量与关键题约束

| 关卡 | 主题 | 目标题量 | 关键题原则 |
| --- | --- | ---: | --- |
| 1 | 安全操作 | 5 | 急停/进给保持、防护联锁、旋转部件清屑、个人防护、异常停机后复位均按高风险题处理 |
| 2 | 机床结构 | 5 | 自动换刀区域、刀具尺寸/重量限制属于关键题；具体限制必须核对当前机床原厂手册 |
| 3 | 坐标与回零 | 5 | 参考点返回目的和回零运动通道属于关键题；轴向、顺序、动作方向不得跨机猜测 |
| 4 | 图纸基础 | 5 | 公差含义至少1道关键理解题；测量与判定必须回到正式图纸、检验规范和量具能力 |
| 5 | 工件坐标 | 5 | G54/偏置写入、修改、独立复核和当前坐标系身份属于关键题；系统页面与写入方式以原厂手册为准 |
| 6 | 装夹基础 | 5 | 定位贴合、支撑/变形、刀具通道和夹具避让属于关键题；夹紧力不得给出无来源固定数值 |
| 7 | 刀具基础 | 5 | 刀柄/拉钉匹配、刃口状态、接口清洁、伸出风险属于关键题；转速与夹持限制核对厂家资料 |
| 8 | 刀长补偿 | 5 | H号对应、安全接近、刀长数据身份及正负/调用规则属于关键题；必须核对当前系统/机床手册 |
| 9 | G00/G01 | 5 | G00切削误用、危险快移程序行、快速移动通道属于关键题；轨迹和倍率行为按当前系统手册 |
| 10 | G02/G03 | 5 | 平面选择、IJK/R规则和系统差异属于关键题；圆弧方向必须结合当前平面和观察规则 |
| 11 | 孔加工循环 | 5 | R平面、孔深坐标、G80取消、接近/退回路径和首次受控验证均按高风险题处理 |
| 12 | 完整程序/首件 | 5 | 首件顺序、空运行/单段/低倍率、首件测量与放行属于关键题；最终按企业制度和现场授权执行 |

## 建议专属题 ID

每关5题，共60题；现有26题可保留并扩展，新增题不得跨关复用。

- 第1关：`safe-stop-first`、`safety-door-authorization`、`safety-chip-removal`、`safety-ppe-precheck`、`safety-restart-after-stop`
- 第2关：`machine-spindle-function`、`machine-tool-magazine-role`、`machine-axis-purpose`、`machine-tool-change-clearance`、`machine-panel-status-before-start`
- 第3关：`axis-z-direction`、`home-reference-purpose`、`coordinate-machine-vs-work`、`axis-positive-reference`、`reference-return-clearance`
- 第4关：`drawing-datum-reading`、`drawing-tolerance-meaning`、`drawing-dimension-priority`、`drawing-tolerance-not-target`、`drawing-measurement-datum`
- 第5关：`work-offset`、`g54-independent-check`、`work-offset-purpose`、`work-offset-change-risk`、`work-offset-verify-screen-part`
- 第6关：`workholding-location-first`、`workholding-support-check`、`workholding-clean-contact`、`workholding-clamp-clearance`、`workholding-recheck-after-clamp`
- 第7关：`tool-holder-match`、`tool-overhang-risk`、`tool-edge-condition`、`tool-holder-clean-interface`、`tool-selection-workpiece`
- 第8关：`tool-length-h-register`、`tool-length-safe-approach`、`tool-length-purpose`、`tool-length-number-verify`、`tool-length-sign-risk`
- 第9关：`g00-cutting`、`find-error-g00`、`g01-feed`、`rapid-clearance-check`、`feed-command-context`
- 第10关：`arc-plane-selection`、`arc-center-command`、`arc-endpoint-check`、`arc-direction-view`、`arc-parameter-system-scope`
- 第11关：`canned-cycle-r-plane`、`canned-cycle-g80-cancel`、`canned-cycle-clearance-purpose`、`canned-cycle-depth-scope`、`canned-cycle-safe-simulation`
- 第12关：`order-first-run`、`dry-run`、`fill-g01`、`first-piece-single-block`、`first-piece-measure-before-release`

## 数据迁移要求

`cnc_training_practice_v1` 不能简单清空，因为错题、答题记录和XP来源属于用户真实学习数据。建议新增 `gateVersion: 2`：

- 保留 `attempts`、`wrong`、`correct`；旧题仍然可以计入新版5题；
- 旧 `lessonScores` 复制到 `legacyLessonScores` 作为迁移审计依据；
- 对“旧规则得过100分但从未真正完成课程”的关卡，不允许旧100分直接绕过新版5题门禁；
- 对已经存在正式完成记录的关卡，不撤销用户完成状态，可保留80分掌握基线并标记“既有通关记录”，同时建议完成新版5题复测；
- 新版成绩和完成记录继续使用现有本地数据结构，不得破坏成长档案、每日训练、AI CNC老师、错题本和连续训练数据。

## 必须新增/调整的自动化断言

1. `course-gate-specificity-smoke.cjs`：固定12关严格各5题、合计60道、无跨关复用；高风险题必须全部属于本关关键题；每题有中文解析和适用范围；高风险解析必须出现原厂手册/现场/授权/验证边界。
2. `mobile-training-course-gates-smoke.cjs`：390×844真实浏览器验证第9关：
   - 3/5=60，不能通关；
   - 4/5且三道关键题全部答对时，必须真实得到80并允许通关；
   - 4/5但漏掉关键题时，原始答对率虽为80，闯关状态必须低于80且完成按钮被阻断，并优先打开缺失关键题；
   - 旧“两题=100分但未完成课程”的数据升级后不得绕过新版门禁；
   - 已经真实完成课程的旧用户不得因升级被撤销完成记录。
3. 完整CNC回归继续保留；不得删除现有起点测评、手机首页、错题闭环、课程闯关、AI老师、成长档案、PWA、BFCache、冷离线、性能、无障碍、Pages门禁。

## PWA 影响

`cnc/training-practice.js` 属于 `sw.js` 的 `REQUIRED_CORE_PATHS`。正式实现只要修改该核心资源，就必须从当前正式 `20260808-pwa22 / 20260808-learning22` 正规提升到下一构建版本，并同步所有主动构建针、PWA自检、冷离线、BFCache、升级数据保护、Pages exact-head 和公网传播验证。不得只改业务文件而沿用旧核心缓存版本。

## 合并条件

本审计文档本身不代表生产修复完成。只有实现进入PR最新头后，latest head 的专项题库/课程门禁、完整手机、Service Worker、冷离线、PWA自检、BFCache、构建引用、升级数据保护、性能、无障碍、Pages exact-head/status 等全部真正完成且全绿，范围审计仍仅包含 `cnc/**` 或明确CNC专属测试/工作流，PR可合并且无未解决Review Thread，才允许合并。
