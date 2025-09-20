import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [combinedStream, setCombinedStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [status, setStatus] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const screenVideoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const combinedVideoRef = useRef(null);
  const timerRef = useRef(null);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start screen capture
  const startScreenCapture = useCallback(async () => {
    try {
      setStatus('Requesting screen access...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      setScreenStream(stream);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      setStatus('Screen capture started');
      
      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setStatus('Screen capture ended');
      };
      
    } catch (error) {
      console.error('Error accessing screen:', error);
      setStatus(`Error: ${error.message}`);
    }
  }, []);

  // Start camera capture
  const startCameraCapture = useCallback(async () => {
    try {
      setStatus('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setStatus('Camera capture started');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setStatus(`Error: ${error.message}`);
    }
  }, []);

  // Combine streams
  const combineStreams = useCallback(() => {
    if (!screenStream || !cameraStream) {
      setStatus('Please start both screen and camera capture first');
      return;
    }

    try {
      // Create a canvas to combine the streams
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match screen stream
      const screenTrack = screenStream.getVideoTracks()[0];
      const screenSettings = screenTrack.getSettings();
      canvas.width = screenSettings.width || 1920;
      canvas.height = screenSettings.height || 1080;

      // Create a new stream from the canvas
      const combinedStream = canvas.captureStream(30);
      
      // Add audio from screen stream
      const audioTracks = screenStream.getAudioTracks();
      audioTracks.forEach(track => {
        combinedStream.addTrack(track);
      });

      setCombinedStream(combinedStream);
      if (combinedVideoRef.current) {
        combinedVideoRef.current.srcObject = combinedStream;
      }

      // Draw function to combine video streams
      const draw = () => {
        if (screenVideoRef.current && cameraVideoRef.current) {
          // Clear canvas
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw screen stream (full size)
          ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
          
          // Draw camera stream (small overlay in bottom right)
          const cameraSize = Math.min(canvas.width * 0.2, canvas.height * 0.2, 200);
          const x = canvas.width - cameraSize - 20;
          const y = canvas.height - cameraSize - 20;
          
          // Draw border around camera
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x - 2, y - 2, cameraSize + 4, cameraSize + 4);
          
          // Draw camera video
          ctx.drawImage(cameraVideoRef.current, x, y, cameraSize, cameraSize);
        }
        
        if (isRecording) {
          requestAnimationFrame(draw);
        }
      };

      // Start drawing
      draw();
      setStatus('Streams combined successfully');
      
    } catch (error) {
      console.error('Error combining streams:', error);
      setStatus(`Error combining streams: ${error.message}`);
    }
  }, [screenStream, cameraStream, isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!combinedStream) {
      setStatus('Please combine streams first');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Starting recording...');
      
      const chunks = [];
      setRecordedChunks(chunks);
      
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await saveVideo(blob);
      };
      
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setStatus('Recording started');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus(`Error starting recording: ${error.message}`);
      setIsLoading(false);
    }
  }, [combinedStream]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setStatus('Recording stopped');
    }
  }, [mediaRecorder, isRecording]);

  // Save video
  const saveVideo = useCallback(async (blob) => {
    try {
      setIsLoading(true);
      setStatus('Saving video...');
      
      // Convert blob to buffer
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use Electron API to save file
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.saveVideo(buffer);
        if (result.success) {
          setStatus(`Video saved successfully to: ${result.path}`);
        } else {
          setStatus(`Error saving video: ${result.error}`);
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
        setStatus('Video downloaded successfully');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error saving video:', error);
      setStatus(`Error saving video: ${error.message}`);
      setIsLoading(false);
    }
  }, []);

  // Stop all streams
  const stopAllStreams = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (combinedStream) {
      combinedStream.getTracks().forEach(track => track.stop());
      setCombinedStream(null);
    }
    if (isRecording) {
      stopRecording();
    }
    setStatus('All streams stopped');
  }, [screenStream, cameraStream, combinedStream, isRecording, stopRecording]);

  return (
    <>
      <Head>
        <title>Screen & Camera Recorder</title>
        <meta name="description" content="Record your screen and camera simultaneously" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="app">
        <div className="header">
          <h1>🎥 Screen & Camera Recorder</h1>
          <p>Record your screen and camera simultaneously</p>
        </div>

        <div className="recorder-container">
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span className="timer">Recording: {formatTime(recordingTime)}</span>
            </div>
          )}

          <div className="preview-container">
            <div className="screen-preview">
              <div className="preview-label">Screen</div>
              {screenStream ? (
                <video ref={screenVideoRef} autoPlay muted playsInline />
              ) : (
                <div className="no-preview">No screen capture</div>
              )}
            </div>
            
            <div className="camera-preview">
              <div className="preview-label">Camera</div>
              {cameraStream ? (
                <video ref={cameraVideoRef} autoPlay muted playsInline />
              ) : (
                <div className="no-preview">No camera</div>
              )}
            </div>
          </div>

          <div className="controls">
            <button 
              className="btn btn-secondary" 
              onClick={startScreenCapture}
              disabled={isLoading || isRecording}
            >
              📺 Start Screen
            </button>
            
            <button 
              className="btn btn-secondary" 
              onClick={startCameraCapture}
              disabled={isLoading || isRecording}
            >
              📷 Start Camera
            </button>
            
            <button 
              className="btn btn-secondary" 
              onClick={combineStreams}
              disabled={isLoading || isRecording || !screenStream || !cameraStream}
            >
              🔗 Combine Streams
            </button>
            
            <button 
              className="btn btn-primary" 
              onClick={startRecording}
              disabled={isLoading || isRecording || !combinedStream}
            >
              ⏺️ Start Recording
            </button>
            
            <button 
              className="btn btn-danger" 
              onClick={stopRecording}
              disabled={isLoading || !isRecording}
            >
              ⏹️ Stop Recording
            </button>
            
            <button 
              className="btn btn-secondary" 
              onClick={stopAllStreams}
              disabled={isLoading}
            >
              🛑 Stop All
            </button>
          </div>

          {status && (
            <div className={`status ${status.includes('Error') ? 'error' : status.includes('successfully') ? 'success' : ''}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
