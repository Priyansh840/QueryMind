/**
 * MYND — Settings Modal Component
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderSettings = function renderSettings() {
  const store = window.store;
  const modal = document.getElementById('systemSettingsModal');
  if (!modal) return;

  if (store.isSystemSettingsOpen) {
    modal.classList.add('open');
    window.MyndComponents.renderSettingsTab(store.activeSettingsTab);
  } else {
    modal.classList.remove('open');
  }
};

window.MyndComponents.renderSettingsTab = function renderSettingsTab(tab) {
  tab = tab || 'general';
  const store = window.store;
  const content = document.getElementById('systemSettingsContent');
  if (!content) return;

  // Update active tab
  document.querySelectorAll('.settings-tab').forEach(t => {
    t.classList.toggle('active', t.textContent.toLowerCase() === tab);
  });

  if (tab === 'general') {
    content.innerHTML = `
      <div class="settings-row"><div><div class="settings-row-label">Name</div><div class="settings-row-sub">${store.userProfile.name}</div></div></div>
      <div class="settings-row"><div><div class="settings-row-label">Email</div><div class="settings-row-sub">${store.userProfile.email}</div></div><span class="badge badge-active">Synced</span></div>
    `;
  } else if (tab === 'appearance') {
    content.innerHTML = `
      <div class="settings-row"><div><div class="settings-row-label">Theme</div><div class="settings-row-sub">Monochrome · ${store.theme}</div></div><button class="btn btn-secondary btn-sm" onclick="window.store.toggleTheme()">Toggle</button></div>
      <div class="settings-row"><div><div class="settings-row-label">Zen Mode</div><div class="settings-row-sub">Night writing · Pure black</div></div><button class="btn btn-secondary btn-sm" onclick="window.store.toggleZenMode()">Toggle</button></div>
    `;
  } else if (tab === 'autonomy') {
    content.innerHTML = `
      <div class="settings-row"><div><div class="settings-row-label">Memory Consolidation</div><div class="settings-row-sub">Zero-prompt synthesis</div></div><span class="badge badge-active">Active</span></div>
      <div class="settings-row"><div><div class="settings-row-label">Synthesis Radar</div><div class="settings-row-sub">Cross-domain connections</div></div><span class="badge badge-active">Active</span></div>
    `;
  } else if (tab === 'storage') {
    content.innerHTML = `
      <div class="settings-row"><div><div class="settings-row-label">Usage</div><div class="settings-row-sub">${store.settings.storage.used} of ${store.settings.storage.total}</div></div></div>
    `;
  } else if (tab === 'integrations') {
    content.innerHTML = store.settings.integrations.map(ig => `
      <div class="settings-row"><div><div class="settings-row-label">${ig.name}</div><div class="settings-row-sub">Sync: ${ig.sync}</div></div><span class="badge badge-active">${ig.status}</span></div>
    `).join('');
  }
};
