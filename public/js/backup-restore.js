// Backup/Restore Manager - Data protection features
class BackupRestore {
  constructor() {
    this.backupHistory = JSON.parse(localStorage.getItem('rosec-backup-history') || '[]');
    this.autoBackupEnabled = localStorage.getItem('rosec-auto-backup') === 'true';
    this.backupInterval = null;
    this.maxBackupSize = 50 * 1024 * 1024; // 50MB limit
    this.compressionEnabled = true;
    
    this.initializeBackupSystem();
  }

  initializeBackupSystem() {
    this.createBackupInterface();
    this.setupAutoBackup();
    this.createBackupModal();
    this.loadBackupHistory();
  }

  createBackupInterface() {
    // Add backup button to user dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
      const backupOption = document.createElement('button');
      backupOption.className = 'backup-dropdown-option';
      backupOption.innerHTML = `
        <i class="fa-solid fa-shield-halved"></i>
        Backup & Restore
      `;
      backupOption.style.cssText = `
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
      backupOption.addEventListener('mouseover', () => {
        backupOption.style.background = 'var(--bg-tertiary)';
      });
      backupOption.addEventListener('mouseout', () => {
        backupOption.style.background = 'none';
      });
      backupOption.addEventListener('click', () => this.showBackupModal());

      const divider = userDropdown.querySelector('.divider');
      if (divider) {
        userDropdown.insertBefore(backupOption, divider);
      } else {
        userDropdown.appendChild(backupOption);
      }
    }

    // Add floating backup button
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'floating-backup-btn';
    floatingBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    floatingBtn.title = 'Backup & Restore';
    floatingBtn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--success);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      box-shadow: var(--shadow-hover);
      transition: all 0.3s ease;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    floatingBtn.addEventListener('click', () => this.showBackupModal());
    document.body.appendChild(floatingBtn);
  }

  createBackupModal() {
    const modal = document.createElement('div');
    modal.id = 'backupRestoreModal';
    modal.className = 'backup-restore-modal';
    modal.innerHTML = `
      <div class="backup-restore-content">
        <div class="backup-restore-header">
          <h3><i class="fa-solid fa-shield-halved"></i> Backup & Restore</h3>
          <button class="backup-modal-close" id="closeBackupModal">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="backup-restore-body">
          <div class="backup-tabs">
            <button class="backup-tab active" data-tab="backup">Backup</button>
            <button class="backup-tab" data-tab="restore">Restore</button>
            <button class="backup-tab" data-tab="settings">Settings</button>
            <button class="backup-tab" data-tab="history">History</button>
          </div>
          
          <div class="backup-tab-content">
            <!-- Backup Tab -->
            <div class="backup-tab-panel active" id="backupTab">
              <div class="backup-section">
                <div class="backup-info-card">
                  <div class="backup-info-header">
                    <i class="fa-solid fa-info-circle"></i>
                    <h4>Create Backup</h4>
                  </div>
                  <p>Create a complete backup of your Rosec data including exams, students, results, and settings.</p>
                  <div class="backup-stats">
                    <div class="backup-stat">
                      <span class="stat-label">Data Size:</span>
                      <span class="stat-value" id="dataSize">Calculating...</span>
                    </div>
                    <div class="backup-stat">
                      <span class="stat-label">Last Backup:</span>
                      <span class="stat-value" id="lastBackupDate">Never</span>
                    </div>
                  </div>
                </div>
                
                <div class="backup-options">
                  <h4>Backup Options</h4>
                  <div class="backup-option-group">
                    <label class="backup-option">
                      <input type="checkbox" id="backupExams" checked>
                      <span class="backup-option-content">
                        <i class="fa-solid fa-file-text"></i>
                        <div>
                          <strong>Exams & Questions</strong>
                          <small>All exam templates and question sets</small>
                        </div>
                      </span>
                    </label>
                    
                    <label class="backup-option">
                      <input type="checkbox" id="backupStudents" checked>
                      <span class="backup-option-content">
                        <i class="fa-solid fa-user-graduate"></i>
                        <div>
                          <strong>Students</strong>
                          <small>Student information and enrollment data</small>
                        </div>
                      </span>
                    </label>
                    
                    <label class="backup-option">
                      <input type="checkbox" id="backupResults" checked>
                      <span class="backup-option-content">
                        <i class="fa-solid fa-chart-bar"></i>
                        <div>
                          <strong>Results</strong>
                          <small>Exam results and scan data</small>
                        </div>
                      </span>
                    </label>
                    
                    <label class="backup-option">
                      <input type="checkbox" id="backupSettings" checked>
                      <span class="backup-option-content">
                        <i class="fa-solid fa-cog"></i>
                        <div>
                          <strong>Settings</strong>
                          <small>User preferences and system configuration</small>
                        </div>
                      </span>
                    </label>
                  </div>
                </div>
                
                <div class="backup-actions">
                  <button class="btn btn-primary backup-create-btn" id="createBackupBtn">
                    <i class="fa-solid fa-download"></i>
                    Create Backup
                  </button>
                  <button class="btn btn-secondary" id="quickBackupBtn">
                    <i class="fa-solid fa-bolt"></i>
                    Quick Backup
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Restore Tab -->
            <div class="backup-tab-panel" id="restoreTab">
              <div class="restore-section">
                <div class="restore-upload-area" id="restoreUploadArea">
                  <div class="upload-content">
                    <i class="fa-solid fa-cloud-upload-alt"></i>
                    <h4>Select Backup File</h4>
                    <p>Drag and drop a backup file here, or click to browse</p>
                    <input type="file" id="backupFileInput" accept=".json,.zip" style="display: none;">
                    <button class="btn btn-secondary" id="browseBackupBtn">Browse Files</button>
                  </div>
                </div>
                
                <div class="restore-options" id="restoreOptions" style="display: none;">
                  <h4>Restore Options</h4>
                  <div class="restore-info" id="restoreInfo">
                    <!-- Backup file info will be displayed here -->
                  </div>
                  
                  <div class="restore-mode">
                    <label>
                      <input type="radio" name="restoreMode" value="full" checked>
                      <span>Full Restore (Replace all data)</span>
                    </label>
                    <label>
                      <input type="radio" name="restoreMode" value="merge">
                      <span>Merge (Keep existing data, add from backup)</span>
                    </label>
                  </div>
                  
                  <div class="restore-warning">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <strong>Warning:</strong> This action cannot be undone. Make sure to create a backup of your current data before proceeding.
                  </div>
                  
                  <div class="restore-actions">
                    <button class="btn btn-danger" id="startRestoreBtn">
                      <i class="fa-solid fa-upload"></i>
                      Start Restore
                    </button>
                    <button class="btn btn-secondary" id="cancelRestoreBtn">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Settings Tab -->
            <div class="backup-tab-panel" id="settingsTab">
              <div class="backup-settings">
                <div class="setting-group">
                  <h4>Automatic Backup</h4>
                  <label class="setting-toggle">
                    <input type="checkbox" id="autoBackupToggle">
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">Enable automatic backups</span>
                  </label>
                  <p class="setting-description">Automatically create backups at regular intervals</p>
                  
                  <div class="auto-backup-options" id="autoBackupOptions">
                    <div class="setting-field">
                      <label for="backupInterval">Backup Interval:</label>
                      <select id="backupInterval">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div class="settings-actions">
                  <button class="btn btn-primary" id="saveSettingsBtn">
                    <i class="fa-solid fa-save"></i>
                    Save Settings
                  </button>
                  <button class="btn btn-secondary" id="resetSettingsBtn">
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
            
            <!-- History Tab -->
            <div class="backup-tab-panel" id="historyTab">
              <div class="backup-history">
                <div class="history-header">
                  <h4>Backup History</h4>
                  <button class="btn btn-secondary" id="clearHistoryBtn">
                    <i class="fa-solid fa-trash"></i>
                    Clear History
                  </button>
                </div>
                <div class="history-list" id="historyList">
                  <!-- History items will be populated here -->
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="backup-progress" id="backupProgress">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText">Preparing backup...</div>
          <button class="btn btn-secondary" id="cancelBackupBtn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupBackupModal();
  }

