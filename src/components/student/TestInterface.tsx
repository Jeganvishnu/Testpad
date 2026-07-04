import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SkeletonTestLoading } from '../common/LoadingSkeleton';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ref, get, set, runTransaction } from 'firebase/database';
import { Clock, AlertTriangle, CheckCircle, RefreshCw, Shield, Calculator, X, Minus, Plus, Divide, Equal, TrendingUp, Target } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTestProctor } from '../../hooks/useTestProctor';
import ProctorWarning from '../common/ProctorWarning';
import DifficultyBadge from '../common/DifficultyBadge';
import { adaptiveTestService, AdaptiveTestState, AdaptiveQuestion, DifficultyLevel } from '../../services/adaptiveTestService';

// Updated interface to match adaptive system
interface Question extends AdaptiveQuestion { }

interface AdaptiveTestInfo {
  currentDifficulty: DifficultyLevel;
  correctStreak: number;
  wrongStreak: number;
  weightedScore: number;
  difficultyFlow: Array<{
    difficulty: DifficultyLevel;
    wasCorrect: boolean;
    timestamp: number;
  }>;
}

interface Test {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
  closeTime?: string;
  timesAttempted?: number;
}

const TestInterface: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testEnded, setTestEnded] = useState(false);

  // Adaptive testing state
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveTestState | null>(null);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showProctorWarning, setShowProctorWarning] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [calculatorPrevValue, setCalculatorPrevValue] = useState<number | null>(null);
  const [calculatorOperation, setCalculatorOperation] = useState<string | null>(null);
  const [calculatorWaitingForNewValue, setCalculatorWaitingForNewValue] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [incompleteQuestions, setIncompleteQuestions] = useState<number[]>([]);

  // Calculator history (persisted)
  const [calculatorHistory, setCalculatorHistory] = useState<Array<{ expression: string; result: string }>>(() => {
    try {
      const raw = localStorage.getItem('calculatorHistory');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('calculatorHistory', JSON.stringify(calculatorHistory));
    } catch { }
  }, [calculatorHistory]);

  const hasStartedTest = useRef(false);

  // Check for force restart parameter
  const urlParams = new URLSearchParams(location.search);
  const forceRestart = urlParams.get('restart') === 'true';

  // Mobile detection function
  const isMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // Check for mobile devices
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());

    // Check for touch capability and screen size
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    return isMobileUserAgent || (isTouchDevice && isSmallScreen);
  };

  const deviceIsMobile = isMobile();

  // Initialize test proctoring system with mobile support
  const { proctorState, enterFullscreen, exitFullscreen, startTestTracking, stopProctoring } = useTestProctor({
    enableFullscreen: !deviceIsMobile,
    enableTabSwitchDetection: !deviceIsMobile,
    enableCopyCutPaste: !deviceIsMobile, // Disable copy/paste (false means block it)
    enableRightClick: !deviceIsMobile,   // Disable right click (false means block it)
    enableDevTools: !deviceIsMobile,
    enableScreenshot: !deviceIsMobile,
    enableMobileProctoring: deviceIsMobile, // Enable mobile proctoring for mobile devices
    maxViolations: 3, // Same violation limit for both mobile and desktop
    onViolation: (type, count) => {
      console.log(`Proctoring violation: ${type}, Total: ${count} `);
      setShowProctorWarning(true);
    },
    onMaxViolationsReached: () => {
      console.log('Maximum violations reached - terminating test');
      handleTestTermination();
    }
  });

  useEffect(() => {
    if (!testId || !userData?.uid) {
      setLoading(false);
      navigate('/dashboard');
      return;
    }
    fetchTestData();
  }, [testId, userData?.uid, forceRestart]);

  useEffect(() => {
    if (timeLeft > 0 && !testEnded) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !testEnded && test && questions.length > 0 && Object.keys(answers).length > 0) {
      console.log('Time ran out and user has answers, auto-submitting test.');
      handleSubmitTest();
    } else if (timeLeft === 0 && !testEnded && test && questions.length > 0) {
      console.log('Time ran out but no answers provided, ending test.');
      setTestEnded(true);
    }
  }, [timeLeft, testEnded, test, answers, questions]);

  const clearAllTestData = async () => {
    if (!testId || !userData?.uid) return;

    try {
      console.log('Clearing all test data for fresh start...');

      // Clear response data
      const responseRef = ref(database, `responses / ${testId}/${userData.uid}`);
      await set(responseRef, null);

      // Clear user test state
      const userTestStateRef = ref(database, `userTestStates/${userData.uid}/${testId}`);
      await set(userTestStateRef, null);

      console.log('All test data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing test data:', error);
      return false;
    }
  };

  const fetchTestData = async () => {
    if (!testId || !userData?.uid) return;

    try {
      setLoading(true);

      // Clear data if force restart is requested
      if (forceRestart) {
        console.log('Force restart requested, clearing all data...');
        await clearAllTestData();
      }

      // 1. Fetch test details
      const testRef = ref(database, `tests/${testId}`);
      const testSnapshot = await get(testRef);

      if (!testSnapshot.exists()) {
        console.warn('Test not found.');
        navigate('/dashboard');
        return;
      }
      const testData: Test = testSnapshot.val();
      setTest(testData);

      // 2. Check test window
      const now = Date.now();
      const testGlobalStartTime = new Date(testData.startTime).getTime();
      const testGlobalEndTime = new Date(testData.endTime).getTime();

      if (now < testGlobalStartTime || now > testGlobalEndTime) {
        console.warn('Test is not active based on global start/end times.');
        navigate('/dashboard');
        return;
      }

      // 3. Check for existing response with detailed debugging
      const responseRef = ref(database, `responses/${testId}/${userData.uid}`);
      const responseSnapshot = await get(responseRef);

      let responseData = null;
      if (responseSnapshot.exists()) {
        responseData = responseSnapshot.val();
        console.log('=== RESPONSE DATA DEBUG ===');
        console.log('Raw response data:', JSON.stringify(responseData, null, 2));
      }

      // 4. Check user test state with detailed debugging
      const userTestStateRef = ref(database, `userTestStates/${userData.uid}/${testId}`);
      const userTestStateSnapshot = await get(userTestStateRef);

      let userTestState = null;
      if (userTestStateSnapshot.exists()) {
        userTestState = userTestStateSnapshot.val();
        console.log('=== USER TEST STATE DEBUG ===');
        console.log('Raw user test state:', JSON.stringify(userTestState, null, 2));
      }


      // 5. VERY STRICT validation for completed test
      if (responseSnapshot.exists() && !forceRestart) {
        const response = responseSnapshot.val();

        // Check each field individually
        const hasAnswers = response &&
          response.answers &&
          typeof response.answers === 'object' &&
          Object.keys(response.answers).length > 0;

        const hasCompletedAt = response &&
          response.completedAt &&
          typeof response.completedAt === 'string' &&
          response.completedAt.length > 10; // Valid ISO string should be longer

        const hasValidScore = response &&
          typeof response.score === 'number' &&
          response.score >= 0;

        const hasTotalQuestions = response &&
          typeof response.totalQuestions === 'number' &&
          response.totalQuestions > 0;

        console.log('=== VALIDATION RESULTS ===');
        console.log('hasAnswers:', hasAnswers);
        console.log('hasCompletedAt:', hasCompletedAt);
        console.log('hasValidScore:', hasValidScore);
        console.log('hasTotalQuestions:', hasTotalQuestions);

        // ONLY redirect if ALL validations pass
        if (hasAnswers && hasCompletedAt && hasValidScore && hasTotalQuestions) {
          console.log('All validation checks passed - redirecting to result');
          navigate(`/result/${testId}`);
          return;
        } else {
          console.log('Validation failed - clearing incomplete data and starting fresh');
          await clearAllTestData();
        }
      }

      // 6. Initialize or resume adaptive testing state (if adaptive mode)
      if (testData.isAdaptive) {
        let currentAdaptiveState = await adaptiveTestService.getAdaptiveState(userData.uid, testId);

        if (!currentAdaptiveState || forceRestart) {
          console.log('Initializing new adaptive test state');
          currentAdaptiveState = await adaptiveTestService.initializeAdaptiveState(userData.uid, testId);
        } else {
          console.log('Resuming existing adaptive test state:', currentAdaptiveState);
        }

        setAdaptiveState(currentAdaptiveState);
        setIsAdaptiveMode(true);
      }

      // 7. Handle timing - ALWAYS start with full time initially
      let userStartedAt = now;
      let initialTimeLeft = testData.duration * 60;

      console.log(`=== TIMING DEBUG ===`);
      console.log('Test duration (minutes):', testData.duration);
      console.log('Full time (seconds):', testData.duration * 60);
      console.log('Force restart:', forceRestart);

      // Only check existing timing if not force restarting
      if (!forceRestart && userTestStateSnapshot.exists()) {
        const existingState = userTestStateSnapshot.val();
        console.log('Existing user test state:', existingState);

        if (existingState && existingState.startedAt && typeof existingState.startedAt === 'number') {
          const elapsed = Math.floor((now - existingState.startedAt) / 1000);
          const remainingTime = Math.max(0, (testData.duration * 60) - elapsed);

          console.log('Elapsed time (seconds):', elapsed);
          console.log('Calculated remaining time:', remainingTime);

          if (remainingTime > 30) { // Give at least 30 seconds buffer
            userStartedAt = existingState.startedAt;
            initialTimeLeft = remainingTime;
            console.log(`Resuming test with ${initialTimeLeft} seconds remaining`);
          } else {
            console.log('Previous session expired or too little time left, starting fresh');
            // Clear the expired state
            await set(userTestStateRef, null);
          }
        }
      }

      console.log('Final timing decision:');
      console.log('- Start time:', new Date(userStartedAt).toISOString());
      console.log('- Initial time left:', initialTimeLeft);

      // Set the timing - but don't overwrite if resuming
      if (userStartedAt === now || !hasStartedTest.current) {
        await set(userTestStateRef, { startedAt: userStartedAt });
        hasStartedTest.current = true;
        console.log(`Test timing recorded: ${initialTimeLeft} seconds`);
      }

      // Set time left AFTER all calculations
      setTimeLeft(initialTimeLeft);

      // 8. Load ALL questions (for both regular and adaptive modes)
      const questionsRef = ref(database, `questions/${testId}`);
      const questionsSnapshot = await get(questionsRef);

      if (!questionsSnapshot.exists()) {
        console.warn('No questions found for this test.');
        navigate('/dashboard');
        return;
      }

      const questionsData = questionsSnapshot.val();
      const questionsArray: Question[] = Object.entries(questionsData).map(([id, q]: [string, any]) => {
        // Ensure all required fields exist and handle legacy data
        if (!q.question || !q.options || !Array.isArray(q.options) || typeof q.correctAnswer !== 'number') {
          console.warn(`Skipping invalid question ${id}:`, q);
          return null;
        }

        return {
          id,
          question: q.question,
          questionType: q.questionType || 'text', // Default to 'text' for backward compatibility
          imageUrl: q.imageUrl || undefined,
          codeContent: q.codeContent || undefined,
          codeLanguage: q.codeLanguage || 'javascript',
          options: [...q.options],
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty || 'medium', // Add difficulty for adaptive mode
          originalCorrectAnswerValue: q.options[q.correctAnswer],
        };
      }).filter(Boolean) as Question[]; // Remove null entries

      // Shuffle questions and options
      const shuffledQuestions = shuffleArray(questionsArray);
      const finalQuestions = shuffledQuestions.map(q => {
        const shuffledOptions = shuffleArray([...q.options]);
        const newCorrectAnswerIndex = shuffledOptions.findIndex(
          (opt) => opt === q.originalCorrectAnswerValue
        );
        return {
          ...q,
          options: shuffledOptions,
          correctAnswer: newCorrectAnswerIndex !== -1 ? newCorrectAnswerIndex : 0,
        };
      });

      setQuestions(finalQuestions);
      console.log(`Test ready: ${finalQuestions.length} questions loaded`);
      console.log(`Starting test with ${initialTimeLeft} seconds (${Math.floor(initialTimeLeft / 60)} minutes)`);

      // Start proctoring tracking and auto-enter fullscreen when test is ready
      setTimeout(() => {
        startTestTracking();
        enterFullscreen().catch(console.error);
      }, 1000);

    } catch (error) {
      console.error('Error fetching test data:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = <T extends any[]>(array: T): T => {
    const shuffled = [...array] as T;
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (testEnded) return;

    if (isAdaptiveMode && currentQuestion) {
      // Use adaptive answer handling
      handleAdaptiveAnswer(optionIndex);
    } else {
      // Legacy handling for non-adaptive tests
      const currentQId = questions[currentQuestionIndex].id;
      setAnswers(prev => ({
        ...prev,
        [currentQId]: optionIndex
      }));
    }
  };

  // Handle answer selection with adaptive logic
  const handleAdaptiveAnswer = async (selectedOption: number) => {
    if (!currentQuestion || !adaptiveState || submitting || testEnded) return;

    try {
      setSubmitting(true);

      const isCorrect = selectedOption === currentQuestion.correctAnswer;
      const responseTime = Date.now() - questionStartTime;

      // Store the answer
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: selectedOption
      }));

      console.log(`Question ${currentQuestion.id} answered:`, {
        selected: selectedOption,
        correct: currentQuestion.correctAnswer,
        isCorrect,
        responseTime: responseTime + 'ms',
        difficulty: currentQuestion.difficulty
      });

      // Process answer through adaptive system
      const updatedState = await adaptiveTestService.processAnswer(
        userData!.uid,
        testId!,
        currentQuestion.id,
        isCorrect,
        responseTime
      );

      setAdaptiveState(updatedState);

      // Brief pause to show user their selection
      await new Promise(resolve => setTimeout(resolve, 800));

      // Fetch next question
      const nextQuestion = await adaptiveTestService.fetchNextQuestion(
        testId!,
        userData!.uid,
        updatedState
      );

      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setQuestionStartTime(Date.now());
      } else {
        // No more questions available - submit test
        console.log('No more questions available, submitting test');
        await handleSubmitTest();
        return;
      }

    } catch (error) {
      console.error('Error handling adaptive answer:', error);
      // Fall back to regular behavior on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTest = async (forceScore?: number) => {
    console.log('handleSubmitTest called', forceScore !== undefined ? `with forced score: ${forceScore}` : '');

    if (submitting) {
      console.log('Already submitting, ignoring duplicate call');
      return;
    }

    if (!userData?.uid || !testId) {
      console.error('Missing required data:', { uid: userData?.uid, testId });
      alert('Missing user or test information. Please refresh and try again.');
      return;
    }

    const answeredCount = Object.keys(answers).length;
    console.log('Answered questions count:', answeredCount);

    if (answeredCount === 0 && forceScore === undefined) {
      alert('Please answer at least one question before submitting the test.');
      return;
    }

    console.log('Starting test submission...');
    setSubmitting(true);

    // Don't set testEnded here, set it only after successful submission

    try {
      let score = 0;

      console.log('=== SCORE CALCULATION DEBUG ===');
      console.log('Questions array:', questions.map(q => ({ id: q.id, correctAnswer: q.correctAnswer })));
      console.log('User answers:', answers);
      console.log('Force score provided:', forceScore);

      // If forceScore is provided (for violations), use it. Otherwise calculate normally.
      if (forceScore !== undefined) {
        score = forceScore;
        console.log('Using forced score:', score);
      } else {
        questions.forEach((question, index) => {
          const userAnswer = answers[question.id];
          const isCorrect = userAnswer !== undefined && userAnswer === question.correctAnswer;
          console.log(`Question ${index + 1} (ID: ${question.id}):`);
          console.log(`  User answer: ${userAnswer} (type: ${typeof userAnswer})`);
          console.log(`  Correct answer: ${question.correctAnswer} (type: ${typeof question.correctAnswer})`);
          console.log(`  Is correct: ${isCorrect}`);

          if (isCorrect) {
            score++;
            console.log(`  Score incremented to: ${score}`);
          }
        });
        console.log('Final calculated score:', score);
      }

      // Deep sanitization function to remove React Fiber properties
      const deepSanitize = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(deepSanitize);
        }

        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key) &&
            !key.startsWith('__') &&
            !key.startsWith('_react') &&
            key !== 'target' &&
            key !== 'currentTarget') {
            sanitized[key] = deepSanitize(obj[key]);
          }
        }
        return sanitized;
      };

      // Create detailed answers with both indices and values for proper result comparison
      const detailedAnswers: Record<string, { index: number; value: string; isCorrect: boolean }> = {};

      questions.forEach(question => {
        const userAnswerIndex = answers[question.id];
        if (userAnswerIndex !== undefined) {
          detailedAnswers[question.id] = {
            index: userAnswerIndex,
            value: question.options[userAnswerIndex],
            isCorrect: userAnswerIndex === question.correctAnswer
          };
        }
      });

      // Create clean response data with only primitive values
      const responseData = {
        score: Number(score),
        totalQuestions: Number(questions.length),
        answers: deepSanitize(answers), // Keep for backward compatibility
        detailedAnswers: deepSanitize(detailedAnswers), // New detailed format
        completedAt: new Date().toISOString(),
        timeSpent: Number(test!.duration * 60 - timeLeft),
        terminatedDueToViolations: Boolean(forceScore === 0),
      };

      // Add comprehensive debug logging
      console.log('Pre-sanitization answers:', JSON.stringify(answers, null, 2));
      console.log('Post-sanitization responseData:', JSON.stringify(responseData, null, 2));

      // Additional safety check - convert to JSON and back to ensure clean serialization
      const finalResponseData = JSON.parse(JSON.stringify(responseData));
      console.log('Final cleaned responseData:', JSON.stringify(finalResponseData, null, 2));

      const responseRef = ref(database, `responses/${testId}/${userData.uid}`);
      await set(responseRef, finalResponseData);

      // Update counters
      try {
        const testAttemptsRef = ref(database, `tests/${testId}/timesAttempted`);
        await runTransaction(testAttemptsRef, (currentAttempts) => {
          return (currentAttempts || 0) + 1;
        });
      } catch (error) {
        console.error('Error updating test attempts:', error);
      }

      try {
        const userCompletedTestsRef = ref(database, `users/${userData.uid}/testsCompleted`);
        await runTransaction(userCompletedTestsRef, (currentCompleted) => {
          return (currentCompleted || 0) + 1;
        });
      } catch (error) {
        console.error('Error updating user completed tests:', error);
      }

      // Clear user test state
      try {
        await set(ref(database, `userTestStates/${userData.uid}/${testId}`), null);
      } catch (error) {
        console.error('Error clearing user test state:', error);
      }

      // Exit fullscreen and stop proctoring when test is submitted
      try {
        stopProctoring();
        await exitFullscreen();
        console.log('Stopped proctoring and exited fullscreen after test submission');
      } catch (error) {
        console.error('Error stopping proctoring or exiting fullscreen:', error);
      }

      navigate(`/result/${testId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      setSubmitting(false);
      setTestEnded(false);
    }
  };

  const handleTestTermination = () => {
    console.log('Test terminated due to proctoring violations - submitting with score 0');
    setTestEnded(true);
    handleSubmitTest(0); // Force score to 0 for violation termination
  };

  const handleForceRestart = () => {
    const currentUrl = window.location.pathname;
    window.location.href = `${currentUrl}?restart=true`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  // Function to get all unanswered questions
  const getUnansweredQuestions = () => {
    const unanswered: number[] = [];
    questions.forEach((question, index) => {
      if (answers[question.id] === undefined) {
        unanswered.push(index);
      }
    });
    return unanswered;
  };

  // Function to handle submit with incomplete check
  const handleSubmitAttempt = () => {
    const unansweredQuestions = getUnansweredQuestions();

    if (unansweredQuestions.length > 0) {
      // Show warning animation
      setIncompleteQuestions(unansweredQuestions);
      setShowIncompleteWarning(true);

      // Auto-hide the warning after 5 seconds
      setTimeout(() => {
        setShowIncompleteWarning(false);
      }, 5000);

      // Don't proceed with submission
      return;
    }

    // All questions answered, proceed with normal submission
    handleSubmitTest();
  };

  // Function to go to first unanswered question
  const goToFirstUnansweredQuestion = () => {
    const unansweredQuestions = getUnansweredQuestions();
    if (unansweredQuestions.length > 0) {
      setCurrentQuestionIndex(unansweredQuestions[0]);
      setShowIncompleteWarning(false);
    }
  };

  // Calculator functions
  const handleCalculatorButtonClick = (value: string) => {
    if (testEnded) return;

    switch (value) {
      case '=':
        calculateResult();
        break;
      case 'C':
        clearCalculator();
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        handleOperator(value);
        break;
      default:
        handleNumber(value);
        break;
    }
  };

  const handleNumber = (num: string) => {
    if (calculatorWaitingForNewValue) {
      // Start a new operand after an operator, but keep the existing expression prefix
      setCalculatorDisplay(num);
      setCalculatorWaitingForNewValue(false);
      setCalculatorExpression(prev => {
        if (prev === '') return num;
        return prev + num; // append to existing "... op "
      });
    } else {
      setCalculatorDisplay(prev => (prev === '0' ? num : prev + num));
      setCalculatorExpression(prev => (prev === '' ? num : prev + num));
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(calculatorDisplay);

    if (calculatorPrevValue === null) {
      // First operator in a sequence: establish prev value and append operator to expression
      setCalculatorPrevValue(inputValue);
      setCalculatorExpression(prev => {
        const base = prev === '' ? String(inputValue) : prev;
        return base.replace(/\s+$/, '') + ' ' + nextOperator + ' ';
      });
    } else if (calculatorOperation) {
      // Chain calculation: compute intermediate result, show it, then append next operator
      const currentValue = calculatorPrevValue || 0;
      const newValue = calculate(currentValue, inputValue, calculatorOperation);

      setCalculatorDisplay(String(newValue));
      setCalculatorPrevValue(newValue);
      setCalculatorExpression(`${String(newValue)} ${nextOperator} `);
    }

    setCalculatorWaitingForNewValue(true);
    setCalculatorOperation(nextOperator);
  };

  const calculateResult = () => {
    const inputValue = parseFloat(calculatorDisplay);

    if (calculatorPrevValue !== null && calculatorOperation) {
      const newValue = calculate(calculatorPrevValue, inputValue, calculatorOperation);
      const exprRaw = calculatorExpression.trim();
      const exprPretty = exprRaw.replace(/\*/g, '×').replace(/\//g, '÷');
      const resultStr = String(newValue);

      // Update display and expression line to show full equation
      setCalculatorDisplay(resultStr);
      setCalculatorExpression(`${exprPretty} = ${resultStr}`);

      // Push to history (latest first, cap at 25)
      setCalculatorHistory(prev => [{ expression: exprPretty, result: resultStr }, ...prev].slice(0, 25));

      setCalculatorPrevValue(null);
      setCalculatorOperation(null);
      setCalculatorWaitingForNewValue(true);
    }
  };

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      default:
        return secondValue;
    }
  };

  const clearCalculator = () => {
    setCalculatorDisplay('0');
    setCalculatorExpression('');
    setCalculatorPrevValue(null);
    setCalculatorOperation(null);
    setCalculatorWaitingForNewValue(false);
  };

  // Function to render question content with proper formatting
  const renderQuestionContent = (question: Question) => {
    if (question.questionType === 'code' && question.codeContent) {
      // Split question text to show text before/after code block
      const parts = question.question.split(/```\w*\n[\s\S]*?```/);
      return (
        <div className="space-y-3">
          {parts[0] && <p className="text-lg font-medium text-gray-900">{parts[0].trim()}</p>}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 border-b">
              {question.codeLanguage}
            </div>
            <SyntaxHighlighter
              language={question.codeLanguage}
              style={tomorrow}
              customStyle={{ margin: 0, fontSize: '14px' }}
            >
              {question.codeContent}
            </SyntaxHighlighter>
          </div>
          {parts[1] && <p className="text-lg font-medium text-gray-900">{parts[1].trim()}</p>}
        </div>
      );
    }

    if (question.questionType === 'image' && question.imageUrl) {
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">{question.question}</h2>
          <img
            src={question.imageUrl}
            alt="Question image"
            className="max-w-full h-auto rounded-lg border"
            style={{ maxHeight: '400px' }}
          />
        </div>
      );
    }

    return <h2 className="text-lg font-medium text-gray-900">{question.question}</h2>;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonTestLoading />
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center card-modern glass p-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 float-animation" />
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Test not available</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">This test is not currently accessible or contains no questions.</p>


            <div className="mt-6 space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-modern btn-primary-modern"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleForceRestart}
                className="btn-modern bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Force Restart Test</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-16">

        {/* Proctoring Status */}
        {!deviceIsMobile ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className={`h-5 w-5 ${proctorState.isFullscreen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Test Proctoring Active
                  </p>
                  <p className="text-xs text-blue-700">
                    {proctorState.isFullscreen ? '✓ Fullscreen mode active' : '⚠ Please enter fullscreen mode'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {proctorState.violationCount > 0 && (
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Violations: {proctorState.violationCount}/3
                  </p>
                )}
                {!proctorState.isFullscreen && (
                  <button
                    onClick={enterFullscreen}
                    className="mt-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Enter Fullscreen
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`border rounded-lg p-4 mb-6 ${proctorState.violationCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-orange-50 border-orange-200'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className={`h-5 w-5 ${proctorState.violationCount > 0 ? 'text-red-600' : 'text-orange-600'
                  }`} />
                <div>
                  <p className={`text-sm font-medium ${proctorState.violationCount > 0 ? 'text-red-900' : 'text-orange-900'
                    }`}>
                    Mobile Anti-Cheat Active
                  </p>
                  <p className={`text-xs ${proctorState.violationCount > 0 ? 'text-red-700' : 'text-orange-700'
                    }`}>
                    🔒 Split screen, minimize, app switching, one-handed mode detection
                  </p>
                  {proctorState.violationCount > 0 && (
                    <p className="text-xs text-red-800 font-medium mt-1">
                      ⚠️ Cheating attempts detected! Test will auto-submit at 3 violations.
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {proctorState.violationCount > 0 && (
                  <p className={`text-sm font-medium ${proctorState.violationCount > 0 ? 'text-red-900' : 'text-orange-900'
                    }`}>
                    Violations: {proctorState.violationCount}/3
                  </p>
                )}
                {proctorState.violationCount >= 2 && (
                  <p className="text-xs text-red-700 font-bold mt-1">
                    FINAL WARNING!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Adaptive Test Info */}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>Answered: {getAnsweredCount()}/{questions.length}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600">
                {isAdaptiveMode
                  ? `Adaptive Question #${(adaptiveState?.askedQuestionIds?.length || 0) + 1}`
                  : `Question ${currentQuestionIndex + 1} of ${questions.length}`
                }
              </span>
            </div>
            {isAdaptiveMode && adaptiveState && adaptiveState.correctStreak >= 1 && (
              <div className="flex items-center space-x-1 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">
                  {adaptiveState.correctStreak === 1 ? 'Good streak!' : `${adaptiveState.correctStreak} in a row!`}
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            {questions.length > 0 && renderQuestionContent(questions[currentQuestionIndex])}
          </div>

          <div className="space-y-3">
            {questions[currentQuestionIndex]?.options.map((option, index) => {
              const currentQ = questions[currentQuestionIndex];
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={testEnded || submitting}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${answers[currentQ?.id] === index
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${testEnded || submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium mr-3 ${answers[currentQ?.id] === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                      }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0 || testEnded}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex space-x-4">
            {currentQuestionIndex === questions.length - 1 ? (
              <div className="relative">
                <button
                  onClick={handleSubmitAttempt}
                  disabled={submitting || testEnded || timeLeft === 0}
                  className={`px-6 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 ${showIncompleteWarning
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  <CheckCircle className={`h-4 w-4 ${showIncompleteWarning ? 'animate-bounce' : ''
                    }`} />
                  <span>
                    {submitting
                      ? 'Submitting...'
                      : showIncompleteWarning
                        ? `Answer ${incompleteQuestions.length} Missing Questions!`
                        : 'Submit Test'
                    }
                  </span>
                </button>

                {/* Incomplete Warning Tooltip */}
                {showIncompleteWarning && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
                    <div className="bg-red-600 text-white text-sm rounded-lg p-4 shadow-lg animate-fadeInUp">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">Incomplete Test!</h4>
                          <p className="text-xs mb-2">
                            You have {incompleteQuestions.length} unanswered question{incompleteQuestions.length !== 1 ? 's' : ''}: {incompleteQuestions.map(i => i + 1).join(', ')}
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={goToFirstUnansweredQuestion}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-medium px-3 py-1 rounded transition-colors"
                            >
                              Go to Question {incompleteQuestions[0] + 1}
                            </button>
                            <button
                              onClick={() => {
                                setShowIncompleteWarning(false);
                                handleSubmitTest();
                              }}
                              className="bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium px-3 py-1 rounded transition-colors"
                            >
                              Submit Anyway
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowIncompleteWarning(false)}
                          className="text-red-200 hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Arrow pointing down */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                disabled={testEnded}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* Question Navigation */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                disabled={testEnded}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers[q.id] !== undefined
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : showIncompleteWarning && incompleteQuestions.includes(index)
                      ? 'bg-red-200 text-red-800 hover:bg-red-300 animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${testEnded ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Adaptive Mode Progress */}
        {
          isAdaptiveMode && adaptiveState && adaptiveState.difficultyFlow && adaptiveState.difficultyFlow.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Difficulty Journey</h3>
              <div className="flex items-center space-x-2 overflow-x-auto">
                {adaptiveState.difficultyFlow.slice(-10).map((entry, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${entry.wasCorrect
                      ? 'bg-green-100 text-green-800 border-2 border-green-300'
                      : 'bg-red-100 text-red-800 border-2 border-red-300'
                      }`}
                    title={`${entry.difficulty.toUpperCase()} - ${entry.wasCorrect ? 'Correct' : 'Wrong'}`}
                  >
                    {entry.difficulty.charAt(0).toUpperCase()}
                  </div>
                ))}
                {adaptiveState.difficultyFlow.length > 10 && (
                  <span className="text-xs text-gray-500 ml-2">+{adaptiveState.difficultyFlow.length - 10} more</span>
                )}
              </div>
            </div>
          )
        }
      </div>

      {/* Calculator Toggle Button */}
      <button
        onClick={() => setShowCalculator(!showCalculator)}
        disabled={testEnded}
        className="fixed bottom-4 left-4 sm:left-auto sm:right-4 bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-40"
        title="Calculator"
      >
        <Calculator className="h-6 w-6" />
      </button>

      {/* Calculator Widget */}
      {showCalculator && (
        <div className="fixed bottom-20 left-4 sm:left-auto sm:right-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-4 w-72 z-50 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Calculator</h4>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Calculator Display */}
          <div className="bg-gray-100 dark:bg-slate-800/80 rounded p-3 mb-2 text-right font-mono border border-gray-200 dark:border-slate-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 min-h-[1.25rem] overflow-x-auto whitespace-nowrap">{(calculatorExpression || '\u00A0').replace(/\*/g, '×').replace(/\//g, '÷')}</div>
            <div className="text-2xl text-gray-900 dark:text-gray-100">{calculatorDisplay}</div>
          </div>

          {/* History */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">History</span>
              <button
                onClick={() => setCalculatorHistory([])}
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Clear history"
              >
                Clear
              </button>
            </div>
            <div className="max-h-16 overflow-y-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2">
              {calculatorHistory.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No history yet</p>
              ) : (
                <ul className="space-y-1">
                  {calculatorHistory.map((h, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300 mr-2 truncate">{h.expression} =</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">{h.result}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => clearCalculator()}
              className="col-span-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white py-2 rounded font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('/')}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 rounded font-medium"
            >
              ÷
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('*')}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 rounded font-medium"
            >
              ×
            </button>

            <button
              onClick={() => handleCalculatorButtonClick('7')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              7
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('8')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              8
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('9')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              9
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('-')}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 rounded font-medium"
            >
              −
            </button>

            <button
              onClick={() => handleCalculatorButtonClick('4')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              4
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('5')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              5
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('6')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              6
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('+')}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 rounded font-medium"
            >
              +
            </button>

            <button
              onClick={() => handleCalculatorButtonClick('1')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              1
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('2')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              2
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('3')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              3
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('=')}
              className="row-span-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded font-medium"
            >
              =
            </button>

            <button
              onClick={() => handleCalculatorButtonClick('0')}
              className="col-span-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              0
            </button>
            <button
              onClick={() => handleCalculatorButtonClick('.')}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded font-medium"
            >
              .
            </button>
          </div>
        </div>
      )}

      {/* Proctoring Warning Modal */}
      <ProctorWarning
        violationCount={proctorState.violationCount}
        maxViolations={3}
        violations={proctorState.violations}
        isVisible={showProctorWarning}
        onClose={() => setShowProctorWarning(false)}
        onForceExit={() => {
          setShowProctorWarning(false);
          handleTestTermination();
        }}
      />
    </div>
  );
};

export default TestInterface;
