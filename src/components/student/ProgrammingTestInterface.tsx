import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Play,
    Send,
    Clock,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Loader,
    ArrowLeft
} from 'lucide-react';
import CodeEditor from '../common/CodeEditor';
import { hackerEarthService } from '../../services/hackerEarthService';
import {
    ProgrammingTest,
    TestCase,
    ProgrammingLanguage,
    CodeSubmission,
    TestCaseResult,
    SubmissionVerdict
} from '../../types/programmingTestTypes';

const ProgrammingTestInterface: React.FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [test, setTest] = useState<ProgrammingTest | null>(null);
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('python');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [results, setResults] = useState<TestCaseResult[] | null>(null);
    const [verdict, setVerdict] = useState<SubmissionVerdict | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set());
    const [isRunOnly, setIsRunOnly] = useState(false);
    const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!testId) return;

        const fetchTestData = async () => {
            try {
                const testRef = ref(database, `programmingTests/${testId}`);
                const testSnapshot = await get(testRef);

                if (!testSnapshot.exists()) {
                    navigate('/dashboard');
                    return;
                }

                const testData: ProgrammingTest = {
                    id: testId,
                    ...testSnapshot.val()
                };

                setTest(testData);

                if (testData.supportedLanguages.length > 0) {
                    setSelectedLanguage(testData.supportedLanguages[0]);
                    setCode(testData.starterCode[testData.supportedLanguages[0]] || '');
                }

                const testCasesRef = ref(database, `programmingTestCases/${testId}`);
                const testCasesSnapshot = await get(testCasesRef);

                if (testCasesSnapshot.exists()) {
                    const testCasesData = testCasesSnapshot.val();
                    const testCasesArray: TestCase[] = Object.values(testCasesData);
                    setTestCases(testCasesArray);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching test data:', error);
                setLoading(false);
            }
        };

        fetchTestData();
    }, [testId, navigate]);

    const handleLanguageChange = (lang: ProgrammingLanguage) => {
        setSelectedLanguage(lang);
        if (test?.starterCode[lang]) {
            setCode(test.starterCode[lang]);
        }
    };

    const wrapCodeWithDriver = (sourceCode: string, language: ProgrammingLanguage, functionName: string, testCaseInput: string) => {
        if (language === 'python') {
            return `${sourceCode}\n\nimport sys, json\ntry:\n    input_str = '''${testCaseInput}'''\n    # Try to parse as JSON first (for lists/dicts)\n    try:\n        args = json.loads(input_str)\n        if isinstance(args, list):\n            print(${functionName}(*args))\n        elif isinstance(args, dict):\n            print(${functionName}(**args))\n        else:\n            print(${functionName}(args))\n    except:\n        # Fallback: split by space and try to convert to numbers\n        parts = input_str.split()\n        typed_parts = []\n        for p in parts:\n            try:\n                if '.' in p: typed_parts.append(float(p))\n                else: typed_parts.append(int(p))\n            except: typed_parts.append(p)\n        \n        if len(typed_parts) == 0:\n            print(${functionName}())\n        elif len(typed_parts) == 1:\n            print(${functionName}(typed_parts[0]))\n        else:\n            print(${functionName}(*typed_parts))\nexcept Exception as e:\n    sys.stderr.write(str(e))\n    sys.exit(1)`;
        }
        return sourceCode;
    };

    const handleRunCode = async () => {
        if (!test || !currentUser) return;

        setExecuting(true);
        setIsRunOnly(true);
        setResults(null);
        setVerdict(null);

        try {
            const sampleTestCases = testCases.filter(tc => tc.isSample);
            const executionResults: any[] = [];

            for (const tc of sampleTestCases) {
                const wrappedCode = wrapCodeWithDriver(code, selectedLanguage, test.functionName, tc.input);
                const result = await hackerEarthService.executeCode({
                    language: selectedLanguage,
                    sourceCode: wrappedCode,
                    input: '', // Input is now injected via driver code
                    timeLimit: test.timeLimit,
                    memoryLimit: test.memoryLimit
                });
                executionResults.push(result);
            }

            const testCaseResults: TestCaseResult[] = sampleTestCases.map((tc, index) => {
                const execResult = executionResults[index];
                const passed = execResult.output?.trim() === tc.expectedOutput.trim();

                return {
                    testCaseId: tc.id,
                    status: execResult.compilationError ? 'Error' : (passed ? 'Passed' : 'Failed'),
                    executionTime: execResult.executionTime,
                    memoryUsed: execResult.memoryUsed,
                    output: execResult.output,
                    expectedOutput: tc.expectedOutput,
                    error: execResult.error || execResult.compilationError,
                    input: tc.input
                };
            });

            setResults(testCaseResults);

            const hasCompilationError = testCaseResults.some(r => r.error?.includes('Compilation'));
            const hasRuntimeError = testCaseResults.some(r => r.status === 'Error');
            const hasTimeout = testCaseResults.some(r => r.status === 'Timeout');
            const allPassed = testCaseResults.every(r => r.status === 'Passed');

            if (hasCompilationError) {
                setVerdict('Compilation Error');
            } else if (hasTimeout) {
                setVerdict('Time Limit Exceeded');
            } else if (hasRuntimeError) {
                setVerdict('Runtime Error');
            } else if (allPassed) {
                setVerdict('Accepted');
            } else {
                setVerdict('Wrong Answer');
            }

        } catch (error) {
            console.error('Error running code:', error);
            setVerdict('Runtime Error');
        } finally {
            setExecuting(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!test || !currentUser) return;

        setExecuting(true);
        setIsRunOnly(false);
        setResults(null);
        setVerdict(null);

        try {
            const executionResults: any[] = [];

            for (const tc of testCases) {
                const wrappedCode = wrapCodeWithDriver(code, selectedLanguage, test.functionName, tc.input);
                const result = await hackerEarthService.executeCode({
                    language: selectedLanguage,
                    sourceCode: wrappedCode,
                    input: '',
                    timeLimit: test.timeLimit,
                    memoryLimit: test.memoryLimit
                });
                executionResults.push(result);
            }

            const testCaseResults: TestCaseResult[] = testCases.map((tc, index) => {
                const execResult = executionResults[index];
                const passed = execResult.output?.trim() === tc.expectedOutput.trim();

                return {
                    testCaseId: tc.id,
                    status: execResult.compilationError ? 'Error' : (passed ? 'Passed' : 'Failed'),
                    executionTime: execResult.executionTime,
                    memoryUsed: execResult.memoryUsed,
                    output: execResult.output,
                    expectedOutput: tc.expectedOutput,
                    error: execResult.error || execResult.compilationError,
                    input: tc.isSample ? tc.input : undefined
                };
            });

            setResults(testCaseResults);

            const passedCount = testCaseResults.filter(r => r.status === 'Passed').length;

            const rawTotalTime = testCaseResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
            const totalTime = isFinite(rawTotalTime) ? rawTotalTime : 0;

            const memoryValues = testCaseResults.map(r => r.memoryUsed || 0).filter(m => isFinite(m));
            const totalMemory = memoryValues.length > 0 ? Math.max(...memoryValues) : 0;

            const score = (passedCount / testCases.length) * 100;

            const hasCompilationError = testCaseResults.some(r => r.error?.includes('Compilation'));
            const hasRuntimeError = testCaseResults.some(r => r.status === 'Error');
            const hasTimeout = testCaseResults.some(r => r.status === 'Timeout');
            const allPassed = testCaseResults.every(r => r.status === 'Passed');

            let finalVerdict: SubmissionVerdict;
            if (hasCompilationError) {
                finalVerdict = 'Compilation Error';
            } else if (hasTimeout) {
                finalVerdict = 'Time Limit Exceeded';
            } else if (hasRuntimeError) {
                finalVerdict = 'Runtime Error';
            } else if (allPassed) {
                finalVerdict = 'Accepted';
            } else {
                finalVerdict = 'Wrong Answer';
            }

            setVerdict(finalVerdict);

            const submission: Omit<CodeSubmission, 'studentName' | 'studentEmail'> = {
                testId: testId!,
                studentId: currentUser.uid,
                language: selectedLanguage,
                code,
                submittedAt: new Date().toISOString(),
                results: testCaseResults,
                overallVerdict: finalVerdict,
                totalTime,
                totalMemory,
                passedCount,
                totalCount: testCases.length,
                score,
                isRunOnly: false
            };

            const submissionRef = ref(database, `programmingSubmissions/${testId}/${currentUser.uid}`);
            await set(submissionRef, submission);

        } catch (error) {
            console.error('Error submitting code:', error);
            setVerdict('Runtime Error');
        } finally {
            setExecuting(false);
        }
    };

    const toggleTestCase = (testCaseId: string) => {
        setExpandedTestCases(prev => {
            const newSet = new Set(prev);
            if (newSet.has(testCaseId)) {
                newSet.delete(testCaseId);
            } else {
                newSet.add(testCaseId);
            }
            return newSet;
        });
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-500';
            case 'medium': return 'text-yellow-500';
            case 'hard': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!test) {
        return (
            <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">Test not found</p>
                    <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-500 hover:underline">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const sampleTestCases = testCases.filter(tc => tc.isSample);

    return (
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            {/* Top Navigation Bar - LeetCode Style */}
            <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-sm font-medium text-gray-900 dark:text-white">{test.title}</h1>
                <div className="ml-auto flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(elapsedTime)}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
                    {/* Tabs */}
                    <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                        <button
                            onClick={() => setActiveTab('description')}
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'description'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Description
                        </button>
                        <button
                            onClick={() => setActiveTab('submissions')}
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'submissions'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Submissions
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'description' && (
                            <div className="space-y-4">
                                {/* Difficulty Badge */}
                                <div className="flex items-center space-x-2">
                                    <span className={`text-sm font-medium capitalize ${getDifficultyColor(test.difficulty)}`}>
                                        {test.difficulty}
                                    </span>
                                </div>

                                {/* Problem Statement */}
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {test.problemStatement}
                                    </p>
                                </div>

                                {/* Examples */}
                                {sampleTestCases.length > 0 && (
                                    <div className="space-y-3">
                                        {sampleTestCases.map((tc, index) => (
                                            <div key={tc.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                                    Example {index + 1}:
                                                </p>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Input:</p>
                                                        <pre className="text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono">
                                                            {tc.input}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Output:</p>
                                                        <pre className="text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono">
                                                            {tc.expectedOutput}
                                                        </pre>
                                                    </div>
                                                    {tc.explanation && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Explanation:</p>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300">{tc.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Constraints */}
                                {test.constraints && (
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Constraints:</p>
                                        <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                                            {test.constraints}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'submissions' && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>No submissions yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Code Editor */}
                <div className="w-1/2 flex flex-col bg-white dark:bg-gray-900">
                    {/* Editor Header */}
                    <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
                        <select
                            value={selectedLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value as ProgrammingLanguage)}
                            className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {test.supportedLanguages.map(lang => (
                                <option key={lang} value={lang}>
                                    {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 overflow-hidden">
                        <CodeEditor
                            language={selectedLanguage}
                            value={code}
                            onChange={setCode}
                            height="100%"
                        />
                    </div>

                    {/* Bottom Panel - Test Results */}
                    {results && (
                        <div className="h-64 border-t border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                            <div className="p-4">
                                {/* Verdict */}
                                {verdict && (
                                    <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${verdict === 'Accepted'
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                        }`}>
                                        <div className="flex items-center">
                                            {verdict === 'Accepted' ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                                            )}
                                            <span className={`font-semibold ${verdict === 'Accepted'
                                                ? 'text-green-700 dark:text-green-300'
                                                : 'text-red-700 dark:text-red-300'
                                                }`}>
                                                {verdict}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {results.filter(r => r.status === 'Passed').length} / {results.length} passed
                                        </span>
                                    </div>
                                )}

                                {/* Test Cases */}
                                <div className="space-y-2">
                                    {results.map((result, index) => {
                                        const testCase = testCases[index];
                                        const isExpanded = expandedTestCases.has(result.testCaseId);

                                        return (
                                            <div key={result.testCaseId} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => toggleTestCase(result.testCaseId)}
                                                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        {result.status === 'Passed' ? (
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                        )}
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            Case {index + 1}
                                                            {testCase?.isSample && <span className="ml-2 text-xs text-gray-500">(Sample)</span>}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {result.executionTime.toFixed(0)}ms
                                                        </span>
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                                                        {result.input && (
                                                            <div>
                                                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Input:</p>
                                                                <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                    {result.input}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Output:</p>
                                                            <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {result.output || result.error || 'No output'}
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expected:</p>
                                                            <pre className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {result.expectedOutput}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="h-14 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end px-4 space-x-3 bg-white dark:bg-gray-900">
                        <button
                            onClick={handleRunCode}
                            disabled={executing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {executing && isRunOnly ? (
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Run
                        </button>
                        <button
                            onClick={handleSubmitCode}
                            disabled={executing}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {executing && !isRunOnly ? (
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgrammingTestInterface;
