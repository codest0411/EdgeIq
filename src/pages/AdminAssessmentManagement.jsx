import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Eye, Users, Clock, 
  FileText, Video, AlertTriangle, CheckCircle,
  Download, Play, Pause, ArrowLeft, Camera, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminAssessmentManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assessments'); // assessments, questions, live, results, media
  const [assessments, setAssessments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [liveAttempts, setLiveAttempts] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Programming',
    duration_minutes: 45,
    total_questions: 50,
    passing_score: 60,
    difficulty_level: 'medium',
    is_active: true
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    assessment_id: '',
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    category: 'Programming',
    difficulty: 'medium',
    points: 1
  });
  const [snapshots, setSnapshots] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Refresh live data every 5 seconds
    const interval = setInterval(() => {
      if (activeTab === 'live') {
        fetchLiveAttempts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAssessments(),
      fetchQuestions(),
      fetchLiveAttempts(),
      fetchResults()
    ]);
    setLoading(false);
  };

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*, questions(count)')
      .order('created_at', { ascending: false });

    if (!error) setAssessments(data || []);
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*, assessments(title)')
      .order('created_at', { ascending: false });

    if (!error) setQuestions(data || []);
  };

  const fetchLiveAttempts = async () => {
    const { data, error } = await supabase
      .from('user_attempts')
      .select(`
        *,
        profiles(id, email),
        assessments(title)
      `)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });

    if (!error) {
      // Fetch activity logs count for each attempt
      const attemptsWithLogs = await Promise.all(
        (data || []).map(async (attempt) => {
          const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('attempt_id', attempt.id);
          
          return { ...attempt, activity_logs_count: count || 0 };
        })
      );
      setLiveAttempts(attemptsWithLogs);
    }
  };

  const fetchResults = async () => {
    // Fetch completed attempts from user_attempts table
    const { data, error } = await supabase
      .from('user_attempts')
      .select(`
        *,
        profiles(id, email),
        assessments(title, passing_score)
      `)
      .in('status', ['completed', 'submitted'])
      .order('submitted_at', { ascending: false });

    if (!error) {
      console.log('📊 Fetched results:', data);
      // Transform data to match expected format
      const transformedResults = (data || []).map(attempt => {
        console.log('Video URL for attempt', attempt.id, ':', attempt.video_url);
        return {
          id: attempt.id,
          profiles: attempt.profiles,
          assessments: attempt.assessments,
          percentage: attempt.percentage || 0,
          correct_answers: attempt.total_score || 0,
          total_questions: attempt.total_score || 0,
          grade: attempt.percentage >= 80 ? 'A' : attempt.percentage >= 60 ? 'B' : attempt.percentage >= 40 ? 'C' : 'F',
          passed: attempt.percentage >= (attempt.assessments?.passing_score || 60),
          evaluated_at: attempt.submitted_at,
          attempt_id: attempt.id,
          video_url: attempt.video_url, // Include video URL
          video_uploaded_at: attempt.video_uploaded_at,
          status: attempt.status,
          violation_count: attempt.violation_count || 0
        };
      });
      console.log('✅ Transformed results:', transformedResults);
      setResults(transformedResults);
    } else {
      console.error('❌ Error fetching results:', error);
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchAssessments();
      alert('Assessment deleted successfully');
    }
  };

  const viewSnapshots = async (attemptId) => {
    console.log('📸 Fetching snapshots for attempt:', attemptId);
    const { data, error } = await supabase
      .from('proctoring_snapshots')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('captured_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching snapshots:', error);
    } else {
      console.log('✅ Snapshots found:', data?.length || 0, data);
      
      // Generate signed URLs for each snapshot
      const snapshotsWithSignedUrls = await Promise.all(
        (data || []).map(async (snapshot) => {
          try {
            // Extract file path from public URL
            const urlParts = snapshot.snapshot_url.split('/assessment-snapshots/');
            const filePath = urlParts[1];
            
            // Get signed URL (valid for 1 hour)
            const { data: signedData, error: signedError } = await supabase.storage
              .from('assessment-snapshots')
              .createSignedUrl(filePath, 3600);
            
            if (signedError) {
              console.error('❌ Error creating signed URL:', signedError);
              return snapshot;
            }
            
            return {
              ...snapshot,
              snapshot_url: signedData.signedUrl
            };
          } catch (err) {
            console.error('❌ Error processing snapshot URL:', err);
            return snapshot;
          }
        })
      );
      
      setSnapshots(snapshotsWithSignedUrls);
      setShowSnapshotsModal(true);
    }
  };

  const viewActivityLogs = async (attemptId) => {
    console.log('📝 Fetching activity logs for attempt:', attemptId);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('❌ Error fetching logs:', error);
    } else {
      console.log('✅ Activity logs found:', data?.length || 0, data);
      setActivityLogs(data || []);
      setShowLogsModal(true);
    }
  };

  const handleDisqualify = async (attemptId) => {
    if (!confirm('Disqualify this candidate?')) return;

    const { error } = await supabase
      .from('user_attempts')
      .update({
        status: 'disqualified',
        is_disqualified: true,
        disqualification_reason: 'Manually disqualified by admin'
      })
      .eq('id', attemptId);

    if (!error) {
      fetchLiveAttempts();
      alert('Candidate disqualified');
    }
  };

  const viewAttemptDetails = async (attemptId) => {
    try {
      console.log('🔍 Fetching details for attempt:', attemptId);
      
      // Fetch attempt with all related data
      const { data: attempt, error: attemptError } = await supabase
        .from('user_attempts')
        .select(`
          *,
          profiles(id, email),
          assessments(title, category)
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) {
        console.error('❌ Error fetching attempt:', attemptError);
        return;
      }

      console.log('📹 Attempt data:', attempt);
      console.log('🎬 Video URL:', attempt.video_url);

      // Fetch activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('timestamp', { ascending: false });

      console.log('📝 Activity logs:', logs?.length || 0);

      // Fetch snapshots
      const { data: snapshots } = await supabase
        .from('proctoring_snapshots')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('captured_at', { ascending: false });

      console.log('📸 Snapshots:', snapshots?.length || 0);

      // Generate signed URLs for snapshots
      const snapshotsWithSignedUrls = await Promise.all(
        (snapshots || []).map(async (snapshot) => {
          try {
            const urlParts = snapshot.snapshot_url.split('/assessment-snapshots/');
            const filePath = urlParts[1];
            
            const { data: signedData, error: signedError } = await supabase.storage
              .from('assessment-snapshots')
              .createSignedUrl(filePath, 3600);
            
            if (signedError) {
              console.error('❌ Error creating signed URL for snapshot:', signedError);
              return snapshot;
            }
            
            return {
              ...snapshot,
              snapshot_url: signedData.signedUrl
            };
          } catch (err) {
            console.error('❌ Error processing snapshot URL:', err);
            return snapshot;
          }
        })
      );

      // Generate signed URL for video if exists
      let videoSignedUrl = attempt.video_url;
      if (attempt.video_url) {
        try {
          const urlParts = attempt.video_url.split('/assessment-videos/');
          const filePath = urlParts[1];
          
          const { data: signedData, error: signedError } = await supabase.storage
            .from('assessment-videos')
            .createSignedUrl(filePath, 3600);
          
          if (signedError) {
            console.error('❌ Error creating signed URL for video:', signedError);
          } else {
            videoSignedUrl = signedData.signedUrl;
            console.log('✅ Video signed URL created');
          }
        } catch (err) {
          console.error('❌ Error processing video URL:', err);
        }
      }

      // Fetch media files
      const { data: media } = await supabase
        .from('media_files')
        .select('*')
        .eq('attempt_id', attemptId);

      // Fetch responses
      const { data: responses } = await supabase
        .from('user_responses')
        .select('*, questions(question_text, question_type)')
        .eq('attempt_id', attemptId);

      console.log('💬 Responses:', responses?.length || 0);

      const details = {
        ...attempt,
        video_url: videoSignedUrl,
        activity_logs: logs || [],
        snapshots: snapshotsWithSignedUrls,
        media_files: media || [],
        responses: responses || []
      };

      console.log('✅ Complete attempt details:', details);
      setAttemptDetails(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching attempt details:', err);
      alert('Failed to load attempt details');
    }
  };

  const handleCreateAssessment = () => {
    setEditingAssessment(null);
    setFormData({
      title: '',
      description: '',
      category: 'Programming',
      duration_minutes: 45,
      total_questions: 50,
      passing_score: 60,
      difficulty_level: 'medium',
      is_active: true
    });
    setShowCreateModal(true);
  };

  const handleEditAssessment = (assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      title: assessment.title,
      description: assessment.description || '',
      category: assessment.category,
      duration_minutes: assessment.duration_minutes,
      total_questions: assessment.total_questions,
      passing_score: assessment.passing_score,
      difficulty_level: assessment.difficulty_level,
      is_active: assessment.is_active
    });
    setShowCreateModal(true);
  };

  const handleSaveAssessment = async () => {
    try {
      if (editingAssessment) {
        // Update existing
        const { error } = await supabase
          .from('assessments')
          .update(formData)
          .eq('id', editingAssessment.id);
        
        if (error) throw error;
        alert('Assessment updated successfully!');
      } else {
        // Create new
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('assessments')
          .insert([{ ...formData, created_by: user.id }]);
        
        if (error) throw error;
        alert('Assessment created successfully!');
      }
      
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving assessment:', err);
      alert('Failed to save assessment: ' + err.message);
    }
  };

  // Question Management Functions
  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      assessment_id: assessments[0]?.id || '',
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      category: 'Programming',
      difficulty: 'medium',
      points: 1
    });
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      assessment_id: question.assessment_id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer,
      category: question.category,
      difficulty: question.difficulty,
      points: question.points
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    try {
      if (editingQuestion) {
        // Update existing
        const { error } = await supabase
          .from('questions')
          .update(questionForm)
          .eq('id', editingQuestion.id);
        
        if (error) throw error;
        alert('Question updated successfully!');
      } else {
        // Create new
        const { error } = await supabase
          .from('questions')
          .insert([questionForm]);
        
        if (error) throw error;
        alert('Question created successfully!');
      }
      
      setShowQuestionModal(false);
      fetchQuestions();
    } catch (err) {
      console.error('Error saving question:', err);
      alert('Failed to save question: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Delete this question?')) return;

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (!error) {
      fetchQuestions();
      alert('Question deleted');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Assessment Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage assessments, monitor live attempts, and review results
              </p>
            </div>
            {activeTab === 'assessments' && (
              <button
                onClick={handleCreateAssessment}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Assessment</span>
              </button>
            )}
            {activeTab === 'questions' && (
              <button
                onClick={handleCreateQuestion}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Question</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'assessments', label: 'Assessments', icon: FileText },
            { id: 'questions', label: 'Question Bank', icon: Edit },
            { id: 'live', label: 'Live Monitoring', icon: Video },
            { id: 'results', label: 'Results', icon: CheckCircle },
            { id: 'media', label: 'Media Review', icon: Play }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                fetchData();
              }}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assessments.map((assessment) => (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {assessment.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {assessment.category}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assessment.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {assessment.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Duration</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {assessment.duration_minutes} min
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Questions</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {assessment.total_questions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Passing Score</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {assessment.passing_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditAssessment(assessment)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Question Bank Tab */}
            {activeTab === 'questions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Question Bank ({questions.length})
                  </h2>
                  <button
                    onClick={handleCreateQuestion}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No questions yet. Create your first question!
                      </p>
                    </div>
                  ) : (
                    questions.map((question) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded text-xs font-medium">
                                {question.question_type.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-medium">
                                {question.category}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                                {question.difficulty}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {question.points} {question.points === 1 ? 'point' : 'points'}
                              </span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              {question.question_text}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Assessment: {question.assessments?.title || 'N/A'}
                            </p>
                            {question.question_type === 'mcq' && question.options && (
                              <div className="mt-3 space-y-1">
                                {question.options.map((option, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-sm px-3 py-2 rounded ${
                                      option === question.correct_answer
                                        ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 font-medium'
                                        : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + idx)}. {option}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Live Monitoring Tab */}
            {activeTab === 'live' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {liveAttempts.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No active assessments at the moment
                    </p>
                  </div>
                ) : (
                  liveAttempts.map((attempt) => (
                    <motion.div
                      key={attempt.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {attempt.profiles?.email}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            User ID: {attempt.profiles?.id?.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                            {attempt.assessments?.title}
                          </p>
                        </div>
                        <span className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-medium">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span>Live</span>
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {Math.floor(attempt.time_remaining_seconds / 60)}:{(attempt.time_remaining_seconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Violations</span>
                          <span className={`text-sm font-medium ${
                            attempt.violation_count >= 3 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                          }`}>
                            {attempt.violation_count}/3
                          </span>
                        </div>
                      </div>

                      {attempt.violation_count > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm text-yellow-800 dark:text-yellow-200">
                              {attempt.violation_count} violation(s) detected
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewAttemptDetails(attempt.id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={() => handleDisqualify(attempt.id)}
                          className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {result.profiles?.email}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {result.profiles?.id?.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {result.assessments?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {result.percentage}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {result.correct_answers}/{result.total_questions}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            {result.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            result.passed
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {result.passed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewAttemptDetails(result.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Media Review Tab */}
            {activeTab === 'media' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Video
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Snapshots
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Activity Logs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {result.profiles?.email}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {result.profiles?.id?.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {result.assessments?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {result.video_url ? (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Not Recorded
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <button
                            onClick={() => viewSnapshots(result.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400"
                          >
                            View Snapshots
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <button
                            onClick={() => viewActivityLogs(result.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400"
                          >
                            View Logs
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewAttemptDetails(result.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            View All Media
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && attemptDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attemptDetails.profiles?.email}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {attemptDetails.assessments?.title} • {attemptDetails.assessments?.category}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                    {attemptDetails.status}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Violations</p>
                  <p className={`text-lg font-bold ${attemptDetails.violation_count >= 3 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {attemptDetails.violation_count}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Activity Logs</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {attemptDetails.activity_logs.length}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Snapshots</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {attemptDetails.snapshots.length}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Video Recording</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {attemptDetails.video_url ? '✓ Available' : '✗ Not Available'}
                  </p>
                </div>
              </div>

              {/* Video Recording */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  Assessment Video Recording
                </h3>
                {attemptDetails.video_url ? (
                  <div className="space-y-2">
                    <video
                      src={attemptDetails.video_url}
                      controls
                      className="w-full rounded-lg shadow-lg bg-black"
                      onError={(e) => {
                        console.error('❌ Failed to load video:', attemptDetails.video_url);
                      }}
                      onLoadedData={() => {
                        console.log('✅ Video loaded successfully:', attemptDetails.video_url);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>📹 Full assessment recording</span>
                      {attemptDetails.video_uploaded_at && (
                        <span>Uploaded: {new Date(attemptDetails.video_uploaded_at).toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={attemptDetails.video_url}
                        download={`assessment-video-${attemptDetails.id}.webm`}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          fetch(attemptDetails.video_url)
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `assessment-video-${attemptDetails.id}.webm`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            })
                            .catch(err => {
                              console.error('Download failed:', err);
                              alert('Failed to download video. Opening in new tab instead.');
                              window.open(attemptDetails.video_url, '_blank');
                            });
                        }}
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Video (.webm)</span>
                      </a>
                      <a
                        href={attemptDetails.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        <span>Open in New Tab</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Video className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No video recording available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Video recording may not have been enabled for this assessment
                    </p>
                  </div>
                )}
              </div>

              {/* Activity Logs */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Activity Logs ({attemptDetails.activity_logs.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attemptDetails.activity_logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg ${
                        log.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/20' :
                        log.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        'bg-blue-100 dark:bg-blue-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.event_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {log.event_data?.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {log.event_data.description}
                        </p>
                      )}
                    </div>
                  ))}
                  {attemptDetails.activity_logs.length === 0 && (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No activity logs recorded
                    </p>
                  )}
                </div>
              </div>

              {/* Snapshots */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Proctoring Snapshots ({attemptDetails.snapshots.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                  {attemptDetails.snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="relative shadow-lg rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500">
                      <img
                        src={snapshot.snapshot_url}
                        alt="Proctoring Snapshot"
                        className="w-full h-48 object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('❌ Failed to load snapshot:', snapshot.snapshot_url);
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML += '<div class="flex items-center justify-center h-48 bg-gray-300 dark:bg-gray-600"><span class="text-gray-500">Image Load Error</span></div>';
                        }}
                        onLoad={(e) => {
                          console.log('✅ Snapshot loaded:', snapshot.snapshot_url);
                          e.target.style.opacity = '1';
                        }}
                        style={{ opacity: 0, transition: 'opacity 0.3s' }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white text-sm font-medium p-2">
                        {new Date(snapshot.captured_at).toLocaleTimeString()}
                      </div>
                      {!snapshot.face_detected && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          ⚠ No Face
                        </div>
                      )}
                      {snapshot.face_detected && (
                        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          ✓ Face OK
                        </div>
                      )}
                    </div>
                  ))}
                  {attemptDetails.snapshots.length === 0 && (
                    <p className="col-span-full text-gray-600 dark:text-gray-400 text-center py-4">
                      No snapshots captured
                    </p>
                  )}
                </div>
              </div>

              {/* Responses */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Responses ({attemptDetails.responses.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {attemptDetails.responses.map((response, index) => (
                    <div key={response.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Question {index + 1}
                        </span>
                        {response.is_correct !== null && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            response.is_correct
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {response.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {response.questions?.question_text}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        Answer: {JSON.stringify(response.user_answer)}
                      </p>
                    </div>
                  ))}
                  {attemptDetails.responses.length === 0 && (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No responses submitted yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create/Edit Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Full Stack Developer Assessment"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the assessment"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Programming">Programming</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Aptitude">Aptitude</option>
                  <option value="Reasoning">Reasoning</option>
                </select>
              </div>

              {/* Grid for numbers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Total Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Questions *
                  </label>
                  <input
                    type="number"
                    value={formData.total_questions}
                    onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Passing Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Passing Score (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty *
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Active (visible to users)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleSaveAssessment}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {editingAssessment ? 'Update Assessment' : 'Create Assessment'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create/Edit Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </h2>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Assessment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assessment *
                </label>
                <select
                  value={questionForm.assessment_id}
                  onChange={(e) => setQuestionForm({ ...questionForm, assessment_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Assessment</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Text *
                </label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your question here..."
                />
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Type *
                </label>
                <select
                  value={questionForm.question_type}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="coding">Coding</option>
                  <option value="text">Text Answer</option>
                </select>
              </div>

              {/* MCQ Options */}
              {questionForm.question_type === 'mcq' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Options *
                  </label>
                  <div className="space-y-2">
                    {questionForm.options.map((option, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[idx] = e.target.value;
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              {questionForm.question_type === 'mcq' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correct Answer *
                  </label>
                  <select
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Correct Answer</option>
                    {questionForm.options.filter(opt => opt).map((option, idx) => (
                      <option key={idx} value={option}>
                        {String.fromCharCode(65 + idx)}. {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grid for metadata */}
              <div className="grid grid-cols-3 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={questionForm.category}
                    onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Aptitude">Aptitude</option>
                    <option value="Reasoning">Reasoning</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty *
                  </label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Points *
                  </label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {editingQuestion ? 'Update Question' : 'Create Question'}
                </button>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Snapshots Modal */}
      {showSnapshotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Proctoring Snapshots ({snapshots.length})
              </h2>
              <button
                onClick={() => setShowSnapshotsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {snapshots.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No snapshots captured</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md">
                      <div className="relative">
                        <img
                          src={snapshot.snapshot_url}
                          alt="Snapshot"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error('❌ Failed to load image:', snapshot.snapshot_url);
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Error%3C/text%3E%3C/svg%3E';
                          }}
                          onLoad={() => console.log('✅ Image loaded:', snapshot.snapshot_url)}
                        />
                      </div>
                      <div className="p-2 bg-white dark:bg-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {new Date(snapshot.captured_at).toLocaleString()}
                        </p>
                        {snapshot.face_detected && (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded">
                            ✓ Face Detected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Activity Logs ({activityLogs.length})
              </h2>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No activity logs recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                        log.event_type === 'tab_switch' || log.event_type === 'window_blur' ? 'bg-red-500' :
                        log.event_type === 'fullscreen_exit' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {log.event_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {log.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
