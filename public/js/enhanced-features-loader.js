// Enhanced Features Loader - Loads remaining features
class EnhancedFeaturesLoader {
  constructor() {
    this.features = {
      themeManager: null,
      backupRestore: null
    };
    
    // Disable notifications permanently
    localStorage.setItem('rosec-enhanced-features-seen', 'true');
    
    this.loadFeatures();
  }

  async loadFeatures() {
    try {
      // Load CSS first
      this.loadCSS();
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeFeatures());
      } else {
        this.initializeFeatures();
      }
    } catch (error) {
      console.error('Error loading enhanced features:', error);
    }
  }

  loadCSS() {
    // Load enhanced features CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'css/enhanced-features.css';
    document.head.appendChild(cssLink);
  }

  async initializeFeatures() {
    try {
      // Initialize remaining features
      await this.initializeThemeManager();
      await this.initializeBackupRestore();
      
      // Welcome notification disabled
      // this.showWelcomeNotification();
      
      console.log('✅ Enhanced features loaded successfully!');
    } catch (error) {
      console.error('Error initializing enhanced features:', error);
    }
  }

  async initializeThemeManager() {
    try {
      // Theme Manager - Dark Mode
      const { default: ThemeManager } = await import('./theme-manager.js');
      this.features.themeManager = new ThemeManager();
      window.themeManager = this.features.themeManager;
    } catch (error) {
      console.warn('Theme Manager not loaded:', error);
    }
  }

  
  async initializeBackupRestore() {
    try {
      // Backup & Restore
      const { default: BackupRestore } = await import('./backup-restore.js');
      this.features.backupRestore = new BackupRestore();
      window.backupRestore = this.features.backupRestore;
    } catch (error) {
      console.warn('Backup Restore not loaded:', error);
    }
  }

  showWelcomeNotification() {
    // Notification disabled - no longer showing new features popup
    return;
  }

  // Public API
  getFeature(featureName) {
    return this.features[featureName];
  }

  getAllFeatures() {
    return { ...this.features };
  }

  isFeatureLoaded(featureName) {
    return this.features[featureName] !== null;
  }
}

// Welcome notification styles
const welcomeStyles = `
  .enhanced-features-welcome .welcome-content {
    background: var(--modal-bg, white);
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid var(--border-color, #ddd);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  .enhanced-features-welcome .welcome-header {
    padding: 20px 25px;
    background: linear-gradient(135deg, #1a73e8, #4285f4);
    color: white;
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .enhanced-features-welcome .welcome-header i {
    font-size: 1.5rem;
    color: #ffd700;
  }

  .enhanced-features-welcome .welcome-header h4 {
    margin: 0;
    flex: 1;
    font-size: 1.3rem;
  }

  .enhanced-features-welcome .welcome-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .enhanced-features-welcome .welcome-close:hover {
    background: rgba(255,255,255,0.3);
  }

  .enhanced-features-welcome .welcome-body {
    padding: 25px;
    color: var(--text-primary, #333);
  }

  .enhanced-features-welcome .welcome-body p {
    margin: 0 0 20px 0;
    font-size: 16px;
    color: var(--text-secondary, #666);
  }

  .enhanced-features-welcome .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .enhanced-features-welcome .features-list li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-color, #eee);
  }

  .enhanced-features-welcome .features-list li:last-child {
    border-bottom: none;
  }

  .enhanced-features-welcome .features-list i {
    color: #1a73e8;
    width: 20px;
    text-align: center;
  }

  .enhanced-features-welcome .features-list strong {
    color: var(--text-primary, #333);
  }

  .enhanced-features-welcome .welcome-footer {
    padding: 20px 25px;
    background: var(--bg-secondary, #f8f9fa);
    border-top: 1px solid var(--border-color, #eee);
    display: flex;
    gap: 15px;
    justify-content: flex-end;
  }

  .enhanced-features-welcome .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .enhanced-features-welcome .btn-primary {
    background: #1a73e8;
    color: white;
  }

  .enhanced-features-welcome .btn-primary:hover {
    background: #1557b0;
  }

  .enhanced-features-welcome .btn-secondary {
    background: var(--bg-tertiary, #e9ecef);
    color: var(--text-primary, #333);
  }

  .enhanced-features-welcome .btn-secondary:hover {
    background: var(--border-color, #dee2e6);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 768px) {
    .enhanced-features-welcome .welcome-content {
      width: 95%;
      margin: 20px;
    }
    
    .enhanced-features-welcome .welcome-footer {
      flex-direction: column;
    }
  }
`;

// Add welcome styles
const styleSheet = document.createElement('style');
styleSheet.textContent = welcomeStyles;
document.head.appendChild(styleSheet);

// Initialize enhanced features
const enhancedFeaturesLoader = new EnhancedFeaturesLoader();
window.enhancedFeaturesLoader = enhancedFeaturesLoader;

export default EnhancedFeaturesLoader;