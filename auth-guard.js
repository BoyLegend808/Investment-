/**
 * Novara Capital - Client-Side Authentication Guard
 * Place this script in the <head> of protected pages to prevent unauthorized access.
 */
(function() {
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  if (isAuthenticated !== 'true') {
    // If not authenticated, redirect to the homepage and trigger the login modal
    const currentPath = window.location.pathname;
    let homePath = '../index/index.html';
    
    // Adjust path if we are already in the root directory
    if (currentPath.endsWith('/index.html') || currentPath.endsWith('/')) {
        homePath = 'index.html';
    } else if (currentPath.includes('/index/')) {
        homePath = 'index.html';
    }

    window.location.replace(homePath + '?loginRequired=true&redirect=' + encodeURIComponent(window.location.href));
  }
})();
