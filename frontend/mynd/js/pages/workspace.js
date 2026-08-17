/**
 * MYND — Workspace Root Page Renderer
 * Shows all spaces in a card grid with recent activity list.
 */
window.MyndPages = window.MyndPages || {};

window.MyndPages.renderWorkspaceRoot = function renderWorkspaceRoot(container) {
  const store = window.store;

  const spaceMeta = {
    'career': { icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>', color: 'var(--accent-purple)', bg: '#F5F3FF', updates: 8 },
    'research': { icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', color: '#10B981', bg: '#ECFDF5', updates: 12 },

    'personal': { icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>', color: '#14B8A6', bg: '#F0FDFA', updates: 3 },
    'learning': { icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', color: '#7C3AED', bg: '#F5F3FF', updates: 8 }
  };

  container.innerHTML = `
    <div class="workspace-top-bar stagger">
      <div>
        <h1 class="section-title" style="font-size: var(--t-display); font-weight: var(--w-bold); letter-spacing: -0.02em;">Workspace</h1>
        <p style="color: var(--text-secondary); margin-top: var(--s-8);">All your knowledge, organized in connected spaces.</p>
      </div>
      <div class="workspace-controls">
        <div class="view-toggle">
          <button class="view-toggle-btn active"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Cards</button>
          <button class="view-toggle-btn"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> List</button>
        </div>
        <button class="filter-btn"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Filter</button>
      </div>
    </div>

    <div class="spaces-grid stagger" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-16); margin-top: var(--s-32);">
      ${store.spaces.map(s => {
        const meta = spaceMeta[s.id] || spaceMeta['career'];
        return `
          <div class="space-card detailed-space-card" onclick="window.store.selectSpace('${s.id}')">
            <div class="space-card-header">
              <div class="space-card-icon-circle" style="background: ${meta.bg}; color: ${meta.color};">${meta.icon}</div>
              <div>
                <div class="space-card-name" style="font-size: var(--t-h3); font-weight: var(--w-semi); color: var(--text-primary);">${s.name}</div>
                <div class="space-card-count" style="font-size: var(--t-caption); color: var(--text-tertiary); margin-top: 2px;">${s.count} objects</div>
              </div>
            </div>
            <div class="space-card-desc" style="font-size: var(--t-small); color: var(--text-secondary); line-height: var(--lh-snug); margin-top: var(--s-16); flex: 1;">${s.desc}</div>
            <div class="space-card-footer" style="margin-top: var(--s-16); text-align: right; font-size: var(--t-micro); color: var(--text-tertiary);">${meta.updates} updates</div>
          </div>`;
      }).join('')}
      <div class="space-card detailed-space-card" onclick="window.store.openSystemSettings('integrations')" style="border: 1px dashed var(--border-strong); background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-8); min-height: 140px; cursor: pointer; opacity: 0.8; transition: all 180ms var(--ease);">
        <div class="space-card-icon-circle" style="background: var(--surface-hover); color: var(--text-secondary); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div style="font-size: var(--t-body); font-weight: var(--w-semi); color: var(--text-secondary);">Add new space</div>
      </div>
    </div>

    <div class="activity-section stagger" style="margin-top: var(--s-40);">
      <div class="section-label-row" style="margin-bottom: var(--s-12);">
        <span class="section-title-text" style="font-size: var(--t-h3); font-weight: var(--w-bold);">Recent Activity</span>
        <a class="nav-group-add" style="font-size: var(--t-caption); font-weight: var(--w-semi); color: var(--accent); cursor: pointer;" onclick="window.store.setRoute('intelligence')">View all</a>
      </div>
      <div class="vertical-activity-list">
        <div class="vertical-activity-item"><div class="activity-item-left"><div class="vertical-activity-icon" style="color: var(--accent-purple); background: #F5F3FF;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div><span class="vertical-activity-text">Resume 2026 updated</span></div><span class="vertical-activity-meta">2h ago &nbsp;·&nbsp; Career</span></div>
        <div class="vertical-activity-item"><div class="activity-item-left"><div class="vertical-activity-icon" style="color: #10B981; background: #ECFDF5;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div><span class="vertical-activity-text">New connection created: Resume ↔ Projects</span></div><span class="vertical-activity-meta">3h ago &nbsp;·&nbsp; Career</span></div>
        <div class="vertical-activity-item"><div class="activity-item-left"><div class="vertical-activity-icon" style="color: #3B82F6; background: #EFF6FF;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div><span class="vertical-activity-text">Kalyra Engine commit pushed (7 commits)</span></div><span class="vertical-activity-meta">yesterday &nbsp;·&nbsp; Career</span></div>
        <div class="vertical-activity-item"><div class="activity-item-left"><div class="vertical-activity-icon" style="color: #EF4444; background: #FEF2F2;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><span class="vertical-activity-text">Google Interview Prep - Notes updated</span></div><span class="vertical-activity-meta">2d ago &nbsp;·&nbsp; Career</span></div>
      </div>
    </div>
  `;
};
