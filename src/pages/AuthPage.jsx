import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, GraduationCap, Shield, Mail, Lock, ArrowLeft, Eye, EyeOff, BookOpen, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import SupportForm from '../components/SupportForm';

export default function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('user'); // user, instructor, admin
  const [mode, setMode] = useState('login'); // login, signup (only for user)
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMode('login');
    setError('');
    setSuccess('');
    setShowForgotPassword(false);
    setFormData({ email: '', password: '', name: '', confirmPassword: '' });
  };

  // User Login (with email confirmation check)
  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (signInError) {
        // Check if it's email not confirmed error
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('❌ Email not confirmed. Please check your email and click the confirmation link.');
        }
        throw signInError;
      }

      // Check user role - only students allowed
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        await supabase.auth.signOut();
        setError('❌ Database error. Please run CLEAN_AUTH_SETUP.sql in Supabase.');
        setLoading(false);
        return;
      }

      if (!profile) {
        // Try to create profile for this user
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || '',
            role: 'student'
          });
        
        if (createError) {
          console.error('Failed to create profile on login:', createError);
          await supabase.auth.signOut();
          setError('❌ Profile not found. Please run SIMPLE_FIX_AUTH.sql in Supabase.');
          setLoading(false);
          return;
        }
        
        // Profile created, continue login
        console.log('Profile created on login');
      }

      if (profile.role === 'instructor' || profile.role === 'admin') {
        await supabase.auth.signOut();
        setError(`❌ This account is registered as ${profile.role}. Please use the ${profile.role === 'instructor' ? 'Instructor' : 'Admin'} login tab.`);
        setLoading(false);
        return;
      }

      // Login successful - redirect to dashboard
      console.log('Login successful, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  // User Signup (with email confirmation)
  const handleUserSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'student'
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (signUpError) throw signUpError;

      // Create profile - try multiple times if needed
      if (data.user) {
        let profileCreated = false;
        let attempts = 0;
        
        while (!profileCreated && attempts < 3) {
          attempts++;
          
          // Wait a bit for trigger
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
          
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle();

          if (existingProfile) {
            profileCreated = true;
            break;
          }
          
          // Try to create manually
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: formData.email,
              name: formData.name,
              role: 'student'
            });
          
          if (!profileError) {
            profileCreated = true;
          } else {
            console.log(`Profile creation attempt ${attempts} failed:`, profileError);
          }
        }
        
        if (!profileCreated) {
          console.error('Failed to create profile after 3 attempts');
          // Don't throw error, user can still login and we'll create profile then
        }
      }

      // Show success message - user needs to confirm email
      setSuccess('✅ Account created! Please check your email to confirm your account before logging in.');
      setFormData({ email: '', password: '', name: '', confirmPassword: '' });
      
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Instructor Login
  const handleInstructorLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('❌ Email not confirmed. Please check your email and click the confirmation link.');
        }
        throw signInError;
      }

      // Check user role - only instructors allowed
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        await supabase.auth.signOut();
        setError('❌ Database error. Please run CLEAN_AUTH_SETUP.sql in Supabase.');
        setLoading(false);
        return;
      }

      if (!profile) {
        // Try to create profile for this user
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || '',
            role: 'student' // Default to student, they need to apply for instructor
          });
        
        if (createError) {
          console.error('Failed to create profile on login:', createError);
          await supabase.auth.signOut();
          setError('❌ Profile not found. Please run SIMPLE_FIX_AUTH.sql in Supabase.');
          setLoading(false);
          return;
        }
        
        // Profile created but as student
        await supabase.auth.signOut();
        setError('❌ This account is not registered as an instructor. Please apply via "Become an Instructor".');
        setLoading(false);
        return;
      }

      if (profile.role !== 'instructor') {
        // Check if user has a rejected application
        const { data: application } = await supabase
          .from('instructor_applications')
          .select('status, admin_notes')
          .eq('user_id', data.user.id)
          .maybeSingle();

        await supabase.auth.signOut();
        
        if (application && application.status === 'rejected') {
          // Show rejection message with admin notes
          let rejectionMsg = '❌ Your instructor application was rejected.';
          if (application.admin_notes) {
            rejectionMsg += `\n\nReason: ${application.admin_notes}`;
          }
          rejectionMsg += '\n\nPlease contact support if you have questions.';
          setError(rejectionMsg);
        } else if (profile && profile.role === 'student') {
          // Check if they have a pending application
          if (application && application.status === 'pending') {
            setError('⏳ Your instructor application is pending review. Please wait for admin approval.');
          } else {
            setError('❌ This account is registered as a student. Please apply via "Become an Instructor" to become an instructor.');
          }
        } else if (profile && profile.role === 'admin') {
          setError('❌ This account is registered as admin. Please use the Admin login tab.');
        } else {
          setError('❌ This account is not registered as an instructor. Please apply via "Become an Instructor".');
        }
        setLoading(false);
        return;
      }

      // Instructor goes to instructor dashboard
      console.log('Instructor login successful');
      navigate('/instructor/dashboard', { replace: true });
    } catch (err) {
      console.error('Instructor login error:', err);
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  // Admin Login (env-based)
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      console.log('Admin login attempt:', formData.email);
      console.log('API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        })
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        console.error('Login failed:', data.error);
        setError(data.error || 'Invalid admin credentials');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        console.log('Login successful, setting localStorage');
        // Set localStorage
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('isAdmin', 'true');
        
        // Wait a moment to ensure localStorage is set, then navigate
        setTimeout(() => {
          console.log('Navigating to /admin');
          navigate('/admin');
        }, 100);
      } else {
        console.error('Invalid response format:', data);
        setError('Invalid admin credentials');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      // Use environment variable for production, fallback to current origin
      const redirectUrl = import.meta.env.VITE_APP_URL 
        ? `${import.meta.env.VITE_APP_URL}/reset-password`
        : `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      setSuccess('Password reset link sent to your email!');
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'user', label: 'Student', icon: User },
    { id: 'instructor', label: 'Instructor', icon: GraduationCap },
    { id: 'admin', label: 'Admin', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Top Bar - Logo and Back */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">EdgeIQ</h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Role Selection Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Title */}
                <h2 className="text-xl font-bold mb-1 text-center">
                  {showForgotPassword ? 'Reset Password' : 
                   activeTab === 'user' && mode === 'signup' ? 'Create Account' :
                   `${tabs.find(t => t.id === activeTab)?.label} Login`}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-4">
                  {showForgotPassword ? 'Enter your email to receive a reset link' :
                   activeTab === 'user' && mode === 'signup' ? 'Sign up to start learning' :
                   activeTab === 'instructor' ? 'Login with your instructor credentials' :
                   activeTab === 'admin' ? 'Admin access only' :
                   'Welcome back! Please login to continue'}
                </p>

                {/* Admin Warning */}
                {activeTab === 'admin' && !showForgotPassword && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-800 dark:text-red-300 mb-1">
                          ⚠️ Restricted Access
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          This section is for authorized administrators only. Unauthorized access attempts are logged and monitored. If you are not an admin, please use the Student or Instructor login tabs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-300 rounded-lg text-sm">
                      {error}
                    </div>
                    {error.includes('contact support') || error.includes('Database error') || error.includes('Profile not found') ? (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Need help? Click the support button in the bottom-right corner.
                      </p>
                    ) : null}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-300 rounded-lg text-sm">
                    {success}
                  </div>
                )}

                {/* Forgot Password Form */}
                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input pl-10"
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      Back to Login
                    </button>
                  </form>
                ) : (
                  /* Login/Signup Forms */
                  <form
                    onSubmit={
                      activeTab === 'user' && mode === 'signup' ? handleUserSignup :
                      activeTab === 'user' ? handleUserLogin :
                      activeTab === 'instructor' ? handleInstructorLogin :
                      handleAdminLogin
                    }
                    className="space-y-4"
                  >
                    {/* Name field (signup only) */}
                    {activeTab === 'user' && mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="input"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    )}

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input pl-10"
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="input pl-10 pr-10"
                          placeholder="••••••••"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password (signup only) */}
                    {activeTab === 'user' && mode === 'signup' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="input pl-10"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Forgot Password Link (user login only) */}
                    {activeTab === 'user' && mode === 'login' && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? 'Please wait...' : 
                       activeTab === 'user' && mode === 'signup' ? 'Create Account' : 'Login'}
                    </button>

                    {/* Toggle Login/Signup (user only) */}
                    {activeTab === 'user' && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login');
                            setError('');
                            setFormData({ email: '', password: '', name: '', confirmPassword: '' });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                        </button>
                      </div>
                    )}

                    {/* Instructor Application Link */}
                    {activeTab === 'instructor' && (
                      <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Not an instructor yet?
                          (for testing purpose only use this id pass)
                          (totalhacking770@gmail.com , Chirag@00 )
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/become-instructor')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Apply to Become an Instructor →
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Support Form Button */}
      <SupportForm />
    </div>
  );
}
