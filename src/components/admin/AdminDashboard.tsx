import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { Plus, Users, FileText, BarChart3, Calendar, Clock, Shield, Code } from 'lucide-react';
import { database } from '../../lib/firebase';
import Navbar from '../common/Navbar';
import CreateTestModal from './CreateTestModal';
import CreateProgrammingTestModal from './CreateProgrammingTestModal';
import TestManagement from './TestManagement';
import ResultsView from './ResultsView';
import StudentListModal from './StudentListModal';
import AdminManagement from './AdminManagement';

interface Test {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
  type?: 'mcq' | 'programming';
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  registrationNumber: string;
}

const AdminDashboard: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'results' | 'admins'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateProgrammingModal, setShowCreateProgrammingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentList, setShowStudentList] = useState(false);
  const [studentProgress, setStudentProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch tests
      const testsRef = ref(database, 'tests');
      const programmingTestsRef = ref(database, 'programmingTests');

      const [testsSnap, programmingTestsSnap] = await Promise.all([
        get(testsRef),
        get(programmingTestsRef)
      ]);

      let allTests: Test[] = [];

      if (testsSnap.exists()) {
        const testsData = testsSnap.val();
        const testsArray = Object.entries(testsData).map(([id, test]: [string, any]) => ({
          id,
          ...test,
          type: 'mcq' as 'mcq',
          totalQuestions: test.totalQuestions || 0
        }));
        allTests = [...allTests, ...testsArray];
      }

      if (programmingTestsSnap.exists()) {
        const progData = programmingTestsSnap.val();
        const progTests = Object.entries(progData).map(([id, test]: [string, any]) => ({
          id,
          title: test.title,
          startTime: test.startTime,
          endTime: test.endTime,
          duration: (new Date(test.endTime).getTime() - new Date(test.startTime).getTime()) / 60000,
          totalQuestions: test.testCases ? test.testCases.length : 0,
          type: 'programming' as 'programming'
        }));
        allTests = [...allTests, ...progTests];
      }

      setTests(allTests);

      // Fetch users count
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const studentUsers = Object.values(usersData).filter((user: any) => user.role === 'student');
        const studentCount = studentUsers.length;
        setTotalStudents(studentCount);

        // Fetch students array for the modal
        const studentsArray = Object.entries(usersData)
          .filter(([_, user]: [string, any]) => user.role === 'student')
          .map(([id, student]: [string, any]) => ({ id, ...student }));
        setStudents(studentsArray);
      }

      // Fetch responses count and student progress from responses
      const responsesRef = ref(database, 'responses');
      const programmingSubmissionsRef = ref(database, 'programmingSubmissions');

      const [responsesSnapshot, programmingSubmissionsSnapshot] = await Promise.all([
        get(responsesRef),
        get(programmingSubmissionsRef)
      ]);

      let totalCount = 0;
      const studentProgressData: Record<string, any> = {};

      if (responsesSnapshot.exists()) {
        const responsesData = responsesSnapshot.val();

        // Count total responses
        Object.values(responsesData).forEach((testResponses: any) => {
          totalCount += Object.keys(testResponses).length;
        });

        // Transform responses data to student-centric format for progress tracking
        Object.entries(responsesData).forEach(([testId, testResponses]: [string, any]) => {
          Object.entries(testResponses).forEach(([studentId, responseData]: [string, any]) => {
            if (!studentProgressData[studentId]) {
              studentProgressData[studentId] = {};
            }
            studentProgressData[studentId][testId] = responseData;
          });
        });
      }

      if (programmingSubmissionsSnapshot.exists()) {
        const progSubmissions = programmingSubmissionsSnapshot.val();

        // Count total responses
        Object.values(progSubmissions).forEach((testSubs: any) => {
          totalCount += Object.keys(testSubs).length;
        });

        // Add to student progress (might need adaptation depending on how StudentListModal uses it)
        Object.entries(progSubmissions).forEach(([testId, testSubs]: [string, any]) => {
          Object.entries(testSubs).forEach(([studentId, responseData]: [string, any]) => {
            if (!studentProgressData[studentId]) {
              studentProgressData[studentId] = {};
            }
            // Ensure unique key or handle merging if necessary
            studentProgressData[studentId][testId] = responseData;
          });
        });
      }

      setTotalResponses(totalCount);
      setStudentProgress(studentProgressData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveTests = () => {
    const now = new Date().getTime();
    return tests.filter(test => {
      const startTime = new Date(test.startTime).getTime();
      const endTime = new Date(test.endTime).getTime();
      return now >= startTime && now <= endTime;
    });
  };

  const getUpcomingTests = () => {
    const now = new Date().getTime();
    return tests.filter(test => {
      const startTime = new Date(test.startTime).getTime();
      return now < startTime;
    });
  };

  const getExpiredTests = () => {
    const now = new Date().getTime();
    return tests.filter(test => {
      const endTime = new Date(test.endTime).getTime();
      return now > endTime;
    });
  };

  const sortedTestsByCreation = () => {
    return tests.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-themed transition-colors duration-300">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto text-themed opacity-60"></div>
            <p className="mt-4 text-themed-secondary">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-themed transition-colors duration-300">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 card-modern p-4 sm:p-6 glass">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 gradient-animated rounded-2xl flex items-center justify-center flex-shrink-0 float-animation">
                <span className="text-2xl sm:text-3xl font-bold text-white">A</span>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold gradient-warp leading-tight">
                  Admin Dashboard
                </h1>
                <p className="text-slate-600 dark:text-gray-300 mt-1 sm:mt-2 font-medium text-xs sm:text-base">
                  Manage tests and monitor student performance
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-modern btn-primary-modern flex items-center justify-center space-x-2 flex-shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Create Test</span>
                <span className="sm:hidden">Create</span>
              </button>
              <button
                onClick={() => setShowCreateProgrammingModal(true)}
                className="btn-modern flex items-center justify-center space-x-2 flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Code className="h-5 w-5" />
                <span className="hidden sm:inline">Add Programming Test</span>
                <span className="sm:hidden">Code Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-themed mb-8 animate-fadeInUp stagger-2">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${activeTab === 'overview'
                ? 'border-current text-themed'
                : 'border-transparent text-themed-secondary hover:text-themed hover:border-themed'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${activeTab === 'tests'
                ? 'border-current text-themed'
                : 'border-transparent text-themed-secondary hover:text-themed hover:border-themed'
                }`}
            >
              Test Management
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${activeTab === 'results'
                ? 'border-current text-themed'
                : 'border-transparent text-themed-secondary hover:text-themed hover:border-themed'
                }`}
            >
              Results & Analytics
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${activeTab === 'admins'
                ? 'border-current text-themed'
                : 'border-transparent text-themed-secondary hover:text-themed hover:border-themed'
                }`}
            >
              Admin Management
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
              <div
                className="card-modern p-3 sm:p-6 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
                onClick={() => setActiveTab('tests')}
              >
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Total Tests</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{tests.length}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-1 truncate">Click to view all</p>
                  </div>
                </div>
              </div>

              <div
                className="card-modern p-3 sm:p-6 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
                onClick={() => setShowStudentList(true)}
              >
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Total Students</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{totalStudents}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-1 truncate">Click to view</p>
                  </div>
                </div>
              </div>

              <div className="card-modern p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Total Responses</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{totalResponses}</p>
                  </div>
                </div>
              </div>

              <div className="card-modern p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400 truncate">Active Tests</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{getActiveTests().length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Active Tests */}
              <div className="card-modern p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                      <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    Active Tests
                  </h3>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {getActiveTests().length}
                  </span>
                </div>
                {getActiveTests().length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {getActiveTests().slice(0, 5).map((test, index) => (
                      <div key={test.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{test.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {Math.round(test.duration)}min • {test.totalQuestions}{test.type === 'programming' ? 'c' : 'q'}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-800/40 text-orange-800 dark:text-orange-300 rounded-full flex-shrink-0">
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No active tests</p>
                  </div>
                )}
              </div>

              {/* Upcoming Tests */}
              <div className="card-modern p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Upcoming Tests
                  </h3>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {getUpcomingTests().length}
                  </span>
                </div>
                {getUpcomingTests().length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {getUpcomingTests().slice(0, 5).map((test, index) => (
                      <div key={test.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{test.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              {new Date(test.startTime).toLocaleDateString()} • {test.totalQuestions}{test.type === 'programming' ? 'c' : 'q'}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-300 rounded-full flex-shrink-0">
                            Upcoming
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming tests</p>
                  </div>
                )}
              </div>

              {/* Recent Results */}
              <div className="card-modern p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                      <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    Completed Tests
                  </h3>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {getExpiredTests().length}
                  </span>
                </div>
                {getExpiredTests().length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                    {getExpiredTests().slice(0, 5).map((test, index) => (
                      <div key={test.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{test.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              Ended {new Date(test.endTime).toLocaleDateString()} • {test.totalQuestions}{test.type === 'programming' ? 'c' : 'q'}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300 rounded-full flex-shrink-0">
                            Completed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No completed tests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <TestManagement onTestCreated={fetchDashboardData} />
        )}

        {activeTab === 'results' && (
          <ResultsView />
        )}

        {activeTab === 'admins' && (
          <AdminManagement />
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <CreateTestModal
          onClose={() => setShowCreateModal(false)}
          onTestCreated={() => {
            setShowCreateModal(false);
            fetchDashboardData();
          }}
        />
      )}

      {/* Create Programming Test Modal */}
      {showCreateProgrammingModal && (
        <CreateProgrammingTestModal
          onClose={() => setShowCreateProgrammingModal(false)}
          onTestCreated={() => {
            setShowCreateProgrammingModal(false);
            fetchDashboardData();
          }}
        />
      )}

      {/* Student List Modal */}
      <StudentListModal
        isOpen={showStudentList}
        onClose={() => setShowStudentList(false)}
        students={students}
        studentProgress={studentProgress}
        tests={tests}
        onStudentDeleted={fetchDashboardData}
      />
    </div>
  );
};

export default AdminDashboard;