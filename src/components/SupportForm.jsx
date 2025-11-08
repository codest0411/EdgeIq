import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupport } from '../contexts/SupportContext';

export default function SupportForm() {
  const { isOpen, openSupport, closeSupport } = useSupport();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const commonQuestions = [
    "How do I reset my password?",
    "I can't access my account",
    "How do I enroll in a course?",
    "Payment issues",
    "Technical problems with video playback",
    "How to become an instructor?",
    "Course content questions",
    "Certificate not received",
    "Other issue"
  ];

  const handleQuestionSelect = (question) => {
    setFormData(prev => ({ ...prev, subject: question }));
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('=== SUBMITTING SUPPORT MESSAGE ===');
    console.log('Form Data:', formData);

    try {
      // Validate
      if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id || 'Not logged in');

      // Prepare data
      const messageData = {
        user_id: user?.id || null,
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        status: 'pending',
        priority: 'normal'
      };

      console.log('Inserting message:', messageData);

      // Insert support message
      const { data: insertedData, error: insertError } = await supabase
        .from('support_messages')
        .insert(messageData)
        .select();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Message inserted successfully:', insertedData);

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      setTimeout(() => {
        setSuccess(false);
        closeSupport();
      }, 3000);

    } catch (err) {
      console.error('❌ Error submitting support message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Support Button */}
      <motion.button
        onClick={openSupport}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>

      {/* Support Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeSupport}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">Need Help?</h2>
                      <p className="text-purple-100 text-xs sm:text-sm">We're here to assist you</p>
                    </div>
                  </div>
                  <button
                    onClick={closeSupport}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {success ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Our support team will get back to you soon.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Common Questions */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                        Select Your Issue
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {commonQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuestionSelect(question)}
                            className={`text-left p-3 rounded-lg border-2 transition-all ${
                              formData.subject === question
                                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-400'
                            }`}
                          >
                            <span className="text-sm">{question}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Support Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="John Doe"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Brief description of your issue"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Message *
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows="5"
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Please describe your issue in detail..."
                          required
                        />
                      </div>

                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            <span>Send Message</span>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
