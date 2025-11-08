import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Calendar, Award, TrendingUp, BookOpen, 
  Trophy, Settings, Trash2, History, Star, Target, Lock, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContainer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function StudentProfile() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [xpHistory, setXpHistory] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalXP: 0,
    level: 1,
    rank: null
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchProfileData();
  }, [isAuthenticated, user]);

  const fetchProfileData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch XP data (create if doesn't exist)
      let { data: xp, error: xpError } = await supabase
        .from('xp')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Create XP record if it doesn't exist
      if (!xp && xpError?.code === 'PGRST116') {
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
        xp = newXp;
      }

      setXpData(xp || { total_xp: 0, weekly_xp: 0, level: 1 });

      // Fetch XP history (from quiz attempts and course completions)
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('xp_earned, created_at, quizzes(title, courses(title))')
        .eq('user_id', user.id)
        .eq('passed', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const history = quizAttempts?.map(attempt => ({
        type: 'quiz',
        xp: attempt.xp_earned,
        title: attempt.quizzes?.title || 'Quiz',
        course: attempt.quizzes?.courses?.title || 'Course',
        date: attempt.created_at
      })) || [];

      setXpHistory(history);

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, course_id')
        .eq('user_id', user.id);

      // Fetch certificates (completed courses)
      const { data: certificates } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user.id);

      // Get leaderboard rank (based on weekly XP)
      const { data: leaderboard } = await supabase
        .from('xp')
        .select('user_id, weekly_xp')
        .order('weekly_xp', { ascending: false });

      let userRank = null;
      if (leaderboard && leaderboard.length > 0) {
        const rankIndex = leaderboard.findIndex(entry => entry.user_id === user.id);
        userRank = rankIndex >= 0 ? rankIndex + 1 : leaderboard.length + 1;
      }

      setStats({
        totalCourses: enrollments?.length || 0,
        completedCourses: certificates?.length || 0,
        totalXP: xp?.total_xp || 0,
        level: xp?.level || 1,
        rank: userRank
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      showToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Delete user data (cascade will handle related records)
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;

      showToast('Account deleted successfully', 'success');
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast('Failed to delete account. Please contact support.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateLevelProgress = () => {
    const currentLevel = stats.level;
    const xpForNextLevel = currentLevel * 1000;
    const xpInCurrentLevel = stats.totalXP % 1000;
    return (xpInCurrentLevel / xpForNextLevel) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account and track your progress
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold mb-1">
                  {profile?.name || user?.email?.split('@')[0]}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  {user?.email}
                </p>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {formatDate(profile?.created_at)}
                </div>

                {/* Level Badge */}
                <div className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Level {stats.level}</span>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-2 mb-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateLevelProgress()}%` }}
                    />
                  </div>
                  <p className="text-xs">{stats.totalXP} XP</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
                    <p className="text-2xl font-bold">{stats.totalCourses}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Enrolled</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
                    <p className="text-2xl font-bold">{stats.completedCourses}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <p className="text-2xl font-bold">{xpData?.weekly_xp || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Weekly XP</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mb-1" />
                    <p className="text-2xl font-bold">#{stats.rank || '-'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Rank</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Settings Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Account Settings
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - XP History */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
            >
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <History className="h-6 w-6 mr-2 text-purple-600" />
                XP History
              </h3>

              {xpHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No XP earned yet</p>
                  <p className="text-sm text-gray-500">Complete quizzes to start earning XP!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {xpHistory.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          <Star className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.course}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">+{item.xp}</p>
                        <p className="text-xs text-gray-500">XP</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center text-purple-600 dark:text-purple-400">
                <Lock className="h-5 w-5 mr-2" />
                Change Password
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {changingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
                Delete Account?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This action cannot be undone. All your progress, enrollments, and data will be permanently deleted.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
