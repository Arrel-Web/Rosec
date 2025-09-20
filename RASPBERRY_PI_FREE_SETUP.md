# Raspberry Pi Setup Guide - Free Plan Version

This guide shows you how to connect your Rosec website to a Raspberry Pi using only Firebase's free features.

## What You Get (100% Free) ✅

- ✅ **Raspberry Pi API** - Complete camera and scanning functionality
- ✅ **Direct Web Communication** - JavaScript client connects directly to Pi
- ✅ **Firebase Firestore** - Store scan results in database (free tier: 50K reads/day)
- ✅ **Firebase Hosting** - Your website (already working)
- ✅ **Firebase Authentication** - User login (already working)

## Architecture (Free Plan)

```
Your Website (Firebase Hosting)
        ↕ Direct Connection
Raspberry Pi API (Local Network)
        ↕
Camera + Image Processing
        ↕
Results saved to Firebase Firestore
```

## Quick Setup Steps

### 1. Prepare Your Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv libopencv-dev python3-opencv

# Create virtual environment
python3 -m venv ~/rosec-scanner
source ~/rosec-scanner/bin/activate

# Install Python packages
pip install flask flask-cors opencv-python numpy pillow requests psutil
```

### 2. Copy Files to Raspberry Pi

Copy these files from your project to the Pi:
- `raspberry_pi_api.py`
- `raspberry_pi_requirements.txt`

```bash
# From your computer, copy to Pi (replace YOUR_PI_IP with actual IP)
scp raspberry_pi_api.py pi@YOUR_PI_IP:~/
scp raspberry_pi_requirements.txt pi@YOUR_PI_IP:~/
```

### 3. Find Your Pi's IP Address

On your Raspberry Pi, run:
```bash
hostname -I
```
Note this IP address (e.g., `192.168.1.100`)

### 4. Start the API on Raspberry Pi

```bash
# On your Raspberry Pi
source ~/rosec-scanner/bin/activate
python3 raspberry_pi_api.py
```

You should see:
```
Starting Raspberry Pi API server...
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:5000
* Running on http://192.168.1.100:5000
```

### 5. Update Your Website

Add this to your HTML pages where you want to use the scanner:

```html
<script type="module">
import RaspberryPiClientFree from './js/raspberry-pi-client-free.js';

// Initialize with your Pi's IP address
const piClient = new RaspberryPiClientFree({
    raspberryPiUrl: 'http://192.168.1.100:5000' // Replace with your Pi's IP
});

