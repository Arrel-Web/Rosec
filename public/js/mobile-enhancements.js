/**
 * ROSEC MOBILE ENHANCEMENTS
 * Enhanced mobile interactions and optimizations
 */

class MobileEnhancements {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.isTouch = 'ontouchstart' in window;
    
    // Force mobile enhancements class on HTML
    document.documentElement.classList.add('mobile-enhanced');
    
    // Debug mobile detection
    console.log('Mobile Enhanced Initialized:', {
      isMobile: this.isMobile,
      windowWidth: window.innerWidth,
      isTouch: this.isTouch,
      userAgent: navigator.userAgent
    });
    
    this.init();
  }

  init() {
    this.setupMobileNavigation();
    this.setupTouchOptimizations();
    this.setupFormEnhancements();
    this.setupTableEnhancements();
    this.setupModalEnhancements();
    this.setupAccessibilityFeatures();
    this.handleOrientationChange();
    this.setupSwipeGestures();
    this.setupLandscapePrompt();
  }

  setupMobileNavigation() {
    // Enhanced mobile menu functionality
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    let mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Create mobile overlay if it doesn't exist
    let mobileOverlay = document.querySelector('.mobile-overlay');
    if (!mobileOverlay) {
      mobileOverlay = document.createElement('div');
      mobileOverlay.className = 'mobile-overlay';
      document.body.appendChild(mobileOverlay);
    }

    // Only create mobile menu button if sidebar exists (not on login page)
    if (this.isMobile && sidebar) {
      // Remove any existing mobile menu buttons first
      const existingBtns = document.querySelectorAll('.mobile-menu-toggle, .mobile-menu-btn');
      existingBtns.forEach(btn => btn.remove());
      
      // Create new mobile menu button
      const menuBtn = document.createElement('button');
      menuBtn.className = 'mobile-menu-toggle mobile-menu-btn';
      menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      menuBtn.setAttribute('aria-label', 'Toggle menu');
      menuBtn.style.cssText = `
        position: fixed !important;
        top: 16px !important;
        left: 16px !important;
        z-index: 9999 !important;
        background: linear-gradient(135deg, #1a73e8, #4285f4) !important;
        color: white !important;
        border: none !important;
        width: 48px !important;
        height: 48px !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        cursor: pointer !important;
      `;
      document.body.appendChild(menuBtn);
      
      // Update reference
      mobileMenuToggle = menuBtn;
      
      console.log('Mobile menu button created for sidebar');
    } else if (this.isMobile && !sidebar) {
      console.log('No sidebar found - skipping mobile menu button creation');
      return; // Exit early if no sidebar
    }

    // Toggle function
    const toggleMobileMenu = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log('Toggle mobile menu called');
      
      if (sidebar) {
        const isOpen = sidebar.classList.contains('mobile-open');
        console.log('Sidebar state:', { isOpen, sidebar: sidebar });
        
        if (isOpen) {
          sidebar.classList.remove('mobile-open');
          mobileOverlay.classList.remove('active');
          document.body.style.overflow = '';
          console.log('Sidebar closed');
        } else {
          sidebar.classList.add('mobile-open');
          mobileOverlay.classList.add('active');
          document.body.style.overflow = 'hidden';
          console.log('Sidebar opened');
        }
      } else {
        console.log('No sidebar found for toggle');
      }
    };

    // Event listeners for all possible toggle buttons
    const toggleButtons = [
      sidebarToggle,
      mobileMenuToggle,
      document.querySelector('.mobile-menu-toggle')
    ].filter(Boolean);

    toggleButtons.forEach(button => {
      button.addEventListener('click', toggleMobileMenu);
    });

    // Close on overlay click
    mobileOverlay.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      
      if (wasMobile !== this.isMobile) {
        // Reset mobile menu state when switching between mobile/desktop
        if (sidebar) {
          sidebar.classList.remove('mobile-open');
          mobileOverlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      }
    });

    // FORCE SIDEBAR SCROLLING ON MOBILE - AGGRESSIVE APPROACH
    const forceSidebarScrolling = () => {
      if (sidebar) {
        const sidebarNav = sidebar.querySelector('.sidebar-nav');
        if (sidebarNav) {
          // Force scrolling styles with highest priority
          sidebarNav.style.cssText = `
            overflow-y: scroll !important;
            overflow-x: hidden !important;
            height: calc(100vh - 120px) !important;
            max-height: calc(100vh - 120px) !important;
            -webkit-overflow-scrolling: touch !important;
            flex: 1 !important;
            padding-bottom: 20px !important;
          `;
          
          console.log('Sidebar nav scrolling forced:', {
            scrollHeight: sidebarNav.scrollHeight,
            clientHeight: sidebarNav.clientHeight,
            overflowY: sidebarNav.style.overflowY
          });
        }
        
        // Make sidebar flex container with forced styles
        sidebar.style.cssText += `
          display: flex !important;
          flex-direction: column !important;
        `;
        
        console.log('Sidebar container flex forced');
      }
    };

    // Apply scrolling fixes immediately
    forceSidebarScrolling();
    
    // Reapply when sidebar opens with more aggressive timing
    const originalToggle = toggleMobileMenu;
    toggleMobileMenu = (e) => {
      originalToggle(e);
      // Multiple attempts to ensure scrolling works
      setTimeout(forceSidebarScrolling, 50);
      setTimeout(forceSidebarScrolling, 150);
      setTimeout(forceSidebarScrolling, 300);
    };
  }

  setupTouchOptimizations() {
    if (!this.isTouch) return;

    // Add touch feedback to interactive elements
    const interactiveElements = document.querySelectorAll(`
      button, .btn, .nav-link, .dropdown-item, .user-profile-btn,
      .actions-btn, .delete-btn, .sort-btn, .create-btn, .fab
    `);

    interactiveElements.forEach(element => {
      // Add touch start feedback
      element.addEventListener('touchstart', () => {
        element.style.transform = 'scale(0.98)';
        element.style.opacity = '0.8';
      }, { passive: true });

      // Remove feedback on touch end
      element.addEventListener('touchend', () => {
        setTimeout(() => {
          element.style.transform = '';
          element.style.opacity = '';
        }, 100);
      }, { passive: true });

      // Handle touch cancel
      element.addEventListener('touchcancel', () => {
        element.style.transform = '';
        element.style.opacity = '';
      }, { passive: true });
    });

    // Prevent double-tap zoom on buttons
    interactiveElements.forEach(element => {
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        element.click();
      });
    });
  }

  setupFormEnhancements() {
    // Improve form interactions on mobile
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Auto-scroll to focused input
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (this.isMobile) {
            setTimeout(() => {
              input.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }, 300); // Wait for keyboard to appear
          }
        });

        // Add input validation feedback
        input.addEventListener('invalid', (e) => {
          e.preventDefault();
          this.showValidationMessage(input, input.validationMessage);
        });

        input.addEventListener('input', () => {
          this.clearValidationMessage(input);
        });
      });
    });

    // Enhance select dropdowns
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      if (this.isMobile) {
        // Add mobile-friendly styling
        select.style.fontSize = '16px';
        select.style.minHeight = '44px';
      }
    });
  }

  setupTableEnhancements() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const container = table.closest('.table-container');
      if (!container) return;

      // Add scroll indicators
      this.addScrollIndicators(container);
      
      // Handle horizontal scrolling
      container.addEventListener('scroll', () => {
        this.updateScrollIndicators(container);
      });

      // Add swipe scrolling for touch devices
      if (this.isTouch) {
        this.addSwipeScrolling(container);
      }
    });
  }

  setupModalEnhancements() {
    const modals = document.querySelectorAll('.modal, .exam-sheet-modal');
    
    modals.forEach(modal => {
      // Prevent background scrolling when modal is open
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = modal.style.display !== 'none' && 
                            !modal.classList.contains('hidden');
            
            if (isVisible && this.isMobile) {
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
            } else {
              document.body.style.overflow = '';
              document.body.style.position = '';
              document.body.style.width = '';
            }
          }
        });
      });

      observer.observe(modal, { attributes: true });

      // Add swipe-to-close functionality
      if (this.isTouch) {
        this.addSwipeToClose(modal);
      }
    });
  }

  setupAccessibilityFeatures() {
    // Enhance focus management
    const focusableElements = document.querySelectorAll(`
      button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])
    `);

    focusableElements.forEach(element => {
      // Ensure focus is visible
      element.addEventListener('focus', () => {
        if (element.offsetParent === null) return; // Skip hidden elements
        
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      });
    });

    // Add skip links for keyboard navigation
    this.addSkipLinks();
  }

  handleOrientationChange() {
    window.addEventListener('orientationchange', () => {
      // Handle orientation change with a delay to ensure viewport is updated
      setTimeout(() => {
        // Refresh any layout calculations
        this.isMobile = window.innerWidth <= 768;
        
        // Close mobile menu if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          document.querySelector('.mobile-overlay')?.classList.remove('active');
          document.body.style.overflow = '';
        }

        // Trigger resize event for other components
        window.dispatchEvent(new Event('resize'));
      }, 100);
    });
  }

  setupSwipeGestures() {
    if (!this.isTouch) return;

    let startX, startY, currentX, currentY;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;
      
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!startX || !startY || !currentX || !currentY) return;

      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Minimum swipe distance
      if (Math.abs(diffX) < 50 && Math.abs(diffY) < 50) return;

      // Horizontal swipe is more significant
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          // Swipe left - close sidebar if open
          this.handleSwipeLeft();
        } else {
          // Swipe right - open sidebar if closed
          this.handleSwipeRight();
        }
      }

      // Reset values
      startX = startY = currentX = currentY = null;
    }, { passive: true });
  }

  // Helper methods
  addScrollIndicators(container) {
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = '← Scroll to see more →';
    indicator.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      opacity: 0.8;
      pointer-events: none;
      z-index: 10;
    `;
    
    container.style.position = 'relative';
    container.appendChild(indicator);
    
    // Hide indicator if not scrollable
    if (container.scrollWidth <= container.clientWidth) {
      indicator.style.display = 'none';
    }
  }

  updateScrollIndicators(container) {
    const indicator = container.querySelector('.scroll-indicator');
    if (!indicator) return;

    const isScrollable = container.scrollWidth > container.clientWidth;
    const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 5;
    
    if (!isScrollable || isAtEnd) {
      indicator.style.opacity = '0';
    } else {
      indicator.style.opacity = '0.8';
    }
  }

  addSwipeScrolling(container) {
    let startX, scrollLeft;

    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!startX) return;
      
      const x = e.touches[0].pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      container.scrollLeft = scrollLeft - walk;
    }, { passive: true });
  }

  addSwipeToClose(modal) {
    let startY, currentY;

    modal.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    modal.addEventListener('touchmove', (e) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // Only allow downward swipe to close
      if (diff > 0) {
        modal.style.transform = `translateY(${diff}px)`;
        modal.style.opacity = Math.max(0.5, 1 - (diff / 300));
      }
    }, { passive: true });

    modal.addEventListener('touchend', () => {
      const diff = currentY - startY;
      
      if (diff > 100) {
        // Close modal
        modal.style.display = 'none';
        document.body.style.overflow = '';
      } else {
        // Snap back
        modal.style.transform = '';
        modal.style.opacity = '';
      }
      
      startY = currentY = null;
    }, { passive: true });
  }

  addSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #1a73e8;
      color: white;
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 9999;
      transition: top 0.3s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content ID if it doesn't exist
    const mainContent = document.querySelector('.main-area, main, .container');
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
  }

  handleSwipeLeft() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      document.querySelector('.mobile-overlay')?.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  handleSwipeRight() {
    if (this.isMobile && window.scrollX < 50) { // Only if near left edge
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.classList.contains('mobile-open')) {
        sidebar.classList.add('mobile-open');
        document.querySelector('.mobile-overlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  showValidationMessage(input, message) {
    this.clearValidationMessage(input);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #ea4335;
      font-size: 12px;
      margin-top: 4px;
      padding: 4px 8px;
      background: #fce8e6;
      border-radius: 4px;
      border: 1px solid #f28b82;
    `;
    
    input.parentNode.appendChild(errorDiv);
    input.style.borderColor = '#ea4335';
  }

  clearValidationMessage(input) {
    const existingMessage = input.parentNode.querySelector('.validation-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    input.style.borderColor = '';
  }

  setupLandscapePrompt() {
    // Only show on mobile devices
    if (!this.isMobile) return;

    // Check if user has dismissed the prompt before
    const hasSeenPrompt = localStorage.getItem('rosec-landscape-prompt-seen');
    if (hasSeenPrompt) return;

    // Create landscape prompt element
    const landscapePrompt = document.createElement('div');
    landscapePrompt.className = 'landscape-prompt';
    landscapePrompt.innerHTML = `
      <div class="landscape-prompt-content">
        <div class="landscape-prompt-icon">
          <i class="fa-solid fa-mobile-screen-button"></i>
        </div>
        <h2>Better Experience in Landscape</h2>
        <p>For the best experience with Rosec, please rotate your device to landscape mode.</p>
        <button class="landscape-prompt-dismiss">
          <i class="fa-solid fa-times"></i> Continue in Portrait
        </button>
      </div>
    `;

    document.body.appendChild(landscapePrompt);

    // Function to check orientation and show/hide prompt
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobileSize = window.innerWidth <= 768;
      
      if (isMobileSize && isPortrait && !hasSeenPrompt) {
        landscapePrompt.classList.add('show');
        document.body.classList.add('landscape-prompt-active');
      } else {
        landscapePrompt.classList.remove('show');
        document.body.classList.remove('landscape-prompt-active');
      }
    };

    // Handle dismiss button
    const dismissBtn = landscapePrompt.querySelector('.landscape-prompt-dismiss');
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem('rosec-landscape-prompt-seen', 'true');
      landscapePrompt.classList.remove('show');
      document.body.classList.remove('landscape-prompt-active');
    });

    // Check orientation on load and orientation change
    checkOrientation();
    
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 100); // Delay to ensure orientation change is complete
    });

    window.addEventListener('resize', checkOrientation);

    // Auto-dismiss after 10 seconds if user doesn't interact
    setTimeout(() => {
      if (landscapePrompt.classList.contains('show')) {
        dismissBtn.click();
      }
    }, 10000);
  }
}

// Initialize mobile enhancements when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MobileEnhancements();
  });
} else {
  new MobileEnhancements();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileEnhancements;
}
