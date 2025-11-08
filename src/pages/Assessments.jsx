import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, FileText, Award, TrendingUp, 
  Lock, CheckCircle, AlertCircle, Play, Brain, Video, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Assessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [userAttempts, setUserAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedType, setSelectedType] = useState(null); // null = show both options

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch all active assessments
      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setAssessments(assessmentsData || []);

      // Fetch user's attempts
      const { data: attemptsData } = await supabase
        .from('user_attempts')
        .select('*, assessment_results(*)')
        .eq('user_id', user.id);

      setUserAttempts(attemptsData || []);
      setLoading(false);

    } catch (err) {
      console.error('Error fetching assessments:', err);
      setLoading(false);
    }
  };

  const getAttemptStatus = (assessmentId) => {
    const attempts = userAttempts.filter(a => a.assessment_id === assessmentId);
    if (attempts.length === 0) return { status: 'available', attempts: 0 };
    
    const completed = attempts.filter(a => a.status === 'completed');
    const inProgress = attempts.find(a => a.status === 'in_progress');
    
    if (inProgress) return { status: 'in_progress', attempts: attempts.length };
    if (completed.length > 0) return { status: 'completed', attempts: attempts.length, result: completed[0].assessment_results?.[0] };
    
    return { status: 'available', attempts: attempts.length };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Programming': '💻',
      'Web Development': '🌐',
      'Data Science': '📊',
      'Design': '🎨',
      'Business': '💼',
      'Marketing': '📱',
      'Aptitude': '🧮',
      'Reasoning': '🧠'
    };
    return icons[category] || '📝';
  };

  const filteredAssessments = assessments.filter(assessment => {
    const status = getAttemptStatus(assessment.id).status;
    if (filter === 'all') return true;
    if (filter === 'available') return status === 'available';
    if (filter === 'completed') return status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show type selection screen if no type is selected
  if (selectedType === null) {
    const assessmentTypes = [
      {
        id: 'assessment-arena',
        title: 'Assessment Arena',
        description: 'Take structured assessments with multiple choice questions, proctoring, and detailed analytics.',
        icon: FileText,
        color: 'from-purple-500 to-pink-500',
        features: [
          'Multiple Choice Questions',
          'Video Proctoring',
          'Snapshot Monitoring',
          'Detailed Results & Analytics',
          'Time-bound Tests'
        ]
      },
      {
        id: 'ai-interview',
        title: 'AI Interview',
        description: 'Practice interviews with AI-powered feedback, real-time analysis, and personalized improvement suggestions.',
        icon: Video,
        color: 'from-blue-500 to-cyan-500',
        features: [
          'AI-Powered Questions',
          'Real-time Feedback',
          'Voice & Video Analysis',
          'Communication Skills Assessment',
          'Personalized Tips'
        ]
      }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Choose Your Assessment Type
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Select the assessment format that best suits your needs. Both options provide comprehensive evaluation and detailed feedback.
            </p>
          </motion.div>

          {/* Assessment Type Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {assessmentTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                {/* Content */}
                <div className="relative p-8">
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${type.color} mb-6`}>
                    <type.icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {type.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {type.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {type.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${type.color}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => {
                      if (type.id === 'ai-interview') {
                        navigate('/ai-interview');
                      } else {
                        setSelectedType('assessment-arena');
                      }
                    }}
                    className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r ${type.color} text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
                  >
                    <span>Start {type.title}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => setSelectedType(null)}
          className="mb-6 flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          <span>Back to Assessment Types</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AI Assessment Arena
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test your skills with AI-proctored assessments across multiple domains
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
              </div>
              <FileText className="h-10 w-10 text-purple-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userAttempts.filter(a => a.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userAttempts.filter(a => a.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userAttempts.filter(a => a.percentage).length > 0
                    ? Math.round(userAttempts.filter(a => a.percentage).reduce((sum, a) => sum + a.percentage, 0) / userAttempts.filter(a => a.percentage).length)
                    : 0}%
                </p>
              </div>
              <Award className="h-10 w-10 text-yellow-500" />
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          {['all', 'available', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Assessments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment, index) => {
            const attemptStatus = getAttemptStatus(assessment.id);
            
            return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Category Badge */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{getCategoryIcon(assessment.category)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      attemptStatus.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : attemptStatus.status === 'in_progress'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white text-purple-600'
                    }`}>
                      {attemptStatus.status === 'completed' ? 'Completed' : 
                       attemptStatus.status === 'in_progress' ? 'In Progress' : 'Available'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {assessment.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {assessment.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Duration
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {assessment.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Questions
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {assessment.total_questions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Award className="h-4 w-4 mr-2" />
                        Passing Score
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {assessment.passing_score}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Difficulty
                      </span>
                      <span className={`font-medium ${
                        assessment.difficulty_level === 'hard' ? 'text-red-600' :
                        assessment.difficulty_level === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {assessment.difficulty_level.charAt(0).toUpperCase() + assessment.difficulty_level.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Result Display */}
                  {attemptStatus.result && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Your Score</span>
                        <span className={`text-lg font-bold ${
                          attemptStatus.result.passed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attemptStatus.result.percentage}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => navigate(`/assessment/${assessment.id}`)}
                    disabled={attemptStatus.status === 'in_progress'}
                    className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
                      attemptStatus.status === 'in_progress'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : attemptStatus.status === 'completed'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {attemptStatus.status === 'in_progress' ? (
                      <>
                        <Lock className="h-5 w-5" />
                        <span>In Progress</span>
                      </>
                    ) : attemptStatus.status === 'completed' ? (
                      <>
                        <Play className="h-5 w-5" />
                        <span>Retake Assessment</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5" />
                        <span>Start Assessment</span>
                      </>
                    )}
                  </button>

                  {/* Attempts Info */}
                  {attemptStatus.attempts > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Attempts: {attemptStatus.attempts}/{assessment.max_attempts}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredAssessments.length === 0 && (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No assessments found for this filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
