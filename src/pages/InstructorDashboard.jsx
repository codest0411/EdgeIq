import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Video,
  FileText,
  BarChart3,
  GraduationCap,
  LogOut,
  Moon,
  Sun,
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function InstructorDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
    avgRating: 0
  });
  const [courses, setCourses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [roleChecked, setRoleChecked] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    watchData: [],
    completionData: [],
    enrollmentTrend: []
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Only check role once we have user data and haven't checked yet
    if (user && !roleChecked) {
      checkInstructorRole();
    }
  }, [authLoading, isAuthenticated, user, roleChecked]);

  useEffect(() => {
    if (profile && roleChecked && user?.id) {
      fetchDashboardData();
      
      // Set up real-time subscriptions for analytics
      const progressChannel = supabase
        .channel('instructor_analytics_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        }, (payload) => {
          console.log('Progress updated - refreshing analytics', payload);
          fetchDashboardData(true);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'enrollments'
        }, (payload) => {
          console.log('Enrollments updated - refreshing analytics', payload);
          fetchDashboardData(true);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'course_ratings'
        }, (payload) => {
          console.log('Ratings updated - refreshing analytics', payload);
          fetchDashboardData(true);
        })
        .subscribe((status) => {
          console.log('Real-time subscription status:', status);
        });

      // Also set up polling as backup (every 10 seconds)
      const pollInterval = setInterval(() => {
        console.log('Polling for updates...');
        fetchDashboardData(true);
      }, 10000);

      return () => {
        console.log('Cleaning up real-time subscriptions');
        supabase.removeChannel(progressChannel);
        clearInterval(pollInterval);
      };
    }
  }, [profile, roleChecked, user?.id]);

  const checkInstructorRole = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID yet, waiting...');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role, name, is_verified, email, bio')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        setRoleChecked(true);
        navigate('/auth', { replace: true });
        return;
      }

      if (!profileData || profileData.role !== 'instructor') {
        console.log('Not an instructor, redirecting to dashboard');
        setRoleChecked(true);
        navigate('/dashboard', { replace: true });
        return;
      }

      setProfile(profileData);
      setRoleChecked(true);
    } catch (error) {
      console.error('Error checking role:', error);
      setRoleChecked(true);
      navigate('/auth', { replace: true });
    }
  };

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch instructor's courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments:enrollments(count),
          lessons:lessons(count)
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }

      console.log('🔍 Raw courses data:', coursesData);

      // Fetch real-time watch/completion data
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        
        // Get lesson progress data
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('course_id, lesson_id, completed, user_id')
          .in('course_id', courseIds);
        
        // Calculate watch and completion stats per course
        const watchStats = {};
        const completionStats = {};
        
        console.log('📊 Analytics Data Fetch:', {
          totalCourses: coursesData.length,
          totalProgressRecords: progressData?.length || 0,
          progressData: progressData
        });
        
        console.log('📋 Enrollment counts per course:');
        coursesData.forEach(course => {
          console.log(`  ${course.title}: ${course.enrollments?.[0]?.count || 0} enrollments`);
        });
        
        coursesData.forEach(course => {
          const courseProgress = progressData?.filter(p => p.course_id === course.id) || [];
          const uniqueUsers = [...new Set(courseProgress.map(p => p.user_id))];
          const completedLessons = courseProgress.filter(p => p.completed);
          const totalLessons = course.lessons?.[0]?.count || 0;
          const totalPossibleProgress = uniqueUsers.length * totalLessons;
          
          watchStats[course.id] = {
            watching: uniqueUsers.length,
            totalEnrolled: course.enrollments?.[0]?.count || 0,
            watchRate: course.enrollments?.[0]?.count > 0 
              ? ((uniqueUsers.length / course.enrollments?.[0]?.count) * 100).toFixed(1)
              : 0
          };
          
          completionStats[course.id] = {
            completed: completedLessons.length,
            total: totalPossibleProgress,
            completionRate: totalPossibleProgress > 0
              ? ((completedLessons.length / totalPossibleProgress) * 100).toFixed(1)
              : 0
          };
          
          console.log(`📚 ${course.title}:`, {
            progressRecords: courseProgress.length,
            uniqueStudentsWatching: uniqueUsers.length,
            totalEnrolled: course.enrollments?.[0]?.count || 0,
            completedLessons: completedLessons.length,
            totalLessons: totalLessons,
            watchRate: watchStats[course.id].watchRate + '%',
            completionRate: completionStats[course.id].completionRate + '%'
          });
        });
        
        setAnalyticsData({
          watchData: watchStats,
          completionData: completionStats,
          enrollmentTrend: coursesData
        });
        
        console.log('Analytics Data Set:', { watchStats, completionStats });
      }

      // Fetch ratings for all instructor's courses
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);
        
        const { data: ratingsData } = await supabase
          .from('course_ratings')
          .select('course_id, rating')
          .in('course_id', courseIds);
        
        // Calculate ratings for each course
        coursesData.forEach(course => {
          const courseRatings = ratingsData?.filter(r => r.course_id === course.id) || [];
          if (courseRatings.length > 0) {
            const sum = courseRatings.reduce((acc, r) => acc + r.rating, 0);
            course.average_rating = sum / courseRatings.length;
            course.total_ratings = courseRatings.length;
          } else {
            course.average_rating = 0;
            course.total_ratings = 0;
          }
        });
      }

      setCourses(coursesData || []);

      // Calculate stats
      const totalCourses = coursesData?.length || 0;
      const totalStudents = coursesData?.reduce((sum, course) => 
        sum + (course.enrollments?.[0]?.count || 0), 0) || 0;
      
      // Fetch REAL revenue from instructor_earnings table
      const { data: earningsData } = await supabase
        .from('instructor_earnings')
        .select('amount_cents, status, course_id')
        .eq('instructor_id', user.id);
      
      // Calculate total revenue from actual payments (in rupees)
      const totalRevenue = earningsData?.reduce((sum, earning) => 
        sum + (earning.amount_cents / 100), 0) || 0;
      
      // Calculate pending vs paid earnings
      const paidEarnings = earningsData?.filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + (e.amount_cents / 100), 0) || 0;
      const pendingEarnings = earningsData?.filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + (e.amount_cents / 100), 0) || 0;
      
      // Map earnings to courses for revenue display
      const earningsByCourse = {};
      earningsData?.forEach(earning => {
        if (!earningsByCourse[earning.course_id]) {
          earningsByCourse[earning.course_id] = 0;
        }
        earningsByCourse[earning.course_id] += earning.amount_cents / 100;
      });
      
      // Add real earnings to courses
      coursesData?.forEach(course => {
        course.realEarnings = earningsByCourse[course.id] || 0;
      });
      
      // Calculate average rating across all courses
      const totalRatings = coursesData?.reduce((sum, course) => 
        sum + (course.total_ratings || 0), 0) || 0;
      const sumRatings = coursesData?.reduce((sum, course) => 
        sum + ((course.average_rating || 0) * (course.total_ratings || 0)), 0) || 0;
      const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

      setStats({
        totalCourses,
        totalStudents,
        totalRevenue,
        paidEarnings,
        pendingEarnings,
        avgRating: avgRating.toFixed(1)
      });

      // Fetch follower count
      const { data: followers } = await supabase
        .from('instructor_followers')
        .select('id', { count: 'exact' })
        .eq('instructor_id', user.id);
      
      setFollowerCount(followers?.length || 0);

      // Set last updated timestamp
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleCreateCourse = () => {
    navigate('/instructor/courses/create');
  };

  const handleEditCourse = (courseId) => {
    navigate(`/instructor/courses/${courseId}/edit`);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      alert('Course deleted successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const handleViewCourse = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
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
                  Instructor Dashboard
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, {profile?.name || 'Instructor'}! 👋
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

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex items-start space-x-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile?.name?.charAt(0).toUpperCase() || 'I'}
              </div>
              {profile?.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-2xl font-bold">{profile?.name || 'Instructor'}</h2>
                {profile?.is_verified && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{profile?.email}</p>
              {profile?.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{profile.bio}</p>
              )}
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-bold">{followerCount}</span>
                  <span className="text-gray-500">Followers</span>
                </span>
                <span className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  <span className="font-bold">{stats.totalCourses}</span>
                  <span className="text-gray-500">Courses</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="font-bold">{stats.totalStudents}</span>
                  <span className="text-gray-500">Students</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Courses</p>
                <p className="text-3xl font-bold">{stats.totalCourses}</p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Students</p>
                <p className="text-3xl font-bold">{stats.totalStudents}</p>
              </div>
              <Users className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earnings (70%)</p>
                <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-green-600 dark:text-green-400">Paid: ₹{stats.paidEarnings.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-orange-600 dark:text-orange-400">Pending: ₹{stats.pendingEarnings.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Rating</p>
                <p className="text-3xl font-bold">{stats.avgRating} ⭐</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Create Course Button */}
            <div className="mb-6">
              <button
                onClick={handleCreateCourse}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create New Course</span>
              </button>
            </div>

            {/* Courses List */}
            {courses.length === 0 ? (
              <div className="card text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No courses yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first course to start teaching!
                </p>
                <button onClick={handleCreateCourse} className="btn-primary">
                  Create Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="card hover:shadow-xl transition-shadow"
                  >
                    {/* Course Image */}
                    <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="h-16 w-16 text-white opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          course.published 
                            ? 'bg-green-500 text-white' 
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {course.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>

                    {/* Course Info */}
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {course.enrollments?.[0]?.count || 0}
                        </span>
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {course.lessons?.[0]?.count || 0}
                        </span>
                        <span className="flex items-center text-yellow-600">
                          ⭐ {course.average_rating ? course.average_rating.toFixed(1) : '0.0'}
                          <span className="text-gray-500 ml-1">({course.total_ratings || 0})</span>
                        </span>
                      </div>
                      <span className="font-bold text-blue-600">₹{course.price}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewCourse(course.id)}
                        className="flex-1 btn-outline text-sm py-2"
                        title="View Course"
                      >
                        <Eye className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleEditCourse(course.id)}
                        className="flex-1 btn-primary text-sm py-2"
                        title="Edit Course"
                      >
                        <Edit className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Header with Refresh */}
            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <div className="absolute top-0 left-0 h-3 w-3 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">LIVE</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                    📊 Real-time Analytics Dashboard
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {lastUpdated ? (
                      <>Updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 10s & on changes</>
                    ) : (
                      'Loading analytics...'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <TrendingUp className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Now'}</span>
              </button>
            </div>

            {/* Real-time Watch Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <PlayCircle className="h-6 w-6 mr-2 text-blue-600" />
                  Student Watch Activity
                </h3>
                {courses.length > 0 ? (
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: courses.slice(0, 5).map(c => c.title.substring(0, 20)),
                        datasets: [
                          {
                            label: 'Watching',
                            data: courses.slice(0, 5).map(c => analyticsData.watchData[c.id]?.watching || 0),
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 2
                          },
                          {
                            label: 'Enrolled',
                            data: courses.slice(0, 5).map(c => analyticsData.watchData[c.id]?.totalEnrolled || 0),
                            backgroundColor: 'rgba(156, 163, 175, 0.7)',
                            borderColor: 'rgba(156, 163, 175, 1)',
                            borderWidth: 2
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'top',
                            labels: {
                              font: { size: 12 },
                              padding: 10
                            }
                          },
                          title: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} students`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                              font: { size: 11 }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            ticks: {
                              font: { size: 10 }
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No courses yet. Create a course to see analytics.</p>
                )}
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                  Completion Rate
                </h3>
                {courses.length > 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: courses.slice(0, 5).map(c => c.title.substring(0, 15)),
                        datasets: [{
                          label: 'Completion Rate',
                          data: courses.slice(0, 5).map(c => parseFloat(analyticsData.completionData[c.id]?.completionRate || 0)),
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(139, 92, 246, 0.8)'
                          ],
                          borderColor: [
                            'rgba(59, 130, 246, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(139, 92, 246, 1)'
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: { 
                            position: 'bottom',
                            labels: {
                              font: { size: 11 },
                              padding: 15,
                              generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                  text: `${label}: ${data.datasets[0].data[i]}%`,
                                  fillStyle: data.datasets[0].backgroundColor[i],
                                  strokeStyle: data.datasets[0].borderColor[i],
                                  hidden: false,
                                  index: i
                                }));
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.label}: ${context.parsed}% completed`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No courses yet. Create a course to see analytics.</p>
                )}
              </div>
            </div>

            {/* Watch Rate Details */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Video className="h-6 w-6 mr-2 text-purple-600" />
                Real-time Watch Statistics
                <span className="ml-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                  Live Data
                </span>
              </h3>
              {courses.length > 0 ? (
                <div className="space-y-3">
                  {courses.slice(0, 5).map((course) => {
                    const watchData = analyticsData.watchData[course.id] || {};
                    const hasData = watchData.totalEnrolled > 0 || watchData.watching > 0;
                    
                    return (
                      <div key={course.id} className={`p-4 rounded-lg ${hasData ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold">{course.title}</p>
                            {hasData && (
                              <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${hasData ? 'text-green-600' : 'text-gray-400'}`}>
                            {watchData.watchRate || 0}% Watch Rate
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Enrolled</p>
                            <p className={`text-xl font-bold ${watchData.totalEnrolled > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                              {watchData.totalEnrolled || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Watching</p>
                            <p className={`text-xl font-bold ${watchData.watching > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                              {watchData.watching || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Completion</p>
                            <p className={`text-xl font-bold ${parseFloat(analyticsData.completionData[course.id]?.completionRate || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {analyticsData.completionData[course.id]?.completionRate || 0}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${hasData ? 'bg-green-600' : 'bg-gray-400'}`}
                            style={{ width: `${watchData.watchRate || 0}%` }}
                          />
                        </div>
                        {!hasData && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            No student activity yet
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No courses yet. Create a course to see analytics.</p>
              )}
            </div>

            {/* Top Performing Courses */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
                Top Performing Courses (by Rating)
              </h3>
              <div className="space-y-3">
                {[...courses]
                  .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
                  .slice(0, 5)
                  .map((course, index) => (
                    <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-semibold">{course.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {course.enrollments?.[0]?.count || 0} students
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-yellow-600">
                          ⭐ {course.average_rating ? course.average_rating.toFixed(1) : '0.0'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {course.total_ratings || 0} ratings
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Most Popular Courses */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Users className="h-6 w-6 mr-2 text-blue-600" />
                Most Popular Courses (by Enrollments)
              </h3>
              <div className="space-y-3">
                {[...courses]
                  .sort((a, b) => (b.enrollments?.[0]?.count || 0) - (a.enrollments?.[0]?.count || 0))
                  .slice(0, 5)
                  .map((course, index) => (
                    <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-semibold">{course.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ⭐ {course.average_rating ? course.average_rating.toFixed(1) : '0.0'} ({course.total_ratings || 0})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          {course.enrollments?.[0]?.count || 0}
                        </p>
                        <p className="text-xs text-gray-500">students</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Revenue Analysis - REAL EARNINGS */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-green-600" />
                Earnings by Course (70% Share)
              </h3>
              <div className="space-y-3">
                {[...courses]
                  .sort((a, b) => (b.realEarnings || 0) - (a.realEarnings || 0))
                  .slice(0, 5)
                  .map((course, index) => {
                    const earnings = course.realEarnings || 0;
                    const maxEarnings = Math.max(...courses.map(c => c.realEarnings || 0));
                    const percentage = maxEarnings > 0 ? (earnings / maxEarnings) * 100 : 0;
                    
                    return (
                      <div key={course.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{course.title}</p>
                          <p className="text-lg font-bold text-green-600">₹{earnings.toLocaleString()}</p>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {course.enrollments?.[0]?.count || 0} sales
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Course Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Rating Distribution</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = courses.filter(c => 
                      Math.round(c.average_rating || 0) === rating
                    ).length;
                    const percentage = courses.length > 0 ? (count / courses.length) * 100 : 0;
                    
                    return (
                      <div key={rating} className="flex items-center space-x-3">
                        <span className="text-sm font-medium w-8">{rating}⭐</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Courses</span>
                    <span className="text-xl font-bold">{stats.totalCourses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Students</span>
                    <span className="text-xl font-bold">{stats.totalStudents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                    <span className="text-xl font-bold text-green-600">₹{stats.totalRevenue}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Avg Rating</span>
                    <span className="text-xl font-bold text-yellow-600">{stats.avgRating} ⭐</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Best Course</span>
                    <span className="text-sm font-semibold">
                      {[...courses].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))[0]?.title?.substring(0, 20) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
