import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, Clock, ArrowLeft, MessageSquare, Loader, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Admin Support Messages Management - v2
export default function AdminSupport() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, resolved, closed
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    console.log('Filter changed to:', filter);
    fetchMessages();
    setSelectedMessage(null);
  }, [filter]);

  const fetchMessages = async () => {
    console.log('=== FETCHING MESSAGES ===');
    console.log('Current filter:', filter);
    
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filter
      if (filter && filter !== 'all') {
        console.log('Applying filter:', filter);
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} messages`);
      console.log('Messages:', data);
      
      setMessages(data || []);
    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (messageId, newStatus) => {
    console.log('=== UPDATING STATUS ===');
    console.log('Message ID:', messageId);
    console.log('New Status:', newStatus);
    console.log('Current Filter:', filter);
    
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select();

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }
      
      console.log('✅ Update successful:', data);
      
      // Close detail view immediately
      setSelectedMessage(null);
      
      // Fetch fresh data from database
      console.log('Fetching fresh data...');
      await fetchMessages();
      
      // Show success
      alert(`✅ Status updated to: ${newStatus.replace('_', ' ')}`);
      
    } catch (err) {
      console.error('❌ Error updating status:', err);
      alert('❌ Error: ' + err.message);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) return;
    
    setResponding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('support_messages')
        .update({ 
          admin_reply: response,
          status: 'resolved',
          replied_by: user?.id || null,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      alert('Response sent successfully!');
      setResponse('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (err) {
      console.error('Error sending response:', err);
      alert('Error: ' + err.message);
    } finally {
      setResponding(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    const icons = {
      pending: Clock,
      in_progress: MessageSquare,
      resolved: CheckCircle,
      closed: XCircle
    };

    const Icon = icons[status] || Clock;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {Icon && <Icon className="h-3 w-3" />}
        <span className="capitalize">{status === 'in_progress' ? 'In Progress' : status}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading support messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Support Messages
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage user support requests
              </p>
            </div>
            <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'in_progress', 'resolved', 'closed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchMessages()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Messages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No messages found
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedMessage?.id === msg.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {msg.subject}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {msg.name} • {msg.email}
                      </p>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {msg.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </motion.div>
              ))
            )}
          </div>

          {/* Message Detail */}
          {selectedMessage ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedMessage.subject}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    From: {selectedMessage.name} ({selectedMessage.email})
                  </p>
                </div>
                {getStatusBadge(selectedMessage.status)}
              </div>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              {selectedMessage.admin_reply && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Admin Response:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {selectedMessage.admin_reply}
                  </p>
                </div>
              )}

              {/* Response Form */}
              {selectedMessage.status === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Send Response
                    </label>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      className="input min-h-[120px]"
                      placeholder="Type your response..."
                    />
                  </div>
                  <button
                    onClick={handleSendResponse}
                    disabled={responding || !response.trim()}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{responding ? 'Sending...' : 'Send Response & Mark Resolved'}</span>
                  </button>
                </div>
              )}

              {/* Status Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Change Status:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'in_progress', 'resolved', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedMessage.id, status)}
                      disabled={selectedMessage.status === status}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        selectedMessage.status === status
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select a message to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
