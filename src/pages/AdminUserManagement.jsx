import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, Mail, Shield, BookOpen, ArrowLeft, UserCheck, Moon, Sun, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  const [actionLoading, setActionLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const [userCount, setUserCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);

  useEffect(() => {
    fetchCounts();
    fetchData();
  }, [activeTab]);

  const fetchCounts = async () => {
    try {
      // Fetch user count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!usersError) {
        setUserCount(usersCount || 0);
      }

      // Fetch applications count
      const { count: appsCount, error: appsError } = await supabase
        .from('instructor_applications')
        .select('*', { count: 'exact', head: true });
      
      if (!appsError) {
        setApplicationCount(appsCount || 0);
      }
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'applications') {
        // Fetch all applications
        const { data, error } = await supabase
          .from('instructor_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Applications fetch error:', error);
          setApplications([]);
        } else {
          console.log('Applications:', data);
          setApplications(data || []);
        }
      } else {
        // Fetch all users
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, name, role, is_verified, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Users fetch error:', error);
          console.log('Error details:', error.message, error.code);
          // Try to show what we can
          setUsers([]);
          alert('Cannot load users. Please run FIX_ADMIN_ACCESS.sql in Supabase.\nError: ' + error.message);
        } else {
          console.log('Users fetched:', data);
          setUsers(data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createInstructorAccount = async (application) => {
    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: application.email,
      password: application.password_hash, // Use the password they provided
      options: {
        data: {
          name: application.full_name,
          role: 'instructor'
        }
      }
    });

    if (authError) {
      throw new Error('Failed to create account: ' + authError.message);
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: application.email,
        name: application.full_name,
        role: 'instructor'
      }, {
        onConflict: 'id'
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Profile error:', profileError);
    }

    // Update application with user_id
    const { error: updateError } = await supabase
      .from('instructor_applications')
      .update({ 
        user_id: authData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      throw new Error('Failed to update application');
    }

    return authData.user;
  };

  const handleApprove = async (applicationId) => {
    if (!confirm('Approve this instructor application? This will create a Supabase account.')) return;
    
    setActionLoading(true);
    try {
      // Get the application details
      const { data: application, error: appError } = await supabase
        .from('instructor_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      // Create account
      await createInstructorAccount(application);

      // Update status to approved
      const { error: statusError } = await supabase
        .from('instructor_applications')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (statusError) {
        throw new Error('Failed to update status');
      }

      alert('✅ Application approved! Instructor account created. They can now login with their email and password.');
      fetchCounts();
      fetchData();
      setActiveTab('users');
    } catch (err) {
      console.error('Approval error:', err);
      alert('❌ Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAccountForApproved = async (applicationId) => {
    if (!confirm('Create Supabase account for this already-approved instructor?')) return;
    
    setActionLoading(true);
    try {
      // Get the application details
      const { data: application, error: appError } = await supabase
        .from('instructor_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        throw new Error('Application not found');
      }

      if (application.user_id) {
        alert('⚠️ This instructor already has an account!');
        return;
      }

      // Create account
      await createInstructorAccount(application);

      alert('✅ Instructor account created! They can now login with their email and password.');
      fetchCounts();
      fetchData();
    } catch (err) {
      console.error('Create account error:', err);
      alert('❌ Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId) => {
    const notes = prompt('Reason for rejection (optional):');
    if (notes === null) return;
    
    setActionLoading(true);
    try {
      // Update status to rejected
      const { error } = await supabase
        .from('instructor_applications')
        .update({ 
          status: 'rejected',
          notes: notes || 'Application rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      alert('Application rejected.');
      fetchCounts();
      fetchData();
    } catch (err) {
      console.error('Rejection error:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!confirm(`Change user role to ${newRole}?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      alert('Role updated successfully.');
      fetchCounts();
      fetchData();
    } catch (err) {
      console.error('Role change error:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleVerification = async (userId, currentStatus) => {
    const action = currentStatus ? 'remove verification from' : 'verify';
    if (!confirm(`Are you sure you want to ${action} this instructor?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      alert(`Instructor ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
      fetchData();
    } catch (err) {
      console.error('Verification error:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Website Name */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Shield className="h-10 w-10 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    EdgeIQ
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Learning Management System
                  </p>
                </div>
              </div>
              <div className="border-l border-gray-300 dark:border-gray-600 pl-4 ml-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  User Management
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage users and instructor applications
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Instructor Applications ({applicationCount})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  All Users ({userCount})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {activeTab === 'applications' ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Instructor Applications
              </h2>
              {applications.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No applications found.</p>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {app.full_name}
                          </h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2" />
                              {app.email}
                            </div>
                            <div>
                              <strong>Expertise:</strong> {app.expertise}
                            </div>
                            <div>
                              <strong>Bio:</strong> {app.bio}
                            </div>
                            <div>
                              <strong>Status:</strong>{' '}
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  app.status === 'approved'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : app.status === 'rejected'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}
                              >
                                {app.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
                                disabled={actionLoading}
                                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(app.id)}
                                disabled={actionLoading}
                                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                          {app.status === 'approved' && !app.user_id && (
                            <button
                              onClick={() => handleCreateAccountForApproved(app.id)}
                              disabled={actionLoading}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Create Account
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                All Users
              </h2>
              {users.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : user.role === 'instructor'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {user.role}
                              </span>
                              {user.role === 'instructor' && user.is_verified && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <select
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                disabled={actionLoading}
                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Change Role
                                </option>
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                              </select>
                              {user.role === 'instructor' && (
                                <button
                                  onClick={() => toggleVerification(user.id, user.is_verified)}
                                  disabled={actionLoading}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    user.is_verified
                                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200'
                                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200'
                                  }`}
                                >
                                  {user.is_verified ? (
                                    <>
                                      <XCircle className="h-3 w-3 inline mr-1" />
                                      Unverify
                                    </>
                                  ) : (
                                    <>
                                      <Award className="h-3 w-3 inline mr-1" />
                                      Verify
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
