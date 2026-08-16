/**
 * MYND — Activity / Intelligence Page Renderer
 * Exact pixel-perfect replication of the Activity view mockup.
 */
window.MyndPages = window.MyndPages || {};

window.MyndPages.renderIntelligence = function renderIntelligence(container) {
  const activities = [
    {
      id: 'act-1',
      time: '2h ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
      iconBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      title: 'Resume 2026 updated',
      desc: 'PDF document was updated',
      space: 'Career',
      spaceColor: 'var(--accent-purple)',
      onClick: "window.store.openObjectPanel({ id: 'obj-car-1', title: 'Resume 2026', type: 'Document', version: 'v2.4' }, 'career')"
    },
    {
      id: 'act-2',
      time: '3h ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      title: 'New connection created: Resume ↔ Projects',
      desc: '2 items are now connected',
      space: 'Career',
      spaceColor: 'var(--accent-purple)',
      onClick: "window.store.selectSpace('career')"
    },
    {
      id: 'act-3',
      time: '5h ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      title: 'System Design Notes added',
      desc: 'New notes added to System Design Notes',
      space: 'Research',
      spaceColor: '#10B981',
      onClick: "window.store.openObjectPanel({ id: 'obj-car-2', title: 'System Design Notes', type: 'Document' }, 'research')"
    },
    {
      id: 'act-4',
      time: 'Yesterday',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      title: 'Kalyra Engine commit pushed (7 commits)',
      desc: 'Changes pushed to main branch',
      space: 'Startup',
      spaceColor: 'var(--color-projects)',
      onClick: "window.store.selectSpace('startup')"
    },
    {
      id: 'act-5',
      time: 'Yesterday',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
      iconBg: '#FEF2F2',
      iconColor: '#EF4444',
      title: 'Google Interview Prep – Review scheduled',
      desc: 'Tomorrow at 10:00 AM',
      space: 'Career',
      spaceColor: 'var(--accent-purple)',
      onClick: "window.store.openObjectPanel({ id: 'obj-car-3', title: 'Google Interview Prep', type: 'Meeting' }, 'career')"
    },
    {
      id: 'act-6',
      time: '2 days ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      title: 'Interview Prep – Notes updated',
      desc: 'Notes were updated',
      space: 'Career',
      spaceColor: 'var(--accent-purple)',
      onClick: "window.store.openObjectPanel({ id: 'obj-car-3', title: 'Interview Prep Notes', type: 'Meeting' }, 'career')"
    },
    {
      id: 'act-7',
      time: '2 days ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      iconBg: '#F0FDFA',
      iconColor: '#06B6D4',
      title: 'You added a new note',
      desc: 'In Technical Screen — Key Concepts',
      space: 'Career',
      spaceColor: 'var(--accent-purple)',
      onClick: "window.store.selectSpace('career')"
    },
    {
      id: 'act-8',
      time: '3 days ago',
      icon: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
      iconBg: '#FFF7ED',
      iconColor: '#F97316',
      title: 'Portfolio Website assets added',
      desc: '9 files added',
      space: 'Startup',
      spaceColor: 'var(--color-projects)',
      onClick: "window.store.selectSpace('startup')"
    }
  ];

  container.innerHTML = `
    <div class="activity-page-view stagger">
      
      <!-- Top Title & Subtitle -->
      <div class="activity-page-header">
        <h1 class="activity-main-title">Activity</h1>
        <p class="activity-main-subtitle">Track what's new and important across your workspace.</p>
      </div>

      <!-- Filter Controls Bar -->
      <div class="activity-filter-bar">
        <div class="activity-filters-left">
          <button class="activity-pill-btn">
            <span>All Activity</span>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="activity-pill-btn">
            <span>All Spaces</span>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="activity-pill-btn">
            <span>All Types</span>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="activity-pill-btn">
            <span>Date</span>
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </button>
        </div>

        <button class="activity-pill-btn activity-filter-trigger">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span>Filters</span>
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>

      <!-- Activity Section Heading -->
      <div class="activity-group-heading">Today</div>

      <!-- Vertical Timeline Feed -->
      <div class="activity-timeline-feed">
        <!-- Connecting vertical line -->
        <div class="activity-vertical-track"></div>

        ${activities.map(item => `
          <div class="activity-feed-row">
            <!-- Left Timestamp -->
            <div class="activity-row-time">${item.time}</div>

            <!-- Center Timeline Dot -->
            <div class="activity-row-dot-wrap">
              <div class="activity-row-dot"></div>
            </div>

            <!-- Right Activity Card -->
            <div class="activity-row-card" ${item.onClick ? `onclick="${item.onClick}"` : ''}>
              <div class="activity-card-left">
                <div class="activity-card-icon" style="background: ${item.iconBg}; color: ${item.iconColor};">
                  ${item.icon}
                </div>
                <div class="activity-card-texts">
                  <div class="activity-card-title">${item.title}</div>
                  <div class="activity-card-desc">${item.desc}</div>
                </div>
              </div>

              <div class="activity-card-right">
                <div class="activity-space-tag">
                  <span class="activity-space-dot" style="background: ${item.spaceColor};"></span>
                  <span class="activity-space-name">${item.space}</span>
                </div>
                <button class="activity-card-options-btn" title="More options" onclick="event.stopPropagation()">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Bottom Load More -->
      <div class="activity-load-more-wrap">
        <button class="activity-load-more-btn">
          <span>Load more</span>
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>

    </div>
  `;
};
