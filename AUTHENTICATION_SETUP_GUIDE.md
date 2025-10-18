# Raspberry Pi Authentication Setup Guide

## Overview
Your Rosec website now has a complete authentication system with three components:

1. **Frontend Authentication** - Firebase Auth (for web users)
2. **Real Auth API** - Backend authentication service (Port 5001)
3. **Authenticated Pi API** - Raspberry Pi scanner with JWT authentication (Port 5000)

---

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Dashboard)    │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│  Firebase Auth  │                  │  Real Auth API  │
│  (Direct Login) │                  │   Port 5001     │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              │ JWT Token
                                              ▼
                                     ┌─────────────────┐
                                     │  Pi API (Auth)  │
                                     │   Port 5000     │
                                     └─────────────────┘
```

---

## Setup Instructions

### Step 1: Start the Real Auth API (Port 5001)

```powershell
python real_auth_api.py
```

This API handles:
- User authentication with Firebase Admin SDK
- JWT token generation
- Token verification

### Step 2: Start the Authenticated Pi API (Port 5000)

```powershell
python raspberry_pi_api_authenticated.py
```

This API handles:
- Scanner operations (requires authentication)
- Camera preview (requires authentication)
- Session management (requires authentication)

---

## Testing with Postman

### 1. Get Authentication Token

**Endpoint:** `POST http://localhost:5001/api/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@rosec.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Copy the token from the response!**

---

### 2. Use Token to Access Pi API

**Endpoint:** `GET http://localhost:5000/api/status`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "success": true,
  "status": {
    "online": true,
    "scanner_ready": true,
    "authenticated_user": "admin@rosec.com",
    "scan_count": 0
  }
}
```

---

### 3. Initialize Scanner (Authenticated)

**Endpoint:** `POST http://localhost:5000/api/initialize`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "success": true,
  "message": "Scanner initialized successfully",
  "initialized_by": "admin@rosec.com"
}
```

---

### 4. Start Scanning Session (Authenticated)

**Endpoint:** `POST http://localhost:5000/api/session/start`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body:**
```json
{
  "session_name": "Math Exam Session",
  "exam_id": "exam_001"
}
```

---

## Frontend Integration

### Using the Updated Raspberry Pi Client

```javascript
// Initialize the client
const piClient = new RaspberryPiClientFree({
    raspberryPiUrl: 'http://192.168.1.100:5000'
});

// Authenticate with email and password
try {
    await piClient.authenticate('admin@rosec.com', 'admin123');
    console.log('✅ Authenticated with Pi');
    
    // Now you can use all authenticated endpoints
    const status = await piClient.getRaspberryPiStatus();
    console.log('Pi Status:', status);
    
    // Initialize scanner
    await piClient.initializeScanner();
    
    // Start session
    await piClient.startScanningSession('My Session', 'exam_001');
    
} catch (error) {
    console.error('❌ Authentication failed:', error);
}
```

### Event Listeners

```javascript
// Listen for authentication events
piClient.on('authenticated', (data) => {
    console.log('Authenticated as:', data.email);
});

piClient.on('authenticationFailed', (data) => {
    console.error('Auth failed:', data.error);
});

piClient.on('passwordRequired', (data) => {
    // Prompt user for password
    const password = prompt(`Enter password for ${data.email}`);
    piClient.authenticate(data.email, password);
});
```

---

## Security Notes

### ✅ What's Secure:
- Passwords never sent to Pi API directly
- JWT tokens expire after 24 hours
- All sensitive endpoints require authentication
- Tokens use HMAC-SHA256 signing

### ⚠️ For Production:
1. **Use HTTPS** - Never send tokens over HTTP in production
2. **Environment Variables** - Store JWT_SECRET in environment variables
3. **Token Refresh** - Implement token refresh mechanism
4. **Rate Limiting** - Add rate limiting to prevent brute force
5. **CORS** - Configure CORS properly for your domain

---

## Troubleshooting

### Error: "Authentication required"
- Make sure you included the `Authorization` header
- Check that the token hasn't expired
- Verify the token format: `Bearer YOUR_TOKEN`

### Error: "Invalid token"
- Token may be expired (24 hours)
- JWT_SECRET mismatch between auth API and Pi API
- Token was modified or corrupted

### Error: "Connection refused"
- Make sure both APIs are running
- Check firewall settings
- Verify correct ports (5000 for Pi, 5001 for Auth)

---

## API Endpoints Summary

### Real Auth API (Port 5001)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/login` | POST | ❌ | Get JWT token |
| `/api/verify-token` | POST | ❌ | Verify token validity |
| `/api/health` | GET | ❌ | Health check |

### Authenticated Pi API (Port 5000)
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/authenticate` | POST | ❌ | Authenticate with Pi |
| `/api/status` | GET | ✅ | Get Pi status |
| `/api/initialize` | POST | ✅ | Initialize scanner |
| `/api/scan` | POST | ✅ | Scan answer sheet |
| `/api/session/start` | POST | ✅ | Start session |
| `/api/session/end` | POST | ✅ | End session |
| `/api/preview` | GET | ✅ | Get camera preview |
| `/api/health` | GET | ❌ | Health check |

---

## Next Steps

1. ✅ Test authentication flow in Postman
2. ✅ Update your dashboard to authenticate with Pi before scanning
3. ✅ Add password prompt UI for Pi authentication
4. ✅ Store token securely (sessionStorage or localStorage)
5. ✅ Handle token expiration gracefully

---

## Example: Complete Flow

```javascript
// 1. User logs into website (Firebase Auth)
await login(email, password);

// 2. When accessing Pi scanner, authenticate
const piClient = new RaspberryPiClientFree();
await piClient.authenticate(email, password);

// 3. Use scanner
await piClient.initializeScanner();
await piClient.startScanningSession('Session 1', 'exam_001');
const result = await piClient.scanAnswerSheet(examTemplate);

// 4. Cleanup
await piClient.endScanningSession();
piClient.clearAuth();
```

---

## Support

For issues or questions, check:
- Console logs for detailed error messages
- Network tab in browser DevTools
- Server logs for both APIs
