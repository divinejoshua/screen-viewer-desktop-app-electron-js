# Screen & Camera Recorder

An Electron application that allows you to record your screen and camera simultaneously, perfect for creating tutorials, presentations, or video calls with screen sharing.

## Features

- 🖥️ **Screen Recording**: Capture your entire screen or specific windows
- 📷 **Camera Recording**: Record from your webcam simultaneously
- 🎬 **Combined Recording**: Merge screen and camera feeds into a single video
- 💾 **Local Saving**: Save recordings directly to your computer
- 🎨 **Modern UI**: Beautiful, responsive interface with real-time previews
- ⏱️ **Recording Timer**: See how long you've been recording
- 🔄 **Stream Management**: Easy start/stop controls for all streams

## How It Works

1. **Start Screen Capture**: Click "Start Screen" to begin capturing your screen
2. **Start Camera**: Click "Start Camera" to begin capturing your webcam
3. **Combine Streams**: Click "Combine Streams" to merge both feeds
4. **Start Recording**: Click "Start Recording" to begin recording the combined video
5. **Stop Recording**: Click "Stop Recording" to end the recording
6. **Save Video**: The app will prompt you to save the video file locally

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Development Mode**:
   ```bash
   npm run electron-dev
   ```
   This will start the webpack dev server and launch Electron.

3. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## Usage Instructions

### First Time Setup
1. Launch the application
2. Grant permissions when prompted for:
   - Screen sharing access
   - Camera access
   - Microphone access (for audio recording)

### Recording Process
1. **Start Screen Capture**: 
   - Click "Start Screen" button
   - Select the screen/window you want to record
   - You'll see a preview of your screen

2. **Start Camera**:
   - Click "Start Camera" button
   - Allow camera access when prompted
   - You'll see a preview of your camera feed

3. **Combine Streams**:
   - Click "Combine Streams" to merge both feeds
   - The camera will appear as a small overlay in the bottom-right corner

4. **Record**:
   - Click "Start Recording" to begin
   - A timer will show your recording duration
   - Click "Stop Recording" when finished

5. **Save**:
   - Choose where to save your video file
   - The video will be saved in WebM format

## Technical Details

- **Screen Capture**: Uses `getDisplayMedia()` API
- **Camera Capture**: Uses `getUserMedia()` API
- **Stream Combination**: Canvas-based video composition
- **Recording**: MediaRecorder API with WebM format
- **File Saving**: Electron's native file dialog

## File Formats

- **Input**: Screen and camera streams
- **Output**: WebM video files (compatible with most video players)
- **Audio**: Included from screen capture (system audio)

## Troubleshooting

### Common Issues

1. **Permission Denied**:
   - Make sure to allow screen sharing and camera access
   - Check your system's privacy settings

2. **No Audio**:
   - Ensure you select "Share system audio" when starting screen capture
   - Check your system's audio settings

3. **Poor Performance**:
   - Close unnecessary applications
   - Lower the recording resolution if needed
   - Ensure sufficient disk space

4. **Video Not Saving**:
   - Check available disk space
   - Ensure you have write permissions to the save location

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 14 or higher
- **Browser**: Modern browser with WebRTC support
- **Hardware**: Webcam and sufficient RAM for video processing

## Development

### Project Structure
```
├── main.js              # Electron main process
├── preload.js           # Electron preload script
├── webpack.config.js    # Webpack configuration
├── src/
│   ├── App.js          # Main React component
│   ├── index.js        # React entry point
│   ├── index.html      # HTML template
│   └── styles.css      # Application styles
└── dist/               # Built application (generated)
```

### Available Scripts
- `npm run dev`: Start webpack dev server
- `npm run build`: Build for production
- `npm run electron-dev`: Run in development mode
- `npm start`: Run production build

## License

ISC License - feel free to use and modify as needed.
