from flask import Flask, jsonify, request
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Flask
app = Flask(__name__)

# Initialize Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

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

@app.route('/api/scan', methods=['POST'])
def scan():
    data = request.json or {}
    exam_id = data.get("examId", "mock_exam_2025")
    student_id = data.get("studentId", "20250001")

    # Fake answers
    answers = {"1": "A", "2": "B", "3": "D"}

    # Save to Firestore
    doc_ref = db.collection("scan_results").document()
    doc_ref.set({
        "examId": exam_id,
        "studentId": student_id,
        "answers": answers,
        "confidence": 0.97,
        "processingTime": 1.2,
        "timestamp": datetime.utcnow(),
        "scannedBy": "mockDevice",
        "scannedByEmail": "mock@rosec.com"
    })

    return jsonify({
        "success": True,
        "results": {
            "student_id": student_id,
            "answers": answers,
            "confidence": 0.97
        }
    })

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
