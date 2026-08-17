/**
 * MYND — Spatial Knowledge Graph & Figma Infinite Canvas Engine
 * Architecture: Apple + Linear + Arc Browser Paradigm
 */

class KnowledgeGraphEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scale = 1.0;
    this.nodes = [];
    this.initCanvas();
  }

  initCanvas() {
    this.container.innerHTML = '';
    const space = window.store.activeSpaceId 
      ? window.store.spaces.find(s => s.id === window.store.activeSpaceId) 
      : window.store.spaces[0];

    if (!space || !space.sections.knowledge) return;

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-mode-viewport';
    canvasWrapper.id = 'spatialCanvasViewport';

    // Toolbar
    canvasWrapper.innerHTML = `
      <div class="canvas-floating-toolbar">
        <span style="font-size: var(--text-micro); font-family: var(--font-mono); font-weight: var(--weight-bold);">${space.name.toUpperCase()} SPATIAL CANVAS</span>
        <div style="display: flex; gap: 4px; margin-left: 8px;">
          <button class="btn btn-secondary btn-sm" id="canvasZoomInBtn">+</button>
          <button class="btn btn-secondary btn-sm" id="canvasZoomOutBtn">−</button>
          <button class="btn btn-ghost btn-sm" id="canvasExitBtn" onclick="window.store.toggleCanvasMode()">Exit Canvas</button>
        </div>
      </div>
      <svg class="canvas-wire-svg" id="canvasWireSvg"></svg>
    `;

    const svg = canvasWrapper.querySelector('#canvasWireSvg');
    const nodes = space.sections.knowledge;

    nodes.forEach((node, index) => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'canvas-node-card';
      const pos = node.canvasPos || { x: 100 + index * 180, y: 120 + (index % 2) * 140 };
      nodeEl.style.left = `${pos.x}px`;
      nodeEl.style.top = `${pos.y}px`;
      nodeEl.id = `canvas-node-${node.id}`;

      nodeEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge ${node.type.includes('Code') ? 'badge-running' : ''}">${node.type}</span>
          <span style="font-size: 9px; font-family: var(--font-mono); color: var(--text-tertiary);">${node.version || 'v1.0'}</span>
        </div>
        <div class="canvas-node-title" style="margin-top: 8px;">${node.title}</div>
        <div class="canvas-node-meta">${node.connections} Connections · ${node.confidence}</div>
      `;

      // Click to open object in Arc multi-panel deck
      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        window.store.openObjectPanel(node, space.id);
        window.store.toggleCanvasMode();
      });

      // Simple drag implementation
      this.makeDraggable(nodeEl, () => this.drawWires(svg, nodes));
      canvasWrapper.appendChild(nodeEl);
    });

    this.container.appendChild(canvasWrapper);
    setTimeout(() => this.drawWires(svg, nodes), 50);

    const zIn = canvasWrapper.querySelector('#canvasZoomInBtn');
    const zOut = canvasWrapper.querySelector('#canvasZoomOutBtn');
    if (zIn) zIn.addEventListener('click', () => this.zoom(1.15, canvasWrapper));
    if (zOut) zOut.addEventListener('click', () => this.zoom(0.85, canvasWrapper));
  }

  drawWires(svg, nodes) {
    if (!svg) return;
    svg.innerHTML = '';
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const n1 = document.getElementById(`canvas-node-${nodes[i].id}`);
      const n2 = document.getElementById(`canvas-node-${nodes[i + 1].id}`);
      if (n1 && n2) {
        const x1 = n1.offsetLeft + n1.offsetWidth;
        const y1 = n1.offsetTop + (n1.offsetHeight / 2);
        const x2 = n2.offsetLeft;
        const y2 = n2.offsetTop + (n2.offsetHeight / 2);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const cx1 = x1 + (x2 - x1) / 2;
        const cy1 = y1;
        const cx2 = x1 + (x2 - x1) / 2;
        const cy2 = y2;
        
        path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
        path.setAttribute('stroke', 'var(--border-strong)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-dasharray', '4 4');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    }
  }

  makeDraggable(el, onMove) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      el.style.top = (el.offsetTop - pos2) + "px";
      el.style.left = (el.offsetLeft - pos1) + "px";
      if (onMove) onMove();
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  zoom(factor, container) {
    this.scale = Math.min(Math.max(this.scale * factor, 0.6), 1.8);
    const nodes = container.querySelectorAll('.canvas-node-card');
    nodes.forEach(n => {
      n.style.transform = `scale(${this.scale})`;
    });
  }
}

window.KnowledgeGraphEngine = KnowledgeGraphEngine;
