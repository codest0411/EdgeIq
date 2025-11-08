import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, GraduationCap, TrendingUp, UserCheck, Clock, ArrowRight, Moon, Sun, Mail, Award, Video, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalEnrollments: 0,
    pendingApplications: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Check if admin is logged in
    const checkAuth = () => {
      const isAdmin = localStorage.getItem('isAdmin');
      const adminUser = localStorage.getItem('adminUser');
      
      if (!isAdmin || !adminUser) {
        console.log('Admin not authenticated, redirecting to /auth');
        navigate('/auth');
        return false;
      }
      return true;
    };

    if (checkAuth()) {
      fetchDashboardData();
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [coursesData, enrollmentsData, usersData, applicationsData] = await Promise.all([
        supabase.from('courses').select('id'),
        supabase.from('enrollments').select('id'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('instructor_applications').select('id').eq('status', 'pending')
      ]);

      // Calculate stats
      const allUsers = usersData.data || [];
      const totalStudents = allUsers.filter(u => u.role === 'student').length;
      const totalInstructors = allUsers.filter(u => u.role === 'instructor').length;

      setStats({
        totalCourses: coursesData.data?.length || 0,
        totalStudents,
        totalInstructors,
        totalEnrollments: enrollmentsData.data?.length || 0,
        pendingApplications: applicationsData.data?.length || 0
      });

      // Get recent users (last 5)
      setRecentUsers(allUsers.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminUser');
    navigate('/auth');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Website Name */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
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
                  Admin Dashboard
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, Administrator
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalCourses}
                </p>
              </div>
              <BookOpen className="h-10 w-10 text-blue-600" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalStudents}
                </p>
              </div>
              <Users className="h-10 w-10 text-green-600" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Instructors</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalInstructors}
                </p>
              </div>
              <GraduationCap className="h-10 w-10 text-purple-600" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Enrollments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalEnrollments}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin/user-management')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Apps</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.pendingApplications}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/user-management')}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <span className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-3" />
                  Manage Users & Applications
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/admin/courses')}
                className="w-full flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
              >
                <span className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-3" />
                  Manage Courses
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/admin/interviews')}
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
              >
                <span className="flex items-center">
                  <Video className="h-5 w-5 mr-3" />
                  AI Interviews
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/admin/support')}
                className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
              >
                <span className="flex items-center">
                  <Mail className="h-5 w-5 mr-3" />
                  Support Messages
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/admin/assessments')}
                className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
              >
                <span className="flex items-center">
                  <FileText className="h-5 w-5 mr-3" />
                  AI Assessment Arena
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>

          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Users
              </h2>
              <button
                onClick={() => navigate('/admin/user-management')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No users yet</p>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : user.role === 'instructor'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
