import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { leaderboardAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time subscription for leaderboard changes
    const leaderboardChannel = supabase
      .channel('leaderboard_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_progress'
      }, () => {
        console.log('Leaderboard updated');
        fetchLeaderboard();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_attempts'
      }, () => {
        console.log('Quiz attempt detected');
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch leaderboard from Supabase XP table
      const xpField = period === 'weekly' ? 'weekly_xp' : 'total_xp';
      
      const { data: xpData, error } = await supabase
        .from('xp')
        .select('user_id, weekly_xp, total_xp, level')
        .order(xpField, { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Fetch profiles for these users
      const userIds = xpData.map(x => x.user_id);
      
      if (userIds.length === 0) {
        setLeaderboard([]);
        return;
      }
      
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      
      console.log('XP Data:', xpData);
      console.log('Profiles Data:', profilesData);
      console.log('Profile Error:', profileError);
      
      // Create a map of user_id to profile
      const profilesMap = {};
      if (profilesData) {
        profilesData.forEach(p => {
          profilesMap[p.id] = p;
        });
      }
      
      // Format data for display
      const formattedData = xpData.map((item, index) => {
        const profile = profilesMap[item.user_id];
        // Show name if exists, otherwise show email
        const displayName = profile?.name || profile?.email || 'No Email';
        
        return {
          rank: index + 1,
          user_id: item.user_id,
          name: displayName,
          email: profile?.email,
          xp: item[xpField],
          total_xp: item.total_xp,
          level: item.level || 1
        };
      });
      
      setLeaderboard(formattedData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return null;
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            🏆 Leaderboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            See how you rank against other learners
          </p>
        </motion.div>

        {/* Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                period === 'weekly'
                  ? 'bg-light-primary dark:bg-dark-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('total')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                period === 'total'
                  ? 'bg-light-primary dark:bg-dark-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Leaderboard */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card"
          >
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No data available yet. Start learning to appear on the leaderboard!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      entry.user_id === user?.id
                        ? 'bg-light-primary/10 dark:bg-dark-primary/10 border-2 border-light-primary dark:border-dark-primary'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="w-12 flex items-center justify-center">
                        {getRankIcon(entry.rank) || (
                          <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary flex items-center justify-center text-white font-bold">
                        {entry.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Name */}
                      <div>
                        <p className="font-semibold">
                          {entry.name}
                          {entry.user_id === user?.id && (
                            <span className="ml-2 text-sm text-light-primary dark:text-dark-primary">
                              (You)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-light-primary dark:text-dark-primary">
                        {entry.xp}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">XP</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
