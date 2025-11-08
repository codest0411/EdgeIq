import { Link } from 'react-router-dom';
import { Clock, BookOpen, Star, FileQuestion } from 'lucide-react';
import { motion } from 'framer-motion';
import StripeCheckoutButton from './StripeCheckoutButton';

export default function CourseCard({ course }) {
  const priceDisplay = (course.price === 0 || course.price_cents === 0)
    ? 'Free' 
    : course.currency === 'INR'
      ? `₹${parseFloat(course.price || (course.price_cents / 100)).toFixed(0)}`
      : `$${parseFloat(course.price || (course.price_cents / 100)).toFixed(2)}`;

  const isIntermediate = course.difficulty === 'intermediate';
  const isAdvanced = course.difficulty === 'advanced';
  const isPaid = course.price > 0 || course.price_cents > 0;
  const showBuyButton = (isIntermediate || isAdvanced) && isPaid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card hover:shadow-xl transition-shadow duration-300"
    >
      <Link to={`/courses/${course.id}`}>
        {/* Thumbnail */}
        <div className="relative h-48 bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary rounded-lg mb-4 overflow-hidden">
          {(course.thumbnail_url || course.thumbnail) ? (
            <img
              src={course.thumbnail_url || course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="h-16 w-16 text-white opacity-50" />
            </div>
          )}
          
          {/* Difficulty Badge */}
          {course.difficulty && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium capitalize">
              {course.difficulty}
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          {/* Category */}
          {course.category && (
            <span className="text-xs font-medium text-light-primary dark:text-dark-primary uppercase tracking-wide">
              {course.category}
            </span>
          )}

          {/* Title */}
          <h3 className="text-xl font-bold mt-2 mb-2 line-clamp-2">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">
            {course.description || 'No description available'}
          </p>

          {/* Instructor */}
          {course.instructor && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary flex items-center justify-center text-white font-medium text-sm">
                {course.instructor.name?.[0]?.toUpperCase() || 'I'}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {course.instructor.name || 'Instructor'}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <BookOpen className="h-4 w-4" />
                <span>{course.lesson_count || 0} lessons</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileQuestion className="h-4 w-4" />
                <span>{course.quiz_count || 0} quizzes</span>
              </div>
            </div>
            
            <div className="text-lg font-bold text-light-primary dark:text-dark-primary">
              {priceDisplay}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Stripe Checkout Button for Intermediate/Advanced Paid Courses */}
      {showBuyButton && (
        <div onClick={(e) => e.stopPropagation()}>
          <StripeCheckoutButton course={course} />
        </div>
      )}
    </motion.div>
  );
}
