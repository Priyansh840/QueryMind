/**
 * MYND — Search View Renderer
 * Full search results page with filter bar, top results, and other results.
 */
window.MyndPages = window.MyndPages || {};

window.MyndPages.renderSearch = function renderSearch(container) {
  container.innerHTML = `
    <div class="search-view-container stagger">
      <div class="search-filter-bar">
        <div class="search-tabs">
          <button class="search-tab active">All <span class="tab-badge">24</span></button>
          <button class="search-tab">Objects <span class="tab-badge">12</span></button>
          <button class="search-tab">Notes <span class="tab-badge">6</span></button>
          <button class="search-tab">People <span class="tab-badge">2</span></button>
          <button class="search-tab">Spaces <span class="tab-badge">3</span></button>
          <button class="search-tab">Tags <span class="tab-badge">1</span></button>
        </div>
        <button class="search-filter-btn"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Filters</button>
      </div>

      <div class="search-section">
        <h2 class="search-section-title">Top Results</h2>
        <div class="search-results-box">
          <div class="search-result-item" onclick="window.store.openObjectPanel({ id: 'obj-car-1', title: 'Resume 2026', type: 'Document', version: 'v2.4' }, 'career')">
            <div class="sr-icon" style="color: var(--accent-purple); background: #F5F3FF;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume 2026</span><span class="sr-badge">PDF</span></div><div class="sr-meta">PDF Document • Updated 2h ago</div><div class="sr-breadcrumbs"><span class="sr-crumb">Career</span><span class="sr-crumb">Job Application</span></div></div>
            <div class="sr-snippet">Your resume is optimized for software engineering roles with a strong focus on system design...</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
          <div class="search-result-item">
            <div class="sr-icon" style="color: #10B981; background: #ECFDF5;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume 2026 – Notes</span><span class="sr-badge">Note</span></div><div class="sr-meta">Updated 3h ago</div><div class="sr-breadcrumbs"><span class="sr-crumb">Career</span></div></div>
            <div class="sr-snippet" style="flex-direction: column; align-items: flex-start; gap: 4px;"><div>Key changes for 2026 version:</div><div style="color: var(--text-tertiary);">- Added systems architecture experience...</div><div style="color: var(--text-tertiary);">- Updated project metrics...</div></div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
          <div class="search-result-item">
            <div class="sr-icon" style="color: #3B82F6; background: #EFF6FF;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume Assets</span><span class="sr-badge">Folder</span></div><div class="sr-meta">12 items • Updated yesterday</div><div class="sr-breadcrumbs"><span class="sr-crumb">Career</span></div></div>
            <div class="sr-snippet">Contains all assets, docs and media used in Resume 2026</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
          <div class="search-result-item" style="border-bottom: none;">
            <div class="sr-icon" style="color: #EF4444; background: #FEF2F2;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Google Interview Prep – Resume Review</span><span class="sr-badge">Event</span></div><div class="sr-meta">Event • Tomorrow, 10:00 AM</div><div class="sr-breadcrumbs"><span class="sr-crumb">Career</span></div></div>
            <div class="sr-snippet">Review and finalize Resume 2026 before the interview.</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
        </div>
      </div>

      <div class="search-section" style="margin-top: var(--s-32);">
        <h2 class="search-section-title">Other Results</h2>
        <div class="search-results-box">
          <div class="search-result-item">
            <div class="sr-icon" style="color: #3B82F6; background: #EFF6FF;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume Templates</span></div></div>
            <div class="sr-snippet" style="color: var(--text-tertiary); justify-content: flex-end;">Career / Resources</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
          <div class="search-result-item">
            <div class="sr-icon" style="color: var(--accent-purple); background: #F5F3FF;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume 2026 v1.3</span></div><div class="sr-meta">PDF Document • Updated 1 week ago</div></div>
            <div class="sr-snippet" style="color: var(--text-tertiary); justify-content: flex-end;">Career / Archives</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
          <div class="search-result-item" style="border-bottom: none;">
            <div class="sr-icon" style="color: #10B981; background: #ECFDF5;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="sr-main"><div class="sr-title-row"><span class="sr-title">Resume Bullet Points</span></div><div class="sr-meta">Note • Updated 2 weeks ago</div></div>
            <div class="sr-snippet" style="color: var(--text-tertiary); justify-content: flex-end;">Career / Notes</div>
            <button class="sr-options"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
          </div>
        </div>
      </div>

      <div class="search-footer">Press <span class="kbd-sm">↑</span> <span class="kbd-sm">↓</span> to navigate &nbsp;•&nbsp; <span class="kbd-sm">Enter</span> to open</div>
    </div>
  `;
};
