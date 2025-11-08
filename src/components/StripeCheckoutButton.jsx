import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from './ToastContainer';
import { supabase } from '../lib/supabase';

export default function StripeCheckoutButton({ course }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleCheckout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Please log in to purchase this course', 'warning');
        setLoading(false);
        return;
      }

      // Check if already enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();

      if (enrollment) {
        showToast('You are already enrolled in this course', 'info');
        setLoading(false);
        return;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Please log in to purchase this course', 'warning');
        setLoading(false);
        return;
      }

      // Create Stripe checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          course_id: course.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Checkout response:', data);

      if (data.url) {
        // Redirect to official Stripe Checkout page
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      
      // Better error handling
      let errorMessage = 'Failed to start checkout';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'Unable to connect to payment service. Please try again.';
      }
      
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full mt-3 btn btn-primary flex items-center justify-center space-x-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          <span>Buy Now</span>
        </>
      )}
    </button>
  );
}
