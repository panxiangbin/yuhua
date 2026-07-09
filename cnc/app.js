if (view === "balloon") {
    // 确保气泡标注工具在切换到该视图时重新初始化事件监听
    setTimeout(function() {
      if (window.CNC_BALLOON_TOOL && typeof window.CNC_BALLOON_TOOL.init === "function") {
        window.CNC_BALLOON_TOOL.init();
      }
    }, 50);
  }