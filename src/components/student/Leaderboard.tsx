import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, Users, BookOpen, Calendar, User } from 'lucide-react';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';

interface Test {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  completedAt: string;
}

interface StudentData {
  uid: string;
  name: string;
  department: string;
  registrationNumber: string;
  testResults: Record<string, TestResult>;
  averageScore: number;
  completedTests: number;
  totalTests: number;
  profilePictureUrl?: string;
}

const Leaderboard: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('overall');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);

      // Fetch all tests
      const testsRef = ref(database, 'tests');
      const testsSnapshot = await get(testsRef);
      const testsData: Test[] = [];

      if (testsSnapshot.exists()) {
        const tests = testsSnapshot.val();
        Object.entries(tests).forEach(([id, test]: [string, any]) => {
          testsData.push({
            id,
            title: test.title,
            description: test.description,
            startTime: test.startTime,
            endTime: test.endTime,
            duration: test.duration,
            totalQuestions: test.totalQuestions
          });
        });
      }
      setTests(testsData);

      // Fetch all users (students only)
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);

      // Fetch all responses
      const responsesRef = ref(database, 'responses');
      const responsesSnapshot = await get(responsesRef);

      const studentsData: StudentData[] = [];

      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        const responses = responsesSnapshot.exists() ? responsesSnapshot.val() : {};

        Object.entries(users).forEach(([uid, user]: [string, any]) => {
          // Only include students, not admins
          if (user.role === 'student') {
            // Get this student's test results
            const testResults: Record<string, TestResult> = {};

            Object.keys(responses).forEach((testId) => {
              if (responses[testId] && responses[testId][uid]) {
                testResults[testId] = responses[testId][uid];
              }
            });

            // Calculate average score percentage across ALL tests (attended and unattended)
            const completedTests = Object.keys(testResults).length;
            let averageScore = 0;

            // Calculate overall average considering ALL tests (unattended = 0%)
            if (testsData.length > 0) {
              const allPercentages = testsData.map(test => {
                const result = testResults[test.id];
                if (!result) return 0; // Unattended test = 0%
                if (result.totalQuestions === 0) return 0;
                return (result.score / result.totalQuestions) * 100;
              });
              averageScore = allPercentages.reduce((sum, percentage) => sum + percentage, 0) / testsData.length;
            }

            studentsData.push({
              uid,
              name: user.name,
              department: user.department,
              registrationNumber: user.registrationNumber,
              testResults,
              averageScore: parseFloat(averageScore.toFixed(1)),
              completedTests,
              totalTests: testsData.length,
              profilePictureUrl: user.profilePictureUrl || null
            });
          }
        });
      }

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value);
  };

  const handleDepartmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartment(event.target.value);
  };

  // Get unique departments from students
  const getDepartments = () => {
    const departments = [...new Set(students.map(student => student.department))];
    return departments.sort();
  };

  // Filter students by department and then sort
  const getFilteredAndSortedStudents = () => {
    // First filter by department
    let filteredStudents = students;
    if (selectedDepartment !== 'all') {
      filteredStudents = students.filter(student => student.department === selectedDepartment);
    }

    // Then sort the filtered results
    const sortedStudents = [...filteredStudents];

    if (sortBy === 'overall') {
      // Sort by average score (descending), then by completed tests (descending)
      return sortedStudents.sort((a, b) => {
        if (a.averageScore !== b.averageScore) {
          return b.averageScore - a.averageScore;
        }
        return b.completedTests - a.completedTests;
      });
    } else {
      // Sort by specific test score
      return sortedStudents.sort((a, b) => {
        const aScore = a.testResults[sortBy] ? (a.testResults[sortBy].score / a.testResults[sortBy].totalQuestions) * 100 : 0;
        const bScore = b.testResults[sortBy] ? (b.testResults[sortBy].score / b.testResults[sortBy].totalQuestions) * 100 : 0;
        return bScore - aScore;
      });
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
  };

  const getTestScore = (student: StudentData, testId: string) => {
    const result = student.testResults[testId];
    if (!result) return '-';
    return `${((result.score / result.totalQuestions) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="sliding-squares-loader mx-auto mb-4">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const filteredAndSortedStudents = getFilteredAndSortedStudents();
  const currentUserRank = filteredAndSortedStudents.findIndex(s => s.uid === userData?.uid) + 1;
  const departments = getDepartments();

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-500 dark:text-yellow-400 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Leaderboard</h1>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400">
            {selectedDepartment === 'all'
              ? 'Rankings based on overall performance across ALL tests (unattended tests count as 0%)'
              : `Rankings for ${selectedDepartment} department (unattended tests count as 0%)`
            }
          </p>
        </div>

        {/* Current User Stats */}
        {userData && currentUserRank > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-300">
                    Your Current Ranking
                    {selectedDepartment !== 'all' && ` in ${selectedDepartment}`}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{userData.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">#{currentUserRank}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">out of {filteredAndSortedStudents.length} students</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="card-modern p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Department:</span>
              </div>
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                className="form-input-modern"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Test Sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              </div>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="form-input-modern"
              >
                <option value="overall">Overall Average</option>
                {tests.map(test => (
                  <option key={test.id} value={test.id}>{test.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {sortBy === 'overall' ? 'Average Score' : tests.find(t => t.id === sortBy)?.title || 'Score'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tests Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedStudents.map((student, index) => {
                  const isCurrentUser = student.uid === userData?.uid;
                  return (
                    <tr key={student.uid} className={`${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(index + 1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {/* Profile Picture */}
                          <div className="flex-shrink-0">
                            {student.profilePictureUrl ? (
                              <img
                                src={student.profilePictureUrl}
                                alt={student.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                          {/* Student Info */}
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => navigate(`/profile/${student.uid}`)}
                              className={`text-sm font-medium hover:underline transition-colors text-left ${isCurrentUser ? 'text-blue-900 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-400' : 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                            >
                              {student.name} {isCurrentUser && <span className="text-blue-600">(You)</span>}
                            </button>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {student.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {student.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isCurrentUser ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {sortBy === 'overall'
                            ? `${student.averageScore}%`
                            : getTestScore(student, sortBy)
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {student.completedTests}/{student.totalTests}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {students.length === 0 && (
          <div className="text-center py-12 card-modern">
            <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No students found</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">No student data available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
