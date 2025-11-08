import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { progressAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastContainer';

export default function LessonViewer() {
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch lesson and course from Supabase
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (lessonError) {
        console.error('Lesson fetch error:', lessonError);
        throw lessonError;
      }
      
      console.log('Fetched lesson:', lessonData);
      console.log('Video URL:', lessonData.video_url_or_storage_path);
      
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          lessons:lessons(*)
        `)
        .eq('id', courseId)
        .single();
      
      if (courseError) {
        console.error('Course fetch error:', courseError);
        throw courseError;
      }

      // Check if intermediate/advanced paid course and user is enrolled
      const isPaidCourse = (courseData.difficulty === 'intermediate' || courseData.difficulty === 'advanced') && 
                          (courseData.price > 0 || courseData.price_cents > 0);
      
      if (isPaidCourse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();
          
          if (!enrollment) {
            setError('Please purchase this course to watch videos');
            setLoading(false);
            return;
          }
        }
      }
      
      // Sort lessons by order_index
      if (courseData.lessons) {
        courseData.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      }
      
      setLesson(lessonData);
      setCourse(courseData);
    } catch (err) {
      setError('Failed to load lesson');
      console.error('Lesson viewer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async () => {
    setMarkingComplete(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Please log in to mark lessons as complete', 'warning');
        return;
      }

      // Check if progress exists
      const { data: existingData } = await supabase
        .from('progress')
        .select('id, completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();
      
      const existing = existingData;

      // Check if already completed
      if (existing && existing.completed) {
        showToast('You already completed this lesson!', 'info');
        return;
      }

      let error;
      let isNewCompletion = false;
      
      if (existing) {
        // Update existing (mark as completed for first time)
        const result = await supabase
          .from('progress')
          .update({ completed: true })
          .eq('id', existing.id);
        error = result.error;
        isNewCompletion = true;
      } else {
        // Insert new
        const result = await supabase
          .from('progress')
          .insert({
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true
          });
        error = result.error;
        isNewCompletion = true;
      }

      if (error) throw error;

      if (isNewCompletion) {
        showToast('Lesson completed! +50 XP earned', 'success');
      }
      
      // Move to next lesson if available
      const currentIndex = course.lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < course.lessons.length - 1) {
        const nextLesson = course.lessons[currentIndex + 1];
        navigate(`/courses/${courseId}/lesson/${nextLesson.id}`);
      } else {
        // Last lesson - go back to course
        navigate(`/courses/${courseId}`);
      }
    } catch (err) {
      console.error('Failed to mark as complete:', err);
      showToast('Failed to mark as complete: ' + err.message, 'error');
    } finally {
      setMarkingComplete(false);
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    
    // Check if it's a YouTube video ID (11 characters, no special chars)
    if (lesson.youtube_video_id) {
      return `https://www.youtube.com/embed/${lesson.youtube_video_id}`;
    }
    
    // YouTube URL
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // Direct video URL (uploaded videos from Supabase Storage)
    return url;
  };

  const isUploadedVideo = (url) => {
    // Check if it's an uploaded video (not YouTube/Vimeo)
    if (!url) return false;
    if (lesson.youtube_video_id) return false;
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Lesson not found'}</p>
          <Link to={`/courses/${courseId}`} className="btn-primary">
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const currentIndex = course.lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? course.lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < course.lessons.length - 1 ? course.lessons[currentIndex + 1] : null;
  const embedUrl = getVideoEmbedUrl(lesson.video_url_or_storage_path);

  return (
    <div className="min-h-screen bg-black">
      {/* Video Player */}
      <div className="max-w-7xl mx-auto">
        <div className="aspect-video bg-black">
          {embedUrl ? (
            isUploadedVideo(lesson.video_url_or_storage_path) ? (
              // HTML5 video player for uploaded videos
              <video
                controls
                className="w-full h-full"
                controlsList="nodownload"
              >
                <source src={embedUrl} type="video/mp4" />
                <source src={embedUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            ) : (
              // iframe for YouTube/Vimeo
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Video not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Info */}
      <div className="bg-light-bg dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Breadcrumb */}
            <div className="mb-4">
              <Link
                to={`/courses/${courseId}`}
                className="text-light-primary dark:text-dark-primary hover:underline"
              >
                ← Back to {course.title}
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                {prevLesson && (
                  <Link
                    to={`/courses/${courseId}/lesson/${prevLesson.id}`}
                    className="btn-outline flex items-center space-x-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Link>
                )}
              </div>

              <button
                onClick={markAsComplete}
                disabled={markingComplete}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{markingComplete ? 'Saving...' : 'Mark as Complete'}</span>
              </button>

              <div className="flex items-center space-x-4">
                {nextLesson && (
                  <Link
                    to={`/courses/${courseId}/lesson/${nextLesson.id}`}
                    className="btn-outline flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Lesson List */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Course Content</h2>
              <div className="space-y-2">
                {course.lessons.map((l, index) => (
                  <Link
                    key={l.id}
                    to={`/courses/${courseId}/lesson/${l.id}`}
                    className={`block p-3 rounded-lg transition-colors ${
                      l.id === lessonId
                        ? 'bg-light-primary/10 dark:bg-dark-primary/10 border-2 border-light-primary dark:border-dark-primary'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium">
                      {index + 1}. {l.title}
                    </p>
                    {l.duration_seconds > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.floor(l.duration_seconds / 60)} min
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
