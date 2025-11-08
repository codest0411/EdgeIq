import { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SupportModal({ isOpen, onClose, errorMessage = '' }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    subject: 'Account Issue',
    message: errorMessage
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert support message
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user?.id || null,
          email: formData.email,
          name: formData.name,
          subject: formData.subject,
          message: formData.message,
          status: 'pending'
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ email: '', name: '', subject: 'Account Issue', message: '' });
      }, 2000);
    } catch (err) {
      console.error('Error sending support message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Contact Support
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We'll help you resolve this issue
            </p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Send className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Message Sent!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our team will review your message and respond soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
                required
              >
                <option value="Account Issue">Account Issue</option>
                <option value="Login Problem">Login Problem</option>
                <option value="Profile Error">Profile Error</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="input min-h-[120px]"
                placeholder="Describe your issue..."
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
