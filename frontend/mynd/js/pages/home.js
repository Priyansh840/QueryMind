/**
 * MYND — Home Page Renderer
 * Emotional & Clean Mockup Style home view.
 */
window.MyndPages = window.MyndPages || {};

window.MyndPages.renderHome = function renderHome(container) {
  const store = window.store;
  const initMapViewport = window.MyndUtils.initMapViewport;

  container.innerHTML = `
    <div class="greeting-hero-container stagger">
      <div class="greeting-text-block">
        <div class="greeting-time-row">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <span>Good evening, Aryan</span>
        </div>
        <h1 class="greeting-headline">You're in flow</h1>
        <div class="greeting-subtitle" onclick="window.store.selectSpace('career')">Focused on Career &amp; Systems Architecture →</div>
      </div>
      <button class="focus-mode-btn" onclick="window.store.toggleFocusMode()">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>
        <span>Focus Mode</span>
      </button>
    </div>

    <div class="continue-section stagger">
      <div class="section-label-row"><span class="section-title-text">Continue where you left off</span></div>
      <div class="continue-cards-grid">
        <div class="continue-card" data-type="document" onclick="window.store.openObjectPanel({ id: 'obj-car-1', title: 'Resume 2026', type: 'Document', version: 'v2.4' }, 'career')">
          <div class="continue-card-top">
            <div class="continue-card-icon"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <div class="continue-card-info"><span class="continue-card-title">Resume 2026</span><span class="continue-card-meta">PDF • Updated 2h ago</span></div>
          </div>
          <div class="continue-card-progress-bar"><div class="continue-card-progress-fill" style="width: 95%;"></div><span class="continue-card-progress-pct">95%</span></div>
        </div>
        <div class="continue-card" data-type="notes" onclick="window.store.openObjectPanel({ id: 'obj-car-3', title: 'Google Interview Prep', type: 'Meeting', version: 'v1.2' }, 'career')">
          <div class="continue-card-top">
            <div class="continue-card-icon"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="continue-card-info"><span class="continue-card-title">Google Interview Prep</span><span class="continue-card-meta">Notes • Updated 5h ago</span></div>
          </div>
          <div class="continue-card-progress-bar"><div class="continue-card-progress-fill" style="width: 80%; background: #D97706;"></div><span class="continue-card-progress-pct">80%</span></div>
        </div>
        <div class="continue-card" data-type="code" onclick="window.store.openObjectPanel({ id: 'obj-car-2', title: 'Kalyra Streaming Engine', type: 'Code', version: 'v3.1' }, 'career')">
          <div class="continue-card-top">
            <div class="continue-card-icon"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
            <div class="continue-card-info"><span class="continue-card-title">Kalyra Engine</span><span class="continue-card-meta">Code • Updated yesterday</span></div>
          </div>
          <div class="continue-card-progress-bar"><div class="continue-card-progress-fill" style="width: 72%; background: #059669;"></div><span class="continue-card-progress-pct">72%</span></div>
        </div>
        <div class="new-capture-card" onclick="document.getElementById('mapCaptureInput').focus()"><span class="new-capture-icon">+</span><span style="font-size: var(--t-small); font-weight: var(--w-medium);">New Capture</span></div>
      </div>
    </div>

    <div class="knowledge-map-card stagger">
      <div class="map-header-row">
        <span class="section-title-text">Your Knowledge Map</span>
        <div class="map-controls-group">
          <button class="map-control-btn" title="Zoom In">＋</button>
          <button class="map-control-btn" title="Zoom Out">－</button>
          <button class="map-control-btn" title="Fullscreen" onclick="window.store.toggleCanvasMode()"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg></button>
        </div>
      </div>
      <div class="map-canvas-viewport" id="homeMapViewport"></div>
      <div class="map-capture-capsule">
        <input type="text" class="map-capture-input" id="mapCaptureInput" placeholder="Capture anything...">
        <div class="map-capture-actions-group">
          <button class="map-capture-icon-btn" title="Document"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></button>
          <button class="map-capture-icon-btn" title="Voice"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 1v11a4 4 0 0 0 4-4V5a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 21v-3"></path></svg></button>
          <button class="map-capture-icon-btn" title="Attach Link/File"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
          <button class="map-capture-icon-btn" title="Scan / Expand"><svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path></svg></button>
          <button class="map-capture-submit-circle" id="mapCaptureSubmit" title="Submit Capture"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
        </div>
      </div>
    </div>

    <div class="activity-section stagger">
      <div class="section-label-row">
        <span class="section-title-text">Recent Activity</span>
        <a class="nav-group-add" style="font-size: var(--t-caption); font-weight: var(--w-semi); color: var(--accent);" onclick="window.store.setRoute('intelligence')">View all</a>
      </div>
      <div class="activity-horizontal-timeline">
        <div class="activity-timeline-line"></div>
        <div class="activity-timeline-item"><div class="activity-item-content"><div class="activity-item-icon-wrapper" style="color: var(--accent-purple); background: #F5F3FF;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div><span class="activity-item-text">Resume 2026 updated</span></div><div class="activity-item-node-connector"><div class="activity-item-node-stem"></div><div class="activity-item-node-dot"></div></div><span class="activity-item-subtext">2h ago • Career</span></div>
        <div class="activity-timeline-item"><div class="activity-item-content"><div class="activity-item-icon-wrapper" style="color: var(--color-skills); background: #FEF3C7;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div><span class="activity-item-text">New connection created<br>Resume ↔ Projects</span></div><div class="activity-item-node-connector"><div class="activity-item-node-stem"></div><div class="activity-item-node-dot"></div></div><span class="activity-item-subtext">3h ago • Career</span></div>
        <div class="activity-timeline-item"><div class="activity-item-content"><div class="activity-item-icon-wrapper" style="color: var(--color-resume); background: #ECFDF5;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div><span class="activity-item-text">Google Interview Prep Notes updated</span></div><div class="activity-item-node-connector"><div class="activity-item-node-stem"></div><div class="activity-item-node-dot"></div></div><span class="activity-item-subtext">5h ago • Career</span></div>
        <div class="activity-timeline-item"><div class="activity-item-content"><div class="activity-item-icon-wrapper" style="color: var(--color-projects); background: #EFF6FF;"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><span class="activity-item-text">Kalyra Engine commit pushed: 7 commits</span></div><div class="activity-item-node-connector"><div class="activity-item-node-stem"></div><div class="activity-item-node-dot"></div></div><span class="activity-item-subtext">yesterday • Career</span></div>
      </div>
    </div>
  `;

  setTimeout(() => initMapViewport('homeMapViewport'), 20);

  const mapInput = document.getElementById('mapCaptureInput');
  const mapSubmit = document.getElementById('mapCaptureSubmit');
  if (mapInput && mapSubmit) {
    const handleCap = () => {
      const val = mapInput.value.trim();
      if (val) { store.addCapturedItem(val, 'Text'); mapInput.value = ''; }
    };
    mapSubmit.addEventListener('click', handleCap);
    mapInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCap(); });
  }
};
