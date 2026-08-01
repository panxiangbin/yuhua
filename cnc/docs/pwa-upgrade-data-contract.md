# CNC PWA 升级数据保护契约

## 目标

当 CNC 新手训练平台的 Service Worker 从旧缓存版本升级到新版本时，必须同时满足以下条件：

1. 旧版 `cnc-static-*` 与 `cnc-runtime-*` 缓存被清理。
2. 新版静态缓存和运行时缓存完整建立。
3. `/cnc/` 作用域只能保留一个激活的 Service Worker 注册，不得残留 `waiting` 或 `installing` Worker。
4. 不得删除或改写学习数据，包括成长档案、练习历史、错题记录和模拟训练成绩。
5. 不得误删同源下不属于 CNC 的缓存。
6. 升级完成后，AI CNC 老师和现场问诊单仍需在未重新在线预热的情况下离线打开。

## 当前自动验证路径

专项门禁会在全新的 Chromium 用户目录中执行以下真实路径：

```text
建立旧版 pwa3 静态缓存和运行时缓存
→ 写入成长档案、练习、错题和模拟训练数据
→ 写入 SessionStorage 与 IndexedDB 探针
→ 注册并激活当前 pwa4 Service Worker
→ 验证旧 CNC 缓存清理、新缓存就绪
→ 验证学习数据逐字节保持不变
→ 验证无关缓存仍然存在
→ 断网打开 AI CNC 老师和现场问诊单
```

## 数据范围

当前门禁覆盖正式学习数据键：

- `cnc_training_profile_v1`
- `cnc_training_practice_v1`
- `cnc_training_simulator_v1`

同时覆盖：

- 非 CNC 的 LocalStorage 数据
- 同一标签页 SessionStorage
- IndexedDB 数据
- 非 CNC CacheStorage 缓存

## 安全边界

PWA 升级只负责应用壳与缓存版本切换，不得借升级过程修改用户学习记录，也不得自动推断或改写机床参数、报警、刀补、坐标或现场安全结论。涉及具体机床的技术内容仍需核对原厂手册、企业制度、受控工艺和现场条件。
