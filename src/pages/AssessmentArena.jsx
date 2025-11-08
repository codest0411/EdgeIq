import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Camera, Mic, Monitor, AlertTriangle, Clock, 
  CheckCircle, XCircle, Code, FileText, Brain,
  Eye, EyeOff, Maximize, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AssessmentArena() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  
  // Assessment State
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState(2700); // 45 minutes
  const [isActive, setIsActive] = useState(false);
  
  // Proctoring State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [violations, setViolations] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [ping, setPing] = useState(0);
  
  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  
  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  
  // Pre-assessment camera/mic check
  const [previewActive, setPreviewActive] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  const previewVideoRef = useRef(null);

  // Initialize Assessment
  useEffect(() => {
    initializeAssessment();
    setupEventListeners();
    startPingMonitoring();
    
    return () => {
      cleanup();
    };
  }, [assessmentId]);

  // Ping Monitoring
  const startPingMonitoring = () => {
    const measurePing = async () => {
      const start = Date.now();
      try {
        await supabase.from('assessments').select('id').limit(1);
        const latency = Date.now() - start;
        setPing(latency);
      } catch (err) {
        setPing(999);
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  };

  const initializeAssessment = async () => {
    try {
      console.log('=== INITIALIZING ASSESSMENT ===');
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);
      setTimeRemaining(assessmentData.duration_minutes * 60);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Create attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_attempts')
        .insert({
          user_id: user.id,
          assessment_id: assessmentId,
          status: 'in_progress',
          time_remaining_seconds: assessmentData.duration_minutes * 60
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      setAttemptId(attemptData.id);

      console.log('✅ Assessment initialized');
      setLoading(false);

    } catch (err) {
      console.error('❌ Error initializing assessment:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const setupEventListeners = () => {
    // Detect tab switch
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Detect window blur
    window.addEventListener('blur', handleWindowBlur);
    
    // Detect fullscreen change
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Prevent right click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Detect key combinations
    document.addEventListener('keydown', handleKeyDown);
  };

  const handleVisibilityChange = () => {
    if (document.hidden && isActive) {
      logViolation('tab_switch', 'User switched tabs');
      showViolationWarning('Tab switch detected! This is a violation.');
    }
  };

  const handleWindowBlur = () => {
    if (isActive) {
      logViolation('window_blur', 'Window lost focus');
    }
  };

  const handleFullscreenChange = () => {
    const isNowFullscreen = !!document.fullscreenElement;
    setIsFullScreen(isNowFullscreen);
    
    if (!isNowFullscreen && isActive) {
      logViolation('fullscreen_exit', 'Exited fullscreen mode');
      showViolationWarning('You exited fullscreen! Please return to fullscreen.');
    }
  };

  const handleKeyDown = (e) => {
    // Prevent common shortcuts
    if (
      (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
      (e.altKey && e.key === 'Tab') ||
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I')
    ) {
      e.preventDefault();
      logViolation('key_press', `Blocked key: ${e.key}`);
    }
  };

  const logViolation = async (eventType, description) => {
    const newViolationCount = violations + 1;
    setViolations(newViolationCount);

    try {
      await supabase.from('activity_logs').insert({
        attempt_id: attemptId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        event_type: eventType,
        event_data: { description },
        severity: newViolationCount >= 3 ? 'critical' : 'warning'
      });

      // Auto-disqualify after 3 violations
      if (newViolationCount >= 3) {
        await disqualifyUser('Exceeded maximum violations (3)');
      }
    } catch (err) {
      console.error('Error logging violation:', err);
    }
  };

  const showViolationWarning = (message) => {
    setWarningMessage(message);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 5000);
  };

  const disqualifyUser = async (reason) => {
    try {
      await supabase
        .from('user_attempts')
        .update({
          status: 'disqualified',
          is_disqualified: true,
          disqualification_reason: reason,
          submitted_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      alert(`You have been disqualified: ${reason}`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error disqualifying user:', err);
    }
  };

  // Start preview camera/mic check
  const startPreview = async () => {
    try {
      console.log('🎥 Starting preview...');
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      
      console.log('✅ Stream obtained:', stream.active);
      console.log('Video tracks:', stream.getVideoTracks().length);
      console.log('Audio tracks:', stream.getAudioTracks().length);
      
      setPreviewStream(stream);
      
      // Connect to video element (it's always rendered now)
      if (previewVideoRef.current) {
        console.log('✅ Connecting stream to preview video...');
        previewVideoRef.current.srcObject = stream;
        
        // Wait a moment then play
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          await previewVideoRef.current.play();
          console.log('✅ Preview video playing');
          setPreviewActive(true);
        } catch (playErr) {
          console.error('⚠️ Preview play error:', playErr);
          // Set active anyway, video might autoplay
          setPreviewActive(true);
        }
      } else {
        console.error('❌ Preview video ref is still null!');
        setError('Video element not ready. Please try again.');
      }
      
    } catch (err) {
      console.error('❌ Preview error:', err);
      setError('Camera/Microphone access denied. Please allow permissions and try again.');
    }
  };

  // Stop preview
  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
      setPreviewActive(false);
    }
  };

  const startAssessment = async () => {
    try {
      // Stop preview first
      stopPreview();
      
      // Request fullscreen
      await document.documentElement.requestFullscreen();
      
      // Start camera and mic
      await startMediaCapture();
      
      // Start timer
      setIsActive(true);
      
      // Start snapshot capture
      startSnapshotCapture();
      
    } catch (err) {
      console.error('Error starting assessment:', err);
      setError('Failed to start assessment. Please allow camera and microphone access.');
    }
  };

  const startMediaCapture = async () => {
    try {
      console.log('=== REQUESTING CAMERA & MIC ACCESS ===');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera/Microphone not supported in this browser');
      }

      // Try with simpler constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('✅ Media stream obtained with simple constraints');
      } catch (simpleError) {
        console.log('Simple constraints failed, trying detailed constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        console.log('✅ Media stream obtained with detailed constraints');
      }

      console.log('Stream active:', stream.active);
      console.log('Video tracks:', stream.getVideoTracks().map(t => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));
      console.log('Audio tracks:', stream.getAudioTracks().map(t => ({
        id: t.id,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));

      streamRef.current = stream;
      
      // Set camera and mic active immediately
      setCameraActive(true);
      setMicActive(true);
      console.log('✅ Status updated: Camera and mic active');
      
      // Connect to video element - wait for it to be ready
      const connectVideo = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!videoRef.current && attempts < maxAttempts) {
          console.log(`Waiting for video element... attempt ${attempts + 1}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (videoRef.current) {
          console.log('✅ Connecting stream to video element...');
          videoRef.current.srcObject = stream;
          
          // Force video attributes
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          
          // Multiple approaches to start playback
          videoRef.current.onloadedmetadata = async () => {
            console.log('✅ Video metadata loaded');
            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            
            try {
              await videoRef.current.play();
              console.log('✅ Video playing via onloadedmetadata');
              setCameraActive(true);
            } catch (playError) {
              console.error('Play error in metadata handler:', playError);
            }
          };

          // Also try to play immediately
          setTimeout(async () => {
            if (videoRef.current) {
              try {
                await videoRef.current.play();
                console.log('✅ Video playing via setTimeout');
                setCameraActive(true);
              } catch (playError) {
                console.log('Play via setTimeout failed (may be normal):', playError.message);
              }
            }
          }, 200);
        } else {
          console.error('❌ Video ref is still null after waiting!');
        }
      };
      
      connectVideo();

      // Start recording with proper chunk handling
      console.log('🎬 Starting MediaRecorder...');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log('📦 Chunk received:', e.data.size, 'bytes');
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped. Total chunks:', chunks.length);
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log('📹 Final video blob size:', blob.size, 'bytes');
          await uploadRecording(blob);
        } else {
          console.warn('⚠️ No video chunks recorded');
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('❌ MediaRecorder error:', e);
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      console.log('✅ MediaRecorder started, state:', mediaRecorder.state);

    } catch (err) {
      console.error('Error starting media:', err);
      throw err;
    }
  };

  const startSnapshotCapture = () => {
    snapshotIntervalRef.current = setInterval(async () => {
      await captureSnapshot();
    }, 15000); // Every 15 seconds
  };

  const captureSnapshot = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      console.log('⚠️ Video not ready for snapshot');
      return;
    }

    try {
      console.log('📸 Capturing snapshot...');
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('❌ Failed to create snapshot blob');
          return;
        }

        const timestamp = Date.now();
        const fileName = `${attemptId}/${timestamp}.jpg`;
        
        console.log('📤 Uploading snapshot:', fileName, blob.size, 'bytes');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assessment-snapshots')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Snapshot upload error:', uploadError);
          return;
        }

        console.log('✅ Snapshot uploaded:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('assessment-snapshots')
          .getPublicUrl(fileName);

        console.log('🔗 Snapshot URL:', publicUrl);

        // Save to database
        const { data: user } = await supabase.auth.getUser();
        const { error: dbError } = await supabase.from('proctoring_snapshots').insert({
          attempt_id: attemptId,
          user_id: user.user.id,
          snapshot_url: publicUrl,
          face_detected: true, // You can add face detection later
          captured_at: new Date().toISOString()
        });

        if (dbError) {
          console.error('❌ Error saving snapshot to DB:', dbError);
        } else {
          console.log('✅ Snapshot saved to database');
        }
      }, 'image/jpeg', 0.9);

    } catch (err) {
      console.error('❌ Error capturing snapshot:', err);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      console.log('🎬 Uploading video recording...');
      console.log('Video blob size:', blob.size, 'bytes', '(', (blob.size / 1024 / 1024).toFixed(2), 'MB)');
      
      if (blob.size === 0) {
        console.error('❌ Video blob is empty, cannot upload');
        return;
      }

      const fileName = `${attemptId}/recording_${Date.now()}.webm`;
      
      console.log('📤 Uploading to:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assessment-videos')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Video upload error:', uploadError);
        return;
      }

      console.log('✅ Video uploaded successfully:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assessment-videos')
        .getPublicUrl(fileName);

      console.log('🔗 Video URL:', publicUrl);

      // Update attempt with video URL
      const { error: updateError } = await supabase
        .from('user_attempts')
        .update({ 
          video_url: publicUrl
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('❌ Error updating attempt with video URL:', updateError);
      } else {
        console.log('✅ Video URL saved to database');
      }

    } catch (err) {
      console.error('❌ Error uploading recording:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          submitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeRemaining]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const submitAssessment = async () => {
    try {
      console.log('=== SUBMITTING ASSESSMENT ===');
      
      // Stop media recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Stopping media recorder...');
        mediaRecorderRef.current.stop();
      }
      
      // Stop snapshot capture
      if (snapshotIntervalRef.current) {
        console.log('Stopping snapshot capture...');
        clearInterval(snapshotIntervalRef.current);
      }
      
      // Stop all media streams (camera & mic)
      if (streamRef.current) {
        console.log('Stopping camera and microphone...');
        streamRef.current.getTracks().forEach(track => {
          console.log(`Stopping track: ${track.kind} - ${track.label}`);
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Update states
      setCameraActive(false);
      setMicActive(false);
      console.log('✅ All media stopped');

      // Save all answers with proper JSONB format
      console.log('Saving answers...', Object.keys(answers).length, 'responses');
      for (const [questionId, answer] of Object.entries(answers)) {
        const { error: responseError } = await supabase
          .from('user_responses')
          .insert({
            attempt_id: attemptId,
            question_id: questionId,
            user_answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
            is_correct: false, // Will be evaluated later
            marks_obtained: 0
          });
        
        if (responseError) {
          console.error('Error saving response:', responseError);
        }
      }

      // Calculate total score (basic calculation)
      const totalQuestions = questions.length;
      const answeredQuestions = Object.keys(answers).length;
      const percentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

      // Update attempt status
      const { error: updateError } = await supabase
        .from('user_attempts')
        .update({
          status: 'completed',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: timeRemaining,
          total_score: answeredQuestions,
          percentage: percentage.toFixed(2)
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('Error updating attempt:', updateError);
      }

      console.log('✅ Assessment submitted successfully');
      console.log('Attempt ID:', attemptId);
      console.log('Answered:', answeredQuestions, '/', totalQuestions);
      console.log('Percentage:', percentage.toFixed(2), '%');

      alert('Assessment submitted successfully!');
      navigate('/dashboard');

    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment');
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up assessment resources...');
    
    // Stop preview if active
    stopPreview();
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping media recorder in cleanup...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    // Stop all media streams
    if (streamRef.current) {
      console.log('Stopping all media tracks in cleanup...');
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Stop snapshot interval
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    
    // Update states
    setCameraActive(false);
    setMicActive(false);
    
    console.log('✅ Cleanup complete');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-gray-800 rounded-lg p-8"
        >
          <div className="text-center mb-8">
            <Lock className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">
              {assessment?.title}
            </h1>
            <p className="text-gray-400">{assessment?.description}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Duration</span>
              <span className="text-white font-semibold">{assessment?.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Total Questions</span>
              <span className="text-white font-semibold">{questions.length}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Passing Score</span>
              <span className="text-white font-semibold">{assessment?.passing_score}%</span>
            </div>
          </div>

          {/* Camera/Mic Preview */}
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Camera & Microphone Check
            </h3>
            
            {/* Video Preview Container - Always rendered */}
            <div className="relative bg-black rounded-lg overflow-hidden mb-4 h-64">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ 
                  transform: 'scaleX(-1)', 
                  display: previewActive ? 'block' : 'none'
                }}
                onLoadedMetadata={(e) => {
                  console.log('✅ Preview video metadata loaded');
                  e.target.play().then(() => {
                    console.log('✅ Preview playing');
                  }).catch(err => console.log('Preview autoplay prevented:', err));
                }}
              />
              
              {/* Placeholder when not active */}
              {!previewActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Click below to test your camera and microphone</p>
                  </div>
                </div>
              )}
              
              {/* Live Preview Badge */}
              {previewActive && (
                <div className="absolute top-2 left-2 flex items-center space-x-2 bg-green-600 px-3 py-1 rounded z-10">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <span className="text-white text-xs font-semibold">PREVIEW</span>
                </div>
              )}
            </div>
            
            {/* Status Indicators */}
            {previewActive && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center justify-center space-x-2 bg-green-900/30 border border-green-600 rounded-lg p-3">
                  <Camera className="h-5 w-5 text-green-500" />
                  <span className="text-green-400 font-semibold">Camera Active</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-green-900/30 border border-green-600 rounded-lg p-3">
                  <Mic className="h-5 w-5 text-green-500" />
                  <span className="text-green-400 font-semibold">Mic Active</span>
                </div>
              </div>
            )}
            
            {/* Test Button */}
            {!previewActive && (
              <button
                onClick={startPreview}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Camera className="h-5 w-5" />
                <span>Test Camera & Mic</span>
              </button>
            )}
          </div>

          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-8">
            <h3 className="text-yellow-500 font-semibold mb-2 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Important Instructions
            </h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Assessment will run in fullscreen mode</li>
              <li>• Camera and microphone will be active throughout</li>
              <li>• Tab switching will be logged as a violation</li>
              <li>• 3 violations will result in disqualification</li>
              <li>• Assessment will auto-submit when time expires</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={startAssessment}
            disabled={!previewActive}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Maximize className="h-5 w-5" />
            <span>{previewActive ? 'Start Assessment' : 'Test Camera First'}</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Warning Overlay */}
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3"
        >
          <AlertTriangle className="h-6 w-6" />
          <span className="font-semibold">{warningMessage}</span>
        </motion.div>
      )}

      {/* Sidebar - Camera & Info */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        {/* Camera Feed */}
        <div className="mb-4">
          <div className="relative bg-black rounded-lg overflow-hidden border-2 border-gray-700 h-48">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ 
                transform: 'scaleX(-1)',
                display: 'block',
                backgroundColor: '#000'
              }}
              onLoadedMetadata={(e) => {
                console.log('✅ Main video metadata loaded');
                e.target.play().then(() => {
                  console.log('✅ Main video playing');
                  setCameraActive(true);
                }).catch(err => console.error('❌ Main play failed:', err));
              }}
              onCanPlay={(e) => {
                console.log('✅ Main video can play');
                e.target.play().catch(err => console.log('Main auto-play prevented:', err));
              }}
              onPlay={() => {
                console.log('✅ Main video play event fired');
                setCameraActive(true);
              }}
              onError={(e) => console.error('❌ Main video error:', e)}
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-gray-400 text-sm">Camera Initializing...</p>
                  <p className="text-gray-500 text-xs mt-1">Please allow camera access</p>
                </div>
              </div>
            )}
            {/* Live Indicator */}
            {cameraActive && (
              <div className="absolute top-2 left-2 flex items-center space-x-2 bg-red-600 px-2 py-1 rounded z-10">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span className="text-white text-xs font-semibold">LIVE</span>
              </div>
            )}
          </div>
          
          {/* Status Indicators */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="flex items-center justify-center space-x-1 bg-gray-700 rounded p-2">
              <Camera className={`h-3 w-3 ${cameraActive ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-xs text-gray-300">Cam</span>
            </div>
            <div className="flex items-center justify-center space-x-1 bg-gray-700 rounded p-2">
              <Mic className={`h-3 w-3 ${micActive ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-xs text-gray-300">Mic</span>
            </div>
            <div className="flex items-center justify-center space-x-1 bg-gray-700 rounded p-2">
              <div className={`w-2 h-2 rounded-full ${ping <= 50 ? 'bg-green-500' : ping <= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-semibold ${ping <= 50 ? 'text-green-500' : ping <= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                {ping}ms
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Time Remaining</span>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="text-3xl font-bold text-white">
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Violations */}
        <div className={`rounded-lg p-4 mb-4 ${violations >= 3 ? 'bg-red-900/20 border border-red-600' : 'bg-gray-700'}`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Violations</span>
            <span className={`text-2xl font-bold ${violations >= 3 ? 'text-red-500' : 'text-white'}`}>
              {violations}/3
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm">Progress</span>
            <span className="text-white text-sm">{currentQuestion + 1}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={submitAssessment}
          className="mt-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Submit Assessment
        </button>
      </div>

      {/* Main Content - Questions */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Question Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-400 font-semibold">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-gray-400 text-sm">
                {currentQ?.category} • {currentQ?.difficulty}
              </span>
            </div>
            <h2 className="text-2xl text-white font-semibold mb-4">
              {currentQ?.question_text}
            </h2>
            
            {/* MCQ Options */}
            {currentQ?.question_type === 'mcq' && (
              <div className="space-y-3">
                {currentQ?.options?.map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={option}
                      checked={answers[currentQ.id] === option}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-white">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Coding Question */}
            {currentQ?.question_type === 'coding' && (
              <div className="space-y-3">
                <label className="block text-gray-300 text-sm mb-2">
                  Write your code below:
                </label>
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder="// Write your code here..."
                  rows={15}
                  className="w-full px-4 py-3 bg-gray-900 text-white font-mono text-sm rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  spellCheck="false"
                />
                <p className="text-gray-400 text-xs">
                  💡 Tip: Write clean, well-commented code. Test your logic before submitting.
                </p>
              </div>
            )}

            {/* Text/Short Answer Question */}
            {currentQ?.question_type === 'short_answer' && (
              <div className="space-y-3">
                <label className="block text-gray-300 text-sm mb-2">
                  Your answer:
                </label>
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder="Type your answer here..."
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                />
                <p className="text-gray-400 text-xs">
                  💡 Tip: Be clear and concise. Provide examples where applicable.
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
