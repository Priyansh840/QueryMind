/**
 * MYND — Spotlight / Command Palette Component
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderSpotlight = function renderSpotlight() {
  const store = window.store;
  const overlay = document.getElementById('spotlightOverlay');
  if (!overlay) return;

  if (store.isSpotlightOpen) {
    overlay.classList.add('open');
    const input = document.getElementById('spotlightInput');
    if (input) {
      input.value = '';
      input.focus();
      if (window.shortcuts) shortcuts.renderSpotlightResults('');
    }
  } else {
    overlay.classList.remove('open');
  }
};