// Test connection
async function testConnection() {
    try {
        const result = await piClient.testConnection();
        if (result.connected) {
            console.log('✅ Connected to Raspberry Pi');
            document.getElementById('pi-status').textContent = 'Connected';
        } else {
            console.log('❌ Connection failed:', result.error);
            document.getElementById('pi-status').textContent = 'Disconnected';
        }
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

// Set up event listeners
piClient.on('statusUpdate', (status) => {
    console.log('Pi Status:', status);
    // Update your UI here
});

piClient.on('scanCompleted', (results) => {
    console.log('Scan Results:', results);
    // Display scan results in your UI
});

piClient.on('error', (error) => {
    console.error('Pi Error:', error);
    // Show error message to user
});

// Test connection when page loads
testConnection();

// Make piClient available globally for testing
window.piClient = piClient;
</script>
```

## Example Usage

### Basic Scanning

```javascript
async function performScan() {
    try {
        // 1. Initialize scanner
        await piClient.initializeScanner();
        
        // 2. Create exam template (or get from Firestore)
        const examTemplate = {
            examId: 'math_midterm_2024',
            title: 'Mathematics Midterm',
            totalQuestions: 25,
            choiceOptions: 4,
            scannerSettings: {
                studentIdLength: 8,
                subjectIdLength: 4,
                bubbleDetectionThreshold: 0.7
            }
        };
        
        // 3. Start scanning session
        await piClient.startScanningSession('Math Midterm Session', 'math_midterm_2024');
        
        // 4. Scan answer sheet
        const scanResult = await piClient.scanAnswerSheet(examTemplate);
        
        // 5. Results are automatically saved to Firestore
        console.log('Student ID:', scanResult.results.student_id);
        console.log('Answers:', scanResult.results.answers);
        
        // 6. End session
        await piClient.endScanningSession();
        
    } catch (error) {
        console.error('Scanning failed:', error);
        alert('Scanning failed: ' + error.message);
    }
}
```

### Camera Preview

```javascript
async function showCameraPreview() {
    try {
        const preview = await piClient.getCameraPreview();
        if (preview.success) {
            document.getElementById('camera-preview').src = preview.image;
        }
    } catch (error) {
        console.error('Preview failed:', error);
    }
}

// Update preview every 2 seconds
setInterval(showCameraPreview, 2000);
```

### Status Monitoring

```javascript
// Start monitoring Pi status
piClient.startStatusPolling(3000); // Every 3 seconds

piClient.on('statusUpdate', (status) => {
    document.getElementById('cpu-temp').textContent = `${status.system_info.cpu_temperature}°C`;
    document.getElementById('memory-usage').textContent = `${status.system_info.memory_usage}%`;
    document.getElementById('scan-count').textContent = status.scan_count;
    document.getElementById('scanner-ready').textContent = status.scanner_ready ? 'Ready' : 'Not Ready';
});
```

## Testing Your Setup

### 1. Test Pi Connection
Open your browser's developer console and run:
```javascript
piClient.testConnection().then(result => console.log(result));
```

### 2. Test Camera
```javascript
piClient.getCameraPreview().then(result => console.log(result));
```

### 3. Test Scanner Initialization
```javascript
piClient.initializeScanner().then(result => console.log(result));
```

## Firestore Database Structure

Your scan results will be automatically saved to Firestore with this structure:

```
scan_results/
  └── [auto-generated-id]/
      ├── examId: "math_midterm_2024"
      ├── studentId: "20241234"
      ├── answers: {1: "A", 2: "B", 3: "C", ...}
      ├── confidence: 0.95
      ├── processingTime: 1.2
      ├── timestamp: [server timestamp]
      ├── scannedBy: [user ID]
      └── scannedByEmail: [user email]

scanning_sessions/
  └── [session-id]/
      ├── name: "Math Midterm Session"
      ├── exam_id: "math_midterm_2024"
      ├── start_time: "2024-01-15T10:30:00Z"
      ├── status: "started" or "ended"
      └── scan_count: 25

raspberry_pi_status/
  └── current/
      ├── online: true
      ├── scanner_ready: true
      ├── current_session: [session data]
      ├── scan_count: 15
      └── system_info: {...}
```

## Troubleshooting

### Common Issues

1. **"Connection failed" error**
   - Check Pi IP address: `hostname -I` on Pi
   - Ensure Pi and computer are on same network
   - Check if API is running: `curl http://YOUR_PI_IP:5000/api/status`

2. **Camera not working**
   - Test camera: `lsusb` (for USB camera)
   - Check permissions: `sudo usermod -a -G video $USER`

3. **CORS errors in browser**
   - The API includes CORS headers, but ensure you're accessing from the same domain or use HTTPS

### Network Setup

If your Pi and computer are on different networks, you can:
1. Use port forwarding on your router
2. Set up a VPN
3. Use ngrok for testing: `ngrok http 5000`

## Auto-Start (Optional)

To start the API automatically when Pi boots:

```bash
# Create systemd service
sudo nano /etc/systemd/system/rosec-api.service
```

Add:
```ini
[Unit]
Description=Rosec Scanner API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/home/pi/rosec-scanner/bin/python /home/pi/raspberry_pi_api.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable rosec-api.service
sudo systemctl start rosec-api.service
```

## Next Steps

1. **Test the basic setup** with a simple answer sheet
2. **Customize the scanning algorithm** in `raspberry_pi_api.py`
3. **Add your own UI** for the scanning interface
4. **Implement grading logic** using the answer key
5. **Add export functionality** for scan results

You now have a complete, free answer sheet scanning system! 🎉