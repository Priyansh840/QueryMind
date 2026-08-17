/**
 * MYND — Space View & Object Viewer
 * High-fidelity representation matching Career, Research, and Personal Space design specifications.
 */
window.MyndPages = window.MyndPages || {};

window.MyndPages.renderSpace = function renderSpace(container, spaceId) {
  const store = window.store;
  const initMapViewport = window.MyndUtils.initMapViewport;
  const space = store.spaces.find(s => s.id === spaceId) || store.spaces[0];
  const activeTab = store.activeSpaceTab || 'overview';

  const isPersonal = spaceId === 'personal';
  const isResearch = spaceId === 'research';
  const isCareer = spaceId === 'career';
  const isLearning = spaceId === 'learning';

  // SVG Helper
  function getIconSvg(type, color = 'currentColor') {
    switch (type) {
      case 'user':
      case 'person':
        return `<svg viewBox="0 0 24 24" width="22" height="22" stroke="${color}" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      case 'document':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
      case 'note':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
      case 'folder':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      case 'code':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
      case 'paper':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      case 'experiment':
      case 'flask':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M9 3h6M10 9h4M10 3v6l-4.5 9A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 1.7-3L14 9V3"></path></svg>`;
      case 'book':
      case 'journal':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      case 'topic':
      case 'tag':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
      case 'quote':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>`;
      case 'check-circle':
      case 'habit':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      case 'target':
      case 'goal':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
      case 'leaf':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`;
      case 'zap':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
      case 'edit':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      case 'footsteps':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.5v2"></path><path d="M14 20v-2.38C14 15.5 12.97 14.5 13 12c.03-2.72 1.49-6 4.5-6C19.37 6 20 7.8 20 9.5c0 3.11-2 5.66-2 8.5v2"></path></svg>`;
      case 'calendar':
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
      case 'briefcase':
      default:
        return `<svg viewBox="0 0 24 24" width="16" height="16" stroke="${color}" stroke-width="2" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
    }
  }

  // Personal specific recent items
  const personalRecentObjects = [
    {
      id: 'obj-per-1',
      title: 'Daily Reflection – May 12',
      badge: 'Note',
      meta: 'Grateful for progress today.',
      time: '2h ago',
      iconColor: '#0D9488',
      iconBg: '#F0FDFA',
      iconType: 'note'
    },
    {
      id: 'obj-per-2',
      title: 'Reading List',
      badge: 'Note',
      meta: 'Books to read this year.',
      time: 'Yesterday',
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      iconType: 'note'
    },
    {
      id: 'obj-per-3',
      title: 'Learning Log – Systems Design',
      badge: 'Note',
      meta: 'Resources and key takeaways.',
      time: '2 days ago',
      iconColor: '#8B5CF6',
      iconBg: '#F5F3FF',
      iconType: 'note'
    },
    {
      id: 'obj-per-4',
      title: 'Health Goals',
      badge: 'Note',
      meta: 'Run 100km this month.',
      time: '3 days ago',
      iconColor: '#EC4899',
      iconBg: '#FDF2F8',
      iconType: 'note'
    },
    {
      id: 'obj-per-5',
      title: 'Travel Ideas',
      badge: 'Note',
      meta: 'Places I want to explore.',
      time: '5 days ago',
      iconColor: '#F59E0B',
      iconBg: '#FFFBEB',
      iconType: 'folder'
    }
  ];

  // Research specific recent items
  const researchRecentObjects = [
    {
      id: 'obj-res-1',
      title: 'Multi-agent Systems: A Survey',
      badge: 'Paper',
      meta: 'Leslie Pack Kaelbling et al.',
      time: '2h ago',
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
      iconType: 'paper'
    },
    {
      id: 'obj-res-2',
      title: 'Spatial Memory in LLM Agents',
      badge: 'Document',
      meta: 'My notes',
      time: 'Yesterday',
      iconColor: '#3B82F6',
      iconBg: '#EFF6FF',
      iconType: 'document'
    },
    {
      id: 'obj-res-3',
      title: 'Experiment: Memory Retention Test',
      badge: 'Experiment',
      meta: 'Results & Analysis',
      time: '2 days ago',
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      iconType: 'flask'
    },
    {
      id: 'obj-res-4',
      title: 'Papers to Read – May 2025',
      badge: 'Note',
      meta: 'Curated list',
      time: '3 days ago',
      iconColor: '#8B5CF6',
      iconBg: '#F5F3FF',
      iconType: 'note'
    },
    {
      id: 'obj-res-5',
      title: 'Theorem Synthesis — Reference',
      badge: 'Document',
      meta: 'Definitions and proofs',
      time: '4 days ago',
      iconColor: '#F97316',
      iconBg: '#FFF7ED',
      iconType: 'folder'
    }
  ];

  // Career specific recent items
  const careerRecentObjects = [
    {
      id: 'obj-car-1',
      title: 'Resume 2026',
      badge: 'PDF',
      meta: 'Updated 2h ago',
      category: 'Job Application',
      time: '2h ago',
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      iconType: 'document'
    },
    {
      id: 'obj-car-3',
      title: 'Google Interview Prep - Notes',
      badge: 'Note',
      meta: 'Updated yesterday',
      category: 'Preparation',
      time: '1d ago',
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      iconType: 'note'
    },
    {
      id: 'obj-car-2',
      title: 'Kalvra Engine - Architecture',
      badge: 'Folder',
      meta: '12 items',
      category: 'Project',
      time: '2d ago',
      iconColor: '#3B82F6',
      iconBg: '#EFF6FF',
      iconType: 'folder'
    },
    {
      id: 'obj-car-4',
      title: 'Portfolio Website',
      badge: 'Project',
      meta: 'Next.js, Tailwind, Vercel',
      category: 'Project',
      time: '3d ago',
      iconColor: '#F59E0B',
      iconBg: '#FFFBEB',
      iconType: 'code'
    }
  ];

  const recentObjects = isPersonal ? personalRecentObjects : isResearch ? researchRecentObjects : isCareer ? careerRecentObjects : (space.sections.knowledge || []).slice(0, 5).map(obj => ({
    id: obj.id,
    title: obj.title,
    badge: obj.type || 'Document',
    meta: obj.summary || 'Updated recently',
    category: space.name,
    time: obj.updated || 'recently',
    iconColor: '#10B981',
    iconBg: '#ECFDF5',
    iconType: 'document'
  }));

  // Habits dataset for Personal space
  const personalHabits = [
    {
      name: 'Meditation',
      icon: 'leaf',
      color: '#10B981',
      history: [true, true, true, true, true, true, false],
      pct: '86%'
    },
    {
      name: 'Reading',
      icon: 'book',
      color: '#3B82F6',
      history: [true, true, true, true, true, false, false],
      pct: '71%'
    },
    {
      name: 'Workout',
      icon: 'zap',
      color: '#8B5CF6',
      history: [true, true, true, true, false, false, false],
      pct: '57%'
    },
    {
      name: 'Journaling',
      icon: 'edit',
      color: '#F59E0B',
      history: [true, true, true, true, true, true, false],
      pct: '86%'
    },
    {
      name: 'Walk 10K Steps',
      icon: 'footsteps',
      color: '#EC4899',
      history: [true, true, true, true, true, false, false],
      pct: '71%'
    }
  ];

  // Tabs list per space
  let tabsList = [];
  if (isPersonal) {
    tabsList = [
      { id: 'overview', label: 'Overview', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>' },
      { id: 'notes', label: 'Notes', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>' },
      { id: 'journals', label: 'Journals', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
      { id: 'habits', label: 'Habits', icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' },
      { id: 'goals', label: 'Goals', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>' },
      { id: 'timeline', label: 'Timeline', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
      { id: 'insights', label: 'Insights', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' }
    ];
  } else if (isLearning) {
    tabsList = [
      { id: 'overview', label: 'Overview', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>' },
      { id: 'topics', label: 'Topics', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>' },
      { id: 'courses', label: 'Courses', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>' },
      { id: 'notes', label: 'Notes', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>' },
      { id: 'resources', label: 'Resources', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' },
      { id: 'timeline', label: 'Timeline', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
      { id: 'progress', label: 'Progress', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' },
      { id: 'insights', label: 'Insights', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' }
    ];
  } else if (isResearch) {
    tabsList = [
      { id: 'overview', label: 'Overview', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>' },
      { id: 'documents', label: 'Documents', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>' },
      { id: 'notes', label: 'Notes', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>' },
      { id: 'papers', label: 'Papers', icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>' },
      { id: 'topics', label: 'Topics', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>' },
      { id: 'timeline', label: 'Timeline', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
      { id: 'connections', label: 'Connections', icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },
      { id: 'insights', label: 'Insights', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' }
    ];
  } else {
    tabsList = [
      { id: 'overview', label: 'Overview', icon: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>' },
      { id: 'objects', label: 'Objects', icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' },
      { id: 'projects', label: 'Projects', icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>' },
      { id: 'goals', label: 'Goals', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
      { id: 'timeline', label: 'Timeline', icon: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>' },
      { id: 'connections', label: 'Connections', icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },
      { id: 'insights', label: 'Insights', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' }
    ];
  }

  container.innerHTML = `
    <div class="space-view-container stagger" data-space="${spaceId}">
      
      <!-- Top Breadcrumb -->
      <div class="space-breadcrumb-bar">
        <button class="space-back-btn" onclick="window.store.setRoute('workspace'); window.store.closeSpace();">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>All Spaces</span>
        </button>
      </div>

      <!-- Space Header -->
      <div class="space-header-row">
        <div class="space-header-left">
          <div class="space-icon-box">
            ${isLearning ? `
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="#7C3AED" stroke-width="2" fill="none">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            ` : isPersonal ? `
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="#0D9488" stroke-width="2" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            ` : isResearch ? `
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="#10B981" stroke-width="2" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="#7C3AED" stroke-width="2" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            `}
          </div>
          <div class="space-title-block">
            <h1 class="space-title">${space.name}</h1>
            <p class="space-subtitle">${space.desc || (isLearning ? 'Explore, learn and grow every day.' : isPersonal ? 'Notes, habits, reflections and everything about me.' : isResearch ? 'Explore, analyze and contribute to knowledge.' : 'Work, projects, skills and growth.')}</p>
          </div>
        </div>

        <div class="space-header-actions">
          <button class="space-add-btn" onclick="window.store.openAskAi('Add to ' + '${space.name}')">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
          <button class="space-more-btn" title="More Options">···</button>
        </div>
      </div>

      <!-- Metrics Row -->
      ${isLearning ? `
        <div class="space-metric-cards-grid">
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('tag', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">42</span>
                <span class="space-metric-card-label">Topics</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 4 this month</span></div>
          </div>
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('book', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">18</span>
                <span class="space-metric-card-label">Courses</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 2 this month</span></div>
          </div>
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('note', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">26</span>
                <span class="space-metric-card-label">Notes</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 6 this month</span></div>
          </div>
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('folder', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">39</span>
                <span class="space-metric-card-label">Resources</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 5 this month</span></div>
          </div>
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('paper', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">12</span>
                <span class="space-metric-card-label">Bookmarked</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 3 this month</span></div>
          </div>
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #7C3AED;">
                ${getIconSvg('habit', '#7C3AED')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">7</span>
                <span class="space-metric-card-label">Completed</span>
              </div>
            </div>
            <div class="space-metric-card-trend up"><span>↗ 1 this month</span></div>
          </div>
        </div>
      ` : isPersonal ? `
        <div class="space-metric-cards-grid">
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #0D9488;">
                ${getIconSvg('document', '#0D9488')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">36</span>
                <span class="space-metric-card-label">Items</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 5 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #0D9488;">
                ${getIconSvg('note', '#0D9488')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">12</span>
                <span class="space-metric-card-label">Notes</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 4 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #0D9488;">
                ${getIconSvg('journal', '#0D9488')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">4</span>
                <span class="space-metric-card-label">Journals</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 1 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #0D9488;">
                ${getIconSvg('habit', '#0D9488')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">7</span>
                <span class="space-metric-card-label">Habits</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 2 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #0D9488;">
                ${getIconSvg('goal', '#0D9488')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">5</span>
                <span class="space-metric-card-label">Goals</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 1 this month</span>
            </div>
          </div>
        </div>
      ` : isResearch ? `
        <div class="space-metric-cards-grid">
          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #10B981;">
                ${getIconSvg('document', '#10B981')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">148</span>
                <span class="space-metric-card-label">Documents</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 12 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #10B981;">
                ${getIconSvg('quote', '#10B981')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">37</span>
                <span class="space-metric-card-label">Notes</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 5 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #10B981;">
                ${getIconSvg('paper', '#10B981')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">23</span>
                <span class="space-metric-card-label">Papers</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 3 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #10B981;">
                ${getIconSvg('flask', '#10B981')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">8</span>
                <span class="space-metric-card-label">Experiments</span>
              </div>
            </div>
            <div class="space-metric-card-trend neutral">
              <span>→ 0 this month</span>
            </div>
          </div>

          <div class="space-metric-card">
            <div class="space-metric-card-top">
              <span class="space-metric-card-icon" style="color: #10B981;">
                ${getIconSvg('tag', '#10B981')}
              </span>
              <div class="space-metric-card-val">
                <span class="space-metric-card-num">14</span>
                <span class="space-metric-card-label">Topics</span>
              </div>
            </div>
            <div class="space-metric-card-trend up">
              <span>↗ 2 this month</span>
            </div>
          </div>
        </div>
      ` : `
        <div class="space-metrics-bar">
          <div class="space-metric-item">
            <span class="space-metric-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </span>
            <span class="space-metric-num">${space.count || 126}</span>
            <span class="space-metric-label">Objects</span>
          </div>
          <div class="space-metric-item">
            <span class="space-metric-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </span>
            <span class="space-metric-num">8</span>
            <span class="space-metric-label">Projects</span>
          </div>
          <div class="space-metric-item">
            <span class="space-metric-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span class="space-metric-num">12</span>
            <span class="space-metric-label">Goals</span>
          </div>
          <div class="space-metric-item">
            <span class="space-metric-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            <span class="space-metric-num">18</span>
            <span class="space-metric-label">Resources</span>
          </div>
          <div class="space-metric-item">
            <span class="space-metric-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </span>
            <span class="space-metric-num">3</span>
            <span class="space-metric-label">Areas</span>
          </div>
        </div>
      `}

      <!-- Navigation Tabs -->
      <div class="space-tabs-nav">
        ${tabsList.map(tab => `
          <button class="space-tab-btn ${activeTab === tab.id ? 'active' : ''}" onclick="window.store.setSpaceTab('${tab.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              ${tab.icon}
            </svg>
            <span>${tab.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Tab Content Area -->
      ${activeTab === 'overview' && isLearning ? `
        <!-- Learning Overview -->
        <div class="space-overview-grid">
          
          <!-- Left: Continue Learning -->
          <div class="space-recent-objects-col">
            <div class="continue-learning-card">
              <div class="continue-learning-header">
                <span class="continue-learning-title">Continue Learning</span>
                <a class="space-section-link" onclick="window.store.setSpaceTab('courses')">View all</a>
              </div>
              <div class="course-list">
                ${(space.courses || []).map(c => `
                  <div class="course-row" onclick="window.store.openObjectPanel({ id: '${c.id}', title: '${c.title.replace(/'/g, "\\'")}', type: 'Course', version: 'v1.0', updated: '${c.lastAccessed}' }, '${spaceId}')">
                    <div class="course-row-left">
                      <div class="course-icon-box" style="background: ${c.iconBg}; color: ${c.iconColor};">${c.icon}</div>
                      <div class="course-info">
                        <span class="course-title">${c.title}</span>
                        <span class="course-meta">Course • ${c.lessonsLeft} lessons left</span>
                      </div>
                    </div>
                    <div class="course-row-right">
                      <div class="course-progress-bar">
                        <div class="course-progress-fill" style="width: ${c.progress}%; background: #7C3AED;"></div>
                      </div>
                      <span class="course-progress-pct">${c.progress}%</span>
                      <button class="course-menu-btn" onclick="event.stopPropagation();">···</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right: Learning Progress -->
          <div class="space-at-a-glance-col">
            <div class="learning-progress-card">
              <div class="learning-progress-header">
                <span class="learning-progress-title">Learning Progress</span>
                <div class="research-period-dropdown">
                  <span>This Month</span>
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              <div class="learning-progress-body">
                <div class="learning-donut-section">
                  <div class="learning-donut-container">
                    <svg viewBox="0 0 100 100" width="100" height="100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-hover)" stroke-width="10" />
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#7C3AED" stroke-width="10"
                        stroke-dasharray="180 238.76" stroke-dashoffset="0" stroke-linecap="round"
                        transform="rotate(-90 50 50)" />
                    </svg>
                    <div class="learning-donut-center">
                      <span class="learning-donut-count">${space.learningStats ? space.learningStats.hoursLearned : 18}</span>
                      <span class="learning-donut-label">Hours Learned</span>
                    </div>
                  </div>
                </div>

                <div class="learning-stats-col">
                  <div class="learning-stat-row">
                    <span class="learning-stat-badge">↑ ${space.learningStats ? space.learningStats.changeVsLastMonth : '+24%'}</span>
                    <span class="learning-stat-label">vs last month</span>
                  </div>
                  <div class="learning-stat-row">
                    <span class="learning-stat-val">${space.learningStats ? space.learningStats.topicsActive : 6}</span>
                    <span class="learning-stat-label">Topics Active</span>
                  </div>
                  <div class="learning-stat-row">
                    <span class="learning-stat-val">${space.learningStats ? space.learningStats.coursesCompleted : 3}</span>
                    <span class="learning-stat-label">Courses Completed</span>
                  </div>
                </div>
              </div>

              <!-- Weekly Activity Bars -->
              <div class="learning-weekly-bars">
                ${['1 May', '8 May', '15 May', '22 May', '29 May'].map((label, i) => {
                  const heights = [18, 30, 24, 38, 24];
                  const opacity = [0.5, 0.7, 0.6, 0.9, 0.6];
                  return `
                    <div class="learning-bar-col">
                      <div class="learning-bar" style="height: ${heights[i]}px; background: rgba(124, 58, 237, ${opacity[i]});"></div>
                      <span class="learning-bar-label">${label}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Notes Grid -->
        <div class="learning-notes-section">
          <div class="learning-notes-header">
            <span class="learning-notes-title">Recent Notes</span>
            <a class="space-section-link" onclick="window.store.setSpaceTab('notes')">View all</a>
          </div>
          <div class="learning-notes-grid">
            ${(space.sections.knowledge || []).slice(0, 3).map(n => {
              const tagColors = {
                'Algorithms': { bg: '#FEF3C7', color: '#D97706' },
                'Rust': { bg: '#ECFDF5', color: '#059669' },
                'Machine Learning': { bg: '#EFF6FF', color: '#2563EB' },
                'System Design': { bg: '#F5F3FF', color: '#7C3AED' }
              };
              const tag = (n.tags || ['Note'])[0];
              const tc = tagColors[tag] || { bg: '#F3F4F6', color: '#6B7280' };
              const noteIconColors = {
                'Algorithms': { bg: '#FEF3C7', color: '#D97706', icon: 'code' },
                'Rust': { bg: '#ECFDF5', color: '#059669', icon: 'code' },
                'Machine Learning': { bg: '#EFF6FF', color: '#2563EB', icon: 'code' },
                'System Design': { bg: '#F5F3FF', color: '#7C3AED', icon: 'document' }
              };
              const nic = noteIconColors[tag] || { bg: '#F3F4F6', color: '#6B7280', icon: 'note' };
              return `
                <div class="learning-note-card" onclick="window.store.openObjectPanel(${JSON.stringify(n).replace(/"/g, '&quot;')}, '${spaceId}')">
                  <div class="learning-note-icon" style="background: ${nic.bg}; color: ${nic.color};">
                    ${getIconSvg(nic.icon, nic.color)}
                  </div>
                  <span class="learning-note-title">${n.title}</span>
                  <span class="learning-note-desc">${n.summary || ''}</span>
                  <div class="learning-note-footer">
                    <span class="learning-note-tag" style="background: ${tc.bg}; color: ${tc.color};">${tag}</span>
                    <span>${n.updated}</span>
                  </div>
                </div>
              `;
            }).join('')}
            <div class="learning-add-note-card" onclick="window.store.openAskAi('New Learning Note')">
              <span class="learning-add-icon">+</span>
              <span class="learning-add-text">New Note</span>
            </div>
          </div>
        </div>
      ` : activeTab === 'overview' ? `
        <!-- Main Overview Grid -->
        <div class="space-overview-grid">
          
          <!-- Recent Objects / Notes Column (Left) -->
          <div class="space-recent-objects-col">
            <div class="space-section-header-row">
              <span class="space-section-title">${isPersonal ? 'Recent Notes' : isResearch ? 'Recent Papers & Documents' : 'Recent Objects'}</span>
              <a class="space-section-link" onclick="window.store.setSpaceTab('${isPersonal ? 'notes' : isResearch ? 'documents' : 'objects'}')">View all</a>
            </div>

            <div class="space-objects-card-list">
              ${recentObjects.map(obj => `
                <div class="space-object-card" onclick="window.store.openObjectPanel({ id: '${obj.id}', title: '${obj.title.replace(/'/g, "\\'")}', type: '${obj.badge}', version: 'v1.0', updated: '${obj.time}' }, '${spaceId}')">
                  <div class="space-obj-left">
                    <div class="space-obj-icon" style="background: ${obj.iconBg}; color: ${obj.iconColor};">
                      ${getIconSvg(obj.iconType, obj.iconColor)}
                    </div>
                    <div class="space-obj-details">
                      <div class="space-obj-title-row">
                        <span class="space-obj-title">${obj.title}</span>
                        <span class="space-obj-badge">${obj.badge}</span>
                      </div>
                      <span class="space-obj-meta">${obj.meta}</span>
                    </div>
                  </div>
                  <div class="space-obj-right">
                    <span class="space-obj-time">${obj.time}</span>
                    <button class="space-obj-menu-btn" onclick="event.stopPropagation(); window.store.openAskAi('${obj.title.replace(/'/g, "\\'")}')">···</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right Column (Habits Tracker OR Research Progress OR At a Glance) -->
          <div class="space-at-a-glance-col">
            ${isPersonal ? `
              <div class="habits-tracker-card">
                <div class="habits-tracker-header">
                  <span class="habits-tracker-title">Habits Tracker</span>
                  <div class="research-period-dropdown">
                    <span>This Week</span>
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>

                <div class="habits-list">
                  ${personalHabits.map(h => `
                    <div class="habit-row">
                      <div class="habit-left">
                        <div class="habit-icon-wrap" style="color: ${h.color};">
                          ${getIconSvg(h.icon, h.color)}
                        </div>
                        <span class="habit-name">${h.name}</span>
                      </div>
                      <div class="habit-dots-row">
                        ${h.history.map(done => `
                          <span class="habit-dot ${done ? 'completed' : 'missed'}" style="${done ? 'background: ' + h.color + ';' : ''}"></span>
                        `).join('')}
                      </div>
                      <span class="habit-pct">${h.pct}</span>
                    </div>
                  `).join('')}
                </div>

                <div class="habits-footer">
                  <button class="habits-footer-btn" onclick="window.store.setSpaceTab('habits')">View all habits</button>
                </div>
              </div>
            ` : isResearch ? `
              <div class="research-progress-card">
                <div class="research-progress-header">
                  <span class="research-progress-title">Research Progress</span>
                  <div class="research-period-dropdown">
                    <span>This Month</span>
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>

                <!-- Donut Chart SVG -->
                <div class="research-donut-container">
                  <svg viewBox="0 0 130 130" width="130" height="130">
                    <g transform="rotate(-90 65 65)">
                      <circle cx="65" cy="65" r="48" fill="none" stroke="var(--surface-hover)" stroke-width="12" />
                      <circle cx="65" cy="65" r="48" fill="none" stroke="#10B981" stroke-width="12"
                        stroke-dasharray="134.04 167.55" stroke-dashoffset="0" stroke-linecap="round" />
                      <circle cx="65" cy="65" r="48" fill="none" stroke="#3B82F6" stroke-width="12"
                        stroke-dasharray="78.19 223.40" stroke-dashoffset="-134.04" stroke-linecap="round" />
                      <circle cx="65" cy="65" r="48" fill="none" stroke="#06B6D4" stroke-width="12"
                        stroke-dasharray="55.85 245.74" stroke-dashoffset="-212.23" stroke-linecap="round" />
                      <circle cx="65" cy="65" r="48" fill="none" stroke="#F59E0B" stroke-width="12"
                        stroke-dasharray="33.51 268.08" stroke-dashoffset="-268.08" stroke-linecap="round" />
                    </g>
                  </svg>
                  
                  <div class="research-donut-center">
                    <span class="research-donut-count">27</span>
                    <span class="research-donut-label">Total Activities</span>
                  </div>
                </div>

                <!-- Legend Breakdown -->
                <div class="research-legend-list">
                  <div class="research-legend-item">
                    <div class="research-legend-left">
                      <span class="research-legend-dot" style="background: #10B981;"></span>
                      <span class="research-legend-name">Documents Read</span>
                    </div>
                    <span class="research-legend-stat">12 (44%)</span>
                  </div>
                  <div class="research-legend-item">
                    <div class="research-legend-left">
                      <span class="research-legend-dot" style="background: #3B82F6;"></span>
                      <span class="research-legend-name">Notes Added</span>
                    </div>
                    <span class="research-legend-stat">7 (26%)</span>
                  </div>
                  <div class="research-legend-item">
                    <div class="research-legend-left">
                      <span class="research-legend-dot" style="background: #06B6D4;"></span>
                      <span class="research-legend-name">Papers Saved</span>
                    </div>
                    <span class="research-legend-stat">5 (19%)</span>
                  </div>
                  <div class="research-legend-item">
                    <div class="research-legend-left">
                      <span class="research-legend-dot" style="background: #F59E0B;"></span>
                      <span class="research-legend-name">Experiments</span>
                    </div>
                    <span class="research-legend-stat">3 (11%)</span>
                  </div>
                </div>
              </div>
            ` : `
              <div class="space-at-a-glance-card">
                <h3 class="glance-header-title">At a glance</h3>

                <div class="glance-block" onclick="window.store.setSpaceTab('goals')" style="cursor: pointer;">
                  <div class="glance-row-header">
                    <span class="glance-label">Active Goals</span>
                    <span class="glance-chevron">›</span>
                  </div>
                  <div class="glance-big-num">3</div>
                </div>

                <div class="glance-block">
                  <span class="glance-label">This Month</span>
                  <div class="glance-sparkline-row">
                    <div class="glance-sparkline-left">
                      <span class="glance-big-num">14</span>
                      <span class="glance-subtext">Updates</span>
                    </div>
                    <div class="glance-sparkline-graph">
                      <svg viewBox="0 0 110 32" class="sparkline-svg" width="105" height="28">
                        <path d="M0 24 Q 20 28, 38 18 T 72 14 T 92 6 T 110 10" fill="none" stroke="#8B5CF6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="glance-block glance-areas-block">
                  <span class="glance-label">Top Areas</span>
                  <div class="glance-areas-list">
                    <div class="glance-area-item">
                      <div class="glance-area-left">
                        <span class="glance-area-dot" style="background: #8B5CF6;"></span>
                        <span class="glance-area-name">Job Application</span>
                      </div>
                      <span class="glance-area-pct">45%</span>
                    </div>
                    <div class="glance-area-item">
                      <div class="glance-area-left">
                        <span class="glance-area-dot" style="background: #3B82F6;"></span>
                        <span class="glance-area-name">Skills</span>
                      </div>
                      <span class="glance-area-pct">30%</span>
                    </div>
                    <div class="glance-area-item">
                      <div class="glance-area-left">
                        <span class="glance-area-dot" style="background: #EC4899;"></span>
                        <span class="glance-area-name">Projects</span>
                      </div>
                      <span class="glance-area-pct">25%</span>
                    </div>
                  </div>
                </div>
              </div>
            `}
          </div>

        </div>

        ${isPersonal ? `
          <!-- Bottom 3-Column Grid for Personal Space (This Month, Goals, Quick Capture) -->
          <div class="personal-bottom-grid">
            
            <!-- 1. This Month -->
            <div class="this-month-card">
              <span class="this-month-header">This Month</span>
              <div class="this-month-list">
                
                <div class="this-month-row">
                  <div class="this-month-left">
                    <div class="this-month-icon" style="background: #F0FDFA; color: #0D9488;">
                      ${getIconSvg('journal', '#0D9488')}
                    </div>
                    <div class="this-month-info">
                      <span class="this-month-name">Journals Written</span>
                      <span class="this-month-count">8 entries</span>
                    </div>
                  </div>
                  <div class="this-month-sparkline">
                    <svg viewBox="0 0 65 22" width="65" height="22">
                      <path d="M0,18 Q12,15 22,8 T42,12 T64,2" fill="none" stroke="#0D9488" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="this-month-badge">↑ 33%</span>
                </div>

                <div class="this-month-row">
                  <div class="this-month-left">
                    <div class="this-month-icon" style="background: #EFF6FF; color: #3B82F6;">
                      ${getIconSvg('document', '#3B82F6')}
                    </div>
                    <div class="this-month-info">
                      <span class="this-month-name">Notes Created</span>
                      <span class="this-month-count">12 notes</span>
                    </div>
                  </div>
                  <div class="this-month-sparkline">
                    <svg viewBox="0 0 65 22" width="65" height="22">
                      <path d="M0,16 Q12,14 24,16 T45,8 T64,2" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="this-month-badge">↑ 20%</span>
                </div>

                <div class="this-month-row">
                  <div class="this-month-left">
                    <div class="this-month-icon" style="background: #F5F3FF; color: #8B5CF6;">
                      ${getIconSvg('calendar', '#8B5CF6')}
                    </div>
                    <div class="this-month-info">
                      <span class="this-month-name">Days Active</span>
                      <span class="this-month-count">18 days</span>
                    </div>
                  </div>
                  <div class="this-month-sparkline">
                    <svg viewBox="0 0 65 22" width="65" height="22">
                      <path d="M0,18 Q12,14 24,12 T45,15 T64,3" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="this-month-badge">↑ 25%</span>
                </div>

              </div>
            </div>

            <!-- 2. Goals -->
            <div class="personal-goals-card">
              <div class="personal-goals-header">
                <span class="personal-goals-title">Goals</span>
                <a class="personal-goals-manage" onclick="window.store.setSpaceTab('goals')">Manage</a>
              </div>
              <div class="personal-goals-list">
                
                <div class="personal-goal-row">
                  <div class="personal-goal-left">
                    <div class="goal-ring-wrap">
                      <svg viewBox="0 0 32 32" width="32" height="32">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="var(--surface-hover)" stroke-width="3" />
                        <circle cx="16" cy="16" r="12" fill="none" stroke="#0D9488" stroke-width="3"
                          stroke-dasharray="75.39" stroke-dashoffset="43.72" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div class="personal-goal-info">
                      <span class="personal-goal-name">Read 12 Books This Year</span>
                      <span class="personal-goal-sub">5 / 12 books</span>
                    </div>
                  </div>
                  <span class="personal-goal-pct">42%</span>
                </div>

                <div class="personal-goal-row">
                  <div class="personal-goal-left">
                    <div class="goal-ring-wrap">
                      <svg viewBox="0 0 32 32" width="32" height="32">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="var(--surface-hover)" stroke-width="3" />
                        <circle cx="16" cy="16" r="12" fill="none" stroke="#06B6D4" stroke-width="3"
                          stroke-dasharray="75.39" stroke-dashoffset="26.38" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div class="personal-goal-info">
                      <span class="personal-goal-name">Run 100km This Month</span>
                      <span class="personal-goal-sub">65 / 100 km</span>
                    </div>
                  </div>
                  <span class="personal-goal-pct">65%</span>
                </div>

                <div class="personal-goal-row">
                  <div class="personal-goal-left">
                    <div class="goal-ring-wrap">
                      <svg viewBox="0 0 32 32" width="32" height="32">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="var(--surface-hover)" stroke-width="3" />
                        <circle cx="16" cy="16" r="12" fill="none" stroke="#10B981" stroke-width="3"
                          stroke-dasharray="75.39" stroke-dashoffset="30.15" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div class="personal-goal-info">
                      <span class="personal-goal-name">Learn a New Skill</span>
                      <span class="personal-goal-sub">In Progress</span>
                    </div>
                  </div>
                  <span class="personal-goal-pct">60%</span>
                </div>

              </div>
              <button class="personal-add-goal-btn" onclick="window.store.openAskAi('Add Personal Goal')">
                <span>+ Add Goal</span>
              </button>
            </div>

            <!-- 3. Quick Capture -->
            <div class="quick-capture-card">
              <div class="quick-capture-header">
                <span class="quick-capture-title">Quick Capture</span>
                <button class="quick-capture-menu-btn">···</button>
              </div>
              <textarea class="quick-capture-textarea" placeholder="Write a quick note..." id="personalQuickCaptureInput"></textarea>
              <div class="quick-capture-actions">
                <button class="quick-action-btn" onclick="window.store.openAskAi('Quick Note')">
                  <span class="quick-action-icon">${getIconSvg('document', '#0D9488')}</span>
                  <span>Note</span>
                </button>
                <button class="quick-action-btn" onclick="window.store.openAskAi('Quick Journal')">
                  <span class="quick-action-icon">${getIconSvg('journal', '#0D9488')}</span>
                  <span>Journal</span>
                </button>
                <button class="quick-action-btn" onclick="window.store.openAskAi('Quick Habit')">
                  <span class="quick-action-icon">${getIconSvg('habit', '#0D9488')}</span>
                  <span>Habit</span>
                </button>
                <button class="quick-action-btn" onclick="window.store.openAskAi('Quick Goal')">
                  <span class="quick-action-icon">${getIconSvg('goal', '#0D9488')}</span>
                  <span>Goal</span>
                </button>
              </div>
            </div>

          </div>
        ` : `
          <!-- Bottom Focus Areas / Active Topics -->
          <div class="space-focus-areas-section">
            <div class="space-section-header-row">
              <span class="space-section-title">${isResearch ? 'Active Topics' : 'Focus Areas'}</span>
              <a class="space-section-link" onclick="window.store.openAskAi('${isResearch ? 'Active Topics' : 'Focus Areas'} in ' + '${space.name}')">Manage</a>
            </div>

            <div class="space-focus-grid">
              ${(isResearch ? [
                {
                  title: 'Multi-agent Systems',
                  subtitle: '18 Documents • 6 Notes',
                  progress: 75,
                  color: '#10B981',
                  iconBg: '#ECFDF5',
                  iconColor: '#10B981',
                  iconType: 'document'
                },
                {
                  title: 'LLM Memory',
                  subtitle: '14 Documents • 4 Notes',
                  progress: 60,
                  color: '#3B82F6',
                  iconBg: '#EFF6FF',
                  iconColor: '#3B82F6',
                  iconType: 'code'
                },
                {
                  title: 'Theorem Synthesis',
                  subtitle: '9 Documents • 3 Notes',
                  progress: 45,
                  color: '#8B5CF6',
                  iconBg: '#F5F3FF',
                  iconColor: '#8B5CF6',
                  iconType: 'note'
                }
              ] : [
                {
                  title: 'Job Application',
                  completed: 8,
                  total: 12,
                  progress: 65,
                  color: '#8B5CF6',
                  iconBg: '#F5F3FF',
                  iconColor: '#7C3AED',
                  iconType: 'briefcase'
                },
                {
                  title: 'Skills Development',
                  completed: 4,
                  total: 10,
                  progress: 40,
                  color: '#10B981',
                  iconBg: '#ECFDF5',
                  iconColor: '#10B981',
                  iconType: 'code'
                },
                {
                  title: 'Portfolio & Projects',
                  completed: 7,
                  total: 10,
                  progress: 70,
                  color: '#3B82F6',
                  iconBg: '#EFF6FF',
                  iconColor: '#3B82F6',
                  iconType: 'folder'
                }
              ]).map(fa => `
                <div class="focus-area-card">
                  <div class="focus-card-header">
                    <div class="focus-card-icon" style="background: ${fa.iconBg}; color: ${fa.iconColor};">
                      ${getIconSvg(fa.iconType, fa.iconColor)}
                    </div>
                    <span class="focus-card-title">${fa.title}</span>
                  </div>
                  <div class="focus-progress-wrap">
                    <div class="focus-progress-bar">
                      <div class="focus-progress-fill" style="width: ${fa.progress}%; background: ${fa.color};"></div>
                    </div>
                    <span class="focus-progress-pct">${fa.progress}%</span>
                  </div>
                  <span class="focus-card-footer">${fa.subtitle || (fa.completed + ' of ' + fa.total + ' tasks completed')}</span>
                </div>
              `).join('')}

              <div class="focus-add-card" onclick="window.store.openAskAi('New ' + '${isResearch ? 'Topic' : 'Focus Area'}')">
                <span class="focus-add-icon">+</span>
                <span class="focus-add-text">${isResearch ? 'Add Topic' : 'Add Focus Area'}</span>
              </div>
            </div>
          </div>
        `}
      ` : activeTab === 'courses' ? `
        <!-- Courses Tab -->
        <div class="space-all-objects-tab stagger">
          <div class="space-section-header-row">
            <span class="space-section-title">Courses (${(space.courses || []).length})</span>
            <button class="btn btn-primary" onclick="window.store.openAskAi('Add Course')">+ Add Course</button>
          </div>
          <div class="continue-learning-card" style="margin-top: var(--s-16);">
            <div class="course-list">
              ${(space.courses || []).map(c => `
                <div class="course-row" onclick="window.store.openObjectPanel({ id: '${c.id}', title: '${c.title.replace(/'/g, "\\'")}', type: 'Course', version: 'v1.0', updated: '${c.lastAccessed}' }, '${spaceId}')">
                  <div class="course-row-left">
                    <div class="course-icon-box" style="background: ${c.iconBg}; color: ${c.iconColor};">${c.icon}</div>
                    <div class="course-info">
                      <span class="course-title">${c.title}</span>
                      <span class="course-meta">Course • ${c.lessonsCompleted}/${c.totalLessons} lessons • ${c.timeSpent}</span>
                    </div>
                  </div>
                  <div class="course-row-right">
                    <div class="course-progress-bar">
                      <div class="course-progress-fill" style="width: ${c.progress}%; background: #7C3AED;"></div>
                    </div>
                    <span class="course-progress-pct">${c.progress}%</span>
                    <button class="course-menu-btn" onclick="event.stopPropagation();">···</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : activeTab === 'connections' ? `
        <!-- Connections Map Tab -->
        <div class="knowledge-map-card stagger">
          <div class="map-header-row">
            <span class="section-title-text">${space.name} Knowledge Graph</span>
            <div class="map-controls-group">
              <button class="map-control-btn">＋</button>
              <button class="map-control-btn">－</button>
            </div>
          </div>
          <div class="map-canvas-viewport" id="spaceMapViewport"></div>
        </div>
      ` : activeTab === 'habits' ? `
        <!-- Habits Tab -->
        <div class="space-habits-tab stagger">
          <div class="space-section-header-row">
            <span class="space-section-title">Habits (${personalHabits.length})</span>
            <button class="btn btn-primary" onclick="window.store.openAskAi('Create New Habit')">+ New Habit</button>
          </div>
          <div class="habits-tracker-card" style="margin-top: var(--s-16);">
            <div class="habits-list">
              ${personalHabits.map(h => `
                <div class="habit-row" style="padding: 12px 0;">
                  <div class="habit-left">
                    <div class="habit-icon-wrap" style="color: ${h.color};">
                      ${getIconSvg(h.icon, h.color)}
                    </div>
                    <span class="habit-name">${h.name}</span>
                  </div>
                  <div class="habit-dots-row">
                    ${h.history.map(done => `
                      <span class="habit-dot ${done ? 'completed' : 'missed'}" style="${done ? 'background: ' + h.color + ';' : ''}"></span>
                    `).join('')}
                  </div>
                  <span class="habit-pct">${h.pct}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : activeTab === 'goals' ? `
        <!-- Goals Tab -->
        <div class="space-goals-tab stagger">
          <div class="space-section-header-row">
            <span class="space-section-title">Goals (${isPersonal ? '3 Active' : (space.sections.goals || []).length})</span>
            <button class="btn btn-primary" onclick="window.store.openAskAi('Add Goal')">+ Add Goal</button>
          </div>
          <div class="space-focus-grid" style="margin-top: var(--s-16);">
            ${(isPersonal ? [
              { title: 'Read 12 Books This Year', progress: 42, subtitle: '5 / 12 books' },
              { title: 'Run 100km This Month', progress: 65, subtitle: '65 / 100 km' },
              { title: 'Learn a New Skill', progress: 60, subtitle: 'In Progress' }
            ] : (space.sections.goals || [])).map(g => `
              <div class="focus-area-card">
                <div class="focus-card-header">
                  <div class="focus-card-icon" style="background: #F0FDFA; color: #0D9488;">
                    ${getIconSvg('goal', '#0D9488')}
                  </div>
                  <span class="focus-card-title">${g.title}</span>
                </div>
                <div class="focus-progress-wrap">
                  <div class="focus-progress-bar">
                    <div class="focus-progress-fill" style="width: ${g.progress}%; background: #0D9488;"></div>
                  </div>
                  <span class="focus-progress-pct">${g.progress}%</span>
                </div>
                <span class="focus-card-footer">${g.subtitle || 'Active'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : activeTab === 'notes' || activeTab === 'journals' || activeTab === 'documents' || activeTab === 'papers' || activeTab === 'topics' || activeTab === 'objects' || activeTab === 'resources' ? `
        <!-- Filtered Tab View -->
        <div class="space-all-objects-tab stagger">
          <div class="space-section-header-row">
            <span class="space-section-title">${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} in ${space.name}</span>
          </div>
          <div class="space-objects-card-list" style="margin-top: var(--s-16);">
            ${(space.sections.knowledge || []).map(obj => `
              <div class="space-object-card" onclick="window.store.openObjectPanel(${JSON.stringify(obj).replace(/"/g, '&quot;')}, '${spaceId}')">
                <div class="space-obj-left">
                  <div class="space-obj-icon" style="background: ${obj.iconBg || (isPersonal ? '#F0FDFA' : isResearch ? '#ECFDF5' : '#F5F3FF')}; color: ${obj.iconColor || (isPersonal ? '#0D9488' : isResearch ? '#10B981' : '#7C3AED')};">
                    ${getIconSvg(activeTab === 'journals' ? 'journal' : 'note', obj.iconColor || (isPersonal ? '#0D9488' : '#10B981'))}
                  </div>
                  <div class="space-obj-details">
                    <div class="space-obj-title-row">
                      <span class="space-obj-title">${obj.title}</span>
                      <span class="space-obj-badge">${obj.type || 'Note'}</span>
                    </div>
                    <span class="space-obj-meta">${obj.summary || ''}</span>
                  </div>
                </div>
                <div class="space-obj-right">
                  <span class="space-obj-time">${obj.updated || 'recently'}</span>
                  <button class="space-obj-menu-btn" onclick="event.stopPropagation();">···</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <!-- Timeline / Insights Tab -->
        <div class="space-timeline-tab stagger">
          <div class="space-section-header-row">
            <span class="space-section-title">${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Feed</span>
          </div>
          <div class="space-objects-card-list" style="margin-top: var(--s-16);">
            ${(space.sections.activity || []).map(act => `
              <div class="space-object-card">
                <div class="space-obj-left">
                  <div class="space-obj-icon" style="background: ${isPersonal ? '#F0FDFA' : '#ECFDF5'}; color: ${isPersonal ? '#0D9488' : '#10B981'};">
                    ${getIconSvg('document', isPersonal ? '#0D9488' : '#10B981')}
                  </div>
                  <div class="space-obj-details">
                    <span class="space-obj-title">${act.text}</span>
                    <span class="space-obj-meta">${act.time}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `}

    </div>
  `;

  if (activeTab === 'connections') {
    setTimeout(() => initMapViewport('spaceMapViewport'), 30);
  }
};

window.MyndPages.renderObjectViewer = function renderObjectViewer(container) {
  const store = window.store;
  const panel = store.openPanels[store.activePanelIndex];
  if (!panel) return;
  const space = store.spaces.find(s => s.id === panel.spaceId);
  const obj = space ? space.sections.knowledge.find(o => o.id === panel.id) : null;
  if (!obj) return;

  container.innerHTML = `
    <div class="object-viewer stagger">
      <div class="object-viewer-header">
        <div class="object-viewer-meta">${space ? space.name : ''} · ${obj.type} · ${obj.version || 'v1.0'}</div>
        <h1 class="object-viewer-title">${obj.title}</h1>
      </div>
      <div class="object-viewer-content" style="margin: var(--s-24) 0; font-size: var(--t-body); line-height: var(--lh-relaxed); color: var(--text-secondary);">
        ${obj.content || obj.summary}
      </div>
      <div class="object-viewer-actions">
        <button class="btn btn-primary" onclick="window.store.openAskAi('${obj.title.replace(/'/g, "\\'")}')">Ask about this</button>
        <button class="btn btn-ghost" onclick="window.store.closeObjectPanel()">← Back</button>
      </div>
    </div>
  `;
};
