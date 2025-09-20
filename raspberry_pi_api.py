#!/usr/bin/env python3
"""
Raspberry Pi API for Rosec Answer Sheet Scanner
This API runs on the Raspberry Pi and handles:
- Camera operations for scanning answer sheets
- Image processing and OCR
- Communication with Firebase
- Hardware status monitoring
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import json
import os
import time
import threading
import requests
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
FIREBASE_PROJECT_ID = "rosec-57d1d"
FIREBASE_API_URL = f"https://us-central1-{FIREBASE_PROJECT_ID}.cloudfunctions.net/raspberryPiAPI"

class AnswerSheetScanner:
    def __init__(self):
        self.camera = None
        self.scanning_active = False
        self.current_session = None
        self.scan_count = 0
        self.last_scan_time = None
        
    def initialize_camera(self):
        """Initialize the camera"""
        try:
            self.camera = cv2.VideoCapture(0)  # Use default camera
            if not self.camera.isOpened():
                logger.error("Failed to open camera")
                return False
            
            # Set camera properties
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            self.camera.set(cv2.CAP_PROP_FPS, 30)
            
            logger.info("Camera initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Camera initialization error: {e}")
            return False
    
    def capture_image(self):
        """Capture an image from the camera"""
        if not self.camera or not self.camera.isOpened():
            if not self.initialize_camera():
                return None
        
        try:
            ret, frame = self.camera.read()
            if ret:
                return frame
            else:
                logger.error("Failed to capture image")
                return None
        except Exception as e:
            logger.error(f"Image capture error: {e}")
            return None
    
    def process_answer_sheet(self, image, exam_template):
        """Process the answer sheet image and extract answers"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply threshold to get binary image
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Mock answer extraction (replace with actual OCR/bubble detection)
            answers = self.extract_mock_answers(exam_template)
            
            # Extract student ID (mock implementation)
            student_id = self.extract_student_id(thresh)
            
            return {
                'student_id': student_id,
                'answers': answers,
                'confidence': 0.95,
                'processing_time': time.time() - self.last_scan_time if self.last_scan_time else 0
            }
            
        except Exception as e:
            logger.error(f"Answer sheet processing error: {e}")
            return None
    
    def extract_mock_answers(self, exam_template):
        """Mock answer extraction - replace with actual bubble detection"""
        total_questions = exam_template.get('totalQuestions', 25)
        choices = ['A', 'B', 'C', 'D']
        
        answers = {}
        for i in range(1, total_questions + 1):
            # Mock random answer selection
            answers[str(i)] = choices[np.random.randint(0, len(choices))]
        
        return answers
    
    def extract_student_id(self, image):
        """Mock student ID extraction - replace with actual OCR"""
        # Generate a mock student ID
        return f"2024{np.random.randint(1000, 9999)}"
    
    def cleanup(self):
        """Clean up camera resources"""
        if self.camera:
            self.camera.release()
            cv2.destroyAllWindows()

