import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

export default function BecomeInstructor() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    country_code: '+91',
    phone: '',
    aadhar_number: '',
    bio: '',
    expertise: [],
    experience_years: '',
    linkedin_url: '',
    portfolio_url: '',
    teaching_motivations: []
  });

  const [aadharError, setAadharError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const expertiseOptions = [
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Machine Learning',
    'Artificial Intelligence',
    'Cloud Computing',
    'Cybersecurity',
    'DevOps',
    'UI/UX Design',
    'Digital Marketing',
    'Business',
    'Finance',
    'Photography',
    'Video Editing',
    'Music',
    'Languages',
    'Other'
  ];

  const teachingMotivationOptions = [
    'Share my knowledge and expertise',
    'Help others learn and grow',
    'Build a passive income stream',
    'Establish myself as an expert',
    'Give back to the community',
    'Improve my teaching skills',
    'Connect with students worldwide',
    'Create educational content',
    'Make a positive impact',
    'Flexible work schedule'
  ];

  const countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      checkExistingApplication();
    }
  }, [isAuthenticated]);

  const checkExistingApplication = async () => {
    try {
      const response = await api.get('/instructor-applications/my-application');
      if (response.data.application) {
        setExistingApplication(response.data.application);
      }
    } catch (err) {
      console.error('Error checking application:', err);
    }
  };

  const validateAadhar = (aadhar) => {
    // Remove spaces and dashes
    const cleaned = aadhar.replace(/[\s-]/g, '');
    
    // Check if it's exactly 12 digits
    if (cleaned.length === 0) {
      return '';
    }
    
    if (!/^\d+$/.test(cleaned)) {
      return 'Aadhar must contain only numbers';
    }
    
    if (cleaned.length !== 12) {
      return 'Aadhar must be exactly 12 digits';
    }
    
    // Check if all digits are the same (invalid)
    if (/^(\d)\1{11}$/.test(cleaned)) {
      return 'Invalid Aadhar number';
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Full Name - Only text (letters and spaces)
    if (name === 'full_name') {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }
    
    // Phone - Only 10 digits with space after 5th digit
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 10) {
        if (digitsOnly.length > 5) {
          formattedValue = digitsOnly.slice(0, 5) + ' ' + digitsOnly.slice(5, 10);
        } else {
          formattedValue = digitsOnly;
        }
      } else {
        return; // Don't allow more than 10 digits
      }
    }
    
    // Aadhar - Only 12 digits with space after every 4 digits
    if (name === 'aadhar_number') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 12) {
        const parts = [];
        for (let i = 0; i < digitsOnly.length; i += 4) {
          parts.push(digitsOnly.slice(i, i + 4));
        }
        formattedValue = parts.join(' ');
        const error = validateAadhar(digitsOnly);
        setAadharError(error);
      } else {
        return; // Don't allow more than 12 digits
      }
    }
    
    // Experience Years - Only 2 digits, no text
    if (name === 'experience_years') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 2) {
        formattedValue = digitsOnly;
      } else {
        return; // Don't allow more than 2 digits
      }
    }
    
    // LinkedIn URL - Optional validation
    if (name === 'linkedin_url' && value && !value.includes('linkedin.com')) {
      // Allow empty or valid LinkedIn URLs
      if (value.length > 0 && !value.startsWith('http')) {
        formattedValue = 'https://linkedin.com/in/' + value;
      }
    }
    
    // Portfolio URL - Optional validation
    if (name === 'portfolio_url' && value && value.length > 0 && !value.startsWith('http')) {
      formattedValue = 'https://' + value;
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleExpertiseToggle = (expertise) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(expertise)
        ? prev.expertise.filter(e => e !== expertise)
        : [...prev.expertise, expertise]
    }));
  };

  const handleMotivationToggle = (motivation) => {
    setFormData(prev => ({
      ...prev,
      teaching_motivations: prev.teaching_motivations.includes(motivation)
        ? prev.teaching_motivations.filter(m => m !== motivation)
        : [...prev.teaching_motivations, motivation]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);

    // Validation
    if (!formData.full_name || !formData.email || !formData.password || !formData.aadhar_number || !formData.bio) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate password
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirm_password) {
      setPasswordError('Passwords do not match');
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate Aadhar
    const aadharValidationError = validateAadhar(formData.aadhar_number);
    if (aadharValidationError) {
      setError(aadharValidationError);
      setAadharError(aadharValidationError);
      setLoading(false);
      return;
    }

    if (formData.expertise.length === 0) {
      setError('Please select at least one area of expertise');
      setLoading(false);
      return;
    }

    if (formData.teaching_motivations.length === 0) {
      setError('Please select at least one teaching motivation');
      setLoading(false);
      return;
    }

    try {
      // Use public endpoint (no authentication required)
      // Remove confirm_password before sending
      const { confirm_password, ...submitData } = formData;
      await api.post('/instructor-applications/apply-public', submitData);
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (existingApplication) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="text-center">
              {existingApplication.status === 'pending' && (
                <>
                  <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-4">Application Pending</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your instructor application is currently under review. We'll notify you once it's been processed.
                  </p>
                </>
              )}
              {existingApplication.status === 'approved' && (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-4">Application Approved!</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Congratulations! You're now an instructor. You can start creating courses.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-primary"
                  >
                    Go to Dashboard
                  </button>
                </>
              )}
              {existingApplication.status === 'rejected' && (
                <>
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-4">Application Not Approved</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Unfortunately, your application was not approved at this time.
                  </p>
                  {existingApplication.admin_notes && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-6">
                      <p className="text-sm font-semibold mb-2">Admin Notes:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {existingApplication.admin_notes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center"
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Application Submitted!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for applying to become an instructor. We'll review your application and contact you via email at <strong>{formData.email}</strong> with the next steps.
            </p>
            <p className="text-sm text-gray-500">Redirecting to homepage...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <GraduationCap className="h-16 w-16 text-light-primary dark:text-dark-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Become an Instructor</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Share your knowledge and inspire students worldwide. Join our community of expert instructors.
          </p>
        </motion.div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-xl font-bold mb-4">Personal Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                    placeholder="your.email@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your login email after approval
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters - you'll use this to login after approval
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="input"
                    placeholder="Re-enter your password"
                    required
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      className="input w-32"
                    >
                      {countryCodes.map(({ code, country, flag }) => (
                        <option key={code} value={code}>
                          {flag} {code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input flex-1"
                      placeholder="98765 43210"
                      maxLength="11"
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter 10 digit phone number (space added automatically after 5th digit)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Aadhar Card Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="aadhar_number"
                    value={formData.aadhar_number}
                    onChange={handleChange}
                    className={`input ${aadharError ? 'border-red-500' : ''}`}
                    placeholder="1234 5678 9012"
                    maxLength="14"
                    inputMode="numeric"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter 12 digit Aadhar number (spaces added automatically after every 4 digits)
                  </p>
                  {aadharError && (
                    <p className="text-red-500 text-sm mt-1">{aadharError}</p>
                  )}
                  {!aadharError && formData.aadhar_number && formData.aadhar_number.replace(/[\s-]/g, '').length === 12 && (
                    <p className="text-green-500 text-sm mt-1">✓ Valid Aadhar number</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your 12-digit Aadhar card number for identity verification
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Background */}
            <div>
              <h3 className="text-xl font-bold mb-4">Professional Background</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="input"
                    placeholder="Tell us about yourself, your background, and your experience..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Areas of Expertise <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {expertiseOptions.map(expertise => (
                      <label
                        key={expertise}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.expertise.includes(expertise)}
                          onChange={() => handleExpertiseToggle(expertise)}
                          className="rounded"
                        />
                        <span className="text-sm">{expertise}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="text"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                    className="input"
                    placeholder="5"
                    maxLength="2"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter years of teaching/professional experience (max 2 digits)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    LinkedIn Profile (Optional)
                  </label>
                  <input
                    type="text"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    className="input"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your LinkedIn profile URL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Portfolio/Website (Optional)
                  </label>
                  <input
                    type="text"
                    name="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={handleChange}
                    className="input"
                    placeholder="https://yourportfolio.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your portfolio or personal website URL
                  </p>
                </div>
              </div>
            </div>

            {/* Teaching Motivation */}
            <div>
              <h3 className="text-xl font-bold mb-4">Teaching Motivation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Why do you want to teach? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select all that apply
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teachingMotivationOptions.map(motivation => (
                      <label
                        key={motivation}
                        className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.teaching_motivations.includes(motivation)}
                          onChange={() => handleMotivationToggle(motivation)}
                          className="mt-1 rounded"
                        />
                        <span className="text-sm">{motivation}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
