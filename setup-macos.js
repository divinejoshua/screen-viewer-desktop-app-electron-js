const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// This script sets up macOS permissions properly
function setupMacOSPermissions() {
  if (process.platform !== 'darwin') {
    return;
  }

  try {
    // Get the path to the Electron app bundle
    const electronPath = process.execPath;
    const appPath = path.dirname(electronPath);
    const infoPlistPath = path.join(appPath, '..', 'Info.plist');
    
    // Check if Info.plist exists
    if (fs.existsSync(infoPlistPath)) {
      console.log('Info.plist found at:', infoPlistPath);
    } else {
      console.log('Info.plist not found, creating...');
      
      // Create the Info.plist content
      const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSCameraUsageDescription</key>
    <string>This app needs camera access to record video with your face visible.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>This app needs microphone access to record audio with your screen and camera.</string>
    <key>NSScreenCaptureUsageDescription</key>
    <string>This app needs screen recording permission to capture your screen.</string>
    <key>NSCameraUseContinuityCameraDeviceType</key>
    <true/>
    <key>NSDesktopFolderUsageDescription</key>
    <string>This app needs access to save recorded videos to your desktop.</string>
    <key>NSDocumentsFolderUsageDescription</key>
    <string>This app needs access to save recorded videos to your documents folder.</string>
</dict>
</plist>`;
      
      // Write the Info.plist file
      fs.writeFileSync(infoPlistPath, infoPlistContent);
      console.log('Info.plist created successfully');
    }
  } catch (error) {
    console.error('Error setting up macOS permissions:', error);
  }
}

module.exports = { setupMacOSPermissions };