# Global scanner instance
scanner = AnswerSheetScanner()

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get Raspberry Pi status"""
    try:
        # Get system information
        cpu_temp = get_cpu_temperature()
        cpu_usage = get_cpu_usage()
        memory_usage = get_memory_usage()
        
        status = {
            'online': True,
            'timestamp': datetime.now().isoformat(),
            'scanner_ready': scanner.camera is not None,
            'scanning_active': scanner.scanning_active,
            'current_session': scanner.current_session,
            'scan_count': scanner.scan_count,
            'system_info': {
                'cpu_temperature': cpu_temp,
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage
            }
        }
        
        return jsonify({'success': True, 'status': status})
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/initialize', methods=['POST'])
def initialize_scanner():
    """Initialize the scanner"""
    try:
        success = scanner.initialize_camera()
        if success:
            return jsonify({'success': True, 'message': 'Scanner initialized successfully'})
        else:
            return jsonify({'success': False, 'error': 'Failed to initialize camera'}), 500
    except Exception as e:
        logger.error(f"Initialization error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scan', methods=['POST'])
def scan_answer_sheet():
    """Scan an answer sheet"""
    try:
        data = request.get_json()
        exam_template = data.get('exam_template', {})
        
        # Capture image
        scanner.last_scan_time = time.time()
        image = scanner.capture_image()
        
        if image is None:
            return jsonify({'success': False, 'error': 'Failed to capture image'}), 500
        
        # Process the answer sheet
        results = scanner.process_answer_sheet(image, exam_template)
        
        if results is None:
            return jsonify({'success': False, 'error': 'Failed to process answer sheet'}), 500
        
        # Convert image to base64 for storage/transmission
        _, buffer = cv2.imencode('.jpg', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Update scan count
        scanner.scan_count += 1
        
        # Send results to Firebase
        firebase_data = {
            'action': 'save_scan_results',
            'data': {
                'examId': exam_template.get('examId'),
                'results': [results],
                'image_data': image_base64,
                'timestamp': datetime.now().isoformat()
            }
        }
        
        # Send to Firebase (optional - can be done asynchronously)
        try:
            response = requests.post(FIREBASE_API_URL, json=firebase_data, timeout=10)
            firebase_success = response.status_code == 200
        except Exception as e:
            logger.warning(f"Firebase sync error: {e}")
            firebase_success = False
        
        return jsonify({
            'success': True,
            'results': results,
            'firebase_synced': firebase_success,
            'scan_count': scanner.scan_count
        })
        
    except Exception as e:
        logger.error(f"Scan error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/preview', methods=['GET'])
def get_camera_preview():
    """Get a preview image from the camera"""
    try:
        image = scanner.capture_image()
        if image is None:
            return jsonify({'success': False, 'error': 'Failed to capture preview'}), 500
        
        # Convert to JPEG
        _, buffer = cv2.imencode('.jpg', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f"data:image/jpeg;base64,{image_base64}"
        })
        
    except Exception as e:
        logger.error(f"Preview error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session/start', methods=['POST'])
def start_session():
    """Start a scanning session"""
    try:
        data = request.get_json()
        session_name = data.get('session_name', f"Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        exam_id = data.get('exam_id')
        
        scanner.current_session = {
            'name': session_name,
            'exam_id': exam_id,
            'start_time': datetime.now().isoformat(),
            'scan_count': 0
        }
        scanner.scanning_active = True
        scanner.scan_count = 0
        
        return jsonify({
            'success': True,
            'session': scanner.current_session,
            'message': 'Scanning session started'
        })
        
    except Exception as e:
        logger.error(f"Start session error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session/end', methods=['POST'])
def end_session():
    """End the current scanning session"""
    try:
        if scanner.current_session:
            scanner.current_session['end_time'] = datetime.now().isoformat()
            scanner.current_session['final_scan_count'] = scanner.scan_count
            
            session_summary = scanner.current_session.copy()
            scanner.current_session = None
            scanner.scanning_active = False
            
            return jsonify({
                'success': True,
                'session_summary': session_summary,
                'message': 'Scanning session ended'
            })
        else:
            return jsonify({'success': False, 'error': 'No active session'}), 400
            
    except Exception as e:
        logger.error(f"End session error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/calibrate', methods=['POST'])
def calibrate_scanner():
    """Calibrate the scanner for better accuracy"""
    try:
        # Capture calibration image
        image = scanner.capture_image()
        if image is None:
            return jsonify({'success': False, 'error': 'Failed to capture calibration image'}), 500
        
        # Perform calibration (mock implementation)
        calibration_results = {
            'bubble_detection_threshold': 0.7,
            'brightness_adjustment': 1.2,
            'contrast_adjustment': 1.1,
            'calibration_timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'calibration': calibration_results,
            'message': 'Scanner calibrated successfully'
        })
        
    except Exception as e:
        logger.error(f"Calibration error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_cpu_temperature():
    """Get CPU temperature (Raspberry Pi specific)"""
    try:
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp = float(f.read()) / 1000.0
        return round(temp, 1)
    except:
        return 0.0

def get_cpu_usage():
    """Get CPU usage percentage"""
    try:
        import psutil
        return psutil.cpu_percent(interval=1)
    except:
        return 0.0

def get_memory_usage():
    """Get memory usage percentage"""
    try:
        import psutil
        return psutil.virtual_memory().percent
    except:
        return 0.0

def update_firebase_status():
    """Periodically update Firebase with Raspberry Pi status"""
    while True:
        try:
            status_data = {
                'action': 'update_raspberry_pi_status',
                'data': {
                    'status': {
                        'online': True,
                        'lastSeen': datetime.now().isoformat(),
                        'scannerReady': scanner.camera is not None,
                        'currentSession': scanner.current_session,
                        'scanCount': scanner.scan_count,
                        'systemInfo': {
                            'cpuUsage': get_cpu_usage(),
                            'memoryUsage': get_memory_usage(),
                            'temperature': get_cpu_temperature()
                        }
                    }
                }
            }
            
            requests.post(FIREBASE_API_URL, json=status_data, timeout=5)
        except Exception as e:
            logger.warning(f"Firebase status update error: {e}")
        
        time.sleep(30)  # Update every 30 seconds

# Cleanup on exit
import atexit
atexit.register(scanner.cleanup)

if __name__ == '__main__':
    # Start Firebase status update thread
    status_thread = threading.Thread(target=update_firebase_status, daemon=True)
    status_thread.start()
    
    # Initialize scanner
    scanner.initialize_camera()
    
    # Start the Flask app
    logger.info("Starting Raspberry Pi API server...")
    app.run(host='0.0.0.0', port=5000, debug=False)