/**
 * MYND — Header Component
 */
window.MyndComponents = window.MyndComponents || {};

window.MyndComponents.renderHeader = function renderHeader() {
  const headerAvatar = document.getElementById('userAvatarHeader');
  if (headerAvatar) headerAvatar.src = 'assets/aryan.jpg';
};
