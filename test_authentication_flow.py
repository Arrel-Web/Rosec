"""
Test script for complete authentication flow
Tests both Auth API and Authenticated Pi API
"""

import requests
import json
import time

# Configuration
AUTH_API_URL = "http://localhost:5001"
PI_API_URL = "http://localhost:5000"

# Test credentials (make sure these exist in Firebase)
TEST_EMAIL = "admin@rosec.com"
TEST_PASSWORD = "admin123"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_response(response):
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

def test_auth_api():
    """Test the Real Auth API"""
    print_section("TEST 1: Real Auth API - Login")
    
    try:
        response = requests.post(
            f"{AUTH_API_URL}/api/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('token'):
                print("\n✅ Authentication successful!")
                return data['token']
            else:
                print("\n❌ Authentication failed - no token received")
                return None
        else:
            print("\n❌ Authentication failed")
            return None
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure the Auth API is running:")
        print("  python real_auth_api.py")
        return None

def test_pi_api_without_auth():
    """Test Pi API without authentication (should fail)"""
    print_section("TEST 2: Pi API - No Authentication (Should Fail)")
    
    try:
        response = requests.get(f"{PI_API_URL}/api/status", timeout=5)
        print_response(response)
        
        if response.status_code == 401:
            print("\n✅ Correctly rejected unauthenticated request")
            return True
        else:
            print("\n⚠️ Warning: API should require authentication")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure the Authenticated Pi API is running:")
        print("  python raspberry_pi_api_authenticated.py")
        return False

def test_pi_api_with_auth(token):
    """Test Pi API with authentication"""
    print_section("TEST 3: Pi API - With Authentication")
    
    if not token:
        print("❌ No token available, skipping test")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test 3a: Get Status
        print("\n--- 3a: Get Status ---")
        response = requests.get(f"{PI_API_URL}/api/status", headers=headers, timeout=5)
        print_response(response)
        
        if response.status_code == 200:
            print("✅ Status retrieved successfully")
        else:
            print("❌ Failed to get status")
            return False
        
        # Test 3b: Initialize Scanner
        print("\n--- 3b: Initialize Scanner ---")
        response = requests.post(f"{PI_API_URL}/api/initialize", headers=headers, timeout=5)
        print_response(response)
        
        if response.status_code == 200:
            print("✅ Scanner initialized successfully")
        else:
            print("❌ Failed to initialize scanner")
            return False
        
        # Test 3c: Start Session
        print("\n--- 3c: Start Scanning Session ---")
        response = requests.post(
            f"{PI_API_URL}/api/session/start",
            headers=headers,
            json={"session_name": "Test Session", "exam_id": "test_exam_001"},
            timeout=5
        )
        print_response(response)
        
        if response.status_code == 200:
            print("✅ Session started successfully")
        else:
            print("❌ Failed to start session")
            return False
        
        # Test 3d: End Session
        print("\n--- 3d: End Scanning Session ---")
        response = requests.post(f"{PI_API_URL}/api/session/end", headers=headers, timeout=5)
        print_response(response)
        
        if response.status_code == 200:
            print("✅ Session ended successfully")
        else:
            print("❌ Failed to end session")
            return False
        
        print("\n✅ All authenticated requests successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def test_pi_authenticate_endpoint():
    """Test Pi API's own authenticate endpoint"""
    print_section("TEST 4: Pi API - Direct Authentication")
    
    try:
        response = requests.post(
            f"{PI_API_URL}/api/authenticate",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('token'):
                print("\n✅ Pi API authentication successful!")
                return data['token']
            else:
                print("\n❌ Authentication failed")
                return None
        else:
            print("\n❌ Authentication failed")
            return None
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def main():
    print("\n" + "🔐"*30)
    print("  ROSEC AUTHENTICATION FLOW TEST")
    print("🔐"*30)
    
    print("\nThis script will test:")
    print("1. Real Auth API (Port 5001)")
    print("2. Authenticated Pi API (Port 5000)")
    print("3. Complete authentication flow")
    
    input("\nPress Enter to start tests...")
    
    # Test 1: Auth API
    token = test_auth_api()
    time.sleep(1)
    
    # Test 2: Pi API without auth
    test_pi_api_without_auth()
    time.sleep(1)
    
    # Test 3: Pi API with auth
    if token:
        test_pi_api_with_auth(token)
        time.sleep(1)
    
    # Test 4: Pi API direct authentication
    pi_token = test_pi_authenticate_endpoint()
    
    # Final Summary
    print_section("TEST SUMMARY")
    
    if token and pi_token:
        print("\n✅ ALL TESTS PASSED!")
        print("\nYour authentication system is working correctly.")
        print("\nNext steps:")
        print("1. Test in Postman using the token")
        print("2. Update your dashboard to use authentication")
        print("3. See AUTHENTICATION_SETUP_GUIDE.md for details")
    else:
        print("\n⚠️ SOME TESTS FAILED")
        print("\nTroubleshooting:")
        print("1. Make sure both APIs are running")
        print("2. Check that test credentials exist in Firebase")
        print("3. Review error messages above")
    
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
