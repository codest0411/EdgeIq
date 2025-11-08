import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Award, PlayCircle, CheckCircle, FileQuestion, StickyNote, Star, Lock, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import InstructorProfile from '../components/InstructorProfile';
import CourseCertificate from '../components/CourseCertificate';
import { paymentsAPI, progressAPI } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { stripePromise } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastContainer';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    fetchCourse();
    if (isAuthenticated) {
      fetchProgress();
      fetchUserRating();
    }

    // Check for payment success
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      showToast('Payment successful! You now have full access to the course.', 'success');
      // Remove payment param from URL
      searchParams.delete('payment');
      navigate(`/courses/${id}`, { replace: true });
      // Refresh progress to show enrollment
      setTimeout(() => {
        if (isAuthenticated) fetchProgress();
      }, 1000);
    } else if (paymentStatus === 'cancelled') {
      showToast('Payment was cancelled. You can try again anytime.', 'info');
      searchParams.delete('payment');
      navigate(`/courses/${id}`, { replace: true });
    }

    // Real-time subscription for progress and enrollment updates
    if (isAuthenticated && user?.id) {
      const progressChannel = supabase
        .channel('course_progress_realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'progress',
          filter: `course_id=eq.${id}`
        }, (payload) => {
          console.log('Progress updated:', payload);
          fetchProgress();
        })
        .subscribe();

      const enrollmentChannel = supabase
        .channel('course_enrollment_realtime')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'enrollments',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Enrollment updated:', payload);
          if (payload.new.course_id === id) {
            fetchProgress();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(progressChannel);
        supabase.removeChannel(enrollmentChannel);
      };
    }
  }, [id, isAuthenticated, user?.id, course]);

  const fetchCourse = async () => {
    try {
      // Fetch course with lessons and quizzes from Supabase
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select(`
          *,
          lessons (*),
          quizzes (*)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Course fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log('Fetched course:', data);
      console.log('Lessons:', data.lessons);
      
      // Sort lessons by order_index
      if (data.lessons && data.lessons.length > 0) {
        data.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      }
      
      // Manually calculate ratings if columns don't exist
      const { data: ratingsData } = await supabase
        .from('course_ratings')
        .select('rating')
        .eq('course_id', id);
      
      if (ratingsData && ratingsData.length > 0) {
        const totalRatings = ratingsData.length;
        const sumRatings = ratingsData.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = sumRatings / totalRatings;
        
        data.average_rating = avgRating;
        data.total_ratings = totalRatings;
        
        console.log('Calculated ratings:', { avgRating, totalRatings });
      } else {
        data.average_rating = 0;
        data.total_ratings = 0;
      }
      
      setCourse(data);
    } catch (err) {
      const errorMessage = err.message?.includes('Failed to fetch') 
        ? 'Unable to connect to the server. Please check your internet connection or try again later.'
        : 'Failed to load course. Please try again.';
      setError(errorMessage);
      console.error('Course detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .single();

      if (!enrollment) {
        setProgress(null);
        return;
      }

      // For intermediate/advanced paid courses, verify payment
      const isPaidCourse = (course?.difficulty === 'intermediate' || course?.difficulty === 'advanced') && 
                          (course?.price > 0 || course?.price_cents > 0);
      
      if (isPaidCourse) {
        const { data: payment } = await supabase
          .from('payments')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .eq('status', 'completed')
          .single();

        if (!payment) {
          // Enrolled but not paid - remove enrollment
          setProgress(null);
          return;
        }
      }

      // Fetch progress from Supabase
      const { data: progressData, error } = await supabase
        .from('progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id)
        .eq('course_id', id);

      if (error) throw error;

      // Calculate progress
      const completedLessons = progressData?.filter(p => p.completed).map(p => p.lesson_id) || [];
      const totalLessons = course?.lessons?.length || 0;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

      setProgress({
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        percentage: progressPercentage
      });
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
  };

  const fetchUserRating = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('course_ratings')
        .select('rating')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setUserRating(data.rating);
      }
    } catch (err) {
      console.error('Error fetching user rating:', err);
    }
  };

  const handleRating = async (rating) => {
    if (!isAuthenticated || !user) {
      alert('Please login to rate this course');
      return;
    }

    console.log('Submitting rating:', rating, 'for course:', id);
    setSubmittingRating(true);
    try {
      const { data, error } = await supabase
        .from('course_ratings')
        .upsert({
          course_id: id,
          user_id: user.id,
          rating: rating
        }, {
          onConflict: 'course_id,user_id'
        })
        .select();

      if (error) {
        console.error('Rating error:', error);
        throw error;
      }

      console.log('Rating saved:', data);
      setUserRating(rating);
      
      // Refresh course to get updated ratings
      console.log('Fetching updated course data...');
      await fetchCourse();
      
      alert('✅ Thank you for rating this course!');
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    setError('');

    try {
      const response = await paymentsAPI.createCheckout({ course_id: id });
      
      if (response.data.enrolled) {
        // Free course - enrolled directly
        await fetchProgress();
        setEnrolling(false);
        return;
      }

      // Paid course - redirect to Stripe
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll');
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
            <p className="text-xl text-red-600 dark:text-red-400 mb-2 font-semibold">Error Loading Course</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => {
                setError('');
                setLoading(true);
                fetchCourse();
              }}
              className="btn-secondary"
            >
              Try Again
            </button>
            <Link to="/courses" className="btn-primary">
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const priceDisplay = (course.price === 0 || course.price_cents === 0)
    ? 'Free' 
    : course.currency === 'INR'
      ? `₹${parseFloat(course.price || (course.price_cents / 100)).toFixed(0)}`
      : `$${((course.price || course.price_cents / 100)).toFixed(2)}`;

  const isEnrolled = progress !== null;
  const isIntermediate = course.difficulty === 'intermediate';
  const isAdvanced = course.difficulty === 'advanced';
  const isPaid = course.price > 0 || course.price_cents > 0;
  const needsPayment = (isIntermediate || isAdvanced) && isPaid && !isEnrolled;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Courses</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Thumbnail */}
              <div className="relative h-96 bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary rounded-xl mb-6 overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-32 w-32 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Title and Description */}
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              
              {course.category && (
                <span className="inline-block px-3 py-1 bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary rounded-full text-sm font-medium mb-4">
                  {course.category}
                </span>
              )}

              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                {course.description}
              </p>

              {/* Instructor */}
              {course.instructor && (
                <div className="flex items-center space-x-4 mb-8 p-4 bg-light-card dark:bg-dark-card rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary flex items-center justify-center text-white font-bold text-xl">
                    {course.instructor.name?.[0]?.toUpperCase() || 'I'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Instructor</p>
                    <p className="text-lg font-semibold">{course.instructor.name}</p>
                  </div>
                </div>
              )}

              {/* Instructor Profile */}
              {course.instructor_id && (
                <div className="mb-6">
                  <InstructorProfile instructorId={course.instructor_id} showFollowButton={true} />
                </div>
              )}

              {/* Lessons */}
              <div className="card mb-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <PlayCircle className="h-6 w-6 mr-2" />
                  Lessons ({course.lessons?.length || 0})
                </h2>
                {course.lessons && course.lessons.length > 0 ? (
                  <div className="space-y-2">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          {isEnrolled && progress?.completed_lessons?.includes(lesson.id) ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : needsPayment ? (
                            <Lock className="h-5 w-5 text-gray-400" />
                          ) : (
                            <PlayCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">
                              {index + 1}. {lesson.title}
                            </p>
                            {lesson.duration_seconds > 0 && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {Math.floor(lesson.duration_seconds / 60)} min
                              </p>
                            )}
                          </div>
                        </div>
                        {needsPayment ? (
                          <Lock className="h-5 w-5 text-gray-400" />
                        ) : isEnrolled ? (
                          <Link
                            to={`/courses/${id}/lesson/${lesson.id}`}
                            className="text-light-primary dark:text-dark-primary hover:underline"
                          >
                            Watch
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No lessons available yet.</p>
                )}
              </div>

              {/* Quizzes */}
              {course.quizzes && course.quizzes.length > 0 && (
                <div className="card">
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <FileQuestion className="h-6 w-6 mr-2" />
                    Quizzes ({course.quizzes.length})
                  </h2>
                  <div className="space-y-2">
                    {course.quizzes.map((quiz, index) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <FileQuestion className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="font-medium">{quiz.title}</p>
                            {quiz.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {quiz.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              {quiz.xp_reward && (
                                <span className="flex items-center">
                                  <Award className="h-3 w-3 mr-1" />
                                  {quiz.xp_reward} XP
                                </span>
                              )}
                              {quiz.passing_score && (
                                <span>Pass: {quiz.passing_score}%</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {needsPayment ? (
                          <Lock className="h-5 w-5 text-gray-400" />
                        ) : isEnrolled ? (
                          <Link
                            to={`/courses/${id}/quiz/${quiz.id}`}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            Take Quiz
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card sticky top-24"
            >
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-light-primary dark:text-dark-primary mb-2">
                  {priceDisplay}
                </p>
                {course.price_cents > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">One-time payment</p>
                )}
              </div>

              {/* Course Rating */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl font-bold">
                    {course.average_rating ? course.average_rating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({course.total_ratings || 0} {course.total_ratings === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
                
                {isEnrolled && (
                  <div className="mt-3">
                    <p className="text-xs text-center text-gray-600 dark:text-gray-400 mb-2">
                      {userRating > 0 ? 'Your rating:' : 'Rate this course:'}
                    </p>
                    <div className="flex justify-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          disabled={submittingRating}
                          className="transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= (hoverRating || userRating)
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {isEnrolled ? (
                <Link to={`/courses/${id}/lesson/${course.lessons?.[0]?.id}`} className="btn-primary w-full text-center block">
                  Continue Learning
                </Link>
              ) : needsPayment ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'Processing...' : 'Buy Now'}
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'Processing...' : 'Enroll Now'}
                </button>
              )}

              {/* Course Stats */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {course.lessons?.length || 0} lessons
                  </span>
                </div>
                
                {course.difficulty && (
                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {course.difficulty} level
                    </span>
                  </div>
                )}

                {isEnrolled && progress && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Progress</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage || 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {progress.percentage || 0}% complete ({progress.completed_lessons?.length || 0}/{progress.total_lessons || 0} lessons)
                    </p>
                  </div>
                )}

                {/* Course Certificate */}
                <CourseCertificate 
                  course={course}
                  progress={progress}
                  isEnrolled={isEnrolled}
                  needsPayment={needsPayment}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
