const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// CORS-enabled function for Raspberry Pi communication
exports.raspberryPiAPI = onRequest({cors: true}, async (request, response) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(204).send('');
    return;
  }

  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { action, data } = request.body;
    
    switch (action) {
      case 'scan_answer_sheet':
        return await handleScanAnswerSheet(request, response, data);
      case 'get_exam_template':
        return await handleGetExamTemplate(request, response, data);
      case 'save_scan_results':
        return await handleSaveScanResults(request, response, data);
      case 'get_raspberry_pi_status':
        return await handleGetRaspberryPiStatus(request, response);
      case 'start_scanning_session':
        return await handleStartScanningSession(request, response, data);
      case 'end_scanning_session':
        return await handleEndScanningSession(request, response, data);
      default:
        response.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    logger.error('API Error:', error);
    response.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Handle answer sheet scanning
async function handleScanAnswerSheet(request, response, data) {
  try {
    const { examId, studentId, imageData, scannerSettings } = data;
    
    // Log the scanning request
    await db.collection('scan_logs').add({
      examId,
      studentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'processing',
      scannerSettings
    });

    // Here you would typically process the image data
    // For now, we'll return a mock response
    const scanResults = {
      studentId: studentId,
      examId: examId,
      answers: generateMockAnswers(scannerSettings.totalQuestions || 25),
      confidence: 0.95,
      timestamp: new Date().toISOString(),
      processingTime: Math.random() * 2000 + 500 // Mock processing time
    };

    // Save scan results to Firestore
    await db.collection('scan_results').add({
      ...scanResults,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    response.json({
      success: true,
      scanResults,
      message: 'Answer sheet scanned successfully'
    });
  } catch (error) {
    logger.error('Scan error:', error);
    response.status(500).json({ error: 'Scanning failed', details: error.message });
  }
}

// Get exam template for scanning
async function handleGetExamTemplate(request, response, data) {
  try {
    const { examId } = data;
    
    const examDoc = await db.collection('exams').doc(examId).get();
    if (!examDoc.exists) {
      return response.status(404).json({ error: 'Exam not found' });
    }

    const examData = examDoc.data();
    response.json({
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
    });
  } catch (error) {
    logger.error('Template fetch error:', error);
    response.status(500).json({ error: 'Failed to fetch exam template' });
  }
}

// Save scan results
async function handleSaveScanResults(request, response, data) {
  try {
    const { examId, results } = data;
    
    const batch = db.batch();
    
    results.forEach(result => {
      const docRef = db.collection('scan_results').doc();
      batch.set(docRef, {
        ...result,
        examId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    
    response.json({
      success: true,
      message: `Saved ${results.length} scan results`,
      savedCount: results.length
    });
  } catch (error) {
    logger.error('Save results error:', error);
    response.status(500).json({ error: 'Failed to save scan results' });
  }
}

// Get Raspberry Pi status
async function handleGetRaspberryPiStatus(request, response) {
  try {
    // Check the latest status from Raspberry Pi
    const statusDoc = await db.collection('raspberry_pi_status').doc('current').get();
    
    const defaultStatus = {
      online: false,
      lastSeen: null,
      scannerReady: false,
      currentSession: null,
      systemInfo: {
        cpuUsage: 0,
        memoryUsage: 0,
        temperature: 0
      }
    };

    const status = statusDoc.exists ? statusDoc.data() : defaultStatus;
    
    response.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Status check error:', error);
    response.status(500).json({ error: 'Failed to get Raspberry Pi status' });
  }
}

// Start scanning session
async function handleStartScanningSession(request, response, data) {
  try {
    const { examId, sessionName, settings } = data;
    
    const sessionId = `session_${Date.now()}`;
    const sessionData = {
      sessionId,
      examId,
      sessionName,
      settings,
      startTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      scannedCount: 0
    };

    await db.collection('scanning_sessions').doc(sessionId).set(sessionData);
    
    // Update Raspberry Pi status
    await db.collection('raspberry_pi_status').doc('current').set({
      currentSession: sessionId,
      scannerReady: true,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    response.json({
      success: true,
      sessionId,
      message: 'Scanning session started successfully'
    });
  } catch (error) {
    logger.error('Start session error:', error);
    response.status(500).json({ error: 'Failed to start scanning session' });
  }
}

// End scanning session
async function handleEndScanningSession(request, response, data) {
  try {
    const { sessionId } = data;
    
    await db.collection('scanning_sessions').doc(sessionId).update({
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    });

    // Update Raspberry Pi status
    await db.collection('raspberry_pi_status').doc('current').update({
      currentSession: null,
      scannerReady: false,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    response.json({
      success: true,
      message: 'Scanning session ended successfully'
    });
  } catch (error) {
    logger.error('End session error:', error);
    response.status(500).json({ error: 'Failed to end scanning session' });
  }
}

// Helper function to generate mock answers
function generateMockAnswers(totalQuestions) {
  const choices = ['A', 'B', 'C', 'D'];
  const answers = {};
  
  for (let i = 1; i <= totalQuestions; i++) {
    answers[i] = choices[Math.floor(Math.random() * choices.length)];
  }
  
  return answers;
}

// Callable function for real-time updates
exports.updateRaspberryPiStatus = onCall(async (request) => {
  const { status } = request.data;
  
  try {
    await db.collection('raspberry_pi_status').doc('current').set({
      ...status,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, message: 'Status updated successfully' };
  } catch (error) {
    logger.error('Status update error:', error);
    throw new Error('Failed to update status');
  }
});

// Listen for new scan results and process them
exports.processScanResults = onDocumentWritten("scan_results/{docId}", async (event) => {
  const scanResult = event.data?.after?.data();
  
  if (!scanResult) return;

  try {
    // Process the scan result (e.g., grade it, send notifications)
    logger.info('Processing scan result:', scanResult);
    
    // You can add additional processing logic here
    // For example: auto-grading, sending notifications, etc.
    
  } catch (error) {
    logger.error('Scan result processing error:', error);
  }
});