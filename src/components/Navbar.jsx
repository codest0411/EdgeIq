import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X, GraduationCap, User, LogOut, Video, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Check if current page is admin
  const isAdminPage = window.location.pathname.startsWith('/admin');
  const isAdminLoggedIn = localStorage.getItem('isAdmin') === 'true';

  const handleSignOut = async () => {
    try {
      // Check if admin logout
      const isAdmin = localStorage.getItem('isAdmin');
      if (isAdmin === 'true') {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminUser');
        navigate('/auth');
      } else {
        await signOut();
        navigate('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-light-card dark:bg-dark-card shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-light-primary dark:text-dark-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary bg-clip-text text-transparent">
              EdgeIQ
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated && !isAdminPage && (
              <>
                <Link to="/dashboard" className="text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Dashboard
                </Link>
                <Link to="/courses" className="text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Courses
                </Link>
                <Link to="/assessments" className="flex items-center space-x-1 text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>Assessments</span>
                </Link>
                <Link to="/kbc-game" className="text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Games
                </Link>
                <Link to="/leaderboard" className="text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Leaderboard
                </Link>
                <Link to="/profile" className="text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                  Profile
                </Link>
              </>
            )}
            
            {(isAuthenticated || isAdminLoggedIn) ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-light-text dark:text-dark-text hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="btn-primary">
                  Login
                </Link>
              </>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-4 space-y-3">
            {isAuthenticated && !isAdminPage && (
              <>
                <Link
                  to="/dashboard"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/courses"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Courses
                </Link>
                <Link
                  to="/assessments"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Assessments
                </Link>
                <Link
                  to="/kbc-game"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Games
                </Link>
                <Link
                  to="/leaderboard"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Leaderboard
                </Link>
                <Link
                  to="/profile"
                  className="block text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
            
            {(isAuthenticated || isAdminLoggedIn) ? (
              <>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-red-500 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="block btn-primary text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
