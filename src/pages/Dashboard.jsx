import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Award, TrendingUp, Sparkles, Trophy } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';
import { progressAPI, certificatesAPI, aiAPI, leaderboardAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [insights, setInsights] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data when we have a user
    if (!user?.id) return;
    
    fetchDashboardData();

    // Real-time subscriptions for user progress
    const progressChannel = supabase
      .channel('user_progress_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_progress',
        filter: `user_id=eq.${user.id}`
      }, () => {
        console.log('Progress updated');
        fetchDashboardData();
      })
      .subscribe();

    const enrollmentsChannel = supabase
      .channel('user_enrollments_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'enrollments',
        filter: `user_id=eq.${user.id}`
      }, () => {
        console.log('Enrollment updated');
        fetchDashboardData();
      })
      .subscribe();

    const certificatesChannel = supabase
      .channel('user_certificates_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'certificates',
        filter: `user_id=eq.${user.id}`
      }, () => {
        console.log('Certificate updated');
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(enrollmentsChannel);
      supabase.removeChannel(certificatesChannel);
    };
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching dashboard data for user:', user.id);
      
      // Fetch user enrollments (courses in progress)
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            lessons:lessons(count)
          )
        `)
        .eq('user_id', user.id);
      
      console.log('📚 Enrollments:', enrollmentsData);
      
      // Fetch user progress from Supabase
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*, courses(*)')
        .eq('user_id', user.id);
      
      console.log('📈 Progress data:', progressData);
      
      setProgress(enrollmentsData || []);
      
      // Fetch certificates
      const { data: certsData } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id);
      
      setCertificates(certsData || []);
      
      // Fetch or create user XP
      let { data: xpData, error: xpError } = await supabase
        .from('xp')
        .select('total_xp, weekly_xp, level')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // If no XP record exists, create one
      if (!xpData && xpError?.code === 'PGRST116') {
        const { data: newXp } = await supabase
          .from('xp')
          .insert({
            user_id: user.id,
            total_xp: 0,
            weekly_xp: 0,
            level: 1
          })
          .select()
          .single();
        
        xpData = newXp;
      }
      
      // Calculate user's rank based on weekly XP
      const { data: allUsers } = await supabase
        .from('xp')
        .select('user_id, weekly_xp')
        .order('weekly_xp', { ascending: false });
      
      const userRank = allUsers?.findIndex(u => u.user_id === user.id) + 1 || '-';
      
      setRank({
        ...xpData,
        rank: userRank,
        total_xp: xpData?.total_xp || 0,
        weekly_xp: xpData?.weekly_xp || 0,
        level: xpData?.level || 1
      });
      
      // Set mock insights for now
      setInsights({
        strengths: ['Quick learner', 'Consistent practice'],
        improvements: ['Complete more quizzes', 'Review previous lessons'],
        recommendations: ['Try advanced courses', 'Join study groups']
      });
      
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate completed courses based on certificates
  const completedCourses = certificates.length;
  
  // Calculate average progress (this would need actual progress calculation)
  const avgProgress = 0; // TODO: Calculate based on lesson completion

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Here's your learning progress
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            title="Courses in Progress"
            value={progress.length}
            color="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={<Award className="h-6 w-6" />}
            title="Completed Courses"
            value={completedCourses}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Average Progress"
            value={`${avgProgress.toFixed(0)}%`}
            color="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={<Trophy className="h-6 w-6" />}
            title="Weekly Rank"
            value={`#${rank?.rank || '-'}`}
            color="from-yellow-500 to-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Insights */}
            {/* Courses in Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-2xl font-bold mb-4">Continue Learning</h2>
              
              {progress.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't started any courses yet
                  </p>
                  <Link to="/courses" className="btn-primary">
                    Browse Courses
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {progress.map((p) => (
                    <Link
                      key={p.id}
                      to={`/courses/${p.course_id}`}
                      className="block p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{p.courses?.title || 'Course'}</h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {(p.percent_complete || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${p.percent_complete || 0}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* XP Stats */}
            {insights?.stats && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card"
              >
                <h3 className="text-xl font-bold mb-4">Your XP</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total XP</p>
                    <p className="text-3xl font-bold text-light-primary dark:text-dark-primary">
                      {insights.stats.totalXP}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                    <p className="text-2xl font-bold">
                      {insights.stats.weeklyXP}
                    </p>
                  </div>
                  <Link to="/leaderboard" className="btn-outline w-full text-center block">
                    View Leaderboard
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Quick Access */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="card"
            >
              <h3 className="text-xl font-bold mb-4">Quick Access</h3>
              <div className="space-y-3">
                <Link
                  to="/assessments"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg hover:shadow-md transition-all"
                >
                  <span className="font-medium text-purple-700 dark:text-purple-300">AI Assessment Arena</span>
                  <span className="text-2xl">🧠</span>
                </Link>
                <Link
                  to="/ai-interview"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg hover:shadow-md transition-all"
                >
                  <span className="font-medium text-green-700 dark:text-green-300">AI Interview</span>
                  <span className="text-2xl">🎤</span>
                </Link>
                <Link
                  to="/kbc-game"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg hover:shadow-md transition-all"
                >
                  <span className="font-medium text-yellow-700 dark:text-yellow-300">XP Battle Game</span>
                  <span className="text-2xl">🎮</span>
                </Link>
              </div>
            </motion.div>

            {/* Certificates */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Certificates</h3>
                <Link 
                  to="/certificate-generator"
                  className="text-sm text-light-primary dark:text-dark-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Award className="h-4 w-4" />
                  Generate
                </Link>
              </div>
              {certificates.length === 0 ? (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Complete courses to earn certificates
                  </p>
                  <Link 
                    to="/certificate-generator"
                    className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Award className="h-4 w-4" />
                    Create Certificate
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.slice(0, 3).map((cert) => (
                    <div key={cert.id} className="p-3 bg-gradient-to-r from-light-primary/10 to-light-secondary/10 dark:from-dark-primary/10 dark:to-dark-secondary/10 rounded-lg">
                      <p className="font-medium text-sm">{cert.course?.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {certificates.length > 3 && (
                    <p className="text-sm text-light-primary dark:text-dark-primary">
                      +{certificates.length - 3} more
                    </p>
                  )}
                  <Link 
                    to="/certificate-generator"
                    className="inline-flex items-center gap-2 text-sm text-light-primary dark:text-dark-primary hover:underline mt-2"
                  >
                    <Award className="h-4 w-4" />
                    Generate New Certificate
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card"
    >
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${color} text-white mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </motion.div>
  );
}
