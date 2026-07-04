import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { Clock, Calendar, CheckCircle, XCircle, Trophy, Filter, ChevronDown, Sparkles } from 'lucide-react';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import TestCarousel from '../common/TestCarousel';
import Navbar from '../common/Navbar';
import { SkeletonDashboard } from '../common/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';

interface Test {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
  category?: string;
  testType?: 'programming' | 'mcq';
}

interface TestResult {
  score: number;
  totalQuestions: number;
  completedAt: string;
}

const Dashboard: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [completedTests, setCompletedTests] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { userData, currentUser } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
    fetchCompletedTests();
    fetchProfilePicture();
  }, [userData]);

  const fetchTests = async () => {
    try {
      const testsRef = ref(database, 'tests');
      const programmingTestsRef = ref(database, 'programmingTests');

      const [testsSnapshot, programmingTestsSnapshot] = await Promise.all([
        get(testsRef),
        get(programmingTestsRef)
      ]);

      const allTests: Test[] = [];

      // Fetch regular MCQ tests
      if (testsSnapshot.exists()) {
        const testsData = testsSnapshot.val();
        const testsArray = Object.entries(testsData).map(([id, test]: [string, any]) => ({
          id,
          ...test
        }));
        allTests.push(...testsArray);
      }

      // Fetch programming tests
      if (programmingTestsSnapshot.exists()) {
        const programmingTestsData = programmingTestsSnapshot.val();
        const programmingTestsArray = Object.entries(programmingTestsData).map(([id, test]: [string, any]) => ({
          id,
          title: test.title,
          description: test.description,
          startTime: test.startTime,
          endTime: test.endTime,
          duration: test.timeLimit * 60, // Convert to minutes for consistency
          totalQuestions: test.totalTestCases,
          category: 'Programming',
          testType: 'programming' as const // Add marker to identify programming tests
        }));
        allTests.push(...programmingTestsArray);
      }

      setTests(allTests);
    } catch (error) {
      // Silently handle permission errors for unauthenticated users
      // Tests will remain empty and UI will show "No tests available"
      console.log('Could not fetch tests (may require authentication):', error);
    }
  };

  const fetchCompletedTests = async () => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    try {
      const responsesRef = ref(database, 'responses');
      const snapshot = await get(responsesRef);
      if (snapshot.exists()) {
        const allResponses = snapshot.val();
        const userCompletedTests: Record<string, TestResult> = {};

        Object.entries(allResponses).forEach(([testId, testResponses]: [string, any]) => {
          if (testResponses[userData.uid]) {
            userCompletedTests[testId] = testResponses[userData.uid];
          }
        });

        setCompletedTests(userCompletedTests);
      }
    } catch (error) {
      console.error('Error fetching completed tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test: Test) => {
    const now = Date.now();
    let startTime, endTime;

    try {
      // Handle both ISO string and datetime-local format
      startTime = new Date(test.startTime).getTime();
      endTime = new Date(test.endTime).getTime();

      // Validate the parsed times
      if (isNaN(startTime) || isNaN(endTime)) {
        console.warn(`Invalid date format for test ${test.id}:`, { startTime: test.startTime, endTime: test.endTime });
        return 'expired'; // Default to expired for invalid dates
      }
    } catch (error) {
      console.error(`Error parsing dates for test ${test.id}:`, error);
      return 'expired';
    }

    // Debug logging for time comparison
    console.log(`Test ${test.id} time check:`, {
      now: new Date(now).toISOString(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      nowMs: now,
      startMs: startTime,
      endMs: endTime
    });

    if (completedTests[test.id]) {
      return 'completed';
    } else if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'active';
    } else {
      return 'expired';
    }
  };

  // Fetch profile picture used in Navbar, show same on dashboard
  const fetchProfilePicture = async () => {
    try {
      if (!userData?.uid) return;
      const userRef = ref(database, `users/${userData.uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfilePictureUrl(data.profilePictureUrl || null);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
  };

  // Handle test card click with auth check
  const handleTestClick = (testId: string, status: string, testType?: string) => {
    if (!currentUser) {
      // Store the intended destination and redirect to login
      const route = testType === 'programming' ? `/programming-test/${testId}` : `/test/${testId}`;
      sessionStorage.setItem('returnUrl', route);
      navigate('/login');
      return;
    }

    // User is authenticated, proceed with normal navigation
    if (status === 'active') {
      if (testType === 'programming') {
        navigate(`/programming-test/${testId}`);
      } else {
        navigate(`/test/${testId}`);
      }
    } else if (status === 'completed' && completedTests[testId]) {
      navigate(`/result/${testId}`);
    }
  };

  // Filter tests by category
  const filteredTests = selectedCategory === 'All' ? tests : tests.filter(test => test.category === selectedCategory);

  // Get unique categories for filter
  const allCategories = Array.from(new Set(tests.map(test => test.category).filter(Boolean) as string[])).sort();

  const upcomingTests = filteredTests.filter(test => getTestStatus(test) === 'upcoming');
  const activeTests = filteredTests.filter(test => getTestStatus(test) === 'active');
  const completedTestsList = filteredTests.filter(test => getTestStatus(test) === 'completed');
  const expiredTests = filteredTests.filter(test => getTestStatus(test) === 'expired');

  // Calculate average percentage score based only on completed (attended) tests
  const averageScore = (() => {
    if (completedTestsList.length === 0) {
      return '0';
    }

    // Calculate percentage for each completed test and then average them
    const percentages = completedTestsList.map(test => {
      const result = completedTests[test.id];
      if (!result || result.totalQuestions === 0) {
        return 0;
      }
      return (result.score / result.totalQuestions) * 100;
    });

    const totalPercentage = percentages.reduce((sum, percentage) => sum + percentage, 0);
    const averagePercentage = totalPercentage / percentages.length;

    return averagePercentage.toFixed(1);
  })();

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 page-enter">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 card-modern p-4 sm:p-6 glass card-fade-in">
          {currentUser ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center flex-shrink-0 float-animation overflow-hidden bg-gray-100">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt={userData?.name || 'Profile'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-full w-full gradient-animated flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-bold text-white">
                      {userData?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold gradient-warp leading-tight">
                  <span className="block sm:inline">Welcome back,</span>{' '}
                  <span className="block sm:inline break-all sm:break-normal whitespace-normal">{userData?.name}</span>
                </h1>
                <div className="text-slate-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium text-xs sm:text-base">
                  <div className="sm:inline truncate sm:break-normal">{userData?.department}</div>
                  <span className="hidden sm:inline mx-2">•</span>
                  <div className="sm:inline text-xs sm:text-sm break-all sm:break-normal font-mono">{userData?.registrationNumber}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold gradient-warp leading-tight mb-4">
                Welcome to TestPad
              </h1>
              <p className="text-slate-600 dark:text-gray-300 text-sm sm:text-base md:text-lg mb-6">
                Your AI-powered adaptive testing platform. Browse available tests below.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Sign Up to Take Tests
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-mobile mb-6 sm:mb-8 stagger-children">
          <div className="card-modern p-3 sm:p-6 hover-lift">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Total Tests</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{tests.length}</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-3 sm:p-6 hover-lift">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{completedTestsList.length}</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-3 sm:p-6 hover-lift">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Active</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{activeTests.length}</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-3 sm:p-6 hover-lift">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Average Score</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{averageScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        {allCategories.length > 0 && (
          <div className="mb-6 flex justify-end animate-fadeInUp">
            <div className="relative">
              {/* Dropdown Trigger */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 shadow-lg hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 hover:scale-105 group"
              >
                <Filter className="h-4 w-4 text-blue-500 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px] text-left">
                  {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                  }`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden animate-slideDown">
                  <div className="py-2">
                    {/* All Categories Option */}
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-all duration-150 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 flex items-center space-x-3 ${selectedCategory === 'All' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <span className="text-lg">📊</span>
                      <span className="font-medium">All Categories</span>
                    </button>

                    {/* Category Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent mx-2 my-1"></div>

                    {/* Category Options */}
                    {allCategories.map((category) => {
                      const getCategoryIcon = (cat: string) => {
                        switch (cat) {
                          case 'Quantitative Aptitude': return '📊';
                          case 'Verbal': return '📚';
                          case 'Logical Reasoning': return '🧩';
                          case 'Technical MCQs': return '⚙️';
                          case 'Programming': return '💻';
                          default: return '📜';
                        }
                      };

                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-all duration-150 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 flex items-center space-x-3 hover:translate-x-1 ${selectedCategory === category ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <span className="text-lg">{getCategoryIcon(category)}</span>
                          <span className="font-medium">{category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overlay to close dropdown */}
              {dropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                ></div>
              )}
            </div>
          </div>
        )}

        {/* Active Tests Carousel */}
        <TestCarousel
          tests={activeTests}
          status="active"
          completedTests={completedTests}
          title="Active Tests"
          icon={<Clock className="h-5 w-5 text-orange-600 mr-2" />}
          onTestClick={handleTestClick}
        />

        {/* Upcoming Tests Carousel */}
        <TestCarousel
          tests={upcomingTests}
          status="upcoming"
          completedTests={completedTests}
          title="Upcoming Tests"
          icon={<Calendar className="h-5 w-5 text-blue-600 mr-2" />}
          onTestClick={handleTestClick}
        />

        {/* Completed Tests Carousel */}
        <TestCarousel
          tests={completedTestsList}
          status="completed"
          completedTests={completedTests}
          title="Completed Tests"
          icon={<CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
          onTestClick={handleTestClick}
        />

        {/* Expired Tests Carousel */}
        <TestCarousel
          tests={expiredTests}
          status="expired"
          completedTests={completedTests}
          title="Expired Tests"
          icon={<XCircle className="h-5 w-5 text-red-600 mr-2" />}
          onTestClick={handleTestClick}
        />

        {tests.length === 0 && (
          <div className="text-center py-12 card-modern glass">
            <Calendar className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 float-animation" />
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">No tests available</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-md mx-auto">Check back later for new aptitude tests. We're constantly adding new challenges to help you grow!</p>
          </div>
        )}
      </div>

      {/* Practice with AI Floating Button */}
      <a
        href="https://optimum-five.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center space-x-2 px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 animate-fadeInUp btn-touch no-select"
        title="Practice with AI"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Practice with AI</span>
      </a>
    </div>
  );
};

export default Dashboard;