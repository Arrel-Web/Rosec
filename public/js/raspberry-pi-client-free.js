/**
 * Raspberry Pi API Client - Free Plan Version
 * Direct communication with Raspberry Pi (no Firebase Functions required)
 */

import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

class RaspberryPiClientFree {
    constructor(config = {}) {
        this.raspberryPiUrl = config.raspberryPiUrl || 'http://192.168.1.100:5000'; // Default Pi IP
        this.timeout = config.timeout || 10000;
        this.retryAttempts = config.retryAttempts || 3;
        
        // Firebase setup
        this.db = getFirestore();
        this.auth = getAuth();
        
        // Authentication
        this.authToken = null;
        this.isAuthenticated = false;
        
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

    // Authentication Methods
    async authenticate(email, password) {
        try {
            const response = await this.makeRequest('/api/authenticate', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (response.success && response.token) {
                this.authToken = response.token;
                this.isAuthenticated = true;
                this.emit('authenticated', { email });
                console.log('✅ Raspberry Pi authenticated successfully');
                return response;
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            this.emit('authenticationFailed', { error: error.message });
            throw error;
        }
    }

    async authenticateWithCurrentUser() {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }
            
            // Get the user's ID token from Firebase
            const idToken = await user.getIdToken();
            
            // Use the email from Firebase Auth (password not available client-side)
            // This assumes the Pi API can verify the Firebase ID token
            // Or you need to prompt for password
            console.log('Current user:', user.email);
            
            // For now, we'll need to prompt for password
            this.emit('passwordRequired', { email: user.email });
            
            return { success: false, message: 'Password required for Pi authentication' };
        } catch (error) {
            console.error('Failed to authenticate with current user:', error);
            throw error;
        }
    }

    setAuthToken(token) {
        this.authToken = token;
        this.isAuthenticated = true;
        console.log('✅ Auth token set manually');
    }

    clearAuth() {
        this.authToken = null;
        this.isAuthenticated = false;
        this.emit('authenticationCleared');
        console.log('🔓 Authentication cleared');
    }

    // API request helper with retry logic
    async makeRequest(url, options = {}) {
        const fullUrl = `${this.raspberryPiUrl}${url}`;
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add authentication token if available
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        const defaultOptions = {
            method: 'GET',
            headers: headers,
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
            
            // Save status to Firestore (optional)
            await this.saveStatusToFirestore(response.status);
            
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
                // Save scan results to Firestore
                await this.saveScanResultsToFirestore(examTemplate.examId, response.results);
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
                // Save session to Firestore
                await this.saveSessionToFirestore(response.session, 'started');
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
                // Update session in Firestore
                await this.saveSessionToFirestore(response.session_summary, 'ended');
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

    // Firebase Firestore Methods (Direct Database Access)
    async getExamTemplate(examId) {
        try {
            const examDoc = await getDoc(doc(this.db, 'exams', examId));
            
            if (!examDoc.exists()) {
                throw new Error('Exam not found');
            }
            
            const examData = examDoc.data();
            return {
                success: true,
                template: {
                    examId: examId,
                    title: examData.title,
                    totalQuestions: examData.totalQuestions,
                    choiceOptions: examData.choiceOptions,
                    answerKey: examData.answerKey,
                    scannerSettings: examData.scannerSettings || {
                        studentIdLength: 8,
                        subjectIdLength: 4,
                        bubbleDetectionThreshold: 0.7
                    }
                }
            };
        } catch (error) {
            console.error('Failed to get exam template:', error);
            throw error;
        }
    }

    async saveScanResultsToFirestore(examId, results) {
        try {
            const user = this.auth.currentUser;
            const scanData = {
                examId: examId,
                studentId: results.student_id,
                answers: results.answers,
                confidence: results.confidence,
                processingTime: results.processing_time,
                timestamp: serverTimestamp(),
                scannedBy: user ? user.uid : 'anonymous',
                scannedByEmail: user ? user.email : null
            };
            
            const docRef = await addDoc(collection(this.db, 'scan_results'), scanData);
            console.log('Scan results saved with ID:', docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Failed to save scan results to Firestore:', error);
            throw error;
        }
    }

    async saveSessionToFirestore(sessionData, status) {
        try {
            const user = this.auth.currentUser;
            const sessionDoc = {
                ...sessionData,
                status: status,
                timestamp: serverTimestamp(),
                userId: user ? user.uid : 'anonymous',
                userEmail: user ? user.email : null
            };
            
            if (status === 'started') {
                const docRef = await addDoc(collection(this.db, 'scanning_sessions'), sessionDoc);
                this.currentSessionId = docRef.id;
                return docRef.id;
            } else if (status === 'ended' && this.currentSessionId) {
                await updateDoc(doc(this.db, 'scanning_sessions', this.currentSessionId), sessionDoc);
                return this.currentSessionId;
            }
        } catch (error) {
            console.error('Failed to save session to Firestore:', error);
            throw error;
        }
    }

    async saveStatusToFirestore(status) {
        try {
            const statusDoc = {
                ...status,
                timestamp: serverTimestamp(),
                lastUpdated: new Date().toISOString()
            };
            
            // Use set with merge to update the current status document
            await updateDoc(doc(this.db, 'raspberry_pi_status', 'current'), statusDoc);
        } catch (error) {
            // If document doesn't exist, create it
            try {
                await addDoc(collection(this.db, 'raspberry_pi_status'), {
                    ...status,
                    timestamp: serverTimestamp(),
                    lastUpdated: new Date().toISOString()
                });
            } catch (createError) {
                console.warn('Could not save status to Firestore:', createError);
            }
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
if (typeof window !== 'undefined') {
    window.RaspberryPiClientFree = RaspberryPiClientFree;
}

export default RaspberryPiClientFree;