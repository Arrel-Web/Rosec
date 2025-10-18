import requests
import json

# Test the login endpoint
url = "http://localhost:5000/api/login"
headers = {"Content-Type": "application/json"}

# Test admin login
data = {
    "email": "admin@rosec.com",
    "password": "admin123"
}

print("Testing login endpoint...")
print(f"URL: {url}")
print(f"Request body: {json.dumps(data, indent=2)}")
print("\n" + "="*50 + "\n")

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
