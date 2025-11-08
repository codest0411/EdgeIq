import { GraduationCap, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSupport } from '../contexts/SupportContext';

export default function Footer() {
  const { openSupport } = useSupport();
  return (
    <footer className="bg-light-card dark:bg-dark-card border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="h-8 w-8 text-light-primary dark:text-dark-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary bg-clip-text text-transparent">
                EdgeIQ
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
             
            A smart learning platform built to help students reach their goals through personalized guidance, sharp insights, and courses that actually inspire growth.</p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/courses" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/assessments" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Assessments
                </Link>
              </li>
              <li>
                <Link to="/ai-interview" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  AI Interview
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-4">Features</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/kbc-game" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  XP Battle Game
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/become-instructor" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Become Instructor
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:support@edgeiq.com?subject=Support Request&body=Hi EdgeIQ Team,%0D%0A%0D%0AI need help with:%0D%0A%0D%0A[Please describe your issue here]%0D%0A%0D%0AThank you!"
                  className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </li>
              <li>
                <button 
                  onClick={openSupport}
                  className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Contact Us
                </button>
              </li>
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          {/* <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div> */}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} EdgeIQ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
