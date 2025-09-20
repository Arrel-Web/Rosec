// Sidebar Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mainArea = document.querySelector('.main-area');
  
  // Check if elements exist
  if (!sidebar || !sidebarToggle) {
    console.warn('Sidebar toggle elements not found');
    return;
  }
  
  // Load saved sidebar state from localStorage
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState === 'true') {
    sidebar.classList.add('collapsed');
    updateMainAreaMargin(true);
  }
  
  // Toggle sidebar on button click
  sidebarToggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expand sidebar
      sidebar.classList.remove('collapsed');
      updateMainAreaMargin(false);
      localStorage.setItem('sidebarCollapsed', 'false');
    } else {
      // Collapse sidebar
      sidebar.classList.add('collapsed');
      updateMainAreaMargin(true);
      localStorage.setItem('sidebarCollapsed', 'true');
    }
  });
  
  // Update main area margin based on sidebar state
  function updateMainAreaMargin(isCollapsed) {
    if (mainArea) {
      if (isCollapsed) {
        mainArea.style.marginLeft = '80px';
        mainArea.style.width = 'calc(100% - 80px)';
      } else {
        mainArea.style.marginLeft = '280px';
        mainArea.style.width = 'calc(100% - 280px)';
      }
    }
  }
  
  // Handle keyboard shortcut (Ctrl + B or Cmd + B)
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      sidebarToggle.click();
    }
  });
  
  // Handle responsive behavior
  function handleResize() {
    if (window.innerWidth <= 1024) {
      // Mobile/tablet: hide sidebar completely
      if (mainArea) {
        mainArea.style.marginLeft = '0';
        mainArea.style.width = '100%';
      }
    } else {
      // Desktop: apply proper margins based on sidebar state
      const isCollapsed = sidebar.classList.contains('collapsed');
      updateMainAreaMargin(isCollapsed);
    }
  }
  
  // Initial check
  handleResize();
  
  // Listen for resize events
  window.addEventListener('resize', handleResize);
});

// Export for use in other modules if needed
export function toggleSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.click();
  }
}

export function getSidebarState() {
  const sidebar = document.getElementById('sidebar');
  return sidebar ? sidebar.classList.contains('collapsed') : false;
}