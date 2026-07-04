import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { Trophy, Clock, CheckCircle, XCircle, ArrowLeft, AlertTriangle, Eye, EyeOff, TrendingUp, Download, X } from 'lucide-react';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';
import { generateSimplePDF } from '../../utils/testResultsPdfGenerator';
import PerformanceTracker from './PerformanceTracker';

// Interfaces for the data structure
interface TestResultData {
  score: number;
  totalQuestions: number;
  answers: Record<string, number>; // Maps question ID to chosen option index (legacy)
  detailedAnswers?: Record<string, { index: number; value: string; isCorrect: boolean }>; // New format
  completedAt: string;
  timeSpent: number; // In seconds
}

interface Question {
  id: string;
  question: string;
  questionType?: 'text' | 'image' | 'code';
  imageUrl?: string;
  codeContent?: string;
  codeLanguage?: string;
  options: string[];
  correctAnswer: number; // Index of the correct answer
}

interface Test {
  title: string;
  description: string;
  duration: number;
  endTime: string; // Test end time to check if test has expired
}

const TestResult: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [result, setResult] = useState<TestResultData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // useEffect to fetch all necessary data when the component mounts
  useEffect(() => {
    // Navigate to dashboard if essential parameters are missing
    if (!testId || !userData?.uid) {
      navigate('/dashboard');
      return;
    }
    fetchResultData();
  }, [testId, userData, navigate]);

  const fetchResultData = async () => {
    setLoading(true);
    setError(null);

    if (!testId || !userData?.uid) {
      setError("User data or test ID is missing.");
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch the user's test result
      const resultRef = ref(database, `responses/${testId}/${userData.uid}`);
      const resultSnapshot = await get(resultRef);

      if (!resultSnapshot.exists()) {
        setError('You have not completed this test yet.');
        setLoading(false);
        return;
      }
      const resultData = resultSnapshot.val();
      console.log('=== RESULT DATA DEBUG ===');
      console.log('Raw result data:', JSON.stringify(resultData, null, 2));
      console.log('Score:', resultData.score, 'Type:', typeof resultData.score);
      console.log('Total Questions:', resultData.totalQuestions, 'Type:', typeof resultData.totalQuestions);
      console.log('Has detailed answers:', !!resultData.detailedAnswers);
      setResult(resultData);

      // 2. Fetch the test details
      const testRef = ref(database, `tests/${testId}`);
      const testSnapshot = await get(testRef);

      if (!testSnapshot.exists()) {
        setError('Test details not found.');
        setLoading(false);
        return;
      }
      setTest(testSnapshot.val());

      // 3. Fetch the original questions (no shuffling needed for results)
      const questionsRef = ref(database, `questions/${testId}`);
      const questionsSnapshot = await get(questionsRef);

      if (questionsSnapshot.exists()) {
        const questionsData = questionsSnapshot.val();
        // Convert the Firebase object of questions into a usable array (original order)
        const questionsArray: Question[] = Object.entries(questionsData).map(([id, question]: [string, any]) => ({
          id,
          question: question.question,
          questionType: question.questionType || 'text',
          imageUrl: question.imageUrl || undefined,
          codeContent: question.codeContent || undefined,
          codeLanguage: question.codeLanguage || 'javascript',
          options: [...question.options],
          correctAnswer: question.correctAnswer,
          originalCorrectAnswerValue: question.options[question.correctAnswer],
        }));

        setQuestions(questionsArray);
      } else {
        setError('Questions for this test not found.');
      }
    } catch (err) {
      console.error('Error fetching result data:', err);
      setError('An error occurred while loading results.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the percentage score
  const getPercentage = () => {
    console.log('=== PERCENTAGE CALCULATION DEBUG ===');
    console.log('Result exists:', !!result);

    if (!result) {
      console.log('No result data');
      return 0;
    }

    console.log('Raw score:', result.score, 'Type:', typeof result.score);
    console.log('Raw totalQuestions:', result.totalQuestions, 'Type:', typeof result.totalQuestions);

    // Convert to numbers and handle invalid values
    const score = isNaN(Number(result.score)) ? 0 : Number(result.score);
    const totalQuestions = isNaN(Number(result.totalQuestions)) || Number(result.totalQuestions) === 0 ? 1 : Number(result.totalQuestions);

    console.log('Converted score:', score);
    console.log('Converted totalQuestions:', totalQuestions);

    if (totalQuestions === 0) {
      console.log('Total questions is 0, returning 0%');
      return 0;
    }

    const percentage = Math.round((score / totalQuestions) * 100);
    console.log('Calculated percentage:', percentage);

    return isNaN(percentage) ? 0 : percentage;
  };

  // Handle panel close with animation
  const handleClosePanel = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowAnswers(false);
      setIsClosing(false);
    }, 300); // Full animation duration - components stay mounted during animation
  };

  // Helper function to get the grade and associated color
  const getGrade = () => {
    const percentage = getPercentage();
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  // Helper function to check if test has expired
  const isTestExpired = () => {
    if (!test?.endTime) return true; // If no endTime, allow access (backward compatibility)
    const now = new Date().getTime();
    const testEndTime = new Date(test.endTime).getTime();
    return now > testEndTime;
  };

  // Helper function to format time from seconds
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Helper function to get user's answer information from detailed format or fallback to legacy
  const getUserAnswerInfo = (questionId: string) => {
    // Use detailed answers if available (new format)
    if (result?.detailedAnswers && result.detailedAnswers[questionId]) {
      const detailed = result.detailedAnswers[questionId];
      return {
        index: detailed.index,
        value: detailed.value,
        isCorrect: detailed.isCorrect
      };
    }

    // Fallback to legacy format
    if (result?.answers && result.answers[questionId] !== undefined) {
      const answerIndex = result.answers[questionId];
      const question = questions.find(q => q.id === questionId);
      if (question) {
        return {
          index: answerIndex,
          value: question.options[answerIndex],
          isCorrect: answerIndex === question.correctAnswer
        };
      }
    }

    return null;
  };


  // Helper function to render question content
  const renderQuestionContent = (question: Question, index: number) => {
    if (question.questionType === 'code' && question.codeContent) {
      return (
        <div className="space-y-3">
          {question.question && <p className="text-lg font-medium text-gray-900">{question.question}</p>}
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 border-b">
              {question.codeLanguage || 'code'}
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code>{question.codeContent}</code>
            </pre>
          </div>
        </div>
      );
    }

    if (question.questionType === 'image' && question.imageUrl) {
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
          <img
            src={question.imageUrl}
            alt="Question image"
            className="max-w-full h-auto rounded-lg border"
            style={{ maxHeight: '300px' }}
          />
        </div>
      );
    }

    return <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>;
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!test || !result || !questions.length) {
      alert('Unable to generate PDF. Missing test data.');
      return;
    }

    setDownloadingPdf(true);
    try {
      await generateSimplePDF(test, result, questions);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Render different states based on loading and error status
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
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center card-modern glass p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 dark:text-yellow-400 float-animation" />
          <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Unable to load results</h3>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{error || 'Results not found or data is incomplete.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 btn-modern btn-primary-modern"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { grade, color } = getGrade();
  const percentage = result ? getPercentage() : 0;

  // Final safety check to ensure percentage is never NaN
  const safePercentage = isNaN(percentage) ? 0 : percentage;
  console.log('Final safe percentage:', safePercentage);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20">
        {/* Header and Back Button */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-row items-center justify-between gap-2 mb-3 sm:mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf || !isTestExpired()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title={!isTestExpired() ? 'Available after test expires' : ''}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold gradient-warp mb-1">{test.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Test Results</p>
        </div>

        {/* Results Summary */}
        <div className="card-modern glass p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-row gap-2 sm:gap-3">
            {/* Score Display - Left Side (much wider) - Always on left even on mobile */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-56 sm:w-64 border-r border-gray-200 dark:border-gray-700 pr-3 sm:pr-4 py-2">
              <div className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full ${safePercentage >= 70 ? 'bg-green-100 dark:bg-green-900/30' : safePercentage >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'} mb-2`}>
                <Trophy className={`h-7 w-7 sm:h-8 sm:w-8 ${safePercentage >= 70 ? 'text-green-600 dark:text-green-400' : safePercentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <h2 className="text-3xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{safePercentage}%</h2>
              <p className={`text-sm font-semibold text-center ${safePercentage >= 70 ? 'text-green-600 dark:text-green-400' : safePercentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>Grade: {grade}</p>
            </div>

            {/* Metrics Stack - Right Side - Vertical Stack with centered text */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Correct</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{isNaN(Number(result.score)) ? 0 : Number(result.score)}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {isNaN(Number(result.totalQuestions)) ? 0 : Math.round((Number(result.score) / Number(result.totalQuestions)) * 100)}% accuracy
                </p>
              </div>

              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Incorrect</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{Math.max(0, (isNaN(Number(result.totalQuestions)) ? 0 : Number(result.totalQuestions)) - (isNaN(Number(result.score)) ? 0 : Number(result.score)))}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Out of {isNaN(Number(result.totalQuestions)) ? 0 : Number(result.totalQuestions)} questions
                </p>
              </div>

              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Time</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{formatTime(result.timeSpent || 0)}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {Math.round((result.timeSpent || 0) / (isNaN(Number(result.totalQuestions)) ? 1 : Number(result.totalQuestions)))}s per question
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="card-modern p-4 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-2">
            <span className="text-base sm:text-sm font-medium text-gray-700 dark:text-gray-300">Overall Performance</span>
            <span className="text-base sm:text-sm text-gray-600 dark:text-gray-400 font-semibold">{isNaN(Number(result.score)) ? 0 : Number(result.score)}/{isNaN(Number(result.totalQuestions)) ? 0 : Number(result.totalQuestions)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${safePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Show Answers Button - Only enabled after test expires */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <button
            onClick={() => showAnswers ? handleClosePanel() : setShowAnswers(true)}
            disabled={!isTestExpired()}
            className={`btn-modern w-full sm:w-auto ${showAnswers
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!isTestExpired() ? 'Answers will be available after the test expires' : ''}
          >
            {showAnswers ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
            <span className="text-base sm:text-sm">{showAnswers ? 'Hide Answers' : !isTestExpired() ? 'Answers Locked' : 'Show Answers'}</span>
          </button>
        </div>

        {/* Animated Sliding Panel for Answers */}
        {(showAnswers || isClosing) && (
          <>
            {/* Backdrop Overlay - Fades out faster to prevent black flash */}
            <div
              className={`fixed inset-0 bg-black/60 z-[9998] cursor-pointer transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
              onClick={handleClosePanel}
              style={{ pointerEvents: 'auto' }}
            />

            {/* Sliding Panel */}
            <div
              className={`fixed top-0 right-0 bottom-0 w-full md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[9999] ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="space-y-4 sm:space-y-4">
                {/* Legend with Close Button */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-3 sm:p-3 sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                    <strong>Legend:</strong>
                    <span className="flex flex-col sm:inline-flex sm:flex-row gap-2 sm:gap-0 mt-2 sm:mt-0">
                      <span className="inline-flex items-center sm:ml-2 sm:mr-4">
                        <span className="w-3 h-3 bg-green-200 dark:bg-green-900/50 border border-green-400 dark:border-green-600 rounded mr-1"></span>
                        Correct Answer
                      </span>
                      <span className="inline-flex items-center">
                        <span className="w-3 h-3 bg-red-200 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded mr-1"></span>
                        Your Answer (Incorrect)
                      </span>
                    </span>
                  </p>
                  <button
                    onClick={handleClosePanel}
                    className="ml-2 p-2 sm:p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded transition-colors flex-shrink-0 self-end sm:self-auto"
                    aria-label="Close panel"
                    type="button"
                  >
                    <X className="h-6 w-6 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-300" />
                  </button>
                </div>

                {/* Questions */}
                {questions.length > 0 ? (
                  questions.map((question, index) => {
                    const userAnswerInfo = getUserAnswerInfo(question.id);
                    const isCorrect = userAnswerInfo?.isCorrect || false;

                    return (
                      <div key={question.id} className="card-modern p-4 sm:p-4 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-2">
                              <span className="text-base sm:text-sm font-medium text-gray-500 dark:text-gray-400 sm:mr-2">Question {index + 1}</span>
                              {userAnswerInfo ? (
                                isCorrect ? (
                                  <span className="status-success">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Correct
                                  </span>
                                ) : (
                                  <span className="status-error">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Incorrect
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
                                  Not Answered
                                </span>
                              )}
                            </div>
                            {renderQuestionContent(question, index)}
                          </div>
                        </div>

                        <div className="space-y-2 sm:space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isUserAnswer = userAnswerInfo && userAnswerInfo.value === option;
                            const isCorrectAnswer = question.options[question.correctAnswer] === option;

                            let optionClasses = 'w-full text-left p-4 sm:p-3 rounded-lg border transition-all duration-200 ';

                            if (isUserAnswer && isCorrectAnswer) {
                              optionClasses += 'border-green-400 bg-green-200 text-green-900';
                            } else if (isCorrectAnswer) {
                              optionClasses += 'border-green-400 bg-green-200 text-green-900';
                            } else if (isUserAnswer) {
                              optionClasses += 'border-red-400 bg-red-200 text-red-900';
                            } else {
                              optionClasses += 'border-gray-200 bg-gray-50 text-gray-700';
                            }

                            return (
                              <div key={optionIndex} className={optionClasses}>
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-6 sm:h-6 rounded-full text-sm font-medium mr-3 ${isCorrectAnswer
                                    ? 'bg-green-600 text-white'
                                    : isUserAnswer
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-400 text-white'
                                    }`}>
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                  <span className="flex-1 text-base sm:text-sm">{option}</span>
                                  <div className="flex items-center space-x-2">
                                    {isCorrectAnswer && (
                                      <span className="text-xs font-medium text-green-700">Correct</span>
                                    )}
                                    {isUserAnswer && !isCorrectAnswer && (
                                      <span className="text-xs font-medium text-red-700">Your Choice</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!userAnswerInfo && (
                          <div className="mt-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <strong>No answer provided.</strong> The correct answer is:
                              <span className="font-medium text-green-700">
                                {String.fromCharCode(65 + question.correctAnswer)} - {question.options[question.correctAnswer]}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No questions found for this test.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}



        {/* Performance Tracker Section */}
        {userData?.uid && (
          <PerformanceTracker
            currentScore={safePercentage}
            userId={userData.uid}
            currentTestId={testId}
          />
        )}
      </div>
    </div>
  );
};

export default TestResult;