  setupBackupModal() {
    // Close events
    document.getElementById('closeBackupModal')?.addEventListener('click', () => {
      this.hideBackupModal();
    });

    // Tab switching
    document.querySelectorAll('.backup-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchBackupTab(e.target.dataset.tab);
      });
    });

    // Backup actions
    document.getElementById('createBackupBtn')?.addEventListener('click', () => {
      this.createFullBackup();
    });

    document.getElementById('quickBackupBtn')?.addEventListener('click', () => {
      this.createQuickBackup();
    });

    // Restore actions
    document.getElementById('browseBackupBtn')?.addEventListener('click', () => {
      document.getElementById('backupFileInput').click();
    });

    document.getElementById('backupFileInput')?.addEventListener('change', (e) => {
      this.handleBackupFileSelect(e.target.files[0]);
    });

    document.getElementById('startRestoreBtn')?.addEventListener('click', () => {
      this.startRestore();
    });

    // Settings
    document.getElementById('autoBackupToggle')?.addEventListener('change', (e) => {
      this.toggleAutoBackup(e.target.checked);
    });

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      this.saveBackupSettings();
    });

    // History
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      this.clearBackupHistory();
    });

    this.loadBackupSettings();
    this.calculateDataSize();
  }

  // Backup functionality
  async createFullBackup() {
    const options = this.getBackupOptions();
    await this.performBackup(options, 'full');
  }

  async createQuickBackup() {
    const options = {
      exams: true,
      students: true,
      results: true,
      settings: false
    };
    await this.performBackup(options, 'quick');
  }

  getBackupOptions() {
    return {
      exams: document.getElementById('backupExams')?.checked || false,
      students: document.getElementById('backupStudents')?.checked || false,
      results: document.getElementById('backupResults')?.checked || false,
      settings: document.getElementById('backupSettings')?.checked || false
    };
  }

  async performBackup(options, type = 'full') {
    try {
      this.showBackupProgress(0, 'Preparing backup...');
      
      const backupData = {
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString(),
          type: type,
          options: options,
          userAgent: navigator.userAgent,
          size: 0
        },
        data: {}
      };

      let progress = 0;
      const totalSteps = Object.values(options).filter(Boolean).length;
      const stepSize = 100 / totalSteps;

      // Backup exams
      if (options.exams) {
        this.updateBackupProgress(progress, 'Backing up exams...');
        backupData.data.exams = await this.backupCollection('exams');
        backupData.data.questions = await this.backupCollection('questions');
        progress += stepSize;
      }

      // Backup students
      if (options.students) {
        this.updateBackupProgress(progress, 'Backing up students...');
        backupData.data.students = await this.backupCollection('students');
        backupData.data.classes = await this.backupCollection('classes');
        progress += stepSize;
      }

      // Backup results
      if (options.results) {
        this.updateBackupProgress(progress, 'Backing up results...');
        backupData.data.examResults = await this.backupCollection('examResults');
        backupData.data.scanResults = await this.backupCollection('scan_results');
        progress += stepSize;
      }

      // Backup settings
      if (options.settings) {
        this.updateBackupProgress(progress, 'Backing up settings...');
        backupData.data.settings = this.backupLocalSettings();
        backupData.data.subjects = await this.backupCollection('subjects');
        backupData.data.teachers = await this.backupCollection('teachers');
        progress += stepSize;
      }

      // Calculate final size
      const backupString = JSON.stringify(backupData);
      backupData.metadata.size = backupString.length;

      this.updateBackupProgress(95, 'Finalizing backup...');

      // Save backup
      const backupId = this.generateBackupId();
      const filename = `rosec-backup-${backupId}.json`;
      
      this.downloadBackup(backupString, filename);
      this.addToBackupHistory(backupId, backupData.metadata);

      this.updateBackupProgress(100, 'Backup completed!');
      
      setTimeout(() => {
        this.hideBackupProgress();
        this.showNotification('Backup created successfully!', 'success');
      }, 1000);

    } catch (error) {
      console.error('Backup failed:', error);
      this.hideBackupProgress();
      this.showNotification('Backup failed: ' + error.message, 'error');
    }
  }

  async backupCollection(collectionName) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const data = [];
      
      snapshot.docs.forEach(doc => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return data;
    } catch (error) {
      console.warn(`Failed to backup collection ${collectionName}:`, error);
      return [];
    }
  }

  backupLocalSettings() {
    const settings = {};
    
    const localStorageKeys = [
      'rosec-theme',
      'rosec-search-history',
      'rosec-saved-filters',
      'rosec-user-preferences'
    ];
    
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        settings[key] = value;
      }
    });
    
    return settings;
  }

  downloadBackup(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateBackupId() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  addToBackupHistory(id, metadata) {
    const historyEntry = {
      id,
      ...metadata,
      filename: `rosec-backup-${id}.json`
    };
    
    this.backupHistory.unshift(historyEntry);
    
    if (this.backupHistory.length > 50) {
      this.backupHistory = this.backupHistory.slice(0, 50);
    }
    
    localStorage.setItem('rosec-backup-history', JSON.stringify(this.backupHistory));
    this.loadBackupHistory();
  }

  // Restore functionality
  handleBackupFileSelect(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        this.showRestoreOptions(backupData);
      } catch (error) {
        this.showNotification('Invalid backup file format', 'error');
      }
    };
    reader.readAsText(file);
  }

  showRestoreOptions(backupData) {
    const restoreOptions = document.getElementById('restoreOptions');
    const restoreInfo = document.getElementById('restoreInfo');
    
    if (!restoreOptions || !restoreInfo) return;

    restoreInfo.innerHTML = `
      <div class="backup-file-info">
        <h5>Backup Information</h5>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Created:</span>
            <span class="info-value">${new Date(backupData.metadata.created).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Type:</span>
            <span class="info-value">${backupData.metadata.type}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Size:</span>
            <span class="info-value">${this.formatFileSize(backupData.metadata.size)}</span>
          </div>
        </div>
      </div>
    `;

    this.currentRestoreData = backupData;
    restoreOptions.style.display = 'block';
  }

  async startRestore() {
    if (!this.currentRestoreData) {
      this.showNotification('No backup data selected', 'error');
      return;
    }

    const restoreMode = document.querySelector('input[name="restoreMode"]:checked')?.value;
    const confirmed = confirm(`Are you sure you want to restore from this backup? This will ${restoreMode === 'full' ? 'replace all current data' : 'modify your current data'}.`);
    
    if (!confirmed) return;

    try {
      this.showBackupProgress(0, 'Starting restore...');
      await this.performRestore(this.currentRestoreData, restoreMode);
      
      this.hideBackupProgress();
      this.hideBackupModal();
      this.showNotification('Restore completed successfully! Please refresh the page.', 'success');

    } catch (error) {
      console.error('Restore failed:', error);
      this.hideBackupProgress();
      this.showNotification('Restore failed: ' + error.message, 'error');
    }
  }

  async performRestore(backupData, mode) {
    const dataTypes = Object.keys(backupData.data);
    const totalSteps = dataTypes.length;
    let progress = 0;
    const stepSize = 100 / totalSteps;

    for (const dataType of dataTypes) {
      this.updateBackupProgress(progress, `Restoring ${dataType}...`);
      
      if (dataType === 'settings') {
        this.restoreLocalSettings(backupData.data[dataType]);
      } else {
        await this.restoreCollection(dataType, backupData.data[dataType], mode);
      }
      
      progress += stepSize;
    }

    this.updateBackupProgress(100, 'Restore completed!');
  }

  async restoreCollection(collectionName, data, mode) {
    if (!data || !Array.isArray(data)) return;

    try {
      if (mode === 'full') {
        const existingSnapshot = await getDocs(collection(db, collectionName));
        const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }

      const addPromises = data.map(item => {
        const { id, ...itemData } = item;
        return addDoc(collection(db, collectionName), itemData);
      });
      
      await Promise.all(addPromises);
    } catch (error) {
      console.error(`Failed to restore collection ${collectionName}:`, error);
      throw error;
    }
  }

  restoreLocalSettings(settings) {
    if (!settings) return;

    Object.keys(settings).forEach(key => {
      localStorage.setItem(key, settings[key]);
    });
  }

  // Auto backup
  setupAutoBackup() {
    if (this.autoBackupEnabled) {
      this.startAutoBackup();
    }
  }

  toggleAutoBackup(enabled) {
    this.autoBackupEnabled = enabled;
    localStorage.setItem('rosec-auto-backup', enabled.toString());
    
    if (enabled) {
      this.startAutoBackup();
    } else {
      this.stopAutoBackup();
    }
  }

  startAutoBackup() {
    this.stopAutoBackup();
    
    const interval = localStorage.getItem('rosec-backup-interval') || 'daily';
    let intervalMs = 24 * 60 * 60 * 1000; // Default daily
    
    this.backupInterval = setInterval(() => {
      this.performAutoBackup();
    }, intervalMs);
  }

  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  async performAutoBackup() {
    try {
      const options = {
        exams: true,
        students: true,
        results: true,
        settings: true
      };
      
      await this.performBackup(options, 'auto');
      this.showNotification('Automatic backup completed', 'success');
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  // Settings
  loadBackupSettings() {
    const autoBackupToggle = document.getElementById('autoBackupToggle');
    const backupInterval = document.getElementById('backupInterval');
    
    if (autoBackupToggle) {
      autoBackupToggle.checked = this.autoBackupEnabled;
    }
    
    if (backupInterval) {
      backupInterval.value = localStorage.getItem('rosec-backup-interval') || 'daily';
    }
  }

  saveBackupSettings() {
    const backupInterval = document.getElementById('backupInterval')?.value;
    
    if (backupInterval) {
      localStorage.setItem('rosec-backup-interval', backupInterval);
    }
    
    if (this.autoBackupEnabled) {
      this.startAutoBackup();
    }
    
    this.showNotification('Backup settings saved', 'success');
  }

  // History
  loadBackupHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (this.backupHistory.length === 0) {
      historyList.innerHTML = `
        <div class="no-history">
          <i class="fa-solid fa-history"></i>
          <h4>No backup history</h4>
          <p>Your backup history will appear here after creating backups</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = this.backupHistory.map(backup => `
      <div class="history-item">
        <div class="history-info">
          <h5>${backup.filename}</h5>
          <p>Created: ${new Date(backup.created).toLocaleString()}</p>
          <p>Size: ${this.formatFileSize(backup.size)}</p>
        </div>
        <div class="history-actions">
          <button class="btn-icon danger" onclick="backupRestore.removeFromHistory('${backup.id}')" title="Remove">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  removeFromHistory(backupId) {
    if (!confirm('Remove this backup from history?')) return;

    this.backupHistory = this.backupHistory.filter(backup => backup.id !== backupId);
    localStorage.setItem('rosec-backup-history', JSON.stringify(this.backupHistory));
    this.loadBackupHistory();
    this.showNotification('Backup removed from history', 'success');
  }

  clearBackupHistory() {
    if (!confirm('Clear all backup history?')) return;

    this.backupHistory = [];
    localStorage.removeItem('rosec-backup-history');
    this.loadBackupHistory();
    this.showNotification('Backup history cleared', 'success');
  }

  // UI management
  showBackupModal() {
    document.getElementById('backupRestoreModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    this.calculateDataSize();
  }

  hideBackupModal() {
    document.getElementById('backupRestoreModal').classList.remove('show');
    document.body.style.overflow = '';
  }

  switchBackupTab(tabName) {
    document.querySelectorAll('.backup-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.backup-tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  showBackupProgress(progress, message) {
    const progressElement = document.getElementById('backupProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (progressElement) progressElement.style.display = 'block';
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = message;
  }

  updateBackupProgress(progress, message) {
    this.showBackupProgress(progress, message);
  }

  hideBackupProgress() {
    const progressElement = document.getElementById('backupProgress');
    if (progressElement) progressElement.style.display = 'none';
  }

  async calculateDataSize() {
    try {
      let totalSize = 0;
      const collections = ['exams', 'questions', 'students', 'classes', 'examResults', 'scan_results'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          totalSize += JSON.stringify(data).length;
        } catch (error) {
          continue;
        }
      }
      
      const dataSizeElement = document.getElementById('dataSize');
      if (dataSizeElement) {
        dataSizeElement.textContent = this.formatFileSize(totalSize);
      }
    } catch (error) {
      console.error('Error calculating data size:', error);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fa-solid fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || icons.info;
  }
}

// Initialize backup/restore system
let backupRestore;
document.addEventListener('DOMContentLoaded', () => {
  backupRestore = new BackupRestore();
  window.backupRestore = backupRestore;
});

export default BackupRestore;