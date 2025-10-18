from flask import Flask, jsonify, request
from datetime import datetime
import requests
import json

# Initialize Flask
app = Flask(__name__)

# Configuration - Pi API endpoints remain mocked
FIREBASE_PROJECT_ID = "rosec-57d1d"
FIREBASE_API_URL = f"https://us-central1-{FIREBASE_PROJECT_ID}.cloudfunctions.net/raspberryPiAPI"

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "online": True,
        "scanner_ready": True,
        "scan_count": 12,
        "system_info": {
            "cpu_temperature": 40,
            "memory_usage": 28
        }
    })

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"connected": True})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0-mock",
        "uptime_seconds": 3600
    })

@app.route('/api/initialize', methods=['POST'])
def initialize():
    return jsonify({
        "success": True,
        "message": "Scanner initialized successfully",
        "scanner_id": "mock_scanner_001",
        "calibration_status": "ready"
    })

@app.route('/api/preview', methods=['GET'])
def preview():
    return jsonify({
        "success": True,
        "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        "timestamp": datetime.utcnow().isoformat(),
        "camera_status": "active"
    })

@app.route('/api/calibrate', methods=['POST'])
def calibrate():
    return jsonify({
        "success": True,
        "calibration": {
            "status": "completed",
            "accuracy": 0.98,
            "reference_points": 4,
            "timestamp": datetime.utcnow().isoformat()
        },
        "message": "Scanner calibrated successfully"
    })

@app.route('/api/session/start', methods=['POST'])
def start_session():
    data = request.json or {}
    session_name = data.get("session_name", "Mock Session")
    exam_id = data.get("exam_id", "mock_exam_2025")
    
    session_id = f"session_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return jsonify({
        "success": True,
        "session": {
            "session_id": session_id,
            "session_name": session_name,
            "exam_id": exam_id,
            "started_at": datetime.utcnow().isoformat(),
            "status": "active",
            "scanned_count": 0
        }
    })

@app.route('/api/session/end', methods=['POST'])
def end_session():
    return jsonify({
        "success": True,
        "session_summary": {
            "session_id": "session_20250930_110000",
            "ended_at": datetime.utcnow().isoformat(),
            "status": "completed",
            "total_scanned": 15,
            "successful_scans": 14,
            "failed_scans": 1,
            "duration_minutes": 25
        }
    })

@app.route('/api/scan', methods=['POST'])
def scan():
    data = request.json or {}
    exam_id = data.get("examId", "mock_exam_2025")
    student_id = data.get("studentId", "20250001")

    # Fake answers
    answers = {"1": "A", "2": "B", "3": "D"}

    # Prepare data for Firebase Cloud Function (same format as real Pi API)
    firebase_data = {
        'action': 'save_scan_results',
        'data': {
            'examId': exam_id,
            'studentId': student_id,
            'answers': answers,
            'confidence': 0.97,
            'processingTime': 1.2,
            'timestamp': datetime.utcnow().isoformat(),
            'scannedBy': 'mockDevice',
            'scannedByEmail': 'mock@rosec.com'
        }
    }

    # Send to Firebase Cloud Function (optional - for testing)
    firebase_success = False
    try:
        response = requests.post(FIREBASE_API_URL, json=firebase_data, timeout=5)
        firebase_success = response.status_code == 200
        print(f"Firebase sync: {'Success' if firebase_success else 'Failed'}")
    except Exception as e:
        print(f"Firebase sync error: {e}")
        # Continue without Firebase - this is just a mock API

    return jsonify({
        "success": True,
        "results": {
            "student_id": student_id,
            "answers": answers,
            "confidence": 0.97
        },
        "firebase_synced": firebase_success
    })

@app.route('/api/exam/<exam_id>', methods=['GET'])
def get_exam_template(exam_id):
    """Mock endpoint to simulate getting exam template"""
    return jsonify({
        "success": True,
        "template": {
            "examId": exam_id,
            "title": f"Mock Exam {exam_id}",
            "totalQuestions": 50,
            "choiceOptions": ["A", "B", "C", "D"],
            "answerKey": {str(i): ["A", "B", "C", "D"][i % 4] for i in range(1, 51)},
            "scannerSettings": {
                "studentIdLength": 8,
                "subjectIdLength": 4,
                "bubbleDetectionThreshold": 0.7
            }
        }
    })

@app.route('/api/scan-results', methods=['GET'])
def get_scan_results():
    """Mock endpoint to get recent scan results"""
    return jsonify({
        "success": True,
        "results": [
            {
                "id": "scan_001",
                "examId": "mock_exam_2025",
                "studentId": "20250001",
                "answers": {"1": "A", "2": "B", "3": "D"},
                "confidence": 0.97,
                "timestamp": datetime.utcnow().isoformat(),
                "scannedBy": "mockDevice"
            },
            {
                "id": "scan_002", 
                "examId": "mock_exam_2025",
                "studentId": "20250002",
                "answers": {"1": "B", "2": "A", "3": "C"},
                "confidence": 0.95,
                "timestamp": datetime.utcnow().isoformat(),
                "scannedBy": "mockDevice"
            }
        ]
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Secure login endpoint - returns only success, message, and token"""
    data = request.json or {}
    email = data.get("email", "")
    password = data.get("password", "")
    
    # Mock user credentials (NEVER expose these in response!)
    mock_users = {
        "admin@rosec.com": {
            "password": "admin123"
        },
        "teacher@rosec.com": {
            "password": "teacher123"
        }
    }
    
    # Validate credentials
    if email in mock_users and password == mock_users[email]["password"]:
        # Generate mock token
        import hashlib
        token = hashlib.sha256(f"{email}{datetime.utcnow().isoformat()}".encode()).hexdigest()
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "token": token
        })
    else:
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
