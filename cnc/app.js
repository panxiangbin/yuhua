// 事件委托机制修复导航点击无效问题
// 在 bootstrap() 结束后添加下面这段代码

// 事件委托绑定导航（双重保险）
document.addEventListener('click', function(e) {
  const target = e.target.closest('[data-route]');
  if (!target) return;

  const view = target.dataset.route;
  const filter = target.dataset.filter;

  if (view) {
    e.preventDefault();
    console.log('[Event Delegation] 导航到:', view, filter ? `(过滤: ${filter})` : '');
    if (typeof navigate === 'function') {
      navigate(view, filter ? { filter } : {});
    }
  }
}, true);

console.log('[Event Delegation] 导航事件委托已启用');