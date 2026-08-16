/**
 * MYND — Radial Map Viewport
 * Highly interactive, draggable connections map used on Home and Space views.
 */

window.MyndUtils = window.MyndUtils || {};

window.MyndUtils.initMapViewport = function initMapViewport(containerId) {
  const makeDraggable = window.MyndUtils.makeDraggable;
  const container = document.getElementById(containerId);
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  // Viewport SVG wrapper for wires
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-svg-lines');
  container.appendChild(svg);

  // Surrounding branches info based on mockup
  const branches = [
    { id: 'resume', label: 'Resume', cat: 'resume', xOffset: -160, yOffset: -80, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>` },
    { id: 'projects', label: 'Projects', cat: 'projects', xOffset: -200, yOffset: 0, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>` },
    { id: 'interviews', label: 'Interviews', cat: 'interviews', xOffset: -150, yOffset: 80, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>` },
    { id: 'goals', label: 'Goals', cat: 'goals', xOffset: 0, yOffset: 110, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>` },
    { id: 'certs', label: 'Certifications', cat: 'certs', xOffset: 140, yOffset: 80, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>` },
    { id: 'skills', label: 'Skills', cat: 'skills', xOffset: 160, yOffset: -10, icon: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>` }
  ];

  // Helper to redraw connections
  const updateLines = () => {
    svg.innerHTML = '';
    const hubEl = document.getElementById('mapHubNode');
    if (!hubEl) return;

    const hx = hubEl.offsetLeft + hubEl.offsetWidth / 2;
    const hy = hubEl.offsetTop + hubEl.offsetHeight / 2;

    branches.forEach(b => {
      const nodeEl = document.getElementById(`mapNode-${b.id}`);
      if (!nodeEl) return;

      const nx = nodeEl.offsetLeft + nodeEl.offsetWidth / 2;
      const ny = nodeEl.offsetTop + nodeEl.offsetHeight / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'map-svg-line');
      
      // Smooth bezier curves
      const mx = (hx + nx) / 2;
      path.setAttribute('d', `M ${hx} ${hy} C ${mx} ${hy}, ${mx} ${ny}, ${nx} ${ny}`);
      svg.appendChild(path);
    });
  };

  // 1. Render Center Hub Node
  const hub = document.createElement('div');
  hub.className = 'map-hub-node';
  hub.id = 'mapHubNode';
  hub.style.left = `${cx - 36}px`;
  hub.style.top = `${cy - 36}px`;
  hub.innerHTML = `
    <div class="map-hub-icon-circle">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    </div>
  `;
  container.appendChild(hub);
  makeDraggable(hub, updateLines);

  // 2. Render Surrounding Branches
  branches.forEach(b => {
    const node = document.createElement('div');
    node.className = 'map-node';
    node.id = `mapNode-${b.id}`;
    node.style.left = `${cx + b.xOffset - 24}px`;
    node.style.top = `${cy + b.yOffset - 24}px`;
    node.innerHTML = `
      <div class="map-node-icon" style="color: var(--accent); background: var(--surface-subtle);">${b.icon}</div>
      <div class="map-node-label">${b.label}</div>
    `;
    node.onclick = () => window.store.selectSpace(b.cat);
    container.appendChild(node);
    makeDraggable(node, updateLines);
  });

  // Initial draw
  updateLines();
};
