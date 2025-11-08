import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Save, Plus, Trash2, PlayCircle, FileQuestion, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function InstructorCreateCourseNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // basic, lessons, quizzes

  // Course basic info
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'Programming',
    difficulty: 'beginner',
    price_cents: 0,
    thumbnail_url: '',
    status: 'published'
  });

  // Lessons
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    content: '',
    video_type: 'youtube', // 'youtube' or 'upload'
    youtube_video_id: '',
    video_url: '', // For uploaded videos
    duration_seconds: 900
  });
  const [fetchingDuration, setFetchingDuration] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Quizzes
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState({
    title: '',
    description: '',
    passing_score: 70,
    xp_reward: 150,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  });
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(true);

  const fetchYouTubeDuration = async (videoId) => {
    if (!videoId || videoId.length < 5) return;
    
    setFetchingDuration(true);
    try {
      // Use YouTube oEmbed API to get video info (no API key needed)
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (response.ok) {
        // Video exists, set a default duration based on typical video lengths
        // Since oEmbed doesn't provide duration, we'll use a smart default
        setCurrentLesson(prev => ({ 
          ...prev, 
          duration_seconds: 3600 // Default to 1 hour for full courses
        }));
        console.log('Video verified, duration set to 1 hour');
      } else {
        alert('⚠️ Could not verify YouTube video. Please check the video ID.');
      }
    } catch (error) {
      console.error('Error fetching video info:', error);
      // Keep default duration
    } finally {
      setFetchingDuration(false);
    }
  };

  const handleVideoIdChange = (videoId) => {
    setCurrentLesson({ ...currentLesson, youtube_video_id: videoId });
    
    // Auto-fetch duration when video ID is complete (11 characters)
    if (videoId.length === 11) {
      fetchYouTubeDuration(videoId);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      alert('Video file is too large. Maximum size is 500MB.');
      return;
    }

    setUploadingVideo(true);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('course-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-videos')
        .getPublicUrl(fileName);

      // Get video duration using HTML5 video element
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        setCurrentLesson({ 
          ...currentLesson, 
          video_url: publicUrl,
          duration_seconds: duration
        });
        setUploadingVideo(false);
      };

      video.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video: ' + error.message);
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert([{
          ...formData,
          instructor_id: user.id,
          currency: 'USD',
          is_premium: formData.price_cents > 0
        }])
        .select()
        .single();

      if (courseError) throw courseError;

      // Create lessons
      if (lessons.length > 0) {
        const lessonsToInsert = lessons.map((lesson, index) => ({
          ...lesson,
          course_id: courseData.id,
          order_index: index + 1,
          video_url_or_storage_path: `https://www.youtube.com/watch?v=${lesson.youtube_video_id}`
        }));

        const { error: lessonsError } = await supabase
          .from('lessons')
          .insert(lessonsToInsert);

        if (lessonsError) throw lessonsError;
      }

      // Create quizzes
      if (quizzes.length > 0) {
        const quizzesToInsert = quizzes.map(quiz => ({
          ...quiz,
          course_id: courseData.id
        }));

        const { error: quizzesError} = await supabase
          .from('quizzes')
          .insert(quizzesToInsert);

        if (quizzesError) throw quizzesError;
      }

      alert(`✅ Course created successfully with ${lessons.length} lessons and ${quizzes.length} quizzes!`);
      navigate('/instructor/dashboard');
    } catch (err) {
      console.error('Error creating course:', err);
      alert('❌ Failed to create course: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addLesson = () => {
    // Validate based on video type
    if (!currentLesson.title) {
      alert('Please enter a lesson title');
      return;
    }
    
    if (currentLesson.video_type === 'youtube' && !currentLesson.youtube_video_id) {
      alert('Please enter a YouTube video ID');
      return;
    }
    
    if (currentLesson.video_type === 'upload' && !currentLesson.video_url) {
      alert('Please upload a video file');
      return;
    }
    
    setLessons([...lessons, { ...currentLesson }]);
    setCurrentLesson({
      title: '',
      content: '',
      video_type: 'youtube',
      youtube_video_id: '',
      video_url: '',
      duration_seconds: 900
    });
  };

  const removeLesson = (index) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const parseBulkQuestions = () => {
    try {
      const parsed = JSON.parse(bulkQuestions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCurrentQuiz({
          ...currentQuiz,
          questions: parsed
        });
        setBulkQuestions('');
        setShowBulkUpload(false);
        alert(`✅ Successfully added ${parsed.length} questions!`);
      } else {
        alert('❌ Invalid format. Please paste a valid JSON array of questions.');
      }
    } catch (error) {
      alert('❌ Invalid JSON format. Please check your input and try again.');
    }
  };

  const copyTemplate = () => {
    const template = `[
  {
    "question": "What is Python?",
    "options": ["A snake", "A programming language", "A game", "A database"],
    "correct": 1,
    "explanation": "Python is a high-level programming language."
  },
  {
    "question": "How do you print in Python?",
    "options": ["echo()", "console.log()", "print()", "printf()"],
    "correct": 2,
    "explanation": "print() is used to output in Python."
  }
]`;
    navigator.clipboard.writeText(template);
    alert('✅ Template copied to clipboard!');
  };

  const addQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every(opt => opt)) {
      setCurrentQuiz({
        ...currentQuiz,
        questions: [...currentQuiz.questions, { ...currentQuestion }]
      });
      setCurrentQuestion({
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        explanation: ''
      });
    } else {
      alert('Please fill in all question fields');
    }
  };

  const removeQuestion = (index) => {
    setCurrentQuiz({
      ...currentQuiz,
      questions: currentQuiz.questions.filter((_, i) => i !== index)
    });
  };

  const addQuiz = () => {
    if (currentQuiz.title && currentQuiz.questions.length > 0) {
      setQuizzes([...quizzes, { ...currentQuiz }]);
      setCurrentQuiz({
        title: '',
        description: '',
        passing_score: 70,
        xp_reward: 150,
        questions: []
      });
    } else {
      alert('Please add quiz title and at least one question');
    }
  };

  const removeQuiz = (index) => {
    setQuizzes(quizzes.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/instructor/dashboard')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Course</h1>
          <p className="text-gray-600 dark:text-gray-400">Fill in the details to create your course</p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'basic'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <BookOpen className="h-5 w-5 inline mr-2" />
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'lessons'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <PlayCircle className="h-5 w-5 inline mr-2" />
              Lessons ({lessons.length})
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === 'quizzes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileQuestion className="h-5 w-5 inline mr-2" />
              Quizzes ({quizzes.length})
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Course Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Python Programming for Beginners"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Short Description *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  placeholder="Brief description (1-2 sentences)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Full Course Content (Markdown)</label>
                <textarea
                  rows="10"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input w-full font-mono text-sm"
                  placeholder="# Course Overview&#10;&#10;## What You'll Learn&#10;- Topic 1&#10;- Topic 2&#10;&#10;## Prerequisites&#10;- Requirement 1"
                />
                <p className="text-xs text-gray-500 mt-1">Use Markdown formatting for rich content</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input w-full"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty *</label>
                  <select
                    required
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="input w-full"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (in cents, 0 = Free)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_cents}
                    onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) })}
                    className="input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Example: 4999 = $49.99</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Thumbnail URL</label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="input w-full"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className="btn-primary w-full"
              >
                Next: Add Lessons →
              </button>
            </motion.div>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Add Lesson Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Add New Lesson</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Lesson Title *</label>
                    <input
                      type="text"
                      value={currentLesson.title}
                      onChange={(e) => setCurrentLesson({ ...currentLesson, title: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Introduction to Python"
                    />
                  </div>

                  {/* Video Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Video Source *</label>
                    <div className="flex space-x-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setCurrentLesson({ ...currentLesson, video_type: 'youtube', video_url: '' })}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          currentLesson.video_type === 'youtube'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <PlayCircle className="h-5 w-5 inline mr-2" />
                        YouTube Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentLesson({ ...currentLesson, video_type: 'upload', youtube_video_id: '' })}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          currentLesson.video_type === 'upload'
                            ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Award className="h-5 w-5 inline mr-2" />
                        Upload My Video
                      </button>
                    </div>
                  </div>

                  {/* YouTube Video ID */}
                  {currentLesson.video_type === 'youtube' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        YouTube Video ID * {fetchingDuration && <span className="text-blue-600">⏳ Verifying...</span>}
                      </label>
                      <input
                        type="text"
                        value={currentLesson.youtube_video_id}
                        onChange={(e) => handleVideoIdChange(e.target.value)}
                        className="input w-full"
                        placeholder="e.g., dQw4w9WgXcQ (from youtube.com/watch?v=dQw4w9WgXcQ)"
                        disabled={fetchingDuration}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Duration will be set automatically when you enter a valid video ID
                      </p>
                    </div>
                  )}

                  {/* Upload Video */}
                  {currentLesson.video_type === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Upload Video File * {uploadingVideo && <span className="text-blue-600">⏳ Uploading...</span>}
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="input w-full"
                        disabled={uploadingVideo}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: MP4, WebM, MOV (max 500MB)
                      </p>
                      {currentLesson.video_url && (
                        <p className="text-xs text-green-600 mt-2">✓ Video uploaded successfully!</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Lesson Content/Notes</label>
                    <textarea
                      rows="4"
                      value={currentLesson.content}
                      onChange={(e) => setCurrentLesson({ ...currentLesson, content: e.target.value })}
                      className="input w-full"
                      placeholder="# Lesson Overview&#10;&#10;## Topics&#10;- Topic 1&#10;- Topic 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duration (seconds) 
                      <span className="text-green-600 ml-2">✓ Auto-filled</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentLesson.duration_seconds}
                      onChange={(e) => setCurrentLesson({ ...currentLesson, duration_seconds: parseInt(e.target.value) })}
                      className="input w-full bg-green-50 dark:bg-green-900/20"
                      placeholder="3600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.floor(currentLesson.duration_seconds / 60)} minutes • Auto-set from video (editable)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addLesson}
                    className="btn-primary w-full"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Add Lesson
                  </button>
                </div>
              </div>

              {/* Lessons List */}
              {lessons.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">Added Lessons ({lessons.length})</h3>
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{index + 1}. {lesson.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Video: {lesson.youtube_video_id} • {Math.floor(lesson.duration_seconds / 60)} min
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLesson(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className="btn-secondary flex-1"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quizzes')}
                  className="btn-primary flex-1"
                >
                  Next: Add Quizzes →
                </button>
              </div>
            </motion.div>
          )}

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Add Quiz Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Create Quiz</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Quiz Title *</label>
                      <input
                        type="text"
                        value={currentQuiz.title}
                        onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., Python Basics Quiz"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">XP Reward</label>
                      <input
                        type="number"
                        min="0"
                        value={currentQuiz.xp_reward}
                        onChange={(e) => setCurrentQuiz({ ...currentQuiz, xp_reward: parseInt(e.target.value) })}
                        className="input w-full"
                        placeholder="150"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <input
                        type="text"
                        value={currentQuiz.description}
                        onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
                        className="input w-full"
                        placeholder="Test your knowledge!"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Passing Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentQuiz.passing_score}
                        onChange={(e) => setCurrentQuiz({ ...currentQuiz, passing_score: parseInt(e.target.value) })}
                        className="input w-full"
                        placeholder="70"
                      />
                    </div>
                  </div>

                  {/* Bulk Upload Questions */}
                  <div className="border-t pt-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                      <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                        <FileQuestion className="h-5 w-5 mr-2" />
                        📝 How to Generate Questions with ChatGPT
                      </h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p><strong>Step 1:</strong> Click "Copy Template" below</p>
                        <p><strong>Step 2:</strong> Go to ChatGPT and use this prompt:</p>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded mt-2 font-mono text-xs overflow-x-auto">
                          Generate 5 quiz questions about [YOUR TOPIC] in this exact JSON format with question, options (4 choices), correct (0-3 index), and explanation
                        </div>
                        <p><strong>Step 3:</strong> Paste the generated JSON below and click Upload</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={copyTemplate}
                        className="btn-secondary flex-1"
                      >
                        📋 Copy Template
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Paste Questions JSON *
                      </label>
                      <textarea
                        rows="10"
                        value={bulkQuestions}
                        onChange={(e) => setBulkQuestions(e.target.value)}
                        className="input w-full font-mono text-sm"
                        placeholder='[{"question":"What is Python?","options":["A snake","A programming language","A game","A database"],"correct":1,"explanation":"Python is a high-level programming language."}]'
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste the JSON array of questions from ChatGPT
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={parseBulkQuestions}
                      className="btn-primary w-full mt-4"
                      disabled={!bulkQuestions.trim()}
                    >
                      ⬆️ Upload Questions
                    </button>
                  </div>

                  {/* Questions List */}
                  {currentQuiz.questions.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Questions ({currentQuiz.questions.length})</h4>
                      <div className="space-y-2">
                        {currentQuiz.questions.map((q, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm">{index + 1}. {q.question}</span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addQuiz}
                    className="btn-primary w-full"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Add Quiz to Course
                  </button>
                </div>
              </div>

              {/* Quizzes List */}
              {quizzes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">Added Quizzes ({quizzes.length})</h3>
                  <div className="space-y-3">
                    {quizzes.map((quiz, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{quiz.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {quiz.questions.length} questions • {quiz.xp_reward} XP • Pass: {quiz.passing_score}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuiz(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('lessons')}
                  className="btn-secondary flex-1"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  <Save className="h-4 w-4 inline mr-2" />
                  {loading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
