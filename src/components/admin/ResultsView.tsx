import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { Download, Search, Filter, BarChart3 } from 'lucide-react';
import { database } from '../../lib/firebase';

interface TestResult {
  testId: string;
  testTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  registrationNumber: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
}

const ResultsView: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<TestResult[]>([]);
  const [tests, setTests] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, selectedTest, selectedDepartment]);

  const fetchAllData = async () => {
    try {
      // Fetch tests
      const testsRef = ref(database, 'tests');
      const testsSnapshot = await get(testsRef);
      const testsData: Record<string, string> = {};
      if (testsSnapshot.exists()) {
        Object.entries(testsSnapshot.val()).forEach(([id, test]: [string, any]) => {
          testsData[id] = test.title;
        });
      }
      setTests(testsData);

      // Fetch users
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData: Record<string, any> = {};
      if (usersSnapshot.exists()) {
        Object.entries(usersSnapshot.val()).forEach(([id, user]: [string, any]) => {
          if (user.role === 'student') {
            usersData[id] = user;
          }
        });
      }
      setUsers(usersData);

      // Fetch responses
      const responsesRef = ref(database, 'responses');
      const responsesSnapshot = await get(responsesRef);
      const allResults: TestResult[] = [];

      if (responsesSnapshot.exists()) {
        Object.entries(responsesSnapshot.val()).forEach(([testId, testResponses]: [string, any]) => {
          Object.entries(testResponses).forEach(([userId, response]: [string, any]) => {
            const user = usersData[userId];
            if (user && testsData[testId]) {
              allResults.push({
                testId,
                testTitle: testsData[testId],
                userId,
                userName: user.name,
                userEmail: user.email,
                department: user.department,
                registrationNumber: user.registrationNumber,
                score: response.score,
                totalQuestions: response.totalQuestions,
                completedAt: response.completedAt,
                timeSpent: response.timeSpent
              });
            }
          });
        });
      }

      // Sort by completion date, newest first
      allResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setResults(allResults);
    } catch (error) {
      console.error('Error fetching results data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = [...results];

    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTest) {
      filtered = filtered.filter(result => result.testId === selectedTest);
    }

    if (selectedDepartment) {
      filtered = filtered.filter(result => result.department === selectedDepartment);
    }

    setFilteredResults(filtered);
  };

  const getPercentage = (score: number, total: number) => {
    // Handle invalid or zero values to prevent NaN
    const safeScore = isNaN(Number(score)) ? 0 : Number(score);
    const safeTotal = isNaN(Number(total)) || Number(total) === 0 ? 1 : Number(total);
    
    const percentage = Math.round((safeScore / safeTotal) * 100);
    return isNaN(percentage) ? 0 : percentage;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (percentage >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Test', 'Student Name', 'Email', 'Registration Number', 'Department', 'Score', 'Total Questions', 'Percentage', 'Time Spent', 'Completed At'],
      ...filteredResults.map(result => [
        result.testTitle,
        result.userName,
        result.userEmail,
        result.registrationNumber,
        result.department,
        result.score.toString(),
        result.totalQuestions.toString(),
        `${getPercentage(result.score, result.totalQuestions)}%`,
        formatTime(result.timeSpent),
        new Date(result.completedAt).toLocaleDateString()
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'test-results.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const departments = [...new Set(Object.values(users).map((user: any) => user.department))];
  const uniqueTests = Object.entries(tests);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-themed-muted border-t-themed-primary mx-auto"></div>
          <p className="mt-4 text-themed-secondary">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="card-modern p-6 mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-themed-primary">Filter Results</h3>
          <button
            onClick={exportToCSV}
            disabled={filteredResults.length === 0}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-themed-secondary mb-2">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-themed-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, or registration number"
                className="pl-10 block w-full px-3 py-2 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-themed-secondary mb-2">Filter by Test</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="block w-full px-3 py-2 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-200"
            >
              <option value="">All Tests</option>
              {uniqueTests.map(([id, title]) => (
                <option key={id} value={id}>{title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-themed-secondary mb-2">Filter by Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="block w-full px-3 py-2 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-200"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-themed-secondary">Total Results</p>
              <p className="text-2xl font-bold text-themed-primary">{filteredResults.length}</p>
            </div>
          </div>
        </div>

        <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-75">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-themed-secondary">Above 80%</p>
              <p className="text-2xl font-bold text-themed-primary">
                {filteredResults.filter(r => getPercentage(r.score, r.totalQuestions) >= 80).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-150">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-themed-secondary">60-80%</p>
              <p className="text-2xl font-bold text-themed-primary">
                {filteredResults.filter(r => {
                  const pct = getPercentage(r.score, r.totalQuestions);
                  return pct >= 60 && pct < 80;
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-225">
          <div className="flex items-center">
            <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-themed-secondary">Below 50%</p>
              <p className="text-2xl font-bold text-themed-primary">
                {filteredResults.filter(r => getPercentage(r.score, r.totalQuestions) < 50).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card-modern overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-themed-border bg-gradient-to-r from-themed-bg to-themed-bg">
          <h3 className="text-lg font-semibold text-themed-primary">
            Test Results ({filteredResults.length})
          </h3>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="h-16 w-16 bg-themed-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-themed-muted" />
            </div>
            <h3 className="text-lg font-medium text-themed-primary">No results found</h3>
            <p className="mt-2 text-themed-secondary">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-themed-border">
              <thead className="bg-themed-bg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Time Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase tracking-wider">
                    Completed At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-themed-bg divide-y divide-themed-border">
                {filteredResults.map((result, index) => {
                  const percentage = getPercentage(result.score, result.totalQuestions);
                  const gradeColor = getGradeColor(percentage);

                  return (
                    <tr key={index} className="hover:bg-themed-bg-secondary transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-themed-primary line-clamp-1">{result.userName}</div>
                          <div className="text-sm text-themed-secondary line-clamp-1">{result.registrationNumber}</div>
                          <div className="text-xs text-themed-muted line-clamp-1">{result.department}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-themed-primary line-clamp-2">{result.testTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-themed-primary">
                          {result.score}/{result.totalQuestions}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium border ${gradeColor} shadow-sm`}>
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-primary font-medium">
                        {formatTime(result.timeSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-secondary">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;