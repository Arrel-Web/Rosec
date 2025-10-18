from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "working", "message": "API is responding"})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"healthy": True})

if __name__ == '__main__':
    print("Starting simple test server on port 8080...")
    app.run(host="127.0.0.1", port=8080, debug=False)
