#!/usr/bin/env python3
"""
Raspberry Pi API with Authentication for Rosec Answer Sheet Scanner
This API runs on the Raspberry Pi and handles:
- Camera operations for scanning answer sheets
- Image processing and OCR
- Communication with Firebase
- Hardware status monitoring
- JWT-based authentication
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import jwt
import os
import time
import requests
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
AUTH_API_URL = "http://localhost:5001"  # Real auth API
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
FIREBASE_PROJECT_ID = "rosec-57d1d"
FIREBASE_API_URL = f"https://us-central1-{FIREBASE_PROJECT_ID}.cloudfunctions.net/raspberryPiAPI"

# Store authenticated user info
current_user = None

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        try:
            # Verify token
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user = decoded
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'error': 'Token expired'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'error': 'Invalid token'
            }), 401
    
    return decorated_function

# Mock scanner class (replace with real implementation)
class AnswerSheetScanner:
    def __init__(self):
        self.scanning_active = False
        self.current_session = None
        self.scan_count = 0
        self.last_scan_time = None

scanner = AnswerSheetScanner()

@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    """Authenticate with the auth server and get a token"""
    try:
        data = request.json or {}
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password required'
            }), 400
        
        # Forward to auth API
        response = requests.post(
            f"{AUTH_API_URL}/api/login",
            json={'email': email, 'password': password},
            timeout=10
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            global current_user
            current_user = {
                'email': email,
                'token': auth_data.get('token'),
                'authenticated_at': datetime.utcnow().isoformat()
            }
            
            return jsonify({
                'success': True,
                'message': 'Authentication successful',
                'token': auth_data.get('token')
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Authentication failed'
            }), response.status_code
            
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/status', methods=['GET'])
@require_auth
def get_status():
    """Get Raspberry Pi status (requires authentication)"""
    try:
        status = {
            'online': True,
            'timestamp': datetime.now().isoformat(),
            'scanner_ready': True,
            'scanning_active': scanner.scanning_active,
            'current_session': scanner.current_session,
            'scan_count': scanner.scan_count,
            'authenticated_user': request.user.get('email'),
            'system_info': {
                'cpu_temperature': 42.5,
                'cpu_usage': 15.2,
                'memory_usage': 28.5
            }
        }
        
        return jsonify({'success': True, 'status': status})
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/initialize', methods=['POST'])
@require_auth
def initialize_scanner():
    """Initialize the scanner (requires authentication)"""
    try:
        logger.info(f"Scanner initialized by {request.user.get('email')}")
        return jsonify({
            'success': True,
            'message': 'Scanner initialized successfully',
            'initialized_by': request.user.get('email')
        })
    except Exception as e:
        logger.error(f"Initialization error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scan', methods=['POST'])
@require_auth
def scan_answer_sheet():
    """Scan an answer sheet (requires authentication)"""
    try:
        data = request.get_json()
        exam_id = data.get('examId', 'unknown')
        
        # Mock scan results
        results = {
            'student_id': '20250001',
            'answers': {'1': 'A', '2': 'B', '3': 'C'},
            'confidence': 0.95,
            'scanned_by': request.user.get('email'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        scanner.scan_count += 1
        
        logger.info(f"Scan completed by {request.user.get('email')}")
        
        return jsonify({
            'success': True,
            'results': results,
            'scan_count': scanner.scan_count
        })
        
    except Exception as e:
        logger.error(f"Scan error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session/start', methods=['POST'])
@require_auth
def start_session():
    """Start a scanning session (requires authentication)"""
    try:
        data = request.get_json()
        session_name = data.get('session_name', f"Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        exam_id = data.get('exam_id')
        
        scanner.current_session = {
            'name': session_name,
            'exam_id': exam_id,
            'start_time': datetime.now().isoformat(),
            'started_by': request.user.get('email'),
            'scan_count': 0
        }
        scanner.scanning_active = True
        scanner.scan_count = 0
        
        logger.info(f"Session started by {request.user.get('email')}")
        
        return jsonify({
            'success': True,
            'session': scanner.current_session,
            'message': 'Scanning session started'
        })
        
    except Exception as e:
        logger.error(f"Start session error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session/end', methods=['POST'])
@require_auth
def end_session():
    """End the current scanning session (requires authentication)"""
    try:
        if scanner.current_session:
            scanner.current_session['end_time'] = datetime.now().isoformat()
            scanner.current_session['final_scan_count'] = scanner.scan_count
            scanner.current_session['ended_by'] = request.user.get('email')
            
            session_summary = scanner.current_session.copy()
            scanner.current_session = None
            scanner.scanning_active = False
            
            logger.info(f"Session ended by {request.user.get('email')}")
            
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

@app.route('/api/preview', methods=['GET'])
@require_auth
def get_camera_preview():
    """Get a preview image from the camera (requires authentication)"""
    try:
        # Mock preview image
        return jsonify({
            'success': True,
            'image': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            'captured_by': request.user.get('email')
        })
        
    except Exception as e:
        logger.error(f"Preview error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check (no authentication required)"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'authenticated': current_user is not None
    })

if __name__ == '__main__':
    logger.info("Starting Authenticated Raspberry Pi API server...")
    logger.info(f"Auth API URL: {AUTH_API_URL}")
    app.run(host='0.0.0.0', port=5000, debug=False)
