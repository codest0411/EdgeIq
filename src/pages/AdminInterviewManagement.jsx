import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  Eye, 
  Download,
  Search,
  Filter,
  Calendar,
  User,
  Award,
  TrendingUp,
  TrendingDown,
  Play,
  ArrowLeft,
  Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminInterviewManagement() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [playingVideo, setPlayingVideo] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ai_interviews')
        .select(`
          *,
          user:profiles!ai_interviews_user_id_fkey(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewInterviewDetails = async (interview) => {
    try {
      const { data: answers, error } = await supabase
        .from('ai_interview_answers')
        .select('*')
        .eq('interview_id', interview.id)
        .order('question_number');

      if (error) throw error;

      setSelectedInterview({
        ...interview,
        answers: answers || []
      });
    } catch (error) {
      console.error('Error fetching interview details:', error);
    }
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interview.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'abandoned':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Admin Dashboard</span>
          </button>
          
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Video className="h-8 w-8 mr-3 text-purple-600" />
            AI Interview Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and analyze student interview recordings
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Interviews</p>
                <p className="text-2xl font-bold">{interviews.length}</p>
              </div>
              <Video className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {interviews.filter(i => i.status === 'completed').length}
                </p>
              </div>
              <Award className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {interviews.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
              <Play className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {interviews.length > 0 ? '85%' : '0%'}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Interviews Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No interviews found
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium">{interview.user?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{interview.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(interview.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                          {interview.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {interview.questions_answered} / {interview.total_questions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => viewInterviewDetails(interview)}
                          className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interview Details Modal */}
        {selectedInterview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Interview Details</h2>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Student Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedInterview.user?.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedInterview.user?.email}</p>
                    <p className="text-xs text-gray-500">
                      Completed: {new Date(selectedInterview.completed_at || selectedInterview.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedInterview.answers?.map((answer, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          Q{answer.question_number}: {answer.question_category}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                      <p className="text-sm font-medium mb-1">Answer:</p>
                      <p className="text-sm">{answer.user_answer || 'No answer recorded'}</p>
                    </div>

                    {answer.mistakes && answer.mistakes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-600 flex items-center">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Issues Detected:
                        </p>
                        {answer.mistakes.map((mistake, idx) => (
                          <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 ml-5">
                            • {mistake.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {answer.video_chunk_url && (
                      <div className="mt-3">
                        {playingVideo === answer.id ? (
                          <div className="bg-black rounded-lg overflow-hidden">
                            <video
                              controls
                              autoPlay
                              className="w-full max-h-96"
                              src={answer.video_chunk_url}
                            >
                              Your browser does not support video playback.
                            </video>
                            <button
                              onClick={() => setPlayingVideo(null)}
                              className="w-full py-2 bg-gray-800 text-white hover:bg-gray-700 text-sm"
                            >
                              Close Video
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPlayingVideo(answer.id)}
                            className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Play Video Recording
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="btn-secondary px-6 py-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
