import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Trophy, Menu, X, Moon, Sun, Mail, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../lib/firebase';

const Navbar: React.FC = () => {
  const { userData, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  // Fetch user's profile picture
  useEffect(() => {
    const fetchUserProfilePicture = async () => {
      if (userData?.uid) {
        try {
          const userRef = ref(database, `users/${userData.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userdata = snapshot.val();
            setUserProfilePicture(userdata.profilePictureUrl || null);
          }
        } catch (error) {
          console.error('Error fetching user profile picture:', error);
        }
      }
    };

    fetchUserProfilePicture();
  }, [userData?.uid]);

  // Initialize theme on component mount
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = async () => {
    if (isThemeTransitioning) return;

    setIsThemeTransitioning(true);

    // Add theme transitioning class for smooth animations
    document.body.classList.add('theme-transitioning');

    // Add fade overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    document.body.appendChild(overlay);

    // Trigger fade animation
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Change theme during fade
    setTimeout(() => {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);

      const root = document.documentElement;
      const body = document.body;

      if (newTheme) {
        // Apply dark theme with exact Warp colors
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        body.style.backgroundColor = '#0A0A0A';
        body.style.color = '#ffffff';
        localStorage.setItem('theme', 'dark');
      } else {
        // Apply light theme
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#0f172a';
        localStorage.setItem('theme', 'light');
      }

      // Dispatch custom event for other components to listen
      window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newTheme } }));

      // Complete animation and cleanup
      setTimeout(() => {
        overlay.classList.add('complete');
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
          document.body.classList.remove('theme-transitioning');
          setIsThemeTransitioning(false);
        }, 400);
      }, 200);
    }, 200);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleLogoClick = () => {
    setIsMobileMenuOpen(false);
    // Navigate to appropriate dashboard based on user role
    if (userData?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleProfileClick = () => {
    setIsMobileMenuOpen(false);
    navigate(`/profile/${userData?.uid}`);
  };

  const handleLeaderboardClick = () => {
    setIsMobileMenuOpen(false);
    navigate('/leaderboard');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 sm:space-x-3 hover:opacity-70 transition-opacity"
          >
            <img src="/logo.png" alt="TestPad" className="h-7 w-7 sm:h-8 sm:w-8" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              TestPad
            </h1>
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle - First Position */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-all duration-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 group"
              disabled={isThemeTransitioning}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="h-5 w-5 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* About Link */}
            <a
              href="/about"
              className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300"></span>
            </a>

            {/* Contact Link */}
            <a
              href="/contact"
              className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
            >
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300"></span>
            </a>

            {currentUser ? (
              <>
                {/* Divider */}
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* Leaderboard (Students Only) */}
                {userData?.role === 'student' && (
                  <button
                    onClick={handleLeaderboardClick}
                    className="p-2.5 text-gray-600 hover:text-yellow-600 dark:text-gray-300 dark:hover:text-yellow-400 transition-all duration-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 group"
                    aria-label="Leaderboard"
                  >
                    <Trophy className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                )}

                {/* Profile Picture */}
                <div className="relative group">
                  {userProfilePicture ? (
                    <img
                      src={userProfilePicture}
                      alt={userData?.name}
                      className="h-9 w-9 rounded-full object-cover cursor-pointer ring-2 ring-purple-500 hover:ring-purple-600 transition-all duration-200 hover:scale-105"
                      onClick={handleProfileClick}
                    />
                  ) : (
                    <div
                      className="h-9 w-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:from-purple-600 hover:to-blue-600 transition-all duration-200 hover:scale-105 shadow-md"
                      onClick={handleProfileClick}
                    >
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-all duration-200 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 group"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              </>
            ) : (
              <>
                {/* Divider */}
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* Login Button */}
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
                >
                  Login
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:w-full transition-all duration-300"></span>
                </Link>

                {/* Signup Button */}
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 transform"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button and Profile */}
          <div className="md:hidden flex items-center space-x-3 z-[101]">
            {/* Profile Picture - Only visible for authenticated users on mobile */}
            {currentUser && (
              <>
                {userProfilePicture ? (
                  <img
                    src={userProfilePicture}
                    alt={userData?.name}
                    className="h-8 w-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleProfileClick}
                  />
                ) : (
                  <div
                    className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleProfileClick}
                  >
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </>
            )}

            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-14 sm:top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 z-50 transition-colors duration-300">
          <div className="px-3 sm:px-2 pt-3 sm:pt-2 pb-4 sm:pb-3 space-y-1">
            {/* User Info - Only for authenticated users */}
            {currentUser && (
              <div className="px-3 py-4 sm:py-3 border-b border-gray-200 dark:border-gray-700 mb-2">
                <div className="flex items-center space-x-3">
                  {userProfilePicture ? (
                    <img
                      src={userProfilePicture}
                      alt={userData?.name}
                      className="h-12 w-12 sm:h-10 sm:w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 sm:h-10 sm:w-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="h-7 w-7 sm:h-6 sm:w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{userData?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{userData?.role}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <button
              onClick={() => {
                window.location.href = '/about';
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Info className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
              About Us
            </button>

            <button
              onClick={() => {
                window.location.href = '/contact';
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Mail className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
              Contact Us
            </button>

            <button
              onClick={() => {
                toggleTheme();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={isThemeTransitioning}
            >
              <div className={`mr-3 transition-transform duration-300 ${isThemeTransitioning ? 'animate-spin' : ''}`}>
                {isDarkMode ? <Sun className="h-6 w-6 sm:h-5 sm:w-5" /> : <Moon className="h-6 w-6 sm:h-5 sm:w-5" />}
              </div>
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
                  Logout
                </button>

                <button
                  onClick={handleProfileClick}
                  className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
                  Profile
                </button>

                {userData?.role === 'student' && (
                  <button
                    onClick={handleLeaderboardClick}
                    className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Trophy className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
                    Leaderboard
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <User className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
                  Login
                </Link>

                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-left flex items-center px-4 sm:px-3 py-3 sm:py-2 rounded-md text-base font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-colors"
                >
                  <User className="mr-3 h-6 w-6 sm:h-5 sm:w-5" />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;