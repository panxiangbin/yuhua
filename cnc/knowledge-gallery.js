// 知识点图片轮播组件 - ChatGPT Plus 交付
// 用法：在详情页调用 initKnowledgeGallery(containerId, images)

function initKnowledgeGallery(containerId, images) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!images || !images.length) {
    container.innerHTML = `
      <div class="gallery-empty">
        <p>暂无相关配图</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="knowledge-gallery" tabindex="0" aria-label="知识点图片轮播">
      <div class="gallery-main">
        <button class="gallery-arrow prev" aria-label="上一张">‹</button>
        <div class="gallery-counter">1/${images.length}</div>
        <div class="gallery-track"></div>
        <button class="gallery-arrow next" aria-label="下一张">›</button>
      </div>
      <div class="gallery-thumbs"></div>
    </div>
  `;

  const gallery = container.querySelector(".knowledge-gallery");
  const track = container.querySelector(".gallery-track");
  const thumbs = container.querySelector(".gallery-thumbs");
  const counter = container.querySelector(".gallery-counter");
  const prevBtn = container.querySelector(".prev");
  const nextBtn = container.querySelector(".next");

  let currentIndex = 0;

  // 渲染轮播图
  track.innerHTML = images.map(item => `
    <div class="gallery-slide">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" />
      <div class="slide-info">
        <h3 class="slide-title">${escapeHtml(item.title)}</h3>
        <p class="slide-desc">${escapeHtml(item.desc)}</p>
      </div>
    </div>
  `).join("");

  // 渲染缩略图
  thumbs.innerHTML = images.map((item, index) => `
    <button class="gallery-thumb" data-index="${index}" aria-label="查看第${index + 1}张：${escapeHtml(item.title)}">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" />
    </button>
  `).join("");

  // 绑定事件
  prevBtn.addEventListener("click", () => goToSlide(currentIndex - 1));
  nextBtn.addEventListener("click", () => goToSlide(currentIndex + 1));

  thumbs.addEventListener("click", (event) => {
    const thumb = event.target.closest(".gallery-thumb");
    if (!thumb) return;
    const index = Number(thumb.dataset.index);
    goToSlide(index);
  });

  // 键盘支持
  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goToSlide(currentIndex - 1);
    if (event.key === "ArrowRight") goToSlide(currentIndex + 1);
  });

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement.tagName.toLowerCase();
    const isTyping = activeTag === "input" || activeTag === "textarea";
    if (isTyping) return;

    if (event.key === "ArrowLeft") goToSlide(currentIndex - 1);
    if (event.key === "ArrowRight") goToSlide(currentIndex + 1);
  });

  function goToSlide(index) {
    if (index < 0 || index >= images.length) return;
    currentIndex = index;
    updateGallery();
  }

  function updateGallery() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    counter.textContent = `${currentIndex + 1}/${images.length}`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === images.length - 1;

    const thumbButtons = thumbs.querySelectorAll(".gallery-thumb");
    thumbButtons.forEach((button, index) => {
      button.classList.toggle("active", index === currentIndex);
    });

    const activeThumb = thumbs.querySelector(".gallery-thumb.active");
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  updateGallery();
}
