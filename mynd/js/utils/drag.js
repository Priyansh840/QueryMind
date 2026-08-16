/**
 * MYND — Drag Utility
 * Reusable drag handler for map nodes and other draggable elements.
 */

window.MyndUtils = window.MyndUtils || {};

window.MyndUtils.makeDraggable = function makeDraggable(el, onMove) {
  let startX, startY, origX, origY;
  el.addEventListener('mousedown', e => {
    // Allow only primary click
    if (e.button !== 0) return;
    
    // Stop triggering clicks on node when dragging
    let hasDragged = false;
    
    startX = e.clientX;
    startY = e.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
    
    const move = e2 => {
      const dx = e2.clientX - startX;
      const dy = e2.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDragged = true;
      }
      el.style.left = (origX + dx) + 'px';
      el.style.top = (origY + dy) + 'px';
      if (onMove) onMove();
    };
    
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (hasDragged) {
        // Prevent standard click event if we actually dragged
        const captureClick = (ev) => {
          ev.stopPropagation();
          el.removeEventListener('click', captureClick, true);
        };
        el.addEventListener('click', captureClick, true);
      }
    };
    
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
};
