/**
 * MYND — Context Panel Component (Right side)
 * Displays active object metadata, AI summary, key highlights, connections, and AI suggestions.
 * Dynamically renders course details for the Learning space.
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderContextPanel = function renderContextPanel() {
  const panel = document.getElementById('contextPanelContent');
  if (!panel) return;

  const store = window.store;
  const isLearning = store.activeSpaceId === 'learning';
  const learningSpace = isLearning ? store.spaces.find(s => s.id === 'learning') : null;
  const course = learningSpace && learningSpace.courses ? learningSpace.courses[0] : null;

  if (isLearning && course) {
    panel.innerHTML = `
      <div class="context-header">
        <div class="context-header-left">
          <span class="context-header-icon" style="color: #7C3AED;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </span>
          <span class="context-header-title">${course.title}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="context-action-btn" title="More Options" style="font-size: 18px; line-height: 1;">···</button>
          <button class="context-action-btn" title="Close Panel" onclick="window.store.closeSpace()" style="font-size: 14px;">✕</button>
        </div>
      </div>
      <div class="context-header-meta">Course &nbsp;•&nbsp; Updated 2h ago</div>

      <div class="context-tabs-row">
        <span class="context-tab active">Summary</span>
        <span class="context-tab">Contents</span>
        <span class="context-tab">Notes</span>
        <span class="context-tab">Resources</span>
      </div>

      <div class="context-panel-body">
        <div class="context-section">
          <div style="background: #F5F3FF; border: 1px solid #EDE9FE; border-radius: var(--r-md); padding: 12px 14px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="color: #7C3AED; flex-shrink: 0; margin-top: 2px;">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path>
              </svg>
            </span>
            <span style="font-size: var(--t-small); color: #4C1D95; line-height: 1.45;">Learn how to design scalable systems and make the right architectural decisions.</span>
          </div>
        </div>

        <div class="context-section">
          <div class="context-course-meta-grid">
            <div class="context-course-meta-row">
              <span class="context-course-meta-label">Instructor</span>
              <span class="context-course-meta-val">${course.instructor}</span>
            </div>
            <div class="context-course-meta-row">
              <span class="context-course-meta-label">Progress</span>
              <span class="context-course-meta-val">
                <span class="context-course-progress-bar"><span class="context-course-progress-fill" style="width: ${course.progress}%;"></span></span>
                ${course.progress}%
              </span>
            </div>
            <div class="context-course-meta-row">
              <span class="context-course-meta-label">Lessons</span>
              <span class="context-course-meta-val">${course.lessonsCompleted} / ${course.totalLessons}</span>
            </div>
            <div class="context-course-meta-row">
              <span class="context-course-meta-label">Time Spent</span>
              <span class="context-course-meta-val">${course.timeSpent}</span>
            </div>
            <div class="context-course-meta-row">
              <span class="context-course-meta-label">Last Accessed</span>
              <span class="context-course-meta-val">${course.lastAccessed}</span>
            </div>
          </div>
        </div>

        ${course.whatYouWillLearn ? `
          <div class="context-section">
            <span class="nav-group-label" style="padding-left:0; font-size: var(--t-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); font-weight: var(--w-bold);">WHAT YOU WILL LEARN</span>
            <div style="margin-top: var(--s-10); display: flex; flex-direction: column; gap: var(--s-8);">
              ${course.whatYouWillLearn.map(item => `
                <div style="display: flex; align-items: center; gap: var(--s-8); font-size: var(--t-small); color: var(--text-primary); font-weight: var(--w-medium);">
                  <span style="color: #7C3AED; display: flex; align-items: center;">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>
                  </span>
                  <span>${item}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${course.resources ? `
          <div class="context-section">
            <span class="nav-group-label" style="padding-left:0; font-size: var(--t-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); font-weight: var(--w-bold);">RESOURCES</span>
            <div style="margin-top: var(--s-10); display: flex; flex-direction: column; gap: 2px;">
              ${course.resources.map(r => `
                <div class="context-resource-row">
                  <div class="context-resource-left">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="#7C3AED" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>${r.title}</span>
                  </div>
                  <span class="context-resource-type">${r.type}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <button class="context-open-course-btn" onclick="window.store.openAskAi('${course.title}')">
          <span>Open Course</span>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;
  } else {
    // Default context panel (Resume 2026)
    panel.innerHTML = `
      <div class="context-header">
        <div class="context-header-left">
          <span class="context-header-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </span>
          <span class="context-header-title">Resume 2026</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="context-action-btn" title="More Options" style="font-size: 18px; line-height: 1;">···</button>
          <button class="context-action-btn" title="Close Panel" onclick="window.store.closeSpace()" style="font-size: 14px;">✕</button>
        </div>
      </div>
      <div class="context-header-meta">PDF Document &nbsp;•&nbsp; Updated 2h ago</div>

      <div class="context-tabs-row">
        <span class="context-tab active">Summary</span>
        <span class="context-tab" onclick="window.store.openAskAi('Connections')">Connections</span>
        <span class="context-tab">Timeline</span>
        <span class="context-tab">AI</span>
      </div>

      <div class="context-panel-body">
        <div class="context-section">
          <p class="context-summary-paragraph" style="color: var(--text-secondary); font-size: var(--t-small); line-height: 1.55;">
            Your resume is optimized for software engineering roles with a strong focus on system design, backend development and problem solving.
          </p>
        </div>

        <div class="context-section">
          <span class="nav-group-label" style="padding-left:0; font-size: var(--t-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); font-weight: var(--w-bold);">KEY HIGHLIGHTS</span>
          <div class="context-highlights-section" style="margin-top: var(--s-10); display: flex; flex-direction: column; gap: var(--s-8);">
            ${['3 Major Projects', 'Backend Development', 'System Design', 'Problem Solving'].map(h => `
              <div class="context-highlight-item" style="display: flex; align-items: center; gap: var(--s-8); font-size: var(--t-small); color: var(--text-primary); font-weight: var(--w-medium);">
                <span class="context-highlight-check" style="color: #10B981; display: flex; align-items: center;">
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>
                </span>
                <span>${h}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="context-section">
          <span class="nav-group-label" style="padding-left:0; font-size: var(--t-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); font-weight: var(--w-bold);">CONNECTED TO</span>
          <div class="context-pills-wrap" style="margin-top: var(--s-10); display: flex; flex-wrap: wrap; gap: var(--s-8);">
            <button class="context-pill-btn" onclick="window.store.selectSpace('career')">Projects (3)</button>
            <button class="context-pill-btn" onclick="window.store.openObjectPanel({id:'obj-car-2', title:'System Design Notes', type:'Document'}, 'career')">System Design Notes</button>
            <button class="context-pill-btn" onclick="window.store.openObjectPanel({id:'obj-car-3', title:'Google Interview Prep', type:'Meeting'}, 'career')">Google Interview Prep</button>
          </div>
        </div>

        <div class="context-section">
          <span class="nav-group-label" style="padding-left:0; font-size: var(--t-micro); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); font-weight: var(--w-bold);">AI SUGGESTIONS</span>
          <div class="ai-suggestions-container" style="margin-top: var(--s-10); display: flex; flex-direction: column; gap: var(--s-10);">
            <div class="ai-suggestion-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--r-md); gap: 10px;">
              <div class="ai-suggestion-left" style="display: flex; align-items: center; gap: 10px;">
                <span class="ai-suggestion-icon trend" style="color: #10B981; display: flex; align-items: center;">
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                </span>
                <span class="ai-suggestion-text" style="font-size: var(--t-caption); color: var(--text-secondary); line-height: 1.4;">Add more quantifiable impact in Project Alpha.</span>
              </div>
              <button class="ai-suggestion-action-btn" onclick="window.store.openAskAi('Project Alpha impact')" style="background: var(--bg); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: var(--t-micro); font-weight: var(--w-semi); color: var(--text-primary); cursor: pointer;">Apply</button>
            </div>
            <div class="ai-suggestion-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--r-md); gap: 10px;">
              <div class="ai-suggestion-left" style="display: flex; align-items: center; gap: 10px;">
                <span class="ai-suggestion-icon lightbulb" style="color: #F59E0B; display: flex; align-items: center;">
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 21h6"></path><path d="M9 17h6"></path><path d="M12 2a7 7 0 0 1 7 7c0 2.3-1.2 4.3-3 5.4V17H8v-2.6c-1.8-1.1-3-3.1-3-5.4a7 7 0 0 1 7-7z"></path></svg>
                </span>
                <span class="ai-suggestion-text" style="font-size: var(--t-caption); color: var(--text-secondary); line-height: 1.4;">Include system design experience in summary.</span>
              </div>
              <button class="ai-suggestion-action-btn" onclick="window.store.openAskAi('System Design Summary inclusion')" style="background: var(--bg); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: var(--t-micro); font-weight: var(--w-semi); color: var(--text-primary); cursor: pointer;">Review</button>
            </div>
          </div>
        </div>

        <div class="context-ask-ai-bar" onclick="window.store.openAskAi('Resume 2026')" style="background: #F5F3FF; border: 1px solid #DDD6FE; color: #6D28D9; border-radius: var(--r-md); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; font-size: var(--t-small); font-weight: var(--w-semi); cursor: pointer; margin-top: var(--s-8);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path>
            </svg>
            <span>Ask AI about this document</span>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
    `;
  }
};
