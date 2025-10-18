import http.server
import socketserver
import json
from urllib.parse import urlparse, parse_qs

class MockAPIHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Mock API responses
        responses = {
            '/api/status': {
                "online": True,
                "scanner_ready": True,
                "scan_count": 12,
                "system_info": {"cpu_temperature": 40, "memory_usage": 28}
            },
            '/api/test': {"connected": True},
            '/api/health': {
                "status": "healthy",
                "timestamp": "2025-09-30T13:27:00Z",
                "version": "1.0.0-mock"
            },
            '/test': {"status": "working", "message": "API is responding"}
        }
        
        if path in responses:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(responses[path]).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        path = urlparse(self.path).path
        
        # Mock POST responses
        if path == '/api/scan':
            response = {
                "success": True,
                "results": {
                    "student_id": "20250001",
                    "answers": {"1": "A", "2": "B", "3": "D"},
                    "confidence": 0.97
                }
            }
        elif path == '/api/initialize':
            response = {
                "success": True,
                "message": "Scanner initialized successfully",
                "scanner_id": "mock_scanner_001"
            }
        else:
            response = {"success": True, "message": "Mock response"}
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    PORT = 8080
    print(f"Starting HTTP server on port {PORT}...")
    print(f"Test URL: http://localhost:{PORT}/test")
    
    with socketserver.TCPServer(("", PORT), MockAPIHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()
