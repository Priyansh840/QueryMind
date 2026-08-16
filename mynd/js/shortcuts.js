/**
 * MYND — Keyboard Shortcuts & Global Command Dispatcher
 * Architecture: Apple + Linear + Arc Browser Paradigm
 * Spacebar / ⌘K Spotlight | ⌘⇧F Focus Mode | ⌘Z Zen Mode | 1-5 Core Nav
 */

class ShortcutsController {
  constructor() {
    this.initGlobalShortcuts();
    this.initSpotlightEvents();
  }

  initGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // Spacebar when not inside an input -> Open Spotlight
      if (e.code === 'Space' && !isInput && !window.store.isSpotlightOpen) {
        e.preventDefault();
        window.store.openSpotlight();
        return;
      }

      // Escape -> Close Modals, Drawers, or Spotlight
      if (e.key === 'Escape') {
        if (window.store.isSpotlightOpen) {
          window.store.closeSpotlight();
        } else if (window.store.isSystemSettingsOpen) {
          window.store.closeSystemSettings();
        } else if (window.store.isAskAiOpen) {
          window.store.closeAskAi();
        } else if (window.store.isFocusMode) {
          window.store.toggleFocusMode();
        } else if (window.store.isZenMode) {
          window.store.toggleZenMode();
        }
        return;
      }

      // Cmd/Ctrl + K or Cmd/Ctrl + / -> Universal Search Spotlight
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
        e.preventDefault();
        window.store.openSpotlight();
        return;
      }

      // Cmd/Ctrl + Shift + F -> Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        window.store.toggleFocusMode();
        return;
      }

      // Cmd/Ctrl + Z (or Cmd+Shift+Z) -> Zen Mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        window.store.toggleZenMode();
        return;
      }

      // 1-5 Fast Navigation (when not typing in an input)
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') window.store.setRoute('home');
        if (e.key === '2') window.store.setRoute('workspace');
        if (e.key === '3') window.store.setRoute('intelligence');
        if (e.key === '4') window.store.openSpotlight();
        if (e.key === '5') window.store.openSystemSettings();
      }
    });
  }

  initSpotlightEvents() {
    const input = document.getElementById('spotlightInput');
    const resultsContainer = document.getElementById('spotlightResultsList');
    const overlay = document.getElementById('spotlightOverlay');

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          window.store.closeSpotlight();
        }
      });
    }

    if (input) {
      input.addEventListener('input', (e) => {
        this.renderSpotlightResults(e.target.value);
      });

      input.addEventListener('keydown', (e) => {
        const items = resultsContainer ? resultsContainer.querySelectorAll('.spotlight-item') : [];
        if (!items.length) return;

        let currentIndex = Array.from(items).findIndex(el => el.classList.contains('highlighted'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            items.forEach(i => i.classList.remove('highlighted'));
            items[currentIndex + 1].classList.add('highlighted');
            items[currentIndex + 1].scrollIntoView({ block: 'nearest' });
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentIndex > 0) {
            items.forEach(i => i.classList.remove('highlighted'));
            items[currentIndex - 1].classList.add('highlighted');
            items[currentIndex - 1].scrollIntoView({ block: 'nearest' });
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = items[currentIndex] || items[0];
          if (target) target.click();
        }
      });
    }
  }

  renderSpotlightResults(query = '') {
    const container = document.getElementById('spotlightResultsList');
    if (!container) return;

    const q = query.toLowerCase().trim();
    const results = [];

    // System commands
    const commands = [
      { title: '> Toggle Zen Mode (Night Writing)', action: () => window.store.toggleZenMode(), meta: 'Command · ⌘⇧Z' },
      { title: '> Toggle Focus Mode', action: () => window.store.toggleFocusMode(), meta: 'Command · ⌘⇧F' },
      { title: '> Toggle Split Panels (Arc Mode)', action: () => window.store.toggleSplitView(), meta: 'Command · Arc' },
      { title: '> Toggle Infinite Canvas', action: () => window.store.toggleCanvasMode(), meta: 'Command · Spatial' },
      { title: '> Open System Preferences', action: () => window.store.openSystemSettings('general'), meta: 'Settings' }
    ];

    commands.forEach(cmd => {
      if (!q || cmd.title.toLowerCase().includes(q) || cmd.meta.toLowerCase().includes(q)) {
        results.push({
          title: cmd.title,
          sub: cmd.meta,
          onClick: () => {
            cmd.action();
            window.store.closeSpotlight();
          }
        });
      }
    });

    // Search across all 6 spaces and knowledge objects
    window.store.spaces.forEach(space => {
      if (!q || space.name.toLowerCase().includes(q) || space.desc.toLowerCase().includes(q)) {
        results.push({
          title: `Space: ${space.name}`,
          sub: `${space.count} Objects · ${space.desc}`,
          onClick: () => {
            window.store.selectSpace(space.id);
            window.store.closeSpotlight();
          }
        });
      }

      if (space.sections && space.sections.knowledge) {
        space.sections.knowledge.forEach(obj => {
          if (!q || obj.title.toLowerCase().includes(q) || obj.summary.toLowerCase().includes(q) || obj.tags.some(t => t.toLowerCase().includes(q))) {
            results.push({
              title: obj.title,
              sub: `${space.name} Space · ${obj.type} · ${obj.version}`,
              onClick: () => {
                window.store.openObjectPanel(obj, space.id);
                window.store.closeSpotlight();
              }
            });
          }
        });
      }
    });

    if (!results.length) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: var(--text-small);">
          No matching objects or commands. Press Enter to capture as note.
        </div>
      `;
      return;
    }

    container.innerHTML = results.slice(0, 8).map((r, idx) => `
      <div class="spotlight-item ${idx === 0 ? 'highlighted' : ''}" data-idx="${idx}">
        <div class="spotlight-item-title">${r.title}</div>
        <div class="spotlight-item-sub">${r.sub}</div>
      </div>
    `).join('');

    container.querySelectorAll('.spotlight-item').forEach((el, i) => {
      el.addEventListener('click', () => results[i].onClick());
    });
  }
}

window.ShortcutsController = ShortcutsController;
