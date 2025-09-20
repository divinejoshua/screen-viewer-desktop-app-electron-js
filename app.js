class ScreenRecorder {
    constructor() {
        this.screenStream = null;
        this.cameraStream = null;
        this.combinedStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingTime = 0;
        this.timerInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.screenVideo = document.getElementById('screenVideo');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.screenNoPreview = document.getElementById('screenNoPreview');
        this.cameraNoPreview = document.getElementById('cameraNoPreview');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.timer = document.getElementById('timer');
        this.status = document.getElementById('status');
        
        this.startScreenBtn = document.getElementById('startScreenBtn');
        this.startCameraBtn = document.getElementById('startCameraBtn');
        this.combineStreamsBtn = document.getElementById('combineStreamsBtn');
        this.startRecordingBtn = document.getElementById('startRecordingBtn');
        this.stopRecordingBtn = document.getElementById('stopRecordingBtn');
        this.stopAllBtn = document.getElementById('stopAllBtn');
    }

    attachEventListeners() {
        this.startScreenBtn.addEventListener('click', () => this.startScreenCapture());
        this.startCameraBtn.addEventListener('click', () => this.startCameraCapture());
        this.combineStreamsBtn.addEventListener('click', () => this.combineStreams());
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        this.stopAllBtn.addEventListener('click', () => this.stopAllStreams());
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    async getElectronScreenStream() {
        if (!window.electronAPI || !window.electronAPI.getDesktopSources) {
            return null;
        }

        // Get available screen sources from Electron
        const sources = await window.electronAPI.getDesktopSources({ types: ['screen'] });
        if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
        }

        // Prefer primary/entire screen if present
        const preferred = sources.find(s => /Entire Screen|Screen 1|Primary/i.test(s.name)) || sources[0];
        const platform = (await window.electronAPI.getPlatform?.()) || 'unknown';

        // On macOS, system audio via desktop capture is generally unsupported without extra setup
        const wantAudio = platform !== 'darwin';

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: wantAudio ? { mandatory: { chromeMediaSource: 'desktop' } } : false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: preferred.id,
                    maxFrameRate: 30,
                    maxWidth: 1920,
                    maxHeight: 1080
                }
            }
        });

        return stream;
    }

    async startScreenCapture() {
        try {
            this.setStatus('Requesting screen access...');
            
            // Prefer Electron desktopCapturer path when available
            let screenStream = null;
            if (window.electronAPI && window.electronAPI.getDesktopSources) {
                try {
                    screenStream = await this.getElectronScreenStream();
                } catch (e) {
                    console.warn('Electron desktopCapturer path failed, falling back to getDisplayMedia:', e);
                }
            }

            // Fallback to getDisplayMedia if needed
            if (!screenStream) {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    throw new Error('Screen sharing is not supported in this environment');
                }

                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: { ideal: 1920, max: 1920 },
                            height: { ideal: 1080, max: 1080 },
                            frameRate: { ideal: 30, max: 60 }
                        },
                        // System audio support varies; request but handle failure below
                        audio: true
                    });
                } catch (firstError) {
                    console.warn('getDisplayMedia with audio failed, retrying video-only...', firstError);
                    // Retry video-only, as audio is commonly unsupported
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: false
                    });
                }
            }
            
            this.screenStream = screenStream;
            
            this.screenVideo.srcObject = this.screenStream;
            this.screenVideo.style.display = 'block';
            this.screenNoPreview.style.display = 'none';
            this.setStatus('Screen capture started');
            
            // Handle stream end
            this.screenStream.getVideoTracks()[0].onended = () => {
                this.screenStream = null;
                this.screenVideo.style.display = 'none';
                this.screenNoPreview.style.display = 'flex';
                this.setStatus('Screen capture ended');
            };
            
        } catch (error) {
            console.error('Error accessing screen:', error);
            let errorMessage = error.message;
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Screen sharing permission denied. Please allow screen sharing and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No screen source found. Make sure you have a screen to share.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Screen sharing is not supported in this environment. If on macOS, grant Screen Recording permission.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Screen sharing was cancelled.';
            }
            
            this.setStatus(`Error: ${errorMessage}`, 'error');
        }
    }

    async startCameraCapture() {
        try {
            this.setStatus('Requesting camera access...');
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });
            
            this.cameraVideo.srcObject = this.cameraStream;
            this.cameraVideo.style.display = 'block';
            this.cameraNoPreview.style.display = 'none';
            this.setStatus('Camera capture started');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.setStatus(`Error: ${error.message}`, 'error');
        }
    }

    combineStreams() {
        if (!this.screenStream || !this.cameraStream) {
            this.setStatus('Please start both screen and camera capture first', 'error');
            return;
        }

        try {
            // Create a canvas to combine the streams
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match screen stream
            const screenTrack = this.screenStream.getVideoTracks()[0];
            const screenSettings = screenTrack.getSettings();
            canvas.width = screenSettings.width || 1920;
            canvas.height = screenSettings.height || 1080;

            // Create a new stream from the canvas
            this.combinedStream = canvas.captureStream(30);
            
            // Add audio from screen stream
            const audioTracks = this.screenStream.getAudioTracks();
            audioTracks.forEach(track => {
                this.combinedStream.addTrack(track);
            });

            // Draw function to combine video streams
            const draw = () => {
                if (this.screenVideo && this.cameraVideo) {
                    // Clear canvas
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw screen stream (full size)
                    ctx.drawImage(this.screenVideo, 0, 0, canvas.width, canvas.height);
                    
                    // Draw camera stream (small overlay in bottom right)
                    const cameraSize = Math.min(canvas.width * 0.2, canvas.height * 0.2, 200);
                    const x = canvas.width - cameraSize - 20;
                    const y = canvas.height - cameraSize - 20;
                    
                    // Draw border around camera
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x - 2, y - 2, cameraSize + 4, cameraSize + 4);
                    
                    // Draw camera video
                    ctx.drawImage(this.cameraVideo, x, y, cameraSize, cameraSize);
                }
                
                if (this.isRecording) {
                    requestAnimationFrame(draw);
                }
            };

            // Start drawing
            draw();
            this.setStatus('Streams combined successfully', 'success');
            
        } catch (error) {
            console.error('Error combining streams:', error);
            this.setStatus(`Error combining streams: ${error.message}`, 'error');
        }
    }

    async startRecording() {
        if (!this.combinedStream) {
            this.setStatus('Please combine streams first', 'error');
            return;
        }

        try {
            this.setStatus('Starting recording...');
            
            this.recordedChunks = [];
            
            this.mediaRecorder = new MediaRecorder(this.combinedStream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.saveVideo(blob);
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            this.recordingTime = 0;
            
            // Show recording indicator
            this.recordingIndicator.style.display = 'flex';
            
            // Start timer
            this.timerInterval = setInterval(() => {
                this.recordingTime++;
                this.timer.textContent = `Recording: ${this.formatTime(this.recordingTime)}`;
            }, 1000);
            
            this.setStatus('Recording started', 'success');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.setStatus(`Error starting recording: ${error.message}`, 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Hide recording indicator
            this.recordingIndicator.style.display = 'none';
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            this.setStatus('Recording stopped');
        }
    }

    async saveVideo(blob) {
        try {
            this.setStatus('Saving video...');
            
            // Convert blob to buffer
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            
            // Use Electron API to save file
            if (window.electronAPI) {
                const result = await window.electronAPI.saveVideo(buffer);
                if (result.success) {
                    this.setStatus(`Video saved successfully to: ${result.path}`, 'success');
                } else {
                    this.setStatus(`Error saving video: ${result.error}`, 'error');
                }
            } else {
                // Fallback for web version
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.setStatus('Video downloaded successfully', 'success');
            }
            
        } catch (error) {
            console.error('Error saving video:', error);
            this.setStatus(`Error saving video: ${error.message}`, 'error');
        }
    }

    stopAllStreams() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
            this.screenVideo.style.display = 'none';
            this.screenNoPreview.style.display = 'flex';
        }
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
            this.cameraVideo.style.display = 'none';
            this.cameraNoPreview.style.display = 'flex';
        }
        if (this.combinedStream) {
            this.combinedStream.getTracks().forEach(track => track.stop());
            this.combinedStream = null;
        }
        if (this.isRecording) {
            this.stopRecording();
        }
        this.setStatus('All streams stopped');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if running in Electron
    if (window.electronAPI) {
        console.log('Running in Electron - screen sharing should work');
    } else {
        console.log('Running in browser - screen sharing may have limitations');
    }
    
    // Wait a bit for Electron to fully initialize
    setTimeout(() => {
        new ScreenRecorder();
    }, 500);
});
