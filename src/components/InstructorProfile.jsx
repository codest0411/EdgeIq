import { useState, useEffect } from 'react';
import { CheckCircle, Users, BookOpen, Star, Globe, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function InstructorProfile({ instructorId, showFollowButton = true }) {
  const { user } = useAuth();
  const [instructor, setInstructor] = useState(null);
  const [stats, setStats] = useState({
    followers: 0,
    courses: 0,
    students: 0,
    avgRating: 0
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (instructorId) {
      fetchInstructorProfile();
      fetchInstructorStats();
      if (user) {
        checkFollowStatus();
      }
    }
  }, [instructorId, user]);

  const fetchInstructorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', instructorId)
        .single();

      if (error) throw error;
      setInstructor(data);
    } catch (error) {
      console.error('Error fetching instructor:', error);
    }
  };

  const fetchInstructorStats = async () => {
    try {
      console.log('🔍 Fetching instructor stats for:', instructorId);
      
      // Get follower count
      const { data: followers } = await supabase
        .from('instructor_followers')
        .select('id', { count: 'exact' })
        .eq('instructor_id', instructorId);

      console.log('👥 Followers:', followers?.length || 0);

      // Get courses and stats
      const { data: courses } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          enrollments:enrollments(count)
        `)
        .eq('instructor_id', instructorId);

      console.log('📚 Courses:', courses);

      const totalCourses = courses?.length || 0;
      const totalStudents = courses?.reduce((sum, c) => {
        const enrollmentCount = c.enrollments?.[0]?.count || 0;
        console.log(`  ${c.title}: ${enrollmentCount} enrollments`);
        return sum + enrollmentCount;
      }, 0) || 0;
      
      // Fetch ratings manually from course_ratings table (same as instructor dashboard)
      let totalRatings = 0;
      let sumRatings = 0;
      
      if (courses && courses.length > 0) {
        const courseIds = courses.map(c => c.id);
        
        const { data: ratingsData } = await supabase
          .from('course_ratings')
          .select('course_id, rating')
          .in('course_id', courseIds);
        
        console.log('⭐ Ratings data:', ratingsData);
        
        // Calculate ratings for each course
        courses.forEach(course => {
          const courseRatings = ratingsData?.filter(r => r.course_id === course.id) || [];
          if (courseRatings.length > 0) {
            const sum = courseRatings.reduce((acc, r) => acc + r.rating, 0);
            course.average_rating = sum / courseRatings.length;
            course.total_ratings = courseRatings.length;
            
            totalRatings += courseRatings.length;
            sumRatings += sum;
          } else {
            course.average_rating = 0;
            course.total_ratings = 0;
          }
        });
      }
      
      const avgRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;

      console.log('📊 Instructor Stats:', {
        followers: followers?.length || 0,
        courses: totalCourses,
        students: totalStudents,
        avgRating: avgRating,
        totalRatings: totalRatings
      });

      setStats({
        followers: followers?.length || 0,
        courses: totalCourses,
        students: totalStudents,
        avgRating: avgRating
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('instructor_followers')
        .select('id')
        .eq('instructor_id', instructorId)
        .eq('follower_id', user.id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert('Please login to follow instructors');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('instructor_followers')
          .delete()
          .eq('instructor_id', instructorId)
          .eq('follower_id', user.id);

        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        // Follow
        await supabase
          .from('instructor_followers')
          .insert({
            instructor_id: instructorId,
            follower_id: user.id
          });

        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Failed to update follow status');
    }
  };

  if (loading || !instructor) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>;
  }

  return (
    <div className="card">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {instructor.name?.charAt(0).toUpperCase() || 'I'}
          </div>
          {instructor.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-xl font-bold">{instructor.name || instructor.email?.split('@')[0] || 'Instructor'}</h3>
            {instructor.is_verified && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>Verified</span>
              </span>
            )}
          </div>
          
          {instructor.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{instructor.bio}</p>
          )}

          {instructor.specialization && instructor.specialization.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {instructor.specialization.map((spec, index) => (
                <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  {spec}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{stats.followers}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">{stats.courses}</p>
              <p className="text-xs text-gray-500">Courses</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{stats.students}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-600">{stats.avgRating} ⭐</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>

          {/* Follow Button */}
          {showFollowButton && user?.id !== instructorId && (
            <button
              onClick={handleFollow}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary text-white hover:opacity-90'
              }`}
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
