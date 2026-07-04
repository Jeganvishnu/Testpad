import React, { useState, useEffect } from 'react';
import { ref, get, remove } from 'firebase/database';
import { Edit, Trash2, Calendar, Clock, Users, Eye, ChevronDown, ChevronRight, Search, Filter, X, XCircle } from 'lucide-react';
import { database } from '../../lib/firebase';
import EditTestModal from './EditTestModal';

interface Test {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
  createdAt: string;
  category?: string;
  type?: 'mcq' | 'programming';
}

interface TestManagementProps {
  onTestCreated: () => void;
}

const TestManagement: React.FC<TestManagementProps> = ({ onTestCreated }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [testResponses, setTestResponses] = useState<Record<string, number>>({});
  const [testScores, setTestScores] = useState<
    Record<string, { name: string; department: string; score: number }[]>
  >({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    fetchTests();
    fetchResponseCounts();
  }, []);

  const fetchTests = async () => {
    try {
      const testsRef = ref(database, 'tests');
      const programmingTestsRef = ref(database, 'programmingTests');

      const [testsSnap, programmingTestsSnap] = await Promise.all([
        get(testsRef),
        get(programmingTestsRef)
      ]);

      let combinedTests: Test[] = [];

      if (testsSnap.exists()) {
        const testsData = testsSnap.val();
        const mcqTests = Object.entries(testsData).map(([id, test]: [string, any]) => ({
          id,
          ...test,
          type: 'mcq'
        }));
        combinedTests = [...combinedTests, ...mcqTests];
      }

      if (programmingTestsSnap.exists()) {
        const progData = programmingTestsSnap.val();
        const progTests = Object.entries(progData).map(([id, test]: [string, any]) => ({
          id,
          title: test.title,
          description: test.description,
          startTime: test.startTime,
          endTime: test.endTime,
          duration: (new Date(test.endTime).getTime() - new Date(test.startTime).getTime()) / 60000,
          totalQuestions: test.testCases ? test.testCases.length : 0,
          createdAt: test.createdAt || new Date().toISOString(),
          category: 'Programming',
          type: 'programming' as 'programming'
        }));
        combinedTests = [...combinedTests, ...progTests];
      }

      combinedTests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTests(combinedTests);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseCounts = async () => {
    try {
      const responsesRef = ref(database, 'responses');
      const programmingSubmissionsRef = ref(database, 'programmingSubmissions');
      const usersRef = ref(database, 'users');

      const [responsesSnap, programmingSubmissionsSnap, usersSnap] = await Promise.all([
        get(responsesRef),
        get(programmingSubmissionsRef),
        get(usersRef)
      ]);

      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        const responseCounts: Record<string, number> = {};
        const scoreDetails: Record<string, { name: string; department: string; score: number }[]> = {};

        // Process MCQ Responses
        if (responsesSnap.exists()) {
          const responsesData = responsesSnap.val();
          Object.entries(responsesData).forEach(([testId, testRes]) => {
            const resEntries = Object.entries(testRes as Record<string, any>);
            responseCounts[testId] = resEntries.length;

            scoreDetails[testId] = resEntries.map(([userId, result]) => ({
              name: usersData[userId]?.name || 'Unknown',
              department: usersData[userId]?.department || 'Unknown',
              score: result.score || 0
            }));
          });
        }

        // Process Programming Submissions
        if (programmingSubmissionsSnap.exists()) {
          const progSubmissions = programmingSubmissionsSnap.val();
          Object.entries(progSubmissions).forEach(([testId, testSubs]) => {
            const subEntries = Object.entries(testSubs as Record<string, any>);
            responseCounts[testId] = subEntries.length;

            scoreDetails[testId] = subEntries.map(([userId, result]) => ({
              name: usersData[userId]?.name || 'Unknown',
              department: usersData[userId]?.department || 'Unknown',
              score: result.score || 0
            }));
          });
        }

        setTestResponses(responseCounts);
        setTestScores(scoreDetails);
      }
    } catch (error) {
      console.error('Error fetching response counts and scores:', error);
    }
  };

  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${testTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Starting delete process for test:', testId);

      // First, try to delete responses (admin should have access)
      try {
        console.log('Deleting responses...');
        await remove(ref(database, `responses/${testId}`));
        console.log('Responses deleted successfully');
      } catch (responseError) {
        console.log('Could not delete responses (might not exist):', responseError);
        // Continue anyway - responses might not exist
      }

      // Delete questions first
      try {
        console.log('Deleting questions...');
        await remove(ref(database, `questions/${testId}`));
        console.log('Questions deleted successfully');
      } catch (questionError) {
        console.error('Failed to delete questions:', questionError);
        throw new Error('Failed to delete questions. Check admin permissions.');
      }

      // Finally delete the test
      try {
        console.log('Deleting test...');

        // Check if it's a programming test or MCQ test based on some property, 
        // or just try to delete from both if we don't have the type passed here.
        // But better to use the type if we can pass it.
        // Since we don't have test type in arguments, we'll try to delete from both locations or check the test variable from state.

        const testToDelete = tests.find(t => t.id === testId);
        if (testToDelete?.type === 'programming') {
          await remove(ref(database, `programmingTests/${testId}`));
          // Also delete submissions
          await remove(ref(database, `programmingSubmissions/${testId}`));
        } else {
          await remove(ref(database, `tests/${testId}`));
        }

        console.log('Test deleted successfully');
      } catch (testError) {
        console.error('Failed to delete test:', testError);
        throw new Error('Failed to delete test. Check admin permissions.');
      }

      // Refresh the lists
      fetchTests();
      fetchResponseCounts();

      alert('Test deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting test:', error);

      // More specific error messages
      if (error.code === 'PERMISSION_DENIED') {
        alert('PERMISSION DENIED: Make sure you are logged in as an admin. Check Firebase rules and your user role.');
      } else {
        alert(`Failed to delete test: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const getTestStatus = (test: Test) => {
    const now = new Date().getTime();
    const startTime = new Date(test.startTime).getTime();
    const endTime = new Date(test.endTime).getTime();

    if (now < startTime) {
      return { status: 'upcoming', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'active', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else {
      return { status: 'expired', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  // Get unique categories for filter
  const allCategories = Array.from(new Set(tests.map(test => test.category).filter(Boolean))).sort();

  // Filter and search logic
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Category filter
    if (categoryFilter !== 'All' && test.category !== categoryFilter) return false;

    // Status filter
    if (statusFilter === 'All') return true;

    const { status } = getTestStatus(test);
    return status === statusFilter.toLowerCase();
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleTestExpansion = (testId: string) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  if (editingTestId) {
    return <EditTestModal testId={editingTestId} onClose={() => setEditingTestId(null)} onTestUpdated={() => {
      setEditingTestId(null);
      fetchTests();
    }} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto text-themed opacity-60"></div>
          <p className="mt-4 text-themed-secondary">Loading tests...</p>
        </div>
      </div>
    );
  }

  const allDepartments = Array.from(new Set(Object.values(testScores).flat().map(s => s.department))).sort();

  return (
    <div>
      {tests.length === 0 ? (
        <div className="text-center py-12 animate-fadeInUp">
          <Calendar className="mx-auto h-12 w-12 text-themed-secondary float-animation" />
          <h3 className="mt-4 text-lg font-medium text-themed">No tests created yet</h3>
          <p className="mt-2 text-themed-secondary">Create your first aptitude test to get started.</p>
        </div>
      ) : (
        <>
          {/* Search and Filters Section */}
          <div className="mb-6 space-y-4 animate-fadeInUp">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-themed-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input-modern block w-full pl-10 pr-3 py-2"
                placeholder="Search tests by name or description..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-300"
                >
                  <X className="h-5 w-5 text-themed-secondary hover:text-themed" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-themed-secondary" />
                <label className="text-sm font-medium text-themed">Category:</label>
                <select
                  className="form-input-modern px-3 py-1 text-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-themed">Status:</label>
                <select
                  className="form-input-modern px-3 py-1 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-themed">Department:</label>
                <select
                  className="form-input-modern px-3 py-1 text-sm"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="All">All</option>
                  {allDepartments.map((dept, index) => (
                    <option key={index} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Results Count */}
              <div className="text-sm text-themed-secondary">
                Showing {filteredTests.length} of {tests.length} tests
              </div>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <div className="text-center py-12 animate-fadeInUp">
              <Search className="mx-auto h-12 w-12 text-themed-secondary float-animation" />
              <h3 className="mt-4 text-lg font-medium text-themed">No tests found</h3>
              <p className="mt-2 text-themed-secondary">
                {searchQuery || statusFilter !== 'All'
                  ? 'Try adjusting your search or filters'
                  : 'No tests match your current filters'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTests.map(test => {
                const { status, color } = getTestStatus(test);
                const responseCount = testResponses[test.id] || 0;

                return (
                  <div key={test.id} className="card-modern p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{test.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {test.category && (
                              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50 text-purple-800 dark:text-purple-300">
                                {test.category === 'Quantitative Aptitude' && '📊'}
                                {test.category === 'Verbal' && '📚'}
                                {test.category === 'Logical Reasoning' && '🧩'}
                                {test.category === 'Technical MCQs' && '⚙️'}
                                {test.category === 'Programming' && '💻'}
                                <span className="ml-1">{test.category}</span>
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status === 'upcoming' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-300' :
                              status === 'active' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50 text-orange-800 dark:text-orange-300' :
                                'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300'
                              }`}>
                              {status === 'upcoming' && <Calendar className="h-3 w-3 mr-1" />}
                              {status === 'active' && <Clock className="h-3 w-3 mr-1" />}
                              {status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                              <span className="capitalize">{status}</span>
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{test.description}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 sm:mr-2 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <span className="truncate">{formatDate(test.startTime)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 sm:mr-2 text-green-500 dark:text-green-400 flex-shrink-0" />
                            <span>{Math.round(test.duration)} min</span>
                          </div>
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1 sm:mr-2 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                            <span>{test.totalQuestions} {test.type === 'programming' ? 'cases' : 'questions'}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 sm:mr-2 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                            <span>{responseCount} responses</span>
                          </div>
                        </div>

                        {/* Student Submissions Toggle */}
                        {testScores[test.id] && testScores[test.id].length > 0 && (
                          <div className="mt-4">
                            <button
                              onClick={() => toggleTestExpansion(test.id)}
                              className="flex items-center space-x-2 w-full text-left p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg transition-all duration-300"
                            >
                              {expandedTests.has(test.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                View Student Submissions ({testScores[test.id].filter(res => selectedDepartment === 'All' || res.department === selectedDepartment).length})
                              </span>
                            </button>

                            {/* Collapsible Student Scores */}
                            {expandedTests.has(test.id) && (
                              <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Student Scores</h4>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {testScores[test.id].filter(res => selectedDepartment === 'All' || res.department === selectedDepartment).length} submissions
                                  </span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  <div className="space-y-2">
                                    {testScores[test.id]
                                      .filter(res => selectedDepartment === 'All' || res.department === selectedDepartment)
                                      .sort((a, b) => b.score - a.score) // Sort by score descending
                                      .map((res, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300">
                                          <div className="flex items-center space-x-3">
                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                                              #{index + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <span className="font-medium text-gray-900 dark:text-white block truncate">{res.name}</span>
                                              <span className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">({res.department})</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2 flex-shrink-0">
                                            <span className="font-semibold text-gray-900 dark:text-white">{res.score} / {test.totalQuestions}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${Math.round((res.score / test.totalQuestions) * 100) >= 70
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                              : Math.round((res.score / test.totalQuestions) * 100) >= 50
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                              }`}>
                                              {Math.round((res.score / test.totalQuestions) * 100)}%
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingTestId(test.id)}
                          disabled={test.type === 'programming'}
                          className={`p-2 rounded-lg transition-all duration-300 ${test.type === 'programming' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                          title={test.type === 'programming' ? "Editing programming tests not supported yet" : "Edit test"}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id, test.title)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300"
                          title="Delete test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TestManagement;
