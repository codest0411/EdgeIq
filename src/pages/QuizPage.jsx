import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Award, ArrowLeft, Clock } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';

export default function QuizPage() {
  const { id: courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, course:courses(*)')
        .eq('id', quizId)
        .single();

      if (error) throw error;

      // Check if intermediate/advanced paid course and user is enrolled
      const isPaidCourse = data.course && 
                          (data.course.difficulty === 'intermediate' || data.course.difficulty === 'advanced') && 
                          (data.course.price > 0 || data.course.price_cents > 0);
      
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
            alert('Please purchase this course to take quizzes');
            navigate(`/courses/${courseId}`);
            return;
          }
        }
      }

      setQuiz(data);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      alert('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to submit quiz');
        return;
      }

      // Check if user already passed this quiz
      const { data: previousAttempts } = await supabase
        .from('quiz_attempts')
        .select('id, score, passed, xp_earned')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .eq('passed', true);

      const alreadyPassed = previousAttempts && previousAttempts.length > 0;

      // Calculate score
      const questions = quiz.questions;
      let correctCount = 0;
      
      questions.forEach((question, index) => {
        if (answers[index] === question.correct) {
          correctCount++;
        }
      });

      const calculatedScore = Math.round((correctCount / questions.length) * 100);
      const passed = calculatedScore >= (quiz.passing_score || 70);

      // Submit quiz attempt
      const { data: attemptData, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          score: calculatedScore,
          passed: passed,
          answers: JSON.stringify(answers)
        })
        .select()
        .single();

      if (error) throw error;

      setScore(calculatedScore);
      
      // Only show XP if this is first time passing
      if (alreadyPassed) {
        setXpEarned(0);
        alert('ℹ️ You already passed this quiz before. No additional XP awarded.');
      } else {
        setXpEarned(attemptData.xp_earned || 0);
      }
      
      setShowResults(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz not found</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;

  if (showResults) {
    const passed = score >= (quiz.passing_score || 70);
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center"
          >
            <div className="mb-6">
              {passed ? (
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2">
                {passed ? '🎉 Congratulations!' : '😔 Not Quite There'}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                You scored {score}%
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Score</p>
                  <p className="text-2xl font-bold">{score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">XP Earned</p>
                  <p className="text-2xl font-bold text-yellow-500 flex items-center justify-center">
                    <Award className="h-5 w-5 mr-1" />
                    {xpEarned}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/courses/${courseId}`)}
                className="btn-primary w-full"
              >
                Back to Course
              </button>
              {!passed && (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary w-full"
                >
                  Try Again
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Question {currentQuestion + 1} of {totalQuestions}</span>
            {quiz.xp_reward && (
              <span className="flex items-center">
                <Award className="h-4 w-4 mr-1" />
                {quiz.xp_reward} XP
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(currentQuestion, index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQuestion] === index
                    ? 'border-light-primary dark:border-dark-primary bg-light-primary/10 dark:bg-dark-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentQuestion] === index
                      ? 'border-light-primary dark:border-dark-primary bg-light-primary dark:bg-dark-primary'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {answers[currentQuestion] === index && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === totalQuestions - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== totalQuestions || submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                disabled={answers[currentQuestion] === undefined}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </motion.div>

        {/* Quiz Info */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Passing Score: {quiz.passing_score || 70}%</p>
          {quiz.description && <p className="mt-2">{quiz.description}</p>}
        </div>
      </div>
    </div>
  );
}
