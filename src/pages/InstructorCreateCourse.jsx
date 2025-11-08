import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Save, Moon, Sun, GraduationCap, LogOut, Plus, Trash2, PlayCircle, FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function InstructorCreateCourse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    content: '',
    youtube_video_id: '',
    duration_seconds: 900
  });
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
          course_id: courseData.id,
          questions: JSON.stringify(quiz.questions)
        }));

        const { error: quizzesError } = await supabase
          .from('quizzes')
          .insert(quizzesToInsert);

        if (quizzesError) throw quizzesError;
      }

      alert('✅ Course created successfully with ' + lessons.length + ' lessons and ' + quizzes.length + ' quizzes!');
      navigate('/instructor/dashboard');
    } catch (err) {
      console.error('Error creating course:', err);
      alert('❌ Failed to create course: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addLesson = () => {
    if (currentLesson.title && currentLesson.youtube_video_id) {
      setLessons([...lessons, { ...currentLesson }]);
      setCurrentLesson({
        title: '',
        content: '',
        youtube_video_id: '',
        duration_seconds: 900
      });
    } else {
      alert('Please fill in lesson title and YouTube video ID');
    }
  };

  const removeLesson = (index) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every(opt => opt.trim())) {
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
      alert('Please fill in question and all options');
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
          <button
            onClick={() => navigate('/instructor/dashboard')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <GraduationCap className="h-10 w-10 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    EdgeIQ
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Learning Management System
                  </p>
                </div>
              </div>
              <div className="border-l border-gray-300 dark:border-gray-600 pl-4 ml-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create New Course
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Share your knowledge with students
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Complete Web Development Bootcamp"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Description *
              </label>
              <textarea
                required
                rows="5"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what students will learn in this course..."
              />
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Programming">Programming</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level *
                </label>
                <select
                  required
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Price and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="49.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10 hours"
                />
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thumbnail URL
              </label>
              <input
                type="url"
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* What You'll Learn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What Students Will Learn
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={learningPoint}
                  onChange={(e) => setLearningPoint(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLearningPoint())}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a learning point..."
                />
                <button
                  type="button"
                  onClick={addLearningPoint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {formData.what_you_will_learn.length > 0 && (
                <ul className="space-y-2">
                  {formData.what_you_will_learn.map((point, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <span className="text-gray-900 dark:text-white">✓ {point}</span>
                      <button
                        type="button"
                        onClick={() => removeLearningPoint(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/instructor/dashboard')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                {loading ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
