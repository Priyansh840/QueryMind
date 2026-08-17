/**
 * MYND — Application Coordinator v4
 * Thin orchestration layer that delegates rendering to page and component modules.
 *
 * Architecture:
 *   js/utils/drag.js          — Reusable drag utility
 *   js/utils/map-viewport.js  — Radial knowledge map renderer
 *   js/pages/home.js          — Home page
 *   js/pages/workspace.js     — Workspace root (all spaces grid)
 *   js/pages/space.js         — Individual space + object viewer
 *   js/pages/search.js        — Search results view
 *   js/pages/intelligence.js  — Activity / intelligence stream
 *   js/components/sidebar.js  — Sidebar nav state
 *   js/components/header.js   — Top header bar
 *   js/components/context-panel.js — Right context panel
 *   js/components/spotlight.js — Command palette overlay
 *   js/components/ask-ai.js   — AI drawer
 *   js/components/settings.js — Settings modal
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.store;
  if (!store) return;

  const pages = window.MyndPages;
  const components = window.MyndComponents;

  // ── INITIAL RENDER ──
  render();

  // ── REACTIVE RE-RENDER ──
  store.subscribe(render);

  function render() {
    components.renderSidebar();
    components.renderHeader();
    renderWorkspace();
    components.renderContextPanel();
    components.renderSpotlight();
    components.renderAskAi();
    components.renderSettings();
  }

  // ══════════════════════════════════════════════════════════════
  //  WORKSPACE ROUTER — routes to the correct page renderer
  // ══════════════════════════════════════════════════════════════
  function renderWorkspace() {
    const container = document.getElementById('workspaceContent');
    if (!container) return;

    // Spatial entrance animation
    container.classList.remove('view-enter');
    void container.offsetWidth;
    container.classList.add('view-enter');

    if (store.activeRoute === 'intelligence') {
      pages.renderIntelligence(container);
    } else if (store.activeRoute === 'search') {
      pages.renderSearch(container);
    } else if (store.activeRoute === 'workspace') {
      if (store.viewingObjectPanel) {
        pages.renderObjectViewer(container);
      } else if (store.activeSpaceId) {
        pages.renderSpace(container, store.activeSpaceId);
      } else {
        pages.renderWorkspaceRoot(container);
      }
    } else {
      pages.renderHome(container);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  GLOBAL ACTION LISTENERS
  // ══════════════════════════════════════════════════════════════
  document.getElementById('askAiSubmit')?.addEventListener('click', () => {
    const input = document.getElementById('askAiInput');
    const stream = document.getElementById('askAiStreamContent');
    if (input && input.value.trim() && stream) {
      const userMsg = document.createElement('div');
      userMsg.style.cssText = 'font-size: 13px; padding: 8px 12px; background: var(--surface-subtle); border-radius: 8px; align-self: flex-end; margin-top: 8px; max-width: 80%;';
      userMsg.textContent = input.value;
      stream.appendChild(userMsg);

      const aiMsg = document.createElement('div');
      aiMsg.style.cssText = 'font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-top: 8px; align-self: flex-start; max-width: 90%;';
      aiMsg.textContent = `Analyzing "${input.value}" across your knowledge graph…`;
      stream.appendChild(aiMsg);

      input.value = '';
      stream.scrollTop = stream.scrollHeight;
    }
  });
});
