/**
 * MYND — Universal Knowledge Operating System
 * Architecture: Apple + Linear + Arc Browser Paradigm
 * 5-Core Nav: Home (Current Mind) | Workspace | Intelligence | Search | System
 */

class MyndStore {
  constructor() {
    this.theme = localStorage.getItem('mynd_theme') || 'light';
    this.activeRoute = 'workspace'; // 'home', 'workspace', 'intelligence', 'search', 'system'
    this.activeSpaceId = 'learning'; // 'career', 'research', 'startup', 'college', 'personal', 'learning'
    this.activeSpaceTab = 'overview'; // 'overview', 'notes', 'journals', 'habits', 'goals', 'timeline', 'insights'
    this.activeSpaceSection = 'all'; // 'knowledge', 'projects', 'meetings', 'people', 'goals', 'activity'
    
    // Arc Browser Multi-Panel Object Deck
    this.openPanels = [
      { id: 'obj-car-1', spaceId: 'career', title: 'Resume 2026 Final Draft', type: 'Document', badge: 'Active' },
      { id: 'obj-car-2', spaceId: 'career', title: 'Kalyra Streaming & Spatial Engine', type: 'Code', badge: 'GitHub Synced' },
      { id: 'obj-car-3', spaceId: 'career', title: 'Google Technical Screen Prep', type: 'Meeting', badge: 'Tomorrow' }
    ];
    this.activePanelIndex = 0;
    this.isSplitView = false;
    this.viewingObjectPanel = false;
    
    // Modes
    this.isFocusMode = false;
    this.isZenMode = false;
    this.isCanvasMode = false; // Figma-like infinite canvas
    this.isAskAiOpen = false;
    this.askAiTarget = null;
    this.isSpotlightOpen = false;
    this.isSystemSettingsOpen = false;
    this.activeSettingsTab = 'general';

    // Workspaces
    this.workspaces = [
      { id: 'ws-personal', name: 'Personal Intelligence', role: 'Owner', count: 184 },
      { id: 'ws-research', name: 'AI Systems Lab', role: 'Admin', count: 96 },
      { id: 'ws-startup', name: 'Kalyra Streaming OS', role: 'Owner', count: 142 }
    ];
    this.activeWorkspaceId = 'ws-personal';
    this.syncState = 'Synced';

    // User Profile
    this.userProfile = {
      name: 'Aryan Kulkarni',
      email: 'aryan@mynd.os',
      role: 'Staff Systems Architect',
      timezone: 'UTC+05:30 (India Standard Time)',
      focusDomain: 'Career & Systems Architecture',
      stats: {
        knowledgeObjects: 452,
        connections: 1840,
        daemonsRunning: 3,
        learningHours: '64.2 hrs'
      }
    };

    // 6 Primary Spaces (Mini Operating Systems)
    this.spaces = [
      {
        id: 'career',
        name: 'Career',
        status: 'Focused',
        count: 126,
        updated: 'Just now',
        pinned: true,
        desc: 'Staff AI Systems role, Resume 2026, Kalyra engine & Technical Screen',
        goal: { title: 'Secure Staff AI Systems Engineering Role', progress: 78 },
        liveUpdate: { text: 'Resume updated with latest Redis streaming metrics', time: '2m ago' },
        sections: {
          knowledge: [
            {
              id: 'obj-car-1',
              title: 'Resume 2026 Final Draft',
              type: 'PDF / Document',
              updated: 'Today',
              connections: 14,
              confidence: '98%',
              version: 'v2.4',
              tags: ['Staff AI', 'Distributed Systems', 'WebRTC', 'HLS'],
              summary: 'Tailored for Staff AI Systems Engineering roles with emphasis on multi-agent event loops, WebSockets lounge architecture, and sub-12ms response streaming.',
              content: `# Resume 2026 — Staff AI Systems Architect

## Core Competencies
• **Distributed Event Architecture**: Multi-agent background orchestration, zero-prompt memory consolidation, Raft consensus invariants.
• **High-Performance Streaming**: HLS segmentation, Bull Queue Redis workers, FFmpeg pipelines with sub-50ms playback synchronization.
• **Real-Time Spatial Audio**: WebSockets & WebRTC mesh networking for spatial audio lounge presence.

## Key Projects
• **Kalyra Video Streaming & Spatial OS**: Full-stack high-throughput streaming engine with autonomous background transcoding.
• **MYND Knowledge Operating System**: Autonomous personal intelligence graph replacing traditional dashboard UX with spatial memory.`,
              keyIdeas: [
                'Sub-12ms distributed event pipelines',
                'Zero-prompt background memory consolidation',
                'WebSockets spatial lounge presence'
              ],
              recommendations: 'Include benchmark metrics from private alpha stress tests.',
              timeline: [
                { event: 'Created initial draft', time: 'Jan 14, 2026' },
                { event: 'Added WebSockets spatial audio architecture', time: 'Jan 22, 2026' },
                { event: 'AI daemon auto-aligned with Staff AI criteria', time: 'Today' }
              ],
              versions: [
                { version: 'v2.4', date: 'Today', author: 'AI Sync', summary: 'Staff AI role alignment' },
                { version: 'v2.0', date: 'Jan 28, 2026', author: 'Anay', summary: 'Added HLS metrics' },
                { version: 'v1.0', date: 'Jan 14, 2026', author: 'Anay', summary: 'Initial import' }
              ],
              canvasPos: { x: 120, y: 140 }
            },
            {
              id: 'obj-car-2',
              title: 'Kalyra Streaming & Spatial Engine',
              type: 'Code / Architecture',
              updated: 'Yesterday',
              connections: 22,
              confidence: '100%',
              version: 'v3.1',
              tags: ['TypeScript', 'WebSockets', 'HLS', 'Redis'],
              summary: 'Production video streaming platform codebase with HLS video transcoding, Redis queues, and real-time spatial watch parties.',
              content: `// Kalyra Video Transcoding Engine Core
class HlsTranscoderPipeline {
  async processSegments(inputBuffer) {
    return await ffmpeg.transcode({ 
      hls_time: 4, 
      playlist: "master.m3u8",
      concurrency: 8
    });
  }

  async broadcastStreamReady(streamId) {
    await eventBus.emit("STREAM_PUBLISHED", { streamId, ts: Date.now() });
  }
}`,
              keyIdeas: [
                'Segmented HLS stream transcoding pipeline',
                'Bull Queue worker threads for predictable egress compute',
                'Distributed lounge spatial audio presence'
              ],
              recommendations: 'Generate automated API documentation for the spatial presence endpoints.',
              timeline: [
                { event: 'Repository indexed into Career Space', time: 'Feb 02, 2026' },
                { event: 'Extracted 14 technical skill competencies', time: 'Yesterday' }
              ],
              versions: [
                { version: 'v1.0', date: 'Feb 02, 2026', author: 'Anay', summary: 'Initial commit sync' }
              ],
              canvasPos: { x: 420, y: 120 }
            },
            {
              id: 'obj-car-3',
              title: 'Google Technical Screen Prep',
              type: 'Meeting / Brief',
              updated: 'Tomorrow (Scheduled)',
              connections: 9,
              confidence: '94%',
              version: 'v1.2',
              tags: ['Algorithms', 'Raft Consensus', 'Distributed Caching', 'Interview'],
              summary: 'Structured preparation brief for upcoming Google Staff Systems interview screen covering Raft invariants and rate limiting.',
              content: `# Google Technical Screen — Brief & Review

## Agenda & Focus Topics
1. **Raft Consensus Protocol**: Leader election safety, Log matching property, and State machine safety invariants.
2. **Distributed Rate Limiting**: Token bucket with Redis cluster state sync and clock-skew tolerance.
3. **Cache Stampede & Thundering Herd**: Probabilistic early expiration (XFetch algorithm) & distributed single-flight mutators.`,
              keyIdeas: ['Log matching property', 'Distributed token bucket algorithm', 'Cache stampede mitigation'],
              recommendations: 'Review Raft leader election commit rule prior to screen.',
              timeline: [
                { event: 'Meeting object scheduled & synthesized', time: 'Jan 28, 2026' }
              ],
              versions: [
                { version: 'v1.0', date: 'Jan 28, 2026', author: 'Anay', summary: 'Initial outline' }
              ],
              canvasPos: { x: 260, y: 320 }
            }
          ],
          projects: [
            { name: 'Kalyra Streaming OS', status: 'Active', updated: 'Yesterday', desc: 'Real-time video transcoding & WebSockets spatial lounge' },
            { name: 'Mynd AI OS Engine', status: 'In Progress', updated: 'Today', desc: 'Autonomous event-driven personal intelligence architecture' }
          ],
          meetings: [
            { name: 'Google Staff Systems Screen', time: 'Tomorrow 10:00 AM', status: 'Scheduled', role: 'Candidate' },
            { name: 'Kalyra Architecture Sync', time: 'Friday 4:00 PM', status: 'Upcoming', role: 'Lead Architect' }
          ],
          people: [
            { name: 'Sarah Chen', role: 'Staff Recruiter · Google', status: 'Active Thread', notes: 'Shared Resume v2.4' },
            { name: 'David Miller', role: 'Systems Lead · Kalyra Core', status: 'Collaborator', notes: 'Reviewed HLS transcoder PR' }
          ],
          goals: [
            { title: 'Secure Staff AI Systems Engineering Role', progress: 78, deadline: 'Q1 2026' },
            { title: 'Publish Sub-12ms WebSockets Benchmark', progress: 90, deadline: 'Feb 2026' }
          ],
          activity: [
            { text: 'Resume 2026 draft updated with Redis streaming metrics', time: '2m ago' },
            { text: 'Extracted 14 competencies from Kalyra master commit', time: 'Yesterday' }
          ]
        }
      },
      {
        id: 'research',
        name: 'Research',
        status: 'Active',
        count: 148,
        updated: 'Just now',
        pinned: true,
        desc: 'Explore, analyze and contribute to knowledge.',
        goal: { title: 'Publish Spatial AI Memory Benchmark', progress: 84 },
        liveUpdate: { text: 'ArXiv paper parsed: 14 theorems extracted', time: '14m ago' },
        sections: {
          knowledge: [
            {
              id: 'obj-res-1',
              title: 'Multi-agent Systems: A Survey',
              type: 'Paper',
              updated: '2h ago',
              author: 'Leslie Pack Kaelbling et al.',
              connections: 31,
              confidence: '98%',
              version: 'v2.1',
              tags: ['Multi-agent', 'Survey', 'Coordination'],
              summary: 'Comprehensive foundation on multi-agent reinforcement learning, formal communication protocols, and emergent cooperative dynamics.',
              content: `# Multi-agent Systems: A Survey
By Leslie Pack Kaelbling et al.

## Key Themes
1. **Decentralized Coordination**: Cooperative game theory frameworks for autonomous agents.
2. **Communication Bottlenecks**: Bandwidth-efficient message passing under partial observability.
3. **Emergent Consensus**: Convergence properties in large-scale decentralized agent networks.`,
              keyIdeas: ['Decentralized coordination', 'Message passing efficiency', 'Emergent consensus'],
              recommendations: 'Synthesize communication protocols with MYND spatial event bus.',
              timeline: [{ event: 'Paper synthesized from ArXiv', time: '2h ago' }],
              versions: [{ version: 'v2.1', date: '2h ago', author: 'AI Daemon', summary: 'Updated survey notes' }],
              canvasPos: { x: 200, y: 160 }
            },
            {
              id: 'obj-res-2',
              title: 'Spatial Memory in LLM Agents',
              type: 'Document',
              updated: 'Yesterday',
              author: 'My notes',
              connections: 24,
              confidence: '95%',
              version: 'v1.4',
              tags: ['Spatial Memory', 'LLMs', 'Cognitive OS'],
              summary: 'Structured notes and architectural topologies for continuous background memory consolidation.',
              content: `# Spatial Memory in LLM Agents
My Notes & Formulation

## Architecture
• Cognitive graphs mapped to spatial coordinate systems.
• Background decay functions for inactive memory edges.
• Zero-prompt recall via semantic proximity thresholds.`,
              keyIdeas: ['Spatial coordinate mapping', 'Edge decay functions', 'Semantic proximity thresholds'],
              recommendations: 'Connect directly with Kalyra spatial audio lounge architecture.',
              timeline: [{ event: 'Document created', time: 'Yesterday' }],
              canvasPos: { x: 380, y: 140 }
            },
            {
              id: 'obj-res-3',
              title: 'Experiment: Memory Retention Test',
              type: 'Experiment',
              updated: '2 days ago',
              author: 'Results & Analysis',
              connections: 16,
              confidence: '92%',
              version: 'v1.0',
              tags: ['Experiment', 'Benchmark', 'Retention'],
              summary: 'Empirical benchmark analyzing memory recall accuracy across 10,000 conversational turns.',
              content: `# Experiment: Memory Retention Test
Results & Analysis

## Key Metrics
• Recall accuracy: 94.2% across 10k conversational turns.
• Mean retrieval latency: 11.4ms via indexed vector embeddings.
• Zero false positive attribution in cross-domain queries.`,
              keyIdeas: ['94.2% recall accuracy', '11.4ms mean latency', 'Zero false attribution'],
              recommendations: 'Run second test cohort with 50k nodes.',
              timeline: [{ event: 'Experiment completed', time: '2 days ago' }],
              canvasPos: { x: 160, y: 320 }
            },
            {
              id: 'obj-res-4',
              title: 'Papers to Read – May 2025',
              type: 'Note',
              updated: '3 days ago',
              author: 'Curated list',
              connections: 11,
              confidence: '88%',
              version: 'v1.2',
              tags: ['Reading List', 'ArXiv', 'Citations'],
              summary: 'Curated list of 14 upcoming papers on state space models, Raft consensus, and autonomous agent loops.',
              content: `# Papers to Read – May 2025
Curated Reading List

1. State Space Models in Interactive Environments
2. Consensus Invariants in Multi-Master Event Loops
3. Hierarchical Memory Routing in Digital Twin Operating Systems`,
              keyIdeas: ['State space models', 'Consensus invariants', 'Hierarchical memory routing'],
              recommendations: 'Queue for weekend synthesis.',
              timeline: [{ event: 'List updated', time: '3 days ago' }],
              canvasPos: { x: 420, y: 280 }
            },
            {
              id: 'obj-res-5',
              title: 'Theorem Synthesis — Reference',
              type: 'Document',
              updated: '4 days ago',
              author: 'Definitions and proofs',
              connections: 19,
              confidence: '99%',
              version: 'v2.0',
              tags: ['Theorems', 'Proofs', 'Formal Verification'],
              summary: 'Formal definitions, invariants, and proofs for autonomous graph convergence.',
              content: `# Theorem Synthesis — Reference
Definitions and Formal Proofs

## Theorem 1 (Convergence of Memory States)
Let G = (V, E) be a dynamic memory graph. Under continuous asynchronous consolidation pulses, graph state G converges to optimal semantic density in finite iterations.`,
              keyIdeas: ['Memory state convergence', 'Asynchronous consolidation', 'Formal invariant proofs'],
              recommendations: 'Prepare for journal publication draft.',
              timeline: [{ event: 'Proof verified', time: '4 days ago' }],
              canvasPos: { x: 300, y: 220 }
            }
          ],
          projects: [
            { name: 'Autonomous Memory Benchmark', status: 'Running', updated: '14m ago', desc: 'Empirical latency testing across 100k memory nodes' },
            { name: 'Theorem Synthesis Engine', status: 'Active', updated: '2d ago', desc: 'Automated proof assistant integration' }
          ],
          meetings: [
            { name: 'AI Systems Lab Weekly Review', time: 'Thursday 2:00 PM', status: 'Scheduled', role: 'Presenter' }
          ],
          people: [
            { name: 'Dr. Elena Rostova', role: 'Principal AI Researcher', status: 'Collaborator', notes: 'Co-authoring benchmark' }
          ],
          goals: [
            { title: 'Publish Spatial AI Memory Benchmark', progress: 84, deadline: 'Feb 2026' }
          ],
          activity: [
            { text: 'Synthesized 14 core theorems from ArXiv survey', time: '2h ago' },
            { text: 'Completed Memory Retention Test cohort analysis', time: '2 days ago' }
          ]
        }
      },
      {
        id: 'personal',
        name: 'Personal',
        status: 'Active',
        count: 36,
        updated: '2 hrs ago',
        pinned: false,
        desc: 'Notes, habits, reflections and everything about me.',
        stats: {
          items: 36,
          notes: 12,
          journals: 4,
          habits: 7,
          goals: 5
        },
        statTrends: {
          items: '↗ 5 this month',
          notes: '↗ 4 this month',
          journals: '↗ 1 this month',
          habits: '↗ 2 this month',
          goals: '↗ 1 this month'
        },
        sections: {
          knowledge: [
            {
              id: 'obj-per-1',
              title: 'Daily Reflection – May 12',
              type: 'Note',
              updated: '2h ago',
              author: 'Daily reflection',
              connections: 8,
              confidence: '100%',
              version: 'v1.0',
              tags: ['Reflection', 'Gratitude', 'Daily'],
              summary: 'Grateful for progress today.',
              iconColor: '#0D9488',
              iconBg: '#F0FDFA',
              content: `# Daily Reflection – May 12\n\n## Gratitude & Highlights\n• Grateful for continuous progress on the system architecture.\n• Morning meditation felt deeply restorative.\n• Maintained clean focus through 3 deep work blocks.`,
              canvasPos: { x: 220, y: 150 }
            },
            {
              id: 'obj-per-2',
              title: 'Reading List',
              type: 'Note',
              updated: 'Yesterday',
              author: 'Reading queue',
              connections: 14,
              confidence: '95%',
              version: 'v2.1',
              tags: ['Books', 'Learning', '2026'],
              summary: 'Books to read this year.',
              iconColor: '#10B981',
              iconBg: '#ECFDF5',
              content: `# Reading List 2026\n\n1. Designing Data-Intensive Applications – Martin Kleppmann\n2. Thinking in Systems – Donella Meadows\n3. The Master and His Emissary – Iain McGilchrist`,
              canvasPos: { x: 380, y: 180 }
            },
            {
              id: 'obj-per-3',
              title: 'Learning Log – Systems Design',
              type: 'Note',
              updated: '2 days ago',
              author: 'Study notes',
              connections: 19,
              confidence: '98%',
              version: 'v3.0',
              tags: ['Systems', 'Architecture', 'Log'],
              summary: 'Resources and key takeaways.',
              iconColor: '#8B5CF6',
              iconBg: '#F5F3FF',
              content: `# Learning Log – Systems Design\n\n• Consistent hashing rings with virtual nodes for minimal rebalancing.\n• LSM-Trees vs B-Trees trade-offs for write amplification.\n• Vector search indexing topologies (HNSW vs IVF).`,
              canvasPos: { x: 190, y: 300 }
            },
            {
              id: 'obj-per-4',
              title: 'Health Goals',
              type: 'Note',
              updated: '3 days ago',
              author: 'Fitness tracker',
              connections: 11,
              confidence: '90%',
              version: 'v1.5',
              tags: ['Health', 'Running', 'Fitness'],
              summary: 'Run 100km this month.',
              iconColor: '#EC4899',
              iconBg: '#FDF2F8',
              content: `# Health & Fitness Goals\n\n• Target: Run 100km this month (current: 65km).\n• 4 weekly strength training sessions.\n• Target 8.5 hours in bed with >85% sleep recovery.`,
              canvasPos: { x: 420, y: 340 }
            },
            {
              id: 'obj-per-5',
              title: 'Travel Ideas',
              type: 'Note',
              updated: '5 days ago',
              author: 'Exploration',
              connections: 6,
              confidence: '85%',
              version: 'v1.0',
              tags: ['Travel', 'Ideas', 'Bucket List'],
              summary: 'Places I want to explore.',
              iconColor: '#F59E0B',
              iconBg: '#FFFBEB',
              content: `# Travel Ideas & Itineraries\n\n• Kyoto, Japan – Temples, bamboo groves & quiet mountain tea houses.\n• Swiss Alps – Alpine trekking and high altitude clarity.\n• Reykjavik, Iceland – Aurora borealis & volcanic landscapes.`,
              canvasPos: { x: 150, y: 440 }
            }
          ],
          habits: [
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
          ],
          monthlyMetrics: [
            {
              name: 'Journals Written',
              count: '8 entries',
              trend: '↑ 33%',
              color: '#0D9488',
              icon: 'book',
              sparkline: 'M0,18 Q8,15 16,10 T32,12 T48,6 T64,2'
            },
            {
              name: 'Notes Created',
              count: '12 notes',
              trend: '↑ 20%',
              color: '#3B82F6',
              icon: 'document',
              sparkline: 'M0,16 Q8,14 16,16 T32,8 T48,6 T64,2'
            },
            {
              name: 'Days Active',
              count: '18 days',
              trend: '↑ 25%',
              color: '#8B5CF6',
              icon: 'calendar',
              sparkline: 'M0,18 Q8,14 16,12 T32,16 T48,8 T64,4'
            }
          ],
          personalGoals: [
            {
              title: 'Read 12 Books This Year',
              sub: '5 / 12 books',
              progress: 42,
              color: '#0D9488'
            },
            {
              title: 'Run 100km This Month',
              sub: '65 / 100 km',
              progress: 65,
              color: '#06B6D4'
            },
            {
              title: 'Learn a New Skill',
              sub: 'In Progress',
              progress: 60,
              color: '#10B981'
            }
          ],
          projects: [],
          meetings: [],
          people: [],
          activity: [
            { text: 'Completed daily reflection for May 12', time: '2h ago' },
            { text: 'Logged 8.2km morning run', time: 'Yesterday' },
            { text: 'Added 3 notes to Systems Design Learning Log', time: '2 days ago' }
          ]
        }
      },
      {
        id: 'learning',
        name: 'Learning',
        status: 'Active',
        count: 42,
        updated: '2h ago',
        pinned: false,
        desc: 'Explore, learn and grow every day.',
        goal: { title: 'Complete System Design Course', progress: 66 },
        liveUpdate: { text: 'Completed lesson 18 of System Design Basics', time: '2h ago' },
        courses: [
          {
            id: 'course-1',
            title: 'System Design Basics',
            instructor: 'Alex Xu',
            icon: '📐',
            iconBg: '#F5F3FF',
            iconColor: '#7C3AED',
            progress: 68,
            lessonsCompleted: 12,
            totalLessons: 26,
            lessonsLeft: 12,
            timeSpent: '7h 45m',
            lastAccessed: 'Today, 10:30 AM',
            status: 'In Progress',
            whatYouWillLearn: [
              'Understand system design fundamentals',
              'Design scalable and reliable systems',
              'Handle high traffic and data',
              'Make informed trade-off decisions'
            ],
            resources: [
              { title: 'System Design Primer', type: 'PDF' },
              { title: 'Designing Data Intensive Applications', type: 'Book' },
              { title: 'System Design Interview – Anki Deck', type: 'Deck' }
            ]
          },
          {
            id: 'course-2',
            title: 'Rust Programming',
            instructor: 'Tim McNamara',
            icon: '</>',
            iconBg: '#ECFDF5',
            iconColor: '#10B981',
            progress: 45,
            lessonsCompleted: 10,
            totalLessons: 18,
            lessonsLeft: 8,
            timeSpent: '4h 20m',
            lastAccessed: 'Yesterday',
            status: 'In Progress'
          },
          {
            id: 'course-3',
            title: 'Machine Learning Fundamentals',
            instructor: 'Andrew Ng',
            icon: 'ai',
            iconBg: '#EFF6FF',
            iconColor: '#3B82F6',
            progress: 30,
            lessonsCompleted: 5,
            totalLessons: 20,
            lessonsLeft: 15,
            timeSpent: '3h 10m',
            lastAccessed: '3 days ago',
            status: 'In Progress'
          }
        ],
        learningStats: {
          hoursLearned: 18,
          topicsActive: 6,
          coursesCompleted: 3,
          changeVsLastMonth: '+24%',
          weeklyActivity: [3, 5, 4, 6, 4]
        },
        sections: {
          knowledge: [
            {
              id: 'obj-lrn-1',
              title: 'Time Complexity',
              type: 'Note',
              updated: '2h ago',
              connections: 8,
              confidence: '92%',
              version: 'v1.0',
              tags: ['Algorithms'],
              summary: 'Big O notation, best case, average case and worst case analysis.',
              content: `# Time Complexity Notes\n\n## Big O Notation\n• O(1) — Constant time\n• O(log n) — Logarithmic\n• O(n) — Linear\n• O(n log n) — Linearithmic\n• O(n²) — Quadratic\n\n## Analysis Types\n• Best Case — Omega notation\n• Average Case — Theta notation\n• Worst Case — Big O notation`,
              keyIdeas: ['Big O notation', 'Amortized analysis', 'Space vs time tradeoffs'],
              recommendations: 'Add practice problems from LeetCode.',
              timeline: [{ event: 'Note created', time: '2h ago' }],
              versions: [{ version: 'v1.0', date: '2h ago', author: 'Aryan', summary: 'Initial notes' }],
              canvasPos: { x: 120, y: 140 }
            },
            {
              id: 'obj-lrn-2',
              title: 'Ownership in Rust',
              type: 'Note',
              updated: 'Yesterday',
              connections: 5,
              confidence: '88%',
              version: 'v1.0',
              tags: ['Rust'],
              summary: 'Borrowing, lifetimes and memory safety without garbage collection.',
              content: `# Ownership in Rust\n\n## Core Rules\n1. Each value has an owner\n2. Only one owner at a time\n3. Value dropped when owner goes out of scope\n\n## Borrowing\n• Immutable references (&T)\n• Mutable references (&mut T)\n• Cannot have mutable and immutable refs simultaneously`,
              keyIdeas: ['Ownership model', 'Borrow checker', 'Lifetimes'],
              timeline: [{ event: 'Note created from course', time: 'Yesterday' }],
              versions: [{ version: 'v1.0', date: 'Yesterday', author: 'Aryan', summary: 'Course notes' }],
              canvasPos: { x: 280, y: 180 }
            },
            {
              id: 'obj-lrn-3',
              title: 'Neural Networks',
              type: 'Note',
              updated: '2d ago',
              connections: 12,
              confidence: '85%',
              version: 'v1.0',
              tags: ['Machine Learning'],
              summary: 'Basics of neurons, layers, activation functions and backpropagation.',
              content: `# Neural Networks\n\n## Architecture\n• Input Layer → Hidden Layers → Output Layer\n• Each neuron: weighted sum + bias + activation\n\n## Activation Functions\n• ReLU, Sigmoid, Tanh, Softmax\n\n## Backpropagation\n• Chain rule for gradient computation\n• Gradient descent optimization`,
              keyIdeas: ['Forward propagation', 'Backpropagation', 'Gradient descent'],
              timeline: [{ event: 'Note created', time: '2d ago' }],
              versions: [{ version: 'v1.0', date: '2d ago', author: 'Aryan', summary: 'ML course notes' }],
              canvasPos: { x: 400, y: 120 }
            },
            {
              id: 'obj-lrn-4',
              title: 'CAP Theorem Deep Dive',
              type: 'Note',
              updated: '3d ago',
              connections: 6,
              confidence: '90%',
              version: 'v1.0',
              tags: ['System Design'],
              summary: 'Consistency, Availability, Partition tolerance — trade-offs in distributed systems.',
              content: `# CAP Theorem\n\nIn a distributed system, you can only guarantee two of three:\n• Consistency\n• Availability\n• Partition Tolerance`,
              keyIdeas: ['CAP trade-offs', 'CP vs AP systems', 'Eventual consistency'],
              timeline: [{ event: 'Note created', time: '3d ago' }],
              versions: [{ version: 'v1.0', date: '3d ago', author: 'Aryan', summary: 'System design notes' }],
              canvasPos: { x: 180, y: 260 }
            }
          ],
          projects: [],
          meetings: [],
          people: [],
          goals: [
            { title: 'Complete System Design Course', progress: 66, deadline: 'Aug 30' },
            { title: 'Finish Rust Basics', progress: 45, deadline: 'Sep 15' },
            { title: 'ML Fundamentals Certificate', progress: 30, deadline: 'Oct 1' }
          ],
          activity: [
            { text: 'Completed Lesson 18: Load Balancers in System Design Basics', time: '2h ago' },
            { text: 'Added notes on Ownership in Rust', time: 'Yesterday' },
            { text: 'Started Machine Learning Fundamentals course', time: '3 days ago' },
            { text: 'Bookmarked CAP Theorem article', time: '4 days ago' }
          ]
        }
      }
    ];

    // Background Autonomous Daemons (Intelligence Engine)
    this.intelligenceStream = [
      {
        id: 'intel-1',
        title: 'Autonomous Memory Graph Consolidation',
        space: 'Research',
        status: 'Running',
        progress: '86%',
        time: 'Active daemon',
        desc: 'Synthesized 14 core theorems from ArXiv paper. Cosine similarity linked paper to Kalyra spatial lounge codebase.',
        trace: {
          trigger: 'PDF parsed into Research space',
          engines: ['Embedding Daemon', 'Citation Extractor', 'Graph Linker'],
          verdict: 'High-confidence cross-domain connection formed (96% strength).'
        }
      },
      {
        id: 'intel-2',
        title: 'Resume & Skill Matrix Alignment',
        space: 'Career',
        status: 'Completed',
        progress: '100%',
        time: '2m ago',
        desc: 'Extracted Redis Bull Queue metrics from Kalyra commits and updated Resume 2026 draft automatically.',
        trace: {
          trigger: 'Master branch commit on Kalyra repository',
          engines: ['Code AST Parser', 'Career Alignment Daemon'],
          verdict: 'Updated Resume v2.4 with Staff AI Systems metrics.'
        }
      },
      {
        id: 'intel-3',
        title: 'Technical Screen Preparedness Radar',
        space: 'Career',
        status: 'Active',
        progress: '74%',
        time: 'Scheduled',
        desc: 'Google Technical Screen scheduled tomorrow. 3 key topics highlighted: Raft invariants, Rate limiting, Caching.',
        trace: {
          trigger: 'Calendar event correlation',
          engines: ['Schedule Daemon', 'Topic Synthesizer'],
          verdict: 'Generated focused brief with zero prompt required.'
        }
      }
    ];

    // Settings Configuration
    this.settings = {
      general: {
        name: 'Anay',
        email: 'anay@mynd.os',
        role: 'Staff Systems Architect',
        timezone: 'UTC+05:30',
        language: 'English (US)'
      },
      appearance: {
        theme: 'light',
        typography: 'Inter & IBM Plex Mono',
        motionSpeed: 'Apple Spring 250ms'
      },
      autonomy: {
        backgroundConsolidation: true,
        proactiveBriefs: true,
        zeroPromptSync: true
      },
      storage: {
        used: '2.4 GB',
        total: '10.0 GB',
        embeddings: '380 MB',
        documents: '1.2 GB'
      },
      integrations: [
        { name: 'GitHub', status: 'Connected', sync: '2m ago' },
        { name: 'Google Drive', status: 'Connected', sync: '1h ago' },
        { name: 'Notion Sync', status: 'Connected', sync: 'Yesterday' }
      ]
    };

    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // Navigation Core (5 Items)
  setRoute(route, spaceId = null) {
    this.activeRoute = route;
    this.viewingObjectPanel = false;
    if (spaceId) {
      this.activeSpaceId = spaceId;
      this.activeRoute = 'workspace';
    } else if (route === 'workspace' && !this.activeSpaceId) {
      // Stay on workspace root or keep current space
    } else if (route !== 'workspace') {
      this.activeSpaceId = null;
    }
    this.notify();
  }

  selectSpace(spaceId) {
    this.activeRoute = 'workspace';
    this.activeSpaceId = spaceId;
    this.activeSpaceTab = 'overview';
    this.viewingObjectPanel = false;
    this.notify();
  }

  setSpaceTab(tab) {
    this.activeSpaceTab = tab;
    this.notify();
  }

  closeSpace() {
    this.activeSpaceId = null;
    this.activeRoute = 'workspace';
    this.viewingObjectPanel = false;
    this.notify();
  }

  // Arc Browser Multi-Panel Object Deck
  openObjectPanel(obj, spaceId) {
    const existingIndex = this.openPanels.findIndex(p => p.id === obj.id);
    if (existingIndex >= 0) {
      this.activePanelIndex = existingIndex;
    } else {
      this.openPanels.push({
        id: obj.id,
        spaceId: spaceId,
        title: obj.title,
        type: obj.type,
        badge: obj.version || 'Active'
      });
      if (this.openPanels.length > 4) {
        this.openPanels.shift(); // Keep max 4 panels like Arc
      }
      this.activePanelIndex = this.openPanels.length - 1;
    }
    this.activeRoute = 'workspace';
    this.activeSpaceId = spaceId;
    this.viewingObjectPanel = true;
    this.notify();
  }

  closeObjectPanel() {
    this.viewingObjectPanel = false;
    this.notify();
  }

  setActivePanelIndex(index) {
    if (index >= 0 && index < this.openPanels.length) {
      this.activePanelIndex = index;
      const panel = this.openPanels[index];
      if (panel && panel.spaceId) {
        this.activeSpaceId = panel.spaceId;
      }
      this.viewingObjectPanel = true;
      this.notify();
    }
  }

  closePanel(index, e) {
    if (e) e.stopPropagation();
    if (this.openPanels.length <= 1) {
      // Cannot close last panel, just minimize
      return;
    }
    this.openPanels.splice(index, 1);
    if (this.activePanelIndex >= this.openPanels.length) {
      this.activePanelIndex = this.openPanels.length - 1;
    }
    this.notify();
  }

  toggleSplitView() {
    this.isSplitView = !this.isSplitView;
    this.notify();
  }

  // Focus Mode & Zen Mode
  toggleFocusMode() {
    this.isFocusMode = !this.isFocusMode;
    if (this.isFocusMode) {
      document.body.classList.add('focus-mode-active');
      document.body.classList.remove('zen-mode-active');
      this.isZenMode = false;
    } else {
      document.body.classList.remove('focus-mode-active');
    }
    this.notify();
  }

  toggleZenMode() {
    this.isZenMode = !this.isZenMode;
    if (this.isZenMode) {
      document.body.classList.add('zen-mode-active');
      document.body.classList.remove('focus-mode-active');
      this.isFocusMode = false;
    } else {
      document.body.classList.remove('zen-mode-active');
    }
    this.notify();
  }

  toggleCanvasMode() {
    this.isCanvasMode = !this.isCanvasMode;
    this.notify();
  }

  // Theme
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('mynd_theme', this.theme);
    document.documentElement.setAttribute('data-theme', this.theme);
    this.settings.appearance.theme = this.theme;
    this.notify();
  }

