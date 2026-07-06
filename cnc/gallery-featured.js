(function () {
  const grid = document.getElementById("cncGalleryGrid");
  const countEl = document.getElementById("cncGalleryCount");

  const modal = document.getElementById("cncGalleryModal");
  const closeBtn = document.getElementById("cncGalleryClose");
  const prevBtn = document.getElementById("cncGalleryPrev");
  const nextBtn = document.getElementById("cncGalleryNext");

  const previewImg = document.getElementById("cncGalleryPreviewImg");
  const previewTitle = document.getElementById("cncGalleryPreviewTitle");
  const previewDesc = document.getElementById("cncGalleryPreviewDesc");
  const previewIndex = document.getElementById("cncGalleryPreviewIndex");

  if (!grid) return;

  const rawLibrary = Array.isArray(window.CNC_GALLERY_LIBRARY_ENHANCED)
    ? window.CNC_GALLERY_LIBRARY_ENHANCED
    : Array.isArray(window.CNC_GALLERY_LIBRARY)
    ? window.CNC_GALLERY_LIBRARY
    : [];

  const galleryImages = rawLibrary
    .map(normalizeGalleryItem)
    .filter(function (item) {
      return Boolean(item.src);
    })
    .slice(0, 20);

  let currentIndex = 0;

  renderGallery();

  function normalizeGalleryItem(item, index) {
    if (typeof item === "string") {
      return {
        src: item,
        thumb: item,
        title: "数控图片资料 " + (index + 1),
        desc: "点击查看高清大图。",
        alt: "数控图片资料 " + (index + 1)
      };
    }

    item = item || {};

    const src = item.src || item.url || item.image || item.img || item.cover || "";
    const thumb = item.thumb || item.thumbnail || item.preview || src;

    return {
      src: src,
      thumb: thumb,
      title: item.title || item.name || "数控图片资料 " + (index + 1),
      desc: item.desc || item.description || item.summary || "点击查看高清大图。",
      alt: item.alt || item.title || item.name || "数控图片资料 " + (index + 1)
    };
  }

  function renderGallery() {
    if (countEl) countEl.textContent = galleryImages.length;

    if (!galleryImages.length) {
      grid.innerHTML = `
        <div class="cnc-gallery-empty">
          暂未读取到图库数据。请检查 <strong>window.CNC_GALLERY_LIBRARY</strong> 是否已正确加载。
        </div>
      `;
      return;
    }

    grid.innerHTML = galleryImages
      .map(function (item, index) {
        return `
          <button class="cnc-gallery-card" type="button" data-index="${index}" aria-label="查看图片：${escapeHtml(item.title)}">
            <span class="cnc-gallery-img-wrap">
              <img
                data-src="${escapeAttr(item.thumb)}"
                alt="${escapeAttr(item.alt)}"
                loading="lazy"
              >
            </span>

            <span class="cnc-gallery-overlay">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.desc)}</p>
            </span>
          </button>
        `;
      })
      .join("");

    bindCardEvents();
    enableLazyLoad();
  }

  function bindCardEvents() {
    const cards = grid.querySelectorAll(".cnc-gallery-card");

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        const index = Number(card.dataset.index || 0);
        openModal(index);
      });
    });
  }

  function enableLazyLoad() {
    const images = grid.querySelectorAll("img[data-src]");

    if (!("IntersectionObserver" in window)) {
      images.forEach(loadImage);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadImage(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "180px 0px",
        threshold: 0.01
      }
    );

    images.forEach(function (img) {
      observer.observe(img);
    });
  }

  function loadImage(img) {
    const src = img.getAttribute("data-src");
    if (!src) return;

    img.src = src;
    img.removeAttribute("data-src");

    img.addEventListener("load", function () {
      img.classList.add("is-loaded");
    });
  }

  function openModal(index) {
    if (!modal || !galleryImages.length) return;

    currentIndex = clampIndex(index);
    updateModalContent();

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    if (previewImg) {
      previewImg.src = "";
      previewImg.alt = "";
    }
  }

  function showPrev() {
    currentIndex = clampIndex(currentIndex - 1);
    updateModalContent();
  }

  function showNext() {
    currentIndex = clampIndex(currentIndex + 1);
    updateModalContent();
  }

  function updateModalContent() {
    const item = galleryImages[currentIndex];
    if (!item) return;

    previewImg.src = item.src;
    previewImg.alt = item.alt;
    previewTitle.textContent = item.title;
    previewDesc.textContent = item.desc;
    previewIndex.textContent = currentIndex + 1 + " / " + galleryImages.length;
  }

  function clampIndex(index) {
    if (index < 0) return galleryImages.length - 1;
    if (index >= galleryImages.length) return 0;
    return index;
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", showPrev);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", showNext);
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target && event.target.dataset.close === "true") {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!modal || !modal.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeModal();
    }

    if (event.key === "ArrowLeft") {
      showPrev();
    }

    if (event.key === "ArrowRight") {
      showNext();
    }
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
