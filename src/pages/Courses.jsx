import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { coursesAPI } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchCourses();

    // Real-time subscription for course changes
    const coursesChannel = supabase
      .channel('courses_list_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
        console.log('Course list change detected:', payload);
        fetchCourses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(coursesChannel);
    };
  }, [category, difficulty, page]);

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    
    try {
      const itemsPerPage = 12;
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      console.log(`📄 Fetching page ${page}: items ${from} to ${to}`);
      
      // Fetch courses with lessons and quizzes count from Supabase
      let query = supabase
        .from('courses')
        .select(`
          *,
          lessons (id),
          quizzes (id)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (category) {
        query = query.eq('category', category);
      }
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) {
        console.error('Courses fetch error:', fetchError);
        throw fetchError;
      }
      
      // Add lesson and quiz counts to each course
      const coursesWithCounts = (data || []).map(course => ({
        ...course,
        lesson_count: course.lessons?.length || 0,
        quiz_count: course.quizzes?.length || 0
      }));
      
      console.log('Fetched courses:', coursesWithCounts);
      console.log('Total courses:', count);
      
      setCourses(coursesWithCounts);
      setPagination({
        total: count,
        page: page,
        totalPages: Math.ceil((count || 0) / 12)
      });
    } catch (err) {
      setError('Failed to load courses');
      console.error('Courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase()) ||
    course.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore Courses
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Discover courses that match your learning goals
          </p>
        </motion.div>

        {/* Difficulty Level Tabs */}
        <div className="mb-8">
          <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => {
                setDifficulty('');
                setPage(1);
              }}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                difficulty === ''
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600'
              }`}
            >
              All Courses
            </button>
            <button
              onClick={() => {
                setDifficulty('beginner');
                setPage(1);
              }}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                difficulty === 'beginner'
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-green-600'
              }`}
            >
              🌱 Beginner
            </button>
            <button
              onClick={() => {
                setDifficulty('intermediate');
                setPage(1);
              }}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                difficulty === 'intermediate'
                  ? 'border-yellow-600 text-yellow-600 dark:text-yellow-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-yellow-600'
              }`}
            >
              📚 Intermediate
            </button>
            <button
              onClick={() => {
                setDifficulty('advanced');
                setPage(1);
              }}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                difficulty === 'advanced'
                  ? 'border-red-600 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-red-600'
              }`}
            >
              🚀 Advanced
            </button>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-12 w-full"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input w-full md:w-auto"
            >
              <option value="">All Categories</option>
              <option value="Programming">Programming</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Science">Data Science</option>
              <option value="Design">Design</option>
              <option value="Business">Business</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Courses Grid */}
        {!loading && !error && (
          <>
            {filteredCourses.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  No courses found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-12">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
