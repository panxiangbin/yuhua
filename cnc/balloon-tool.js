window.CNC_BALLOON_TOOL = (function() {
  "use strict";

  var state = {
    image: null,
    imageName: "",
    imageWidth: 0,
    imageHeight: 0,
    bubbles: [],
    selectedId: null,
    nextId: 1,
    mode: "select",
    updatedAt: "",
    _initialized: false
  };

  function handleImageUpload(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      state.image = e.target.result;
      state.imageName = file.name;
      var img = new Image();
      img.onload = function() {
        state.imageWidth = img.naturalWidth;
        state.imageHeight = img.naturalHeight;
        renderCanvas();
        renderBubbleList();
      };
      img.src = state.image;
    };
    reader.readAsDataURL(file);
  }

  function addBubble(relX, relY) {
    var bubble = {
      id: state.nextId,
      x: relX,
      y: relY,
      item: "",
      requirement: "",
      upperTol: "",
      lowerTol: "",
      measured: "",
      result: "未检",
      note: ""
    };
    state.bubbles.push(bubble);
    state.selectedId = state.nextId;
    state.nextId++;
    renderCanvas();
    renderBubbleList();
  }

  function selectBubble(id) {
    state.selectedId = id;
    renderCanvas();
    renderBubbleList();
  }

  function updateBubble(id, patch) {
    var bubble = state.bubbles.find(function(b) { return b.id === id; });
    if (!bubble) return;
    Object.keys(patch).forEach(function(k) { bubble[k] = patch[k]; });
    autoJudgeResult(bubble);
    renderCanvas();
    renderBubbleList();
  }

  function deleteBubble(id) {
    var idx = state.bubbles.findIndex(function(b) { return b.id === id; });
    if (idx === -1) return;
    state.bubbles.splice(idx, 1);
    if (state.selectedId === id) state.selectedId = null;
    renderCanvas();
    renderBubbleList();
  }

  function deleteSelected() {
    if (state.selectedId === null) return;
    deleteBubble(state.selectedId);
  }

  function renumberBubbles() {
    state.bubbles.forEach(function(b, i) { b.id = i + 1; });
    state.nextId = state.bubbles.length + 1;
    if (state.selectedId) state.selectedId = state.bubbles.length > 0 ? 1 : null;
    renderCanvas();
    renderBubbleList();
  }

  function renderCanvas() {
    var container = document.getElementById("balloon-canvas");
    if (!container) return;

    if (!state.image) {
      container.innerHTML =
        '<div class="balloon-empty">' +
        '<p>上传一张图纸截图，</p>' +
        '<p>然后点击尺寸位置添加气泡编号。</p>' +
        '<p style="margin-top:10px;font-size:0.78rem;">试用版建议先上传 PNG / JPG 图片，PDF 可以先截图后再上传。</p>' +
        '</div>';
      container.classList.remove("has-image");
      return;
    }

    container.classList.add("has-image");
    var viewW = container.clientWidth || 800;

    var svgBubbles = state.bubbles.map(function(b) {
      var isSelected = b.id === state.selectedId;
      var fillColor, strokeColor, textColor;
      if (isSelected) {
        fillColor = "#1a73e8";
        strokeColor = "#1a73e8";
        textColor = "#fff";
      } else if (b.result === "合格") {
        fillColor = "#fff";
        strokeColor = "#16A34A";
        textColor = "#16A34A";
      } else if (b.result === "超差") {
        fillColor = "#fff";
        strokeColor = "#DC2626";
        textColor = "#DC2626";
      } else {
        fillColor = "#fff";
        strokeColor = "#1a73e8";
        textColor = "#1a73e8";
      }
      var cx = (b.x * 100).toFixed(2);
      var cy = (b.y * 100).toFixed(2);
      return '<g data-bubble-id="' + b.id + '">' +
        '<circle cx="' + cx + '%" cy="' + cy + '%" r="14" fill="' + fillColor + '" stroke="' + strokeColor + '" stroke-width="2" style="cursor:pointer;"/>' +
        '<text x="' + cx + '%" y="' + cy + '%" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="bold" fill="' + textColor + '" style="cursor:pointer;pointer-events:none;">' + b.id + '</text>' +
        '</g>';
    }).join("");

    container.innerHTML =
      '<img src="' + state.image + '" alt="图纸" style="width:100%;height:auto;display:block;user-select:none;-webkit-user-drag:none;" />' +
      '<svg class="balloon-svg-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">' +
      svgBubbles +
      '</svg>';
  }

  function renderBubbleList() {
    var list = document.getElementById("balloon-list");
    if (!list) return;

    if (!state.bubbles.length) {
      list.innerHTML =
        '<div class="balloon-empty">' +
        '<p>还没有标注尺寸。</p>' +
        '<p>点击"添加气泡"，再点图纸上的尺寸位置。</p>' +
        '</div>';
      return;
    }

    var items = [
      '<table class="balloon-table">',
      '<thead><tr><th>#</th><th>检查项目</th><th>尺寸要求</th><th>上差</th><th>下差</th><th>实测值</th><th>结果</th><th>备注</th><th></th></tr></thead>',
      '<tbody>'
    ];

    state.bubbles.forEach(function(b) {
      var isSelected = b.id === state.selectedId;
      var resultCls = b.result === "合格" ? "pass" : b.result === "超差" ? "fail" : b.result === "复查" ? "review" : "pending";
      items.push('<tr class="' + (isSelected ? 'selected' : '') + '" data-bubble-id="' + b.id + '">');
      items.push('<td style="font-weight:600;color:#1a73e8;">' + b.id + '</td>');
      items.push('<td><select onchange="CNC_BALLOON_TOOL._updateItem(\'' + b.id + '\',this.value)">' +
        '<option value="">自定义</option>' +
        '<option value="孔径" ' + (b.item === "孔径" ? "selected" : "") + '>孔径</option>' +
        '<option value="外形尺寸" ' + (b.item === "外形尺寸" ? "selected" : "") + '>外形尺寸</option>' +
        '<option value="槽宽" ' + (b.item === "槽宽" ? "selected" : "") + '>槽宽</option>' +
        '<option value="深度" ' + (b.item === "深度" ? "selected" : "") + '>深度</option>' +
        '<option value="位置度" ' + (b.item === "位置度" ? "selected" : "") + '>位置度</option>' +
        '<option value="平面度" ' + (b.item === "平面度" ? "selected" : "") + '>平面度</option>' +
        '<option value="垂直度" ' + (b.item === "垂直度" ? "selected" : "") + '>垂直度</option>' +
        '<option value="粗糙度" ' + (b.item === "粗糙度" ? "selected" : "") + '>粗糙度</option>' +
        '<option value="倒角" ' + (b.item === "倒角" ? "selected" : "") + '>倒角</option>' +
        '<option value="螺纹" ' + (b.item === "螺纹" ? "selected" : "") + '>螺纹</option>' +
        '</select>' +
        '<input type="text" value="' + escapeHtml(b.item) + '" placeholder="或输入" onchange="CNC_BALLOON_TOOL._updateItem(\'' + b.id + '\',this.value)" style="margin-top:2px;" /></td>');
      items.push('<td><input type="text" value="' + escapeHtml(b.requirement) + '" placeholder="如 Φ10" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'requirement\',this.value)" /></td>');
      items.push('<td><input type="text" value="' + escapeHtml(b.upperTol) + '" placeholder="+0.02" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'upperTol\',this.value)" /></td>');
      items.push('<td><input type="text" value="' + escapeHtml(b.lowerTol) + '" placeholder="-0.02" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'lowerTol\',this.value)" /></td>');
      items.push('<td><input type="text" value="' + escapeHtml(b.measured) + '" placeholder="实测值" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'measured\',this.value)" /></td>');
      items.push('<td><span class="result-badge ' + resultCls + '">' + b.result + '</span></td>');
      items.push('<td><input type="text" value="' + escapeHtml(b.note) + '" placeholder="备注" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'note\',this.value)" /></td>');
      items.push('<td><button onclick="CNC_BALLOON_TOOL._delete(\'' + b.id + '\')" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:1rem;">×</button></td>');
      items.push('</tr>');
    });

    items.push('</tbody></table>');

    // 手机端卡片
    items.push('<div class="balloon-card-list">');
    state.bubbles.forEach(function(b) {
      var isSelected = b.id === state.selectedId;
      var resultCls = b.result === "合格" ? "pass" : b.result === "超差" ? "fail" : b.result === "复查" ? "review" : "pending";
      items.push('<div class="balloon-card-item' + (isSelected ? ' selected' : '') + '" data-bubble-id="' + b.id + '">');
      items.push('<div class="balloon-card-header"><span class="balloon-card-id">#' + b.id + '</span><span class="result-badge ' + resultCls + '">' + b.result + '</span></div>');
      items.push('<div class="balloon-card-field"><label>项目</label><input type="text" value="' + escapeHtml(b.item) + '" placeholder="检查项目" onchange="CNC_BALLOON_TOOL._updateItem(\'' + b.id + '\',this.value)" /></div>');
      items.push('<div class="balloon-card-field"><label>要求</label><input type="text" value="' + escapeHtml(b.requirement) + '" placeholder="尺寸要求" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'requirement\',this.value)" /></div>');
      items.push('<div class="balloon-card-field"><label>上差</label><input type="text" value="' + escapeHtml(b.upperTol) + '" placeholder="上差" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'upperTol\',this.value)" /></div>');
      items.push('<div class="balloon-card-field"><label>下差</label><input type="text" value="' + escapeHtml(b.lowerTol) + '" placeholder="下差" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'lowerTol\',this.value)" /></div>');
      items.push('<div class="balloon-card-field"><label>实测</label><input type="text" value="' + escapeHtml(b.measured) + '" placeholder="实测值" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'measured\',this.value)" /></div>');
      items.push('<div class="balloon-card-field"><label>备注</label><input type="text" value="' + escapeHtml(b.note) + '" placeholder="备注" onchange="CNC_BALLOON_TOOL._updateField(\'' + b.id + '\',\'note\',this.value)" /></div>');
      items.push('<div style="text-align:right;margin-top:6px;"><button onclick="CNC_BALLOON_TOOL._delete(\'' + b.id + '\')" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:0.85rem;">删除</button></div>');
      items.push('</div>');
    });
    items.push('</div>');

    list.innerHTML = items.join("");

    // 为表格行绑定点击选中
    list.querySelectorAll("tr[data-bubble-id]").forEach(function(tr) {
      tr.addEventListener("click", function() {
        var id = parseInt(this.dataset.bubbleId, 10);
        selectBubble(id);
      });
    });
    // 为卡片绑定点击选中
    list.querySelectorAll(".balloon-card-item[data-bubble-id]").forEach(function(card) {
      card.addEventListener("click", function() {
        var id = parseInt(this.dataset.bubbleId, 10);
        selectBubble(id);
      });
    });
  }

  function autoJudgeResult(bubble) {
    var req = bubble.requirement.trim();
    var upper = balloon.upperTol.trim();
    var lower = balloon.lowerTol.trim();
    var measured = balloon.measured.trim();

    if (!req || !upper || !lower || !measured) return;

    var baseVal = parseFloat(req.replace(/[ΦϕRrMmΦϕ]/g, ""));
    var upperVal = parseFloat(upper.replace(/[+]/g, ""));
    var lowerVal = parseFloat(lower.replace(/[+]/g, ""));
    var measVal = parseFloat(measured);

    if (isNaN(baseVal) || isNaN(upperVal) || isNaN(lowerVal) || isNaN(measVal)) return;

    var maxVal = baseVal + upperVal;
    var minVal = baseVal + lowerVal;

    if (measVal >= minVal && measVal <= maxVal) {
      balloon.result = "合格";
    } else {
      balloon.result = "超差";
    }
  }

  function exportAnnotatedImage() {
    if (!state.image) { alert("请先上传图纸"); return; }
    var canvas = document.createElement("canvas");
    var img = new Image();
    img.onload = function() {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      state.bubbles.forEach(function(b) {
        var cx = b.x * img.naturalWidth;
        var cy = b.y * img.naturalHeight;
        var r = 18;
        var isSel = b.id === state.selectedId;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "#1a73e8" : "rgba(255,255,255,0.9)";
        ctx.fill();
        ctx.strokeStyle = isSel ? "#1a73e8" : "#1a73e8";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = isSel ? "#fff" : "#1a73e8";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.id.toString(), cx, cy);
      });

      canvas.toBlob(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "cnc-balloon-drawing.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = state.image;
  }

  function exportInspectionCsv() {
    if (!state.bubbles.length) { alert("请先添加气泡"); return; }
    var BOM = "\uFEFF";
    var rows = ["序号,检查项目,尺寸要求,上差,下差,实测值,结果,备注"];
    state.bubbles.forEach(function(b) {
      rows.push([b.id, b.item, b.requirement, b.upperTol, b.lowerTol, b.measured, b.result, b.note].join(","));
    });
    var csv = BOM + rows.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "cnc-inspection-table.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveDraft() {
    try {
      var data = JSON.stringify({
        image: state.image,
        imageName: state.imageName,
        imageWidth: state.imageWidth,
        imageHeight: state.imageHeight,
        bubbles: state.bubbles,
        selectedId: state.selectedId,
        nextId: state.nextId,
        mode: state.mode,
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem("cnc_balloon_draft", data);
      alert("草稿已保存");
    } catch(e) {
      alert("保存失败：" + e.message);
    }
  }

  function loadDraft() {
    try {
      var data = localStorage.getItem("cnc_balloon_draft");
      if (!data) { alert("没有找到草稿"); return; }
      var saved = JSON.parse(data);
      state.image = saved.image || null;
      state.imageName = saved.imageName || "";
      state.imageWidth = saved.imageWidth || 0;
      state.imageHeight = saved.imageHeight || 0;
      state.bubbles = saved.bubbles || [];
      state.selectedId = saved.selectedId || null;
      state.nextId = saved.nextId || 1;
      state.mode = saved.mode || "select";
      renderCanvas();
      renderBubbleList();
      updateModeButtons();
      alert("草稿已加载");
    } catch(e) {
      alert("读取失败：" + e.message);
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem("cnc_balloon_draft");
      state.image = null;
      state.imageName = "";
      state.imageWidth = 0;
      state.imageHeight = 0;
      state.bubbles = [];
      state.selectedId = null;
      state.nextId = 1;
      state.mode = "select";
      renderCanvas();
      renderBubbleList();
      updateModeButtons();
      alert("草稿已清除");
    } catch(e) {
      alert("清除失败：" + e.message);
    }
  }

  function loadExample() {
    state.image = null;
    state.imageName = "";
    state.imageWidth = 0;
    state.imageHeight = 0;
    state.bubbles = [
      { id: 1, x: 0.3, y: 0.4, item: "孔径", requirement: "Φ10", upperTol: "+0.02", lowerTol: "0", measured: "", result: "未检", note: "" },
      { id: 2, x: 0.6, y: 0.3, item: "外形尺寸", requirement: "80", upperTol: "+0.02", lowerTol: "-0.02", measured: "", result: "未检", note: "" },
      { id: 3, x: 0.5, y: 0.7, item: "槽宽", requirement: "12", upperTol: "+0.03", lowerTol: "0", measured: "", result: "未检", note: "" },
      { id: 4, x: 0.4, y: 0.6, item: "深度", requirement: "5", upperTol: "+0.01", lowerTol: "-0.01", measured: "", result: "未检", note: "" }
    ];
    state.selectedId = null;
    state.nextId = 5;
    renderCanvas();
    renderBubbleList();
    updateModeButtons();
  }

  function clearAll() {
    state.bubbles = [];
    state.selectedId = null;
    state.nextId = 1;
    renderCanvas();
    renderBubbleList();
  }

  function updateModeButtons() {
    var addBtn = document.getElementById("balloon-mode-add");
    var selBtn = document.getElementById("balloon-mode-select");
    if (addBtn) addBtn.classList.toggle("active", state.mode === "add");
    if (selBtn) selBtn.classList.toggle("active", state.mode === "select");
    var canvas = document.getElementById("balloon-canvas");
    if (canvas) {
      canvas.style.cursor = state.mode === "add" ? "crosshair" : "default";
    }
  }

  function init() {
    if (state._initialized) return;
    state._initialized = true;

    // 支持多个可能的上传 input ID
    var uploadInput = document.getElementById("balloon-upload") || document.getElementById("balloon-file-input");
    if (uploadInput) {
      uploadInput.addEventListener("change", function(e) {
        var file = e.target.files[0];
        if (file) handleImageUpload(file);
      });
    }

    // 让上传区域可点击
    var uploadArea = document.getElementById("balloon-upload-area");
    if (uploadArea && uploadInput) {
      uploadArea.addEventListener("click", function() {
        uploadInput.click();
      });
    }

    var canvas = document.getElementById("balloon-canvas");
    if (canvas) {
      canvas.addEventListener("click", function(e) {
        if (state.mode !== "add" || !state.image) return;
        var rect = canvas.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width;
        var relY = (e.clientY - rect.top) / rect.height;
        if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
          addBubble(relX, relY);
        }
      });

      var dragId = null;
      canvas.addEventListener("mousedown", function(e) {
        if (state.mode !== "select") return;
        var target = e.target.closest("[data-bubble-id]");
        if (target) {
          dragId = parseInt(target.dataset.bubbleId, 10);
          selectBubble(dragId);
          e.preventDefault();
        }
      });
      document.addEventListener("mousemove", function(e) {
        if (dragId === null) return;
        var rect = canvas.getBoundingClientRect();
        var relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        var relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        var bubble = state.bubbles.find(function(b) { return b.id === dragId; });
        if (bubble) {
          bubble.x = relX;
          bubble.y = relY;
          renderCanvas();
        }
      });
      document.addEventListener("mouseup", function() { dragId = null; });

      canvas.addEventListener("touchstart", function(e) {
        if (state.mode === "add" && state.image) {
          var touch = e.touches[0];
          var rect = canvas.getBoundingClientRect();
          var relX = (touch.clientX - rect.left) / rect.width;
          var relY = (touch.clientY - rect.top) / rect.height;
          if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
            addBubble(relX, relY);
            e.preventDefault();
          }
        }
        if (state.mode === "select") {
          var target = e.target.closest("[data-bubble-id]");
          if (target) {
            dragId = parseInt(target.dataset.bubbleId, 10);
            selectBubble(dragId);
            e.preventDefault();
          }
        }
      }, { passive: false });
      canvas.addEventListener("touchmove", function(e) {
        if (dragId === null) return;
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        var relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
        var bubble = state.bubbles.find(function(b) { return b.id === dragId; });
        if (bubble) {
          bubble.x = relX;
          bubble.y = relY;
          renderCanvas();
        }
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener("touchend", function() { dragId = null; });
    }
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&").replace(/"/g, """).replace(/</g, "<").replace(/>/g, ">");
  }

  return {
    init: init,
    handleImageUpload: handleImageUpload,
    setMode: function(m) { state.mode = m; updateModeButtons(); },
    deleteSelected: deleteSelected,
    renumberBubbles: renumberBubbles,
    exportAnnotatedImage: exportAnnotatedImage,
    exportInspectionCsv: exportInspectionCsv,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    loadExample: loadExample,
    clearAll: clearAll,
    _updateField: function(id, field, val) {
      updateBubble(parseInt(id, 10), (function(o){ o[field]=val; return o; })({}));
    },
    _updateItem: function(id, val) {
      updateBubble(parseInt(id, 10), { item: val });
    },
    _delete: function(id) {
      if (confirm("确定删除这个气泡？")) deleteBubble(parseInt(id, 10));
    }
  };
})();

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.CNC_BALLOON_TOOL && typeof window.CNC_BALLOON_TOOL.init === 'function') {
      window.CNC_BALLOON_TOOL.init();
    }
  });
} else {
  if (window.CNC_BALLOON_TOOL && typeof window.CNC_BALLOON_TOOL.init === 'function') {
    window.CNC_BALLOON_TOOL.init();
  }
}
