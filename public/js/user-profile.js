/**
 * Modern User Profile Component
 * Handles user profile display, dropdown functionality, and user interactions
 */

class UserProfile {
  constructor() {
    this.userIconBtn = document.getElementById('userIconBtn');
    this.userDropdown = document.getElementById('userDropdown');
    this.userNameDisplay = document.getElementById('userNameDisplay');
    this.userRoleBadge = document.getElementById('userRoleBadge');
    this.userName = document.getElementById('user-name');
    this.userEmail = document.getElementById('user-email');
    this.userRole = document.getElementById('user-role');
    this.signOutBtn = document.getElementById('signOutBtn');
    this.profileBtn = document.getElementById('profileBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    
    this.currentUser = null;
    this.isDropdownOpen = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadUserData();
  }

  setupEventListeners() {
    // Toggle dropdown on user profile button click
    if (this.userIconBtn) {
      this.userIconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-profile')) {
        this.closeDropdown();
      }
    });

    // Close dropdown with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isDropdownOpen) {
        this.closeDropdown();
      }
    });

    // Sign out functionality
    if (this.signOutBtn) {
      this.signOutBtn.addEventListener('click', () => {
        this.signOut();
      });
    }

    // Profile button functionality
    if (this.profileBtn) {
      this.profileBtn.addEventListener('click', () => {
        this.openProfile();
      });
    }

    // Settings button functionality
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => {
        this.openSettings();
      });
    }
  }

  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    if (this.userDropdown) {
      this.userDropdown.classList.add('show');
      this.isDropdownOpen = true;
      
      // Add animation class
      this.userDropdown.style.animation = 'slideDown 0.3s ease-out';
    }
  }

  closeDropdown() {
    if (this.userDropdown) {
      this.userDropdown.classList.remove('show');
      this.isDropdownOpen = false;
      
      // Remove animation
      this.userDropdown.style.animation = '';
    }
  }

  async loadUserData() {
    try {
      // Check if Firebase auth is available
      if (typeof getAuth !== 'undefined') {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          await this.updateUserDisplay(user);
        } else {
          // Listen for auth state changes
          onAuthStateChanged(auth, async (user) => {
            if (user) {
              await this.updateUserDisplay(user);
            } else {
              this.showDefaultUser();
            }
          });
        }
      } else {
        // Fallback to localStorage if Firebase is not available
        this.loadUserFromStorage();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showDefaultUser();
    }
  }

  async updateUserDisplay(user) {
    try {
      this.currentUser = user;
      
      // Get user role from Firestore
      let userData = null;
      if (typeof getFirestore !== 'undefined') {
        const db = getFirestore();
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
        }
      }

      // Update display elements
      const displayName = user.displayName || userData?.name || 'User';
      const email = user.email || 'user@example.com';
      const role = userData?.role || 'user';

      // Update main profile button
      if (this.userNameDisplay) {
        this.userNameDisplay.textContent = displayName;
      }

      if (this.userRoleBadge) {
        this.userRoleBadge.textContent = role;
        this.userRoleBadge.className = `user-role-badge ${role}`;
      }

      // Update dropdown content
      if (this.userName) {
        this.userName.textContent = displayName;
      }

      if (this.userEmail) {
        this.userEmail.textContent = email;
      }

      if (this.userRole) {
        this.userRole.textContent = `Role: ${role}`;
      }

      // Store in localStorage for quick access
      localStorage.setItem('userDisplayName', displayName);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', role);

    } catch (error) {
      console.error('Error updating user display:', error);
      this.showDefaultUser();
    }
  }

  loadUserFromStorage() {
    const displayName = localStorage.getItem('userDisplayName') || 'User';
    const email = localStorage.getItem('userEmail') || 'user@example.com';
    const role = localStorage.getItem('userRole') || 'user';

    // Update display elements
    if (this.userNameDisplay) {
      this.userNameDisplay.textContent = displayName;
    }

    if (this.userRoleBadge) {
      this.userRoleBadge.textContent = role;
      this.userRoleBadge.className = `user-role-badge ${role}`;
    }

    if (this.userName) {
      this.userName.textContent = displayName;
    }

    if (this.userEmail) {
      this.userEmail.textContent = email;
    }

    if (this.userRole) {
      this.userRole.textContent = `Role: ${role}`;
    }
  }

  showDefaultUser() {
    const defaultName = 'User';
    const defaultEmail = 'user@example.com';
    const defaultRole = 'user';

    if (this.userNameDisplay) {
      this.userNameDisplay.textContent = defaultName;
    }

    if (this.userRoleBadge) {
      this.userRoleBadge.textContent = defaultRole;
      this.userRoleBadge.className = `user-role-badge ${defaultRole}`;
    }

    if (this.userName) {
      this.userName.textContent = defaultName;
    }

    if (this.userEmail) {
      this.userEmail.textContent = defaultEmail;
    }

    if (this.userRole) {
      this.userRole.textContent = `Role: ${defaultRole}`;
    }
  }

  async signOut() {
    try {
      this.closeDropdown();
      
      // Show loading state
      if (this.signOutBtn) {
        this.signOutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Signing out...</span>';
        this.signOutBtn.disabled = true;
      }

      // Sign out from Firebase if available
      if (typeof getAuth !== 'undefined') {
        const auth = getAuth();
        await signOut(auth);
      }

      // Clear localStorage
      localStorage.removeItem('userDisplayName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userToken');

      // Show success message
      this.showNotification('Successfully signed out', 'success');

      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);

    } catch (error) {
      console.error('Error signing out:', error);
      this.showNotification('Error signing out. Please try again.', 'error');
      
      // Reset sign out button
      if (this.signOutBtn) {
        this.signOutBtn.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> <span>Sign Out</span>';
        this.signOutBtn.disabled = false;
      }
    }
  }

  openProfile() {
    this.closeDropdown();
    // TODO: Implement profile page navigation
    this.showNotification('Profile page coming soon!', 'info');
  }

  openSettings() {
    this.closeDropdown();
    window.location.href = 'settings.html';
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `user-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fa-solid fa-${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${this.getNotificationColor(type)};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  }

  getNotificationColor(type) {
    switch (type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      default: return '#17a2b8';
    }
  }

  // Method to update user info externally
  updateUserInfo(displayName, email, role) {
    if (this.userNameDisplay) {
      this.userNameDisplay.textContent = displayName;
    }

    if (this.userRoleBadge) {
      this.userRoleBadge.textContent = role;
      this.userRoleBadge.className = `user-role-badge ${role}`;
    }

    if (this.userName) {
      this.userName.textContent = displayName;
    }

    if (this.userEmail) {
      this.userEmail.textContent = email;
    }

    if (this.userRole) {
      this.userRole.textContent = `Role: ${role}`;
    }

    // Update localStorage
    localStorage.setItem('userDisplayName', displayName);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userRole', role);
  }

  // Method to get current user info
  getCurrentUser() {
    return {
      displayName: this.userNameDisplay?.textContent || 'User',
      email: this.userEmail?.textContent || 'user@example.com',
      role: localStorage.getItem('userRole') || 'user'
    };
  }
}

// Initialize user profile when DOM is loaded
let userProfile;
document.addEventListener('DOMContentLoaded', () => {
  userProfile = new UserProfile();
});

// Make user profile globally available
window.userProfile = userProfile;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserProfile;
}