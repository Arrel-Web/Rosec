// Mobile Menu Functionality
class MobileMenu {
  constructor() {
    this.init();
  }

  init() {
    this.createMobileElements();
    this.bindEvents();
    this.handleResize();
  }

  createMobileElements() {
    // Create mobile menu toggle button
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle';
    mobileToggle.id = 'mobileMenuToggle';
    mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
    
    // Create mobile overlay
    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay';
    mobileOverlay.id = 'mobileOverlay';
    
    // Insert elements into DOM
    document.body.insertBefore(mobileToggle, document.body.firstChild);
    document.body.insertBefore(mobileOverlay, document.body.firstChild);
  }

  bindEvents() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const sidebar = document.getElementById('sidebar');

    if (!mobileToggle || !sidebar) return;

    // Toggle mobile menu
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMobileMenu();
    });

    // Close menu when clicking overlay
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const isClickInsideSidebar = sidebar.contains(e.target);
        const isClickOnToggle = mobileToggle.contains(e.target);
        
        if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('mobile-open')) {
          this.closeMobileMenu();
        }
      }
    });

    // Close menu when clicking on navigation links (mobile only)
    const navLinks = sidebar.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMobileMenu();
        }
      });
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
        this.closeMobileMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('mobile-open');
    
    if (isOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
  }

  openMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (!sidebar) return;

    sidebar.classList.add('mobile-open');
    mobileToggle?.classList.add('active');
    
    if (mobileOverlay) {
      mobileOverlay.style.display = 'block';
      // Force reflow
      mobileOverlay.offsetHeight;
      mobileOverlay.classList.add('show');
    }

    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';

    // Update toggle icon
    const icon = mobileToggle?.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-times';
    }
  }

  closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (!sidebar) return;

    sidebar.classList.remove('mobile-open');
    mobileToggle?.classList.remove('active');
    
    if (mobileOverlay) {
      mobileOverlay.classList.remove('show');
      setTimeout(() => {
        mobileOverlay.style.display = 'none';
      }, 300);
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Update toggle icon
    const icon = mobileToggle?.querySelector('i');
    if (icon) {
      icon.className = 'fa-solid fa-bars';
    }
  }

  handleResize() {
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (window.innerWidth > 768) {
      // Desktop view - ensure mobile menu is closed
      sidebar?.classList.remove('mobile-open');
      mobileOverlay?.classList.remove('show');
      if (mobileOverlay) {
        mobileOverlay.style.display = 'none';
      }
      document.body.style.overflow = '';
      
      const mobileToggle = document.getElementById('mobileMenuToggle');
      mobileToggle?.classList.remove('active');
      const icon = mobileToggle?.querySelector('i');
      if (icon) {
        icon.className = 'fa-solid fa-bars';
      }
    }
  }
}

// Initialize mobile menu when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MobileMenu();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileMenu;
}