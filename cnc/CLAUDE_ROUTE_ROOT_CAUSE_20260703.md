# 路由失效真正根因

- 生成时间：2026-07-03 14:39
- 依据：本次现场对当前最新 `app.js` 执行 `node -c app.js`，实测结果如下

```
$ node -c app.js
app.js:827
    </article>
    ^
SyntaxError: Unexpected token '<'
```

（当时 `app.js` 修改时间为 2026-07-03 14:35:16.489，文件大小 67948 字节。此结论基于此版本，若文件之后又被改动，需重新执行 `node -c app.js` 复核，不能沿用本文件的行号。）

## 真正根因：

- `app.js` 第827-829行残留一段没有开头的孤儿代码碎片（`</article>` + 反引号 + `}`），紧跟在 `renderHeroMetrics()` 函数正确收尾（第826行 `}`）之后。这是历史编辑遗留的死代码，导致整个文件**JS语法解析失败**——不是运行时报错，是脚本连解析都过不去。
- 后果：`app.js` 一行都不会执行。`bootstrap()` 从未运行，`initHashRouting()` 从未注册 `hashchange` 监听、也从未在首次加载时调用 `handleHashChange()`。负责给目标 `.view` 元素加 `active` class 的 `navigate()` 函数从未被调用一次。页面因此停在 `index.html` 里硬编码的初始状态——`view-dashboard` 自带 `class="view active"`，其余视图没有 `active` class，也没有任何逻辑去改它。这就是为什么打开 `#study-map` / `#workspace` 后目标视图始终没有被真正激活。
- 第二个隐患：`app.js` 第1403-1404行存在重复声明 `function bindRouteButtons() {`（两行内容完全相同）。这是独立于上面那处的第二个语法级问题——修掉第一处之后，`node -c` 会立刻在这里报出新的错误，必须一并处理，不能只改一处就提交。

## 最小修改点：

- 函数 `renderHeroMetrics()`：函数体本身正确（第813-826行不用动），只需删除紧跟在它后面、第827-829行的孤儿残留三行（`</article>`、收尾反引号、多余的 `}`）
- 函数 `bindRouteButtons()`：当前有两行内容完全相同的函数声明头（第1403、1404行），删除其中一行，只保留一份

## 最短施工指令：

只改 `app.js`，不要动其他文件。第一步：全文搜索 `</article>` 定位孤儿代码碎片（紧跟在 `renderHeroMetrics` 函数结尾 `}` 之后的3行：`</article>`、反引号、多余的 `}`），整段删除，不要动 `renderHeroMetrics` 函数本身。第二步：全文搜索 `function bindRouteButtons`，若命中两行内容相同的声明，删掉其中一行，只留一份。改完后必须在终端执行 `node -c app.js`，看到**没有任何输出**才算改对；只要还有报错输出，就说明没改完，不要提交。