  // Contextual "Ask About This"
  openAskAi(target) {
    this.isAskAiOpen = true;
    this.askAiTarget = target;
    this.notify();
  }

  closeAskAi() {
    this.isAskAiOpen = false;
    this.askAiTarget = null;
    this.notify();
  }

  // System Settings Modal / Overlay
  openSystemSettings(tab = 'general') {
    this.isSystemSettingsOpen = true;
    this.activeSettingsTab = tab;
    this.notify();
  }

  closeSystemSettings() {
    this.isSystemSettingsOpen = false;
    this.notify();
  }

  // Spotlight Command Palette
  openSpotlight() {
    this.isSpotlightOpen = true;
    this.notify();
  }

  closeSpotlight() {
    this.isSpotlightOpen = false;
    this.notify();
  }

  // Helper to get active object
  getActiveObject() {
    if (!this.openPanels.length) return null;
    const p = this.openPanels[this.activePanelIndex];
    if (!p) return null;
    const space = this.spaces.find(s => s.id === p.spaceId);
    if (!space || !space.sections.knowledge) return null;
    return space.sections.knowledge.find(o => o.id === p.id) || null;
  }

  // Quick Capture pipeline
  addCapturedItem(text, type = 'Text') {
    const targetSpace = this.activeSpaceId ? this.spaces.find(s => s.id === this.activeSpaceId) : this.spaces[0];
    const newObj = {
      id: 'obj-' + Date.now(),
      title: text.substring(0, 32) || 'Captured Insight',
      type: type === 'Text' ? 'Note' : type,
      updated: 'Just now',
      connections: 2,
      confidence: '96%',
      version: 'v1.0',
      tags: ['Capture', targetSpace.name],
      summary: `Autonomous capture and synthesis within ${targetSpace.name} space.`,
      content: `# ${text.substring(0, 32)}\n\n${text}\n\n*Auto-indexed by MYND Intelligence Engine.*`,
      keyIdeas: [text.substring(0, 48)],
      recommendations: 'Integrated into space knowledge graph.',
      timeline: [{ event: 'Captured & Synthesized', time: 'Just now' }],
      versions: [{ version: 'v1.0', date: 'Today', author: 'Anay', summary: 'Quick capture' }],
      canvasPos: { x: 300, y: 200 }
    };

    targetSpace.sections.knowledge.unshift(newObj);
    targetSpace.count += 1;
    targetSpace.liveUpdate = { text: `Captured: "${text.substring(0, 24)}..."`, time: 'Just now' };

    this.intelligenceStream.unshift({
      id: 'intel-' + Date.now(),
      title: `Capture Ingested into ${targetSpace.name}`,
      space: targetSpace.name,
      status: 'Completed',
      progress: '100%',
      time: 'Just now',
      desc: `Synthesized "${text.substring(0, 36)}" and created 2 cross-space links.`,
      trace: {
        trigger: 'Quick Capture Terminal',
        engines: ['NLP Extractor', 'Graph Linker'],
        verdict: 'Indexed into living space.'
      }
    });

    this.openObjectPanel(newObj, targetSpace.id);
    this.notify();
  }
}

window.store = new MyndStore();
