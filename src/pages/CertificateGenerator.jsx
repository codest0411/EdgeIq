import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Award, Calendar, BookOpen, User, CreditCard } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContainer';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CertificateGenerator() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [studentName, setStudentName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const certificateRef = useRef(null);

  // Check for payment success
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setHasPaid(true);
      showToast('Payment successful! You can now download your certificate.', 'success');
      searchParams.delete('payment');
      setSearchParams(searchParams);
    } else if (paymentStatus === 'cancelled') {
      showToast('Payment was cancelled. Please try again.', 'info');
      searchParams.delete('payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, showToast]);

  const handlePayment = async () => {
    if (!isAuthenticated) {
      showToast('Please login to purchase certificate generation', 'error');
      return;
    }

    if (!studentName.trim() || !courseName.trim()) {
      showToast('Please enter both student name and course name', 'error');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please login again.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-certificate-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          studentName: `${studentName}`,
          courseName: courseName,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('Checkout response:', data);

      if (!data.sessionId) {
        throw new Error('No session ID received from server');
      }

      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load. Please check your internet connection.');
      }

      console.log('Redirecting to checkout with sessionId:', data.sessionId);
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (error) {
        console.error('Stripe redirect error:', error);
        showToast(error.message, 'error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      showToast(error.message || 'Failed to process payment. Please try again.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const generatePDF = async () => {
    if (!studentName.trim() || !courseName.trim()) {
      alert('Please enter both student name and course name');
      return;
    }

    setIsGenerating(true);

    try {
      const element = certificateRef.current;
      
      // Capture the certificate as canvas
      const canvas = await html2canvas(element, {
        scale: 3, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Convert to image
      const imgData = canvas.toDataURL('image/png');

      // Create PDF (landscape A4)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download the PDF
      pdf.save(`${studentName.replace(/\s+/g, '_')}_Certificate.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg via-purple-50 to-pink-50 dark:from-dark-bg dark:via-slate-900 dark:to-indigo-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Award className="h-12 w-12 text-light-primary dark:text-dark-primary mr-3" />
            <h1 className="text-4xl sm:text-5xl font-bold">Certificate Generator</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Create your professional course completion certificate - Only ₹50!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <User className="h-6 w-6 mr-2 text-light-primary dark:text-dark-primary" />
              Certificate Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="label">Student Name *</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student name"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Course Name *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Enter course name"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label">Completion Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              {!hasPaid ? (
                <>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessingPayment || !studentName.trim() || !courseName.trim()}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 text-lg font-bold flex items-center justify-center gap-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Pay ₹50 to Generate Certificate
                      </>
                    )}
                  </button>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold">
                      💳 One-Time Payment Required
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Pay only ₹50 to generate and download your professional certificate
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={generatePDF}
                    disabled={isGenerating || !studentName.trim() || !courseName.trim()}
                    className="w-full btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        Download Certificate (PDF)
                      </>
                    )}
                  </button>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-300 font-semibold">
                      ✅ Payment Successful!
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                      You can now download your certificate
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Certificate Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h2 className="text-2xl font-bold mb-6">Preview</h2>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto">
              <div 
                ref={certificateRef}
                className="relative w-full aspect-[1.414/1] bg-white shadow-2xl"
                style={{ maxWidth: '800px', margin: '0 auto' }}
              >
                {/* Certificate Background Design */}
                <div className="absolute inset-0">
                  {/* Top Left Corner */}
                  <div className="absolute top-0 left-0 w-1/3 h-1/3">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-700 transform -skew-y-12 origin-top-left"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-500 transform -skew-y-12 origin-top-left" style={{ top: '8px', left: '8px' }}></div>
                  </div>

                  {/* Bottom Right Corner */}
                  <div className="absolute bottom-0 right-0 w-1/3 h-1/3">
                    <div className="absolute inset-0 bg-gradient-to-tl from-teal-600 to-teal-700 transform skew-y-12 origin-bottom-right"></div>
                    <div className="absolute inset-0 bg-gradient-to-tl from-yellow-400 to-yellow-500 transform skew-y-12 origin-bottom-right" style={{ bottom: '8px', right: '8px' }}></div>
                  </div>

                  {/* Best Award Badge */}
                  <div className="absolute top-8 right-12">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                      <div className="absolute inset-2 bg-teal-700 rounded-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-yellow-400 text-xs font-bold">BEST</div>
                          <div className="text-yellow-400 text-xs font-bold">AWARD</div>
                          <div className="flex justify-center gap-0.5 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-yellow-400 text-xs">★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-16 py-12">
                  <div className="text-center space-y-6 w-full">
                    {/* Title */}
                    <div>
                      <h1 className="text-5xl font-bold text-gray-800 tracking-wider">CERTIFICATE</h1>
                      <p className="text-xl text-gray-400 tracking-widest mt-2">OF EXCELLENCE</p>
                    </div>

                    {/* Presented To */}
                    <div className="mt-8">
                      <p className="text-sm font-semibold text-gray-700 tracking-wider">
                        THIS CERTIFICATE IS PROUDLY PRESENTED TO
                      </p>
                    </div>

                    {/* Student Name */}
                    <div className="my-8">
                      <p className="text-5xl font-serif text-teal-700 italic">
                        {studentName || 'Name Surname'}
                      </p>
                    </div>

                    {/* Course Description */}
                    <div className="max-w-2xl mx-auto">
                      <p className="text-sm text-gray-500 italic leading-relaxed">
                        For successfully completing the course <span className="font-semibold text-gray-700">{courseName || 'Course Name'}</span> and demonstrating exceptional dedication, commitment, and excellence in their learning journey.
                      </p>
                    </div>

                    {/* Date and Signature */}
                    <div className="flex justify-center gap-32 mt-12">
                      <div className="text-center">
                        <div className="border-t-2 border-gray-300 pt-2 px-8">
                          <p className="text-xs font-semibold text-gray-700 tracking-wider">DATE</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(completionDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-t-2 border-gray-300 pt-2 px-8">
                          <p className="text-xs font-semibold text-gray-700 tracking-wider">SIGNATURE</p>
                          <p className="text-sm text-gray-600 mt-1 font-serif italic">EdgeIQ Team</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
