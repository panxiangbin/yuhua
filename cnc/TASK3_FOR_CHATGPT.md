# ChatGPT Plus 网页版 - 任务3

## 👋 新任务来了

设计一个**知识点详情页的图片轮播组件**。

---

## 📋 任务目标

为知识点详情页设计一个横向图片轮播组件，展示该知识点相关的所有配图。

---

## 🎨 设计要求

### 场景
用户在工作区点击某个知识点进入详情页，如果该知识点有多张配图（1-5张），显示轮播组件。

### 布局
- 横向排列（左右滑动）
- 每次显示1张图片（主图）
- 底部显示缩略图导航（小圆点或小图）
- 左右箭头切换

### 尺寸
- 主图区域：600x400px（桌面）、100%x300px（移动端）
- 缩略图：60x60px，间距8px
- 箭头按钮：44x44px

### 功能
1. 点击左右箭头切换图片
2. 点击缩略图跳转到对应图片
3. 当前图片的缩略图高亮
4. 支持键盘左右键切换
5. 自动播放（可选，5秒切换）

---

## 🎨 风格要求（土黄色）

```css
主图背景：#fffaf2
边框：rgba(207, 109, 54, 0.22)
箭头按钮：#cf6d36
箭头按钮悬停：#bd5e2c
缩略图边框：rgba(207, 109, 54, 0.3)
缩略图激活：#cf6d36（2px边框）
阴影：0 12px 32px rgba(93, 101, 95, 0.12)
```

---

## 📦 交付格式

提供完整HTML + CSS + JavaScript代码：

```html
<div class="image-carousel">
  <div class="carousel-main">
    <img id="carouselMainImage" src="..." alt="...">
    <button class="carousel-btn carousel-prev" aria-label="上一张">‹</button>
    <button class="carousel-btn carousel-next" aria-label="下一张">›</button>
  </div>
  
  <div class="carousel-thumbs">
    <!-- 缩略图导航 -->
  </div>
  
  <div class="carousel-caption">
    <h4>图片标题</h4>
    <p>图片说明</p>
    <span class="carousel-counter">1 / 5</span>
  </div>
</div>

<style>
/* 你的CSS代码 */
</style>

<script>
// 你的JavaScript代码
// 数据格式示例：
const images = [
  {
    src: "image1.jpg",
    title: "G00快速定位",
    desc: "快速移动到指定位置"
  },
  {
    src: "image2.jpg",
    title: "G01直线插补",
    desc: "直线切削路径"
  }
];
</script>
```

---

## ✅ 功能要求

1. ✅ 左右箭头切换图片
2. ✅ 点击缩略图跳转
3. ✅ 当前缩略图高亮
4. ✅ 键盘左右键支持
5. ✅ 显示当前页码（1/5）
6. ✅ 第一张时左箭头禁用，最后一张右箭头禁用
7. ✅ 平滑过渡动画
8. ✅ 响应式（移动端友好）

---

## 📱 响应式要求

### 桌面（>768px）
- 主图600x400px
- 缩略图60x60px
- 箭头在主图两侧

### 移动端（≤768px）
- 主图100%宽x300px高
- 缩略图50x50px
- 箭头在主图内部（左右两侧）

---

## ⏱️ 时间要求

**40分钟内完成**

---

## 📝 交付示例

回复格式：
```
✅ 图片轮播组件设计完成

【完整代码】
（HTML + CSS + JavaScript一起，可直接复制使用）

【使用说明】
1. 将代码复制到详情页
2. 修改 images 数组，填入实际图片数据
3. 支持键盘左右键切换

【功能清单】
✅ 左右箭头切换
✅ 缩略图导航
✅ 键盘支持
✅ 响应式布局
✅ 平滑动画
```

---

**开始设计吧！**
