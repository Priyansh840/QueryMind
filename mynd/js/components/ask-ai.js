/**
 * MYND — Ask AI Drawer Component
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderAskAi = function renderAskAi() {
  const store = window.store;
  const drawer = document.getElementById('askAiDrawer');
  if (!drawer) return;

  if (store.isAskAiOpen) {
    drawer.classList.add('open');
    const tag = document.getElementById('askAiTargetTag');
    if (tag) tag.textContent = `Context: ${store.askAiTarget || 'Active Environment'}`;
    const stream = document.getElementById('askAiStreamContent');
    if (stream && stream.children.length === 0) {
      stream.innerHTML = '';
      const msg = document.createElement('div');
      msg.style.cssText = 'font-size: 13px; color: var(--text-secondary); line-height: 1.6;';
      msg.textContent = `Ready to analyze ${store.askAiTarget || 'your knowledge base'}. Ask anything.`;
      stream.appendChild(msg);
    }
  } else {
    drawer.classList.remove('open');
  }
};
