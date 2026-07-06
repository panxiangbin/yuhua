# 12关学习系统与 Entry ID 映射审计报告 (2026-07-06)

**文档状态**：DRAFT (可交接)  
**审计执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、两套学习卡片结构对比

在对项目进行真实核对时，我们发现项目内部存在 **两套不同的关卡主题逻辑**，目前它们处于严重的物理脱节状态：

### 1. 结构 A：`index.html` 中的在线 12 关
*   *表现形式*：直接硬编码在 `#view-study` 视口的 HTML 结构中（1-12关卡卡片）。
*   *设计意图*：侧重于车间现场的安全操作规范和机床认路（“找机床老家”、“Z轴对刀保命绝招”、“认识你的武器”、“致命小数点”等）。
*   *缺陷*：属于静态超文本，没有和底层知识库 ID 建立任何属性级的强关联。

### 2. 结构 B：`app.js` 的 `STUDY_CARD_MATCH_RULES` 规则
*   *表现形式*：定义于 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 第 1847 行起，带有 `cardTitle` 和 `keywords`。
*   *设计意图*：以纯技术点（“刀具怎么走”、“圆弧怎么加工”、“程序从哪里开始”等）模糊搜索 `data.js` 的相关词条。
*   *缺陷*：它是上一代静态目录的设计，其 `cardTitle` 根本没有同步修改为当前新版 L1-L4 阶段关卡卡片的最新标题，导致除了第 2 关能匹配上外，其他 11 关在点击时全部在控制台报 Warn 断开。

---

## 二、映射冲突与重合点分析

若我们要保留在线 12 关（HTML版），同时利用 `learning-cards-round2.js` 的最新 Q&A 数据，其对齐重组逻辑如下：

1.  **直接可映射的关卡 (Confidence: HIGH)**:
    *   **第 1 关 (认识零件身份证)** $\rightarrow$ 映射到 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中的 `drawing-symbol` ("图纸符号与尺寸标注入门")。
    *   **第 2 关 (机床的东南西北)** $\rightarrow$ 映射到 `learn-coordinate-system` ("坐标系与对刀详解")。
    *   **第 4 关 (告诉机床活儿在哪)** $\rightarrow$ 映射到 `learn-g54-g59` ("G54-G59工件坐标系")。
    *   **第 8 关 (S和F谁跑得快)** $\rightarrow$ 映射到 `calc-vc-rpm` ("线速度、转速换算")。
    *   **第 11 关 (G90和G91绝对与增量)** $\rightarrow$ 映射到 `learn-absolute-incremental` ("G90/G91绝对值与增量编程")。
    *   **第 12 关 (G81钻孔自动化)** $\rightarrow$ 映射到 `learn-g81-g83` ("G81/G83固定循环")。
2.  **内容空缺、需要新增中间层说明的关卡 (Confidence: LOW)**:
    *   **第 5 关 (Z 轴对刀，保命绝招)**：
        *   *现状*：对刀逻辑在 `learn-coordinate-system` 虽有提及，但主要偏向工件偏置设定。
        *   *建议*：新建一个微型知识点 `learn-z-axis-touchoff`，详细记录“试切法对刀”和“防扎刀手轮试运行”的操作规程，作为这一关详情页的中间层。
    *   **第 10 关 (致命的小数点)**：
        *   *现状*：在 [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js) 里没有这张卡片的数据（卡片 ID 仅有 12 个，且没有关于小数点的题目，多出来的是 `card-006` 刀长偏置 G43）。
        *   *建议*：在 `cards` 数据包中新增 `card-013` (致命的小数点) 数据并配上 Q&A，将 `card-006` (G43) 合并入第 5 关或第 6 关；同时在 `data.js` 中新增小数点语法规则。
3.  **缺图关卡**:
    *   **第 3 关 (找机床的老家 / 手动回零)**：需要一张机械原点碰限位开关复位的物理过程图。
    *   **第 9 关 (G00和G01快慢有别)**：需要一张 G00 快速折线走刀轨迹与 G01 线性插补走刀轨迹的对比图，用于直观警示 G00 的“非线性”撞刀风险。

---

## 三、Codex 整合决策依据

为使两套系统融为一体，**不建议建议回退成 7 关**。应采取以下行动：
*   **动作 1**：将 [learning_12gate_entry_mapping_draft.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/learning_12gate_entry_mapping_draft.json) 直接作为 app.js 的静态映射配置加载。
*   **动作 2**：在 [index.html](file:///F:/AI工作台/cnc_param_quickfinder/index.html) 的 `.study-card` 节点中直接写入 `data-entry-id="[mappedEntryId]"` 属性。
*   **动作 3**：改写 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 点击事件：直接获取 `card.dataset.entryId` 并执行路由跳转，完全废弃脆弱的标题比对规则。
