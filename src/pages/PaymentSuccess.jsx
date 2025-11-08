import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useToast } from '../components/ToastContainer';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const courseId = searchParams.get('course_id');

  useEffect(() => {
    showToast('Payment successful! You are now enrolled in the course.', 'success');
    
    // Redirect to course after 3 seconds
    const timer = setTimeout(() => {
      if (courseId) {
        navigate(`/courses/${courseId}`);
      } else {
        navigate('/dashboard');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [courseId, navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Thank you for your purchase. You have been enrolled in the course.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting you to the course...
        </p>
      </div>
    </div>
  );
}
