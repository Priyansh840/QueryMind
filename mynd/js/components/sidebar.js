/**
 * MYND — Sidebar Component
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderSidebar = function renderSidebar() {
  const store = window.store;

  // Nav Items Active state
  document.querySelectorAll('.app-sidebar .nav-item[id]').forEach(el => {
    const id = el.getAttribute('id');
    const isHome = id === 'navHome' && store.activeRoute === 'home' && !store.activeSpaceId;
    const isWorkspace = id === 'navWorkspace' && store.activeRoute === 'workspace' && !store.activeSpaceId;
    const isSearch = id === 'navSearch' && store.activeRoute === 'search';
    const isActivity = id === 'navActivity' && store.activeRoute === 'intelligence';
    el.classList.toggle('active', isHome || isWorkspace || isSearch || isActivity);
  });

  // Space list active state
  document.querySelectorAll('.app-sidebar .nav-space').forEach(el => {
    const space = el.getAttribute('data-space');
    el.classList.toggle('active', space === store.activeSpaceId);
  });

  // Sync profile picture
  const sidebarAvatar = document.getElementById('userAvatarSidebar');
  if (sidebarAvatar) sidebarAvatar.src = 'assets/aryan.jpg';
};
