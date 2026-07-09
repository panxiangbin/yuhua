window.CNC_BALLOON_TOOL = (function() {
  "use strict";

  var state = {
    image: null,
    imageName: "",
    bubbles: [],
    selectedId: null,
    nextId: 1
  };

  function handleImageUpload(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      state.image = e.target.result;
      render();
    };
    reader.readAsDataURL(file);
  }

  function render() {
    var container = document.getElementById("balloon-canvas");
    if (!container) return;

    if (!state.image) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">请先上传图纸图片</div>';
      return;
    }

    var html = '<img src="' + state.image + '" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px;" />';
    container.innerHTML = html;
  }

  function init() {
    var uploadArea = document.getElementById("balloon-upload-area");
    var fileInput = document.getElementById("balloon-file-input");

    if (uploadArea && fileInput) {
      uploadArea.onclick = function() {
        fileInput.click();
      };

      fileInput.onchange = function(e) {
        if (e.target.files.length > 0) {
          handleImageUpload(e.target.files[0]);
        }
      };
    }

    // 绑定工具栏按钮
    var addBtn = document.getElementById("balloon-add-btn");
    if (addBtn) {
      addBtn.onclick = function() {
        alert("请先上传图纸，然后点击图纸上的位置添加气泡（此功能正在完善）");
      };
    }

    var exportBtn = document.getElementById("balloon-export-img-btn");
    if (exportBtn) {
      exportBtn.onclick = function() {
        if (!state.image) {
          alert("请先上传图纸");
          return;
        }
        var a = document.createElement("a");
        a.href = state.image;
        a.download = "drawing.png";
        a.click();
      };
    }
  }

  return {
    init: init,
    handleImageUpload: handleImageUpload
  };
})();

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.CNC_BALLOON_TOOL && window.CNC_BALLOON_TOOL.init) {
      window.CNC_BALLOON_TOOL.init();
    }
  });
} else {
  if (window.CNC_BALLOON_TOOL && window.CNC_BALLOON_TOOL.init) {
    window.CNC_BALLOON_TOOL.init();
  }
}
