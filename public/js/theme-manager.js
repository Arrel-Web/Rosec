// Theme Manager - Handles Dark Mode and UI preferences
class ThemeManager {
  constructor() {
    // Force light mode as default - clear any existing dark mode settings
    this.currentTheme = 'light';
    
    // Only use stored theme if user has manually set it to dark mode
    const storedTheme = localStorage.getItem('rosec-theme');
    const manuallySet = localStorage.getItem('rosec-theme-manual');
    
    if (storedTheme === 'dark' && manuallySet === 'true') {
      this.currentTheme = 'dark';
    } else {
      // Force light mode and clear any conflicting settings
      localStorage.setItem('rosec-theme', 'light');
      localStorage.removeItem('rosec-theme-manual');
    }
    
    this.initializeTheme();
    this.createThemeToggle();
  }

  initializeTheme() {
    // Apply theme immediately to prevent flash
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.addThemeStyles();
  }

  addThemeStyles() {
    const themeStyles = `
      :root {
        /* Light theme variables */
        --bg-primary: #ffffff;
        --bg-secondary: #f8f9fa;
        --bg-tertiary: #e9ecef;
        --text-primary: #333333;
        --text-secondary: #666666;
        --text-muted: #999999;
        --border-color: #dee2e6;
        --shadow: 0 2px 10px rgba(0,0,0,0.1);
        --shadow-hover: 0 4px 20px rgba(0,0,0,0.15);
        --accent-primary: #1a73e8;
        --accent-secondary: #ffcc00;
        --success: #28a745;
        --warning: #ffc107;
        --danger: #dc3545;
        --info: #17a2b8;
        --sidebar-bg: #2d3e50;
        --sidebar-text: #ffffff;
        --topbar-bg: #ffffff;
        --card-bg: #ffffff;
        --input-bg: #ffffff;
        --input-border: #dee2e6;
        --table-stripe: #f8f9fa;
        --modal-bg: #ffffff;
        --overlay-bg: rgba(0,0,0,0.5);
      }

      [data-theme="dark"] {
        /* Dark theme variables */
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #404040;
        --text-primary: #ffffff;
        --text-secondary: #cccccc;
        --text-muted: #999999;
        --border-color: #404040;
        --shadow: 0 2px 10px rgba(0,0,0,0.3);
        --shadow-hover: 0 4px 20px rgba(0,0,0,0.4);
        --accent-primary: #4285f4;
        --accent-secondary: #ffd700;
        --success: #4caf50;
        --warning: #ff9800;
        --danger: #f44336;
        --info: #2196f3;
        --sidebar-bg: #1e1e1e;
        --sidebar-text: #ffffff;
        --topbar-bg: #2d2d2d;
        --card-bg: #2d2d2d;
        --input-bg: #404040;
        --input-border: #555555;
        --table-stripe: #333333;
        --modal-bg: #2d2d2d;
        --overlay-bg: rgba(0,0,0,0.8);
      }

      /* Apply theme variables to elements */
      body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
      }

      .main-area {
        background: var(--bg-secondary);
      }

      .sidebar {
        background: var(--sidebar-bg);
        color: var(--sidebar-text);
      }

      .topbar {
        background: var(--topbar-bg);
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
      }

      .card, .stat-card, .chart-card, .performance-card, .recent-activity {
        background: var(--card-bg);
        color: var(--text-primary);
        box-shadow: var(--shadow);
        border: 1px solid var(--border-color);
      }

      .card:hover, .stat-card:hover {
        box-shadow: var(--shadow-hover);
      }

      input, select, textarea {
        background: var(--input-bg);
        color: var(--text-primary);
        border: 1px solid var(--input-border);
      }

      input:focus, select:focus, textarea:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
      }

      .table-container {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
      }

      .exams-table th {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
      }

      .exams-table td {
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
      }

      .exams-table tr:nth-child(even) {
        background: var(--table-stripe);
      }

      .exams-table tr:hover {
        background: var(--bg-tertiary);
      }

      .modal, .export-modal {
        background: var(--overlay-bg);
      }

      .modal-content, .export-modal-content {
        background: var(--modal-bg);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .dropdown-menu, .sort-menu, .user-dropdown {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
      }

      .dropdown-item, .sort-option {
        color: var(--text-primary);
      }

      .dropdown-item:hover, .sort-option:hover {
        background: var(--bg-tertiary);
      }

      .btn-secondary {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .btn-secondary:hover {
        background: var(--border-color);
      }

      .loading-spinner {
        border-color: var(--border-color);
        border-top-color: var(--accent-primary);
      }

      .empty-state {
        color: var(--text-secondary);
      }

      .bulk-actions-bar {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .notification {
        box-shadow: var(--shadow-hover);
      }

      /* Chart.js dark mode support */
      [data-theme="dark"] .chart-container canvas {
        filter: brightness(0.9);
      }

      /* Scrollbar styling for dark mode */
      [data-theme="dark"] ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      [data-theme="dark"] ::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }

      [data-theme="dark"] ::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }

      [data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }

      /* Animation for theme transition */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }

      /* Comprehensive dark mode fixes for better visibility */
      
      /* All headings and text elements */
      [data-theme="dark"] h1,
      [data-theme="dark"] h2,
      [data-theme="dark"] h3,
      [data-theme="dark"] h4,
      [data-theme="dark"] h5,
      [data-theme="dark"] h6 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] p,
      [data-theme="dark"] span,
      [data-theme="dark"] div,
      [data-theme="dark"] strong,
      [data-theme="dark"] b,
      [data-theme="dark"] em,
      [data-theme="dark"] i:not(.fa-solid):not(.fa-regular):not(.fa-light):not(.fa-brands) {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .brand h1,
      [data-theme="dark"] .brand h2 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .sub {
        color: var(--text-secondary) !important;
      }

      /* Specific component styling */
      [data-theme="dark"] .exam-name,
      [data-theme="dark"] .class-name,
      [data-theme="dark"] .student-count,
      [data-theme="dark"] .exam-state,
      [data-theme="dark"] .scheduled-date {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .form-card,
      [data-theme="dark"] .grid-container,
      [data-theme="dark"] .class-card,
      [data-theme="dark"] .subject-card,
      [data-theme="dark"] .setup-section,
      [data-theme="dark"] .setup-card,
      [data-theme="dark"] .scanner-status,
      [data-theme="dark"] .batch-controls,
      [data-theme="dark"] .progress-section,
      [data-theme="dark"] .results-section,
      [data-theme="dark"] .exam-card,
      [data-theme="dark"] .content-section,
      [data-theme="dark"] .answer-key-creator,
      [data-theme="dark"] .answer-key-preview {
        background: var(--card-bg) !important;
        color: var(--text-primary) !important;
        border-color: var(--border-color) !important;
      }

      [data-theme="dark"] .form-group label,
      [data-theme="dark"] .control-group label {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .grid-header h3,
      [data-theme="dark"] .form-card h3,
      [data-theme="dark"] .setup-card h3,
      [data-theme="dark"] .chart-title,
      [data-theme="dark"] .section-title {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .class-card h5,
      [data-theme="dark"] .subject-card h4 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .card-detail .label,
      [data-theme="dark"] .card-detail .value,
      [data-theme="dark"] .subject-id,
      [data-theme="dark"] .teacher-info,
      [data-theme="dark"] .detail-label,
      [data-theme="dark"] .detail-value {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .empty-state h3 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .empty-state p {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .section-divider h4 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .teacher-welcome h3 {
        color: var(--accent-primary) !important;
      }

      [data-theme="dark"] .teacher-welcome p {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .selected-count {
        color: var(--accent-primary) !important;
      }

      [data-theme="dark"] .table-title h1 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .sort-btn {
        background: var(--card-bg) !important;
        color: var(--text-primary) !important;
        border-color: var(--border-color) !important;
      }

      [data-theme="dark"] .sort-btn:hover {
        border-color: var(--accent-primary) !important;
        color: var(--accent-primary) !important;
      }

      [data-theme="dark"] .actions-btn {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .actions-btn:hover {
        background: var(--bg-tertiary) !important;
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .loading-cell {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .muted {
        color: var(--text-muted) !important;
      }

      [data-theme="dark"] .suggested-pill {
        background: var(--bg-tertiary) !important;
        color: var(--accent-primary) !important;
      }

      [data-theme="dark"] .subject-title {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .subject-meta {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .fab-item {
        background: var(--card-bg) !important;
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .fab-item:hover {
        background: var(--bg-tertiary) !important;
      }

      [data-theme="dark"] .modal-close {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .modal-close:hover {
        background: var(--bg-tertiary) !important;
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .answer-key-status.has-key {
        color: var(--success) !important;
        background: rgba(76, 175, 80, 0.2) !important;
        border-color: var(--success) !important;
      }

      [data-theme="dark"] .answer-key-status.no-key {
        color: var(--danger) !important;
        background: rgba(244, 67, 54, 0.2) !important;
        border-color: var(--danger) !important;
      }

      /* Analytics page specific */
      [data-theme="dark"] .analytics-header h3,
      [data-theme="dark"] .analytics-header p {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .stat-value {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .stat-label {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .performance-name {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .activity-title {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .activity-time {
        color: var(--text-secondary) !important;
      }

            [data-theme="dark"] .status-card p {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .progress-stats span,
      [data-theme="dark"] .progress-stats strong {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .results-table th {
        background: var(--bg-tertiary) !important;
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .results-table td {
        color: var(--text-primary) !important;
      }

      /* Exam details specific */
      [data-theme="dark"] .exam-header h1 {
        color: white !important;
      }

      [data-theme="dark"] .exam-meta span {
        color: rgba(255,255,255,0.9) !important;
      }

      [data-theme="dark"] .header-title h1,
      [data-theme="dark"] .header-title p {
        color: var(--text-primary) !important;
      }

      /* Subject details specific */
      [data-theme="dark"] .topbar h1 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .topbar .meta {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .label {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .summary {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .summary b {
        color: var(--accent-primary) !important;
      }

      /* Academic periods specific */
      [data-theme="dark"] .page-header h1 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .page-header p {
        color: var(--text-secondary) !important;
      }

      [data-theme="dark"] .academic-year-card h5 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .semester-header h5 {
        color: var(--text-primary) !important;
      }

      /* Answer sheet maker specific */
      [data-theme="dark"] .config-card h3 {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] .required-field {
        color: var(--danger) !important;
      }

      [data-theme="dark"] .sheet-header h2 {
        color: #000 !important;
      }

      [data-theme="dark"] .sheet-header p {
        color: #333 !important;
      }

      /* General table styling */
      [data-theme="dark"] table th {
        background: var(--bg-tertiary) !important;
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] table td {
        color: var(--text-primary) !important;
      }

      [data-theme="dark"] table tr:hover {
        background: var(--bg-tertiary) !important;
      }

      /* Status badges and indicators */
      [data-theme="dark"] .status-badge,
      [data-theme="dark"] .score-badge,
      [data-theme="dark"] .badge {
        color: inherit !important;
      }

      /* Special handling for login page */
      .login--container, .login--toggle-container {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(255,255,255,0.25);
      }

      [data-theme="dark"] .login--container,
      [data-theme="dark"] .login--toggle-container {
        background: rgba(45,45,45,0.8);
        backdrop-filter: blur(20px);
        border: 2px solid rgba(255,255,255,0.1);
      }

      [data-theme="dark"] .login--username-container,
      [data-theme="dark"] .login--password-container {
        background: rgba(45,45,45,0.8);
        border: 2px solid rgba(255,255,255,0.1);
      }

      [data-theme="dark"] .login--username-container input,
      [data-theme="dark"] .login--password-container input {
        background: rgba(64,64,64,0.8);
        color: white;
        border: 2px solid rgba(255,255,255,0.2);
      }

      /* Theme toggle button */
      .theme-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--accent-primary);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        box-shadow: var(--shadow-hover);
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .theme-toggle:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(26, 115, 232, 0.4);
      }

      .theme-toggle i {
        transition: transform 0.3s ease;
      }

      .theme-toggle:hover i {
        transform: rotate(180deg);
      }

      /* Mobile adjustments */
      @media (max-width: 768px) {
        .theme-toggle {
          bottom: 80px;
          right: 15px;
          width: 45px;
          height: 45px;
          font-size: 1rem;
        }
      }

      /* Print mode - always light */
      @media print {
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #ffffff;
          --text-primary: #000000;
          --text-secondary: #333333;
          --border-color: #cccccc;
        }
      }
    `;

    // Remove existing theme styles
    const existingStyles = document.getElementById('theme-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    // Add new theme styles
    const styleSheet = document.createElement('style');
    styleSheet.id = 'theme-styles';
    styleSheet.textContent = themeStyles;
    document.head.appendChild(styleSheet);
  }

  createThemeToggle() {
    // Don't add toggle on login page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      return;
    }

    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.id = 'themeToggle';
    toggle.title = 'Toggle Dark Mode';
    toggle.innerHTML = this.currentTheme === 'dark' 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';

    toggle.addEventListener('click', () => this.toggleTheme());
    document.body.appendChild(toggle);

    // Add to user dropdown as well
    this.addThemeOptionToUserDropdown();
  }

  addThemeOptionToUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
      // Check if theme option already exists to prevent duplicates
      const existingThemeOption = userDropdown.querySelector('.theme-dropdown-option');
      if (existingThemeOption) {
        existingThemeOption.remove();
      }

      const themeOption = document.createElement('button');
      themeOption.className = 'theme-dropdown-option';
      themeOption.innerHTML = `
        <i class="fa-solid fa-${this.currentTheme === 'dark' ? 'sun' : 'moon'}"></i>
        ${this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      `;
      themeOption.style.cssText = `
        width: 100%;
        padding: 10px 15px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 10px;
        transition: background 0.2s ease;
      `;
      themeOption.addEventListener('mouseover', () => {
        themeOption.style.background = 'var(--bg-tertiary)';
      });
      themeOption.addEventListener('mouseout', () => {
        themeOption.style.background = 'none';
      });
      themeOption.addEventListener('click', () => this.toggleTheme());

      // Add before the divider
      const divider = userDropdown.querySelector('.divider');
      if (divider) {
        userDropdown.insertBefore(themeOption, divider);
      } else {
        userDropdown.appendChild(themeOption);
      }
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('rosec-theme', this.currentTheme);
    localStorage.setItem('rosec-theme-manual', 'true'); // Mark as manually set

    // Update toggle button
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.innerHTML = this.currentTheme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
    }

    // Update dropdown option
    const dropdownOption = document.querySelector('.theme-dropdown-option');
    if (dropdownOption) {
      dropdownOption.innerHTML = `
        <i class="fa-solid fa-${this.currentTheme === 'dark' ? 'sun' : 'moon'}"></i>
        ${this.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      `;
    }

    // Update charts if they exist
    this.updateChartsForTheme();

    // Show notification
    this.showThemeNotification();
  }

  // Method to reset theme to light mode
  resetToLightMode() {
    this.currentTheme = 'light';
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('rosec-theme', 'light');
    localStorage.removeItem('rosec-theme-manual');
    
    // Update UI elements
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    const dropdownOption = document.querySelector('.theme-dropdown-option');
    if (dropdownOption) {
      dropdownOption.innerHTML = `
        <i class="fa-solid fa-moon"></i>
        Dark Mode
      `;
    }
    
    this.updateChartsForTheme();
  }

  updateChartsForTheme() {
    // Update Chart.js charts for dark mode
    if (typeof Chart !== 'undefined') {
      Chart.defaults.color = this.currentTheme === 'dark' ? '#ffffff' : '#333333';
      Chart.defaults.borderColor = this.currentTheme === 'dark' ? '#404040' : '#dee2e6';
      Chart.defaults.backgroundColor = this.currentTheme === 'dark' ? '#2d2d2d' : '#ffffff';

      // Update existing charts
      Chart.instances.forEach(chart => {
        if (chart.options.scales) {
          Object.keys(chart.options.scales).forEach(scaleKey => {
            const scale = chart.options.scales[scaleKey];
            if (scale.grid) {
              scale.grid.color = this.currentTheme === 'dark' ? '#404040' : '#dee2e6';
            }
            if (scale.ticks) {
              scale.ticks.color = this.currentTheme === 'dark' ? '#ffffff' : '#333333';
            }
          });
        }
        chart.update();
      });
    }
  }

  showThemeNotification() {
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
      <i class="fa-solid fa-${this.currentTheme === 'dark' ? 'moon' : 'sun'}"></i>
      <span>Switched to ${this.currentTheme} mode</span>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: var(--accent-primary);
      color: white;
      border-radius: 6px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: var(--shadow-hover);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
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

  // Auto theme based on system preference
  enableAutoTheme() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleThemeChange = (e) => {
        if (!localStorage.getItem('rosec-theme-manual')) {
          this.currentTheme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', this.currentTheme);
          this.updateChartsForTheme();
        }
      };

      mediaQuery.addListener(handleThemeChange);
      handleThemeChange(mediaQuery);
    }
  }

  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Set theme programmatically
  setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      this.currentTheme = theme;
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      localStorage.setItem('rosec-theme', this.currentTheme);
      localStorage.setItem('rosec-theme-manual', 'true');
      this.updateChartsForTheme();
    }
  }
}

// Initialize theme manager
let themeManager;
document.addEventListener('DOMContentLoaded', () => {
  themeManager = new ThemeManager();
  
  // Disable auto theme detection - always start with light mode unless manually set
  // if (!localStorage.getItem('rosec-theme-manual')) {
  //   themeManager.enableAutoTheme();
  // }
});

// Make theme manager globally available
window.themeManager = themeManager;

export default ThemeManager;