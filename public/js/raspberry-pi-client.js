/**
 * Raspberry Pi API Client
 * Handles communication between the web app and Raspberry Pi scanner
 */

class RaspberryPiClient {
    constructor(config = {}) {
        this.raspberryPiUrl = config.raspberryPiUrl || 'http://192.168.1.100:5000'; // Default Pi IP
        this.firebaseApiUrl = config.firebaseApiUrl || 'https://us-central1-rosec-57d1d.cloudfunctions.net/raspberryPiAPI';
        this.timeout = config.timeout || 10000;
        this.retryAttempts = config.retryAttempts || 3;
        
        // Event listeners
        this.eventListeners = {};
        
        // Status polling
        this.statusPollingInterval = null;
        this.isPolling = false;
    }

    // Event handling
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // API request helper with retry logic
    async makeRequest(url, options = {}, useFirebase = false) {
        const baseUrl = useFirebase ? this.firebaseApiUrl : this.raspberryPiUrl;
        const fullUrl = `${baseUrl}${url}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.timeout,
            ...options
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(fullUrl, {
                    ...defaultOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;

            } catch (error) {
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    throw new Error(`Request failed after ${this.retryAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    // Raspberry Pi Status
    async getRaspberryPiStatus() {
        try {
            const response = await this.makeRequest('/api/status');
            this.emit('statusUpdate', response.status);
            return response;
        } catch (error) {
            console.error('Failed to get Raspberry Pi status:', error);
            this.emit('error', { type: 'status', error: error.message });
            throw error;
        }
    }

    // Initialize Scanner
    async initializeScanner() {
        try {
            const response = await this.makeRequest('/api/initialize', {
                method: 'POST'
            });
            
            if (response.success) {
                this.emit('scannerInitialized', response);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to initialize scanner:', error);
            this.emit('error', { type: 'initialization', error: error.message });
            throw error;
        }
    }

    // Get Camera Preview
    async getCameraPreview() {
        try {
            const response = await this.makeRequest('/api/preview');
            
            if (response.success) {
                this.emit('previewUpdate', response.image);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to get camera preview:', error);
            this.emit('error', { type: 'preview', error: error.message });
            throw error;
        }
    }

    // Scan Answer Sheet
    async scanAnswerSheet(examTemplate) {
        try {
            this.emit('scanStarted', { examId: examTemplate.examId });
            
            const response = await this.makeRequest('/api/scan', {
                method: 'POST',
                body: JSON.stringify({
                    exam_template: examTemplate
                })
            });
            
            if (response.success) {
                this.emit('scanCompleted', response.results);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to scan answer sheet:', error);
            this.emit('error', { type: 'scan', error: error.message });
            this.emit('scanFailed', { error: error.message });
            throw error;
        }
    }

    // Session Management
    async startScanningSession(sessionName, examId) {
        try {
            const response = await this.makeRequest('/api/session/start', {
                method: 'POST',
                body: JSON.stringify({
                    session_name: sessionName,
                    exam_id: examId
                })
            });
            
            if (response.success) {
                this.emit('sessionStarted', response.session);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to start scanning session:', error);
            this.emit('error', { type: 'session', error: error.message });
            throw error;
        }
    }

    async endScanningSession() {
        try {
            const response = await this.makeRequest('/api/session/end', {
                method: 'POST'
            });
            
            if (response.success) {
                this.emit('sessionEnded', response.session_summary);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to end scanning session:', error);
            this.emit('error', { type: 'session', error: error.message });
            throw error;
        }
    }

    // Calibration
    async calibrateScanner() {
        try {
            const response = await this.makeRequest('/api/calibrate', {
                method: 'POST'
            });
            
            if (response.success) {
                this.emit('calibrationCompleted', response.calibration);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to calibrate scanner:', error);
            this.emit('error', { type: 'calibration', error: error.message });
            throw error;
        }
    }

    // Firebase API Methods
    async getExamTemplate(examId) {
        try {
            const response = await this.makeRequest('', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'get_exam_template',
                    data: { examId }
                })
            }, true); // Use Firebase API
            
            return response;
        } catch (error) {
            console.error('Failed to get exam template:', error);
            throw error;
        }
    }

    async saveScanResults(examId, results) {
        try {
            const response = await this.makeRequest('', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'save_scan_results',
                    data: { examId, results }
                })
            }, true); // Use Firebase API
            
            return response;
        } catch (error) {
            console.error('Failed to save scan results:', error);
            throw error;
        }
    }

    // Status Polling
    startStatusPolling(interval = 5000) {
        if (this.isPolling) {
            this.stopStatusPolling();
        }
        
        this.isPolling = true;
        this.statusPollingInterval = setInterval(async () => {
            try {
                await this.getRaspberryPiStatus();
            } catch (error) {
                // Polling errors are handled by the getRaspberryPiStatus method
            }
        }, interval);
        
        console.log(`Started status polling every ${interval}ms`);
    }

    stopStatusPolling() {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
            this.isPolling = false;
            console.log('Stopped status polling');
        }
    }

    // Utility Methods
    setRaspberryPiUrl(url) {
        this.raspberryPiUrl = url;
        console.log(`Raspberry Pi URL updated to: ${url}`);
    }

    async testConnection() {
        try {
            const response = await this.getRaspberryPiStatus();
            return {
                connected: true,
                status: response.status,
                message: 'Connection successful'
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                message: 'Connection failed'
            };
        }
    }

    
    // Cleanup
    destroy() {
        this.stopStatusPolling();
        this.eventListeners = {};
        console.log('Raspberry Pi client destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RaspberryPiClient;
} else if (typeof window !== 'undefined') {
    window.RaspberryPiClient = RaspberryPiClient;
}

// Usage Example:
/*
const piClient = new RaspberryPiClient({
    raspberryPiUrl: 'http://192.168.1.100:5000',
    timeout: 15000
});

// Set up event listeners
piClient.on('statusUpdate', (status) => {
    console.log('Pi Status:', status);
    updateStatusDisplay(status);
});

piClient.on('scanCompleted', (results) => {
    console.log('Scan Results:', results);
    displayScanResults(results);
});

piClient.on('error', (error) => {
    console.error('Pi Client Error:', error);
    showErrorMessage(error.error);
});

// Initialize and start scanning
async function startScanning() {
    try {
        await piClient.initializeScanner();
        await piClient.startScanningSession('Math Exam Session', 'exam123');
        piClient.startStatusPolling();
        
        const examTemplate = await piClient.getExamTemplate('exam123');
        const scanResult = await piClient.scanAnswerSheet(examTemplate.template);
        
        console.log('Scan completed:', scanResult);
    } catch (error) {
        console.error('Scanning failed:', error);
    }
}
*/