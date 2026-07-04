import React, { useState, useMemo } from 'react';
import { X, TrendingUp, Award, Clock, CheckCircle, XCircle, Target, BookOpen, Calendar, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { deleteStudentData, getStudentDeletionPreview } from '../../services/studentDeletionService';

interface Test {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  registrationNumber: string;
}

interface TestResult {
  testId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: string;
  percentage: number;
}

interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  studentProgress: Record<string, any>;
  tests: Test[];
  onStudentDeleted?: () => void;
}

const StudentProgressModal: React.FC<StudentProgressModalProps> = ({
  isOpen,
  onClose,
  student,
  studentProgress,
  tests,
  onStudentDeleted
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tests' | 'analytics'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePreview, setDeletePreview] = useState<any>(null);

  // Calculate student's test results
  const studentResults = useMemo(() => {
    const results: TestResult[] = [];
    const studentData = studentProgress[student.id];
    
    if (studentData) {
      Object.entries(studentData).forEach(([testId, testData]: [string, any]) => {
        if (testData && typeof testData === 'object' && testData.score !== undefined) {
          const test = tests.find(t => t.id === testId);
          if (test) {
            const percentage = (testData.score / test.totalQuestions) * 100;
            results.push({
              testId,
              score: testData.score,
              totalQuestions: test.totalQuestions,
              correctAnswers: testData.score,
              timeSpent: testData.timeSpent || 0,
              completedAt: testData.completedAt || new Date().toISOString(),
              percentage
            });
          }
        }
      });
    }
    
    return results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [student.id, studentProgress, tests]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    if (studentResults.length === 0) {
      return {
        testsCompleted: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        bestScore: 0,
        improvementTrend: 0
      };
    }

    const totalScore = studentResults.reduce((sum, result) => sum + result.percentage, 0);
    const averageScore = totalScore / studentResults.length;
    const totalTimeSpent = studentResults.reduce((sum, result) => sum + result.timeSpent, 0);
    const bestScore = Math.max(...studentResults.map(r => r.percentage));
    
    // Calculate improvement trend (comparing first half vs second half of tests)
    const midPoint = Math.floor(studentResults.length / 2);
    const recentTests = studentResults.slice(0, midPoint);
    const olderTests = studentResults.slice(midPoint);
    
    const recentAvg = recentTests.length > 0 
      ? recentTests.reduce((sum, r) => sum + r.percentage, 0) / recentTests.length 
      : 0;
    const olderAvg = olderTests.length > 0 
      ? olderTests.reduce((sum, r) => sum + r.percentage, 0) / olderTests.length 
      : 0;
    
    const improvementTrend = recentAvg - olderAvg;

    return {
      testsCompleted: studentResults.length,
      averageScore: Math.round(averageScore * 10) / 10,
      totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
      bestScore: Math.round(bestScore * 10) / 10,
      improvementTrend: Math.round(improvementTrend * 10) / 10
    };
  }, [studentResults]);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  // Handle delete confirmation
  const handleDeleteClick = async () => {
    try {
      const preview = await getStudentDeletionPreview(student.id);
      setDeletePreview(preview);
      setShowDeleteConfirm(true);
    } catch (error) {
      alert('Error loading deletion preview. Please try again.');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteStudentData(student.id);
      if (result.success) {
        alert(`Success: ${result.message}`);
        setShowDeleteConfirm(false);
        onClose();
        if (onStudentDeleted) {
          onStudentDeleted();
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('An unexpected error occurred while deleting the student.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="card-modern w-full max-w-6xl p-6 max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-themed-primary to-themed-primary/80 p-3 rounded-xl shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-themed-primary">{student.name}</h2>
              <p className="text-themed-secondary">{student.email} • {student.department}</p>
              <p className="text-sm text-themed-muted">Registration: {student.registrationNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteClick}
              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Delete Student"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-themed-bg-secondary rounded-xl transition-all duration-200 hover:scale-110"
            >
              <X className="h-6 w-6 text-themed-muted" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-themed-border mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 ${
                selectedTab === 'overview'
                  ? 'border-themed-primary text-themed-primary bg-themed-primary/5'
                  : 'border-transparent text-themed-secondary hover:text-themed-primary hover:bg-themed-bg-secondary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('tests')}
              className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 ${
                selectedTab === 'tests'
                  ? 'border-themed-primary text-themed-primary bg-themed-primary/5'
                  : 'border-transparent text-themed-secondary hover:text-themed-primary hover:bg-themed-bg-secondary'
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setSelectedTab('analytics')}
              className={`py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 ${
                selectedTab === 'analytics'
                  ? 'border-themed-primary text-themed-primary bg-themed-primary/5'
                  : 'border-transparent text-themed-secondary hover:text-themed-primary hover:bg-themed-bg-secondary'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-themed-secondary">Tests Completed</p>
                      <p className="text-2xl font-bold text-themed-primary">{stats.testsCompleted}</p>
                    </div>
                  </div>
                </div>

                <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-75">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-themed-secondary">Average Score</p>
                      <p className="text-2xl font-bold text-themed-primary">{stats.averageScore}%</p>
                    </div>
                  </div>
                </div>

                <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-150">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-themed-secondary">Time Spent</p>
                      <p className="text-2xl font-bold text-themed-primary">{stats.totalTimeSpent}m</p>
                    </div>
                  </div>
                </div>

                <div className="card-modern p-6 animate-fade-in hover:animate-subtle-bounce transition-all duration-200 delay-225">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-themed-secondary">Best Score</p>
                      <p className="text-2xl font-bold text-themed-primary">{stats.bestScore}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Performance */}
              <div className="card-modern p-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-themed-primary mb-4">Recent Performance</h3>
                {studentResults.length > 0 ? (
                  <div className="space-y-3">
                    {studentResults.slice(0, 5).map((result, index) => {
                      const test = tests.find(t => t.id === result.testId);
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-themed-bg-secondary rounded-xl hover:bg-themed-bg-secondary/80 transition-colors duration-200">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl border shadow-sm ${getScoreColor(result.percentage)}`}>
                              {result.percentage >= 60 ? 
                                <CheckCircle className="h-5 w-5" /> : 
                                <XCircle className="h-5 w-5" />
                              }
                            </div>
                            <div>
                              <p className="font-medium text-themed-primary line-clamp-1">{test?.title || 'Unknown Test'}</p>
                              <p className="text-sm text-themed-secondary">
                                {new Date(result.completedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-themed-primary">{result.percentage.toFixed(1)}%</p>
                            <p className="text-sm text-themed-secondary">
                              {result.correctAnswers}/{result.totalQuestions} correct
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-themed-bg rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-themed-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-themed-primary">No tests completed yet</h3>
                    <p className="mt-2 text-themed-secondary">This student hasn't completed any tests.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'tests' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-themed-primary">All Test Results</h3>
              {studentResults.length > 0 ? (
                <div className="card-modern overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-themed-border">
                      <thead className="bg-themed-bg">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Test
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Grade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Time Spent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Completed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-themed-secondary uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-themed-bg divide-y divide-themed-border">
                        {studentResults.map((result, index) => {
                          const test = tests.find(t => t.id === result.testId);
                          return (
                            <tr key={index} className="hover:bg-themed-bg-secondary transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-themed-primary line-clamp-2">
                                  {test?.title || 'Unknown Test'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-themed-primary">
                                  {result.correctAnswers}/{result.totalQuestions} ({result.percentage.toFixed(1)}%)
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-medium border shadow-sm ${getScoreColor(result.percentage)}`}>
                                  {getGradeFromPercentage(result.percentage)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-themed-primary">
                                {Math.round(result.timeSpent / 60)}m
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-secondary">
                                {new Date(result.completedAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {result.percentage >= 60 ? (
                                  <span className="inline-flex items-center text-emerald-600 font-medium">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Passed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-red-600 font-medium">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-themed-bg rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-themed-muted" />
                  </div>
                  <h3 className="text-lg font-medium text-themed-primary">No test results</h3>
                  <p className="mt-2 text-themed-secondary">This student hasn't completed any tests yet.</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-themed-primary">Performance Analytics</h3>
              
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                  <h4 className="text-md font-semibold text-themed-primary mb-4">Performance Trend</h4>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className={`h-6 w-6 ${stats.improvementTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    <span className={`text-lg font-bold ${stats.improvementTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stats.improvementTrend >= 0 ? '+' : ''}{stats.improvementTrend}%
                    </span>
                    <span className="text-themed-secondary">
                      {stats.improvementTrend >= 0 ? 'improvement' : 'decline'} in recent tests
                    </span>
                  </div>
                </div>

                <div className="card-modern p-6">
                  <h4 className="text-md font-semibold text-themed-primary mb-4">Grade Distribution</h4>
                  <div className="space-y-3">
                    {['A+', 'A', 'B+', 'B', 'C+', 'C', 'F'].map(grade => {
                      const count = studentResults.filter(r => getGradeFromPercentage(r.percentage) === grade).length;
                      const percentage = studentResults.length > 0 ? (count / studentResults.length) * 100 : 0;
                      return (
                        <div key={grade} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-themed-secondary">{grade}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-themed-bg-secondary rounded-full h-2.5">
                              <div 
                                className="bg-gradient-to-r from-themed-primary to-themed-primary/80 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-themed-muted w-8 font-medium">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Detailed Insights */}
              <div className="card-modern p-6">
                <h4 className="text-md font-semibold text-themed-primary mb-4">Performance Insights</h4>
                <div className="space-y-4">
                  {stats.testsCompleted > 0 ? (
                    <>
                      <div className="flex items-start space-x-3 p-3 bg-themed-bg-secondary rounded-lg">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <p className="text-themed-secondary">
                          <strong className="text-themed-primary">Overall Performance:</strong> {student.name} has completed {stats.testsCompleted} tests with an average score of {stats.averageScore}%.
                        </p>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-themed-bg-secondary rounded-lg">
                        <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                        <p className="text-themed-secondary">
                          <strong className="text-themed-primary">Best Performance:</strong> Highest score achieved is {stats.bestScore}% ({getGradeFromPercentage(stats.bestScore)} grade).
                        </p>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-themed-bg-secondary rounded-lg">
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <p className="text-themed-secondary">
                          <strong className="text-themed-primary">Time Management:</strong> Total time spent on tests is {stats.totalTimeSpent} minutes, averaging {Math.round(stats.totalTimeSpent / stats.testsCompleted)} minutes per test.
                        </p>
                      </div>

                      {stats.improvementTrend !== 0 && (
                        <div className="flex items-start space-x-3 p-3 bg-themed-bg-secondary rounded-lg">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${stats.improvementTrend >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <p className="text-themed-secondary">
                            <strong className="text-themed-primary">Trend Analysis:</strong> Recent performance shows a {Math.abs(stats.improvementTrend)}% {stats.improvementTrend >= 0 ? 'improvement' : 'decline'} compared to earlier tests.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 bg-themed-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="h-8 w-8 text-themed-muted" />
                      </div>
                      <p className="text-themed-secondary">No analytics available yet. Complete some tests to see insights.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-themed-border">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-themed-primary to-themed-primary/90 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="card-modern w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-xl mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-themed-primary">Delete Student</h3>
                <p className="text-sm text-themed-secondary">This action cannot be undone</p>
              </div>
            </div>

            {deletePreview && (
              <div className="mb-6">
                <p className="text-sm text-themed-secondary mb-4">
                  Are you sure you want to delete <strong className="text-themed-primary">{deletePreview.studentName}</strong>?
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">The following data will be permanently deleted:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Student profile and account data</li>
                    <li>• {deletePreview.testResponseCount} test response(s)</li>
                    {deletePreview.hasTestStates && <li>• Test session states and timing data</li>}
                  </ul>
                  <p className="text-xs text-red-600 mt-3 font-medium">
                    Note: The Firebase Auth account will remain but will be inaccessible.
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-themed-border text-themed-secondary rounded-xl hover:bg-themed-bg-secondary disabled:opacity-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center font-medium"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Student'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProgressModal;
