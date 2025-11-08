import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Camera,
  ArrowLeft,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function AIInterview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const setupVideoRef = useRef(null);
  const interviewVideoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [robotSpeaking, setRobotSpeaking] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes per question
  const [interviewId, setInterviewId] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const interviewQuestions = [
    {
      id: 1,
      question: "Tell me about yourself and your background.",
      category: "Introduction",
      timeLimit: 120
    },
    {
      id: 2,
      question: "What are your greatest strengths and how do they apply to this role?",
      category: "Skills",
      timeLimit: 120
    },
    {
      id: 3,
      question: "Describe a challenging project you worked on and how you overcame obstacles.",
      category: "Experience",
      timeLimit: 150
    },
    {
      id: 4,
      question: "Where do you see yourself in 5 years?",
      category: "Career Goals",
      timeLimit: 90
    },
    {
      id: 5,
      question: "Why do you want to work with us and what can you bring to our team?",
      category: "Motivation",
      timeLimit: 120
    }
  ];

  // Robot face animation states
  const [robotMouth, setRobotMouth] = useState('neutral');
  const [robotEyes, setRobotEyes] = useState('normal');
  const [robotExpression, setRobotExpression] = useState('friendly');

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Update video elements when stream changes
  useEffect(() => {
    if (stream) {
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = stream;
      }
      if (interviewVideoRef.current) {
        interviewVideoRef.current.srcObject = stream;
      }
    }
  }, [stream, interviewStarted]);

  // Timer countdown
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isRecording) {
      handleNextQuestion();
    }
  }, [isRecording, timeLeft]);

  // Robot speaking animation
  useEffect(() => {
    if (robotSpeaking) {
      const interval = setInterval(() => {
        setRobotMouth(prev => prev === 'open' ? 'closed' : 'open');
      }, 200);
      return () => clearInterval(interval);
    } else {
      setRobotMouth('neutral');
    }
  }, [robotSpeaking]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      setStream(mediaStream);
      
      // Set stream to both video elements
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = mediaStream;
      }
      if (interviewVideoRef.current) {
        interviewVideoRef.current.srcObject = mediaStream;
      }
      
      setIsCameraOn(true);
      setIsMicOn(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please grant permissions and ensure you are using HTTPS or localhost.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOn(false);
      setIsMicOn(false);
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const speakQuestion = (question) => {
    setRobotSpeaking(true);
    setRobotExpression('talking');
    
    // Use Web Speech API
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setRobotSpeaking(false);
      setRobotExpression('listening');
      setIsRecording(true);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const createInterviewSession = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_interviews')
        .insert({
          user_id: user.id,
          status: 'in_progress',
          total_questions: interviewQuestions.length
        })
        .select()
        .single();

      if (error) throw error;
      setInterviewId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating interview session:', error);
      return null;
    }
  };

  const startRecording = () => {
    if (stream) {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadVideoChunk(blob, currentQuestion);
        setRecordedChunks([]);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setRecordedChunks(chunks);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  const uploadVideoChunk = async (blob, questionNumber) => {
    try {
      const fileName = `${user.id}/${interviewId}/question_${questionNumber}_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('interview-videos')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('interview-videos')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      return null;
    }
  };

  const analyzeAnswer = (answer, question) => {
    // Simple analysis - can be enhanced with AI API
    const wordCount = answer.trim().split(/\s+/).length;
    const hasFillerWords = /\b(um|uh|like|you know|basically|actually)\b/gi.test(answer);
    const fillerMatches = answer.match(/\b(um|uh|like|you know|basically|actually)\b/gi) || [];
    
    const mistakes = [];
    if (wordCount < 20) {
      mistakes.push({ type: 'too_short', message: 'Answer is too brief' });
    }
    if (fillerMatches.length > 5) {
      mistakes.push({ type: 'filler_words', message: `Too many filler words (${fillerMatches.length})` });
    }
    if (!answer.includes('I') && question.includes('yourself')) {
      mistakes.push({ type: 'not_personal', message: 'Answer lacks personal perspective' });
    }
    
    const score = Math.max(0, 100 - (mistakes.length * 20) - (fillerMatches.length * 2));
    
    return {
      score,
      wordCount,
      fillerWords: fillerMatches.length,
      mistakes,
      feedback: mistakes.length === 0 ? 'Great answer!' : 'Could be improved'
    };
  };

  const saveAnswer = async (answer, videoUrl) => {
    try {
      const analysis = analyzeAnswer(answer, interviewQuestions[currentQuestion].question);
      
      const { error } = await supabase
        .from('ai_interview_answers')
        .insert({
          interview_id: interviewId,
          question_number: currentQuestion + 1,
          question_text: interviewQuestions[currentQuestion].question,
          question_category: interviewQuestions[currentQuestion].category,
          user_answer: answer,
          answer_duration: interviewQuestions[currentQuestion].timeLimit - timeLeft,
          video_chunk_url: videoUrl,
          analysis: analysis,
          score: analysis.score,
          feedback: analysis.feedback,
          mistakes: analysis.mistakes
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const startInterview = async () => {
    if (!isCameraOn) {
      await startCamera();
    }
    
    const sessionId = await createInterviewSession();
    if (!sessionId) {
      alert('Failed to start interview. Please try again.');
      return;
    }
    
    setInterviewStarted(true);
    setRobotExpression('friendly');
    
    // Welcome message
    setTimeout(() => {
      const welcomeMsg = `Hello ${user?.name || 'there'}! Welcome to your AI interview. I'll be asking you ${interviewQuestions.length} questions. Take your time and answer confidently. Let's begin!`;
      speakQuestion(welcomeMsg);
      
      setTimeout(() => {
        speakQuestion(interviewQuestions[0].question);
        setTimeLeft(interviewQuestions[0].timeLimit);
        startRecording();
      }, 5000);
    }, 1000);
  };

  const handleNextQuestion = async () => {
    stopRecording();
    setIsRecording(false);
    
    // Save answer to database
    await saveAnswer(userAnswer, null);
    
    setAnswers(prev => [...prev, {
      question: interviewQuestions[currentQuestion].question,
      answer: userAnswer,
      timestamp: new Date().toISOString()
    }]);
    setUserAnswer('');

    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTimeout(() => {
        speakQuestion(interviewQuestions[currentQuestion + 1].question);
        setTimeLeft(interviewQuestions[currentQuestion + 1].timeLimit);
        startRecording();
      }, 2000);
    } else {
      await completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      // Update interview status
      await supabase
        .from('ai_interviews')
        .update({
          status: 'completed',
          questions_answered: interviewQuestions.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', interviewId);

      // Fetch analysis results
      const { data: answersData } = await supabase
        .from('ai_interview_answers')
        .select('*')
        .eq('interview_id', interviewId)
        .order('question_number');

      setAnalysisResults(answersData);
      setInterviewComplete(true);
      setShowResults(true);
      setRobotExpression('happy');
      
      const endMsg = "Great job! You've completed the interview. Let me show you your results!";
      speakQuestion(endMsg);
      
      setTimeout(() => {
        stopCamera();
      }, 3000);
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/assessments')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Assessments</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Interview
            </h1>
          </div>
        </div>

        {!interviewStarted ? (
          /* Setup Screen */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Prepare for Your Interview</h2>
              
              {/* Camera Preview */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-6" style={{ height: '400px' }}>
                <video
                  ref={setupVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform scale-x-[-1] ${!isCameraOn ? 'hidden' : ''}`}
                />
                {!isCameraOn && (
                  <div className="w-full h-full flex items-center justify-center absolute inset-0">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Camera is off</p>
                      <p className="text-gray-500 text-sm mt-2">Click the camera button to start</p>
                    </div>
                  </div>
                )}
                
                {/* Camera Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                  <button
                    onClick={isCameraOn ? stopCamera : startCamera}
                    className={`p-4 rounded-full ${isCameraOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-all`}
                  >
                    {isCameraOn ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                  </button>
                  <button
                    onClick={toggleMic}
                    disabled={!isCameraOn}
                    className={`p-4 rounded-full ${isMicOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500'} text-white transition-all disabled:opacity-50`}
                  >
                    {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-lg mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Interview Guidelines
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>✓ Ensure your camera and microphone are working</li>
                  <li>✓ Find a quiet, well-lit environment</li>
                  <li>✓ You'll be asked {interviewQuestions.length} questions</li>
                  <li>✓ Each question has a time limit (1-2.5 minutes)</li>
                  <li>✓ Speak clearly and maintain eye contact with the camera</li>
                  <li>✓ The AI interviewer will guide you through the process</li>
                </ul>
              </div>

              {/* Start Button */}
              <button
                onClick={startInterview}
                disabled={!isCameraOn}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-6 w-6" />
                <span>Start Interview</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Interview Screen */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: AI Robot Face */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4 text-center">AI Interviewer</h3>
              
              {/* Robot Face */}
              <div className="relative bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-4" style={{ height: '400px' }}>
                <RobotFace 
                  expression={robotExpression}
                  mouthState={robotMouth}
                  eyeState={robotEyes}
                  speaking={robotSpeaking}
                />
              </div>

              {/* Current Question */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    Question {currentQuestion + 1} of {interviewQuestions.length}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {interviewQuestions[currentQuestion]?.category}
                  </span>
                </div>
                <p className="text-lg font-medium">
                  {interviewQuestions[currentQuestion]?.question}
                </p>
              </div>

              {/* Timer */}
              {isRecording && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Clock className={`h-5 w-5 ${timeLeft < 30 ? 'text-red-500' : 'text-blue-500'}`} />
                  <span className={`text-2xl font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-blue-600'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Right: User Camera */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4 text-center">Your Camera</h3>
              
              {/* User Video */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4" style={{ height: '400px' }}>
                <video
                  ref={interviewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                
                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold">Recording</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={toggleMic}
                  className={`p-4 rounded-full ${isMicOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'} text-white transition-all`}
                >
                  {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </button>
                
                {isRecording && (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Next Question</span>
                  </button>
                )}
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((currentQuestion + 1) / interviewQuestions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentQuestion + 1) / interviewQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Interview Results Modal */}
        <AnimatePresence>
          {showResults && analysisResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full my-8"
              >
                <div className="text-center mb-8">
                  <Award className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Interview Results</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Here's your performance analysis
                  </p>
                </div>

                {/* Overall Score */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Score</p>
                    <p className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                      {Math.round(analysisResults.reduce((sum, a) => sum + a.score, 0) / analysisResults.length)}%
                    </p>
                  </div>
                </div>

                {/* Individual Answers */}
                <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                  {analysisResults.map((answer, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            Q{answer.question_number}: {answer.question_category}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {answer.question_text}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          answer.score >= 80 ? 'bg-green-100 text-green-700' :
                          answer.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {answer.score}%
                        </div>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded p-3 mb-3">
                        <p className="text-sm font-medium mb-1">Your Answer:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {answer.user_answer || 'No answer recorded'}
                        </p>
                      </div>

                      {/* Mistakes */}
                      {answer.mistakes && answer.mistakes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Areas for Improvement:
                          </p>
                          {answer.mistakes.map((mistake, idx) => (
                            <div key={idx} className="flex items-start space-x-2 text-sm">
                              <span className="text-red-500">•</span>
                              <span className="text-gray-700 dark:text-gray-300">{mistake.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Analysis Stats */}
                      <div className="flex items-center space-x-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
                        <span>Words: {answer.analysis?.wordCount || 0}</span>
                        <span>Filler Words: {answer.analysis?.fillerWords || 0}</span>
                        <span>Duration: {answer.answer_duration}s</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => navigate('/assessments')}
                    className="flex-1 btn-primary py-3"
                  >
                    Back to Assessments
                  </button>
                  <button
                    onClick={() => setShowResults(false)}
                    className="flex-1 btn-secondary py-3"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Robot Face Component
function RobotFace({ expression, mouthState, eyeState, speaking }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Head */}
        <circle cx="100" cy="100" r="80" fill="#6366f1" opacity="0.2" />
        <circle cx="100" cy="100" r="75" fill="none" stroke="#6366f1" strokeWidth="3" />
        
        {/* Eyes */}
        <g className="eyes">
          {/* Left Eye */}
          <circle cx="70" cy="85" r="12" fill="#6366f1" />
          <circle cx="70" cy="85" r="6" fill="#fff" className={speaking ? 'animate-pulse' : ''} />
          
          {/* Right Eye */}
          <circle cx="130" cy="85" r="12" fill="#6366f1" />
          <circle cx="130" cy="85" r="6" fill="#fff" className={speaking ? 'animate-pulse' : ''} />
        </g>
        
        {/* Mouth */}
        <g className="mouth">
          {mouthState === 'open' ? (
            <ellipse cx="100" cy="130" rx="25" ry="15" fill="#6366f1" />
          ) : mouthState === 'closed' ? (
            <line x1="80" y1="130" x2="120" y2="130" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path d="M 80 130 Q 100 140 120 130" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
        
        {/* Antenna */}
        <line x1="100" y1="20" x2="100" y2="35" stroke="#6366f1" strokeWidth="2" />
        <circle cx="100" cy="15" r="5" fill="#ec4899" className="animate-pulse" />
        
        {/* Sound waves when speaking */}
        {speaking && (
          <>
            <path d="M 150 100 Q 160 100 165 95" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.5" className="animate-ping" />
            <path d="M 150 100 Q 165 100 170 105" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.5" className="animate-ping" style={{ animationDelay: '0.1s' }} />
          </>
        )}
      </svg>
    </div>
  );
}
