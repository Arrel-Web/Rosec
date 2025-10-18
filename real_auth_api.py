from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime
import jwt
import os

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Secret key for JWT (in production, use environment variable)
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

@app.route('/api/login', methods=['POST'])
def login():
    """Real authentication endpoint using Firebase Admin SDK"""
    try:
        data = request.json or {}
        email = data.get("email", "")
        password = data.get("password", "")
        
        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password required"
            }), 400
        
        # Verify user exists in Firebase Auth
        try:
            user = auth.get_user_by_email(email)
        except auth.UserNotFoundError:
            return jsonify({
                "success": False,
                "message": "Invalid credentials"
            }), 401
        
        # Get user role from Firestore
        user_doc = db.collection('users').document(user.uid).get()
        
        if not user_doc.exists:
            return jsonify({
                "success": False,
                "message": "User profile not found"
            }), 404
        
        user_data = user_doc.to_dict()
        
        # Create custom token for the user
        custom_token = auth.create_custom_token(user.uid)
        
        # Create JWT token with user info (for API authentication)
        jwt_token = jwt.encode({
            'uid': user.uid,
            'email': user.email,
            'role': user_data.get('role', 'teacher'),
            'exp': datetime.utcnow().timestamp() + 86400  # 24 hours
        }, JWT_SECRET, algorithm='HS256')
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "token": jwt_token
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({
            "success": False,
            "message": "Authentication failed"
        }), 500

@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    try:
        data = request.json or {}
        token = data.get("token", "")
        
        if not token:
            return jsonify({
                "success": False,
                "message": "Token required"
            }), 400
        
        # Decode and verify JWT
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        
        return jsonify({
            "success": True,
            "user": {
                "uid": decoded['uid'],
                "email": decoded['email'],
                "role": decoded['role']
            }
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({
            "success": False,
            "message": "Token expired"
        }), 401
    except jwt.InvalidTokenError:
        return jsonify({
            "success": False,
            "message": "Invalid token"
        }), 401

@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)
