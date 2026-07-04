import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { X, Plus, Trash2, AlertCircle, Code, Play, CheckCircle } from 'lucide-react';
import { database } from '../../lib/firebase';
import {
    ProgrammingTest,
    TestCase,
    ProgrammingLanguage,
    ProblemDifficulty,
    StarterCode
} from '../../types/programmingTestTypes';

interface CreateProgrammingTestModalProps {
    onClose: () => void;
    onTestCreated: () => void;
}



const CreateProgrammingTestModal: React.FC<CreateProgrammingTestModalProps> = ({
    onClose,
    onTestCreated
}) => {
    const [testData, setTestData] = useState({
        title: '',
        description: '',
        problemStatement: '',
        constraints: '',
        functionName: '',
        functionParams: 'a, b',
        timeLimit: 2,
        memoryLimit: 256,
        difficulty: 'medium' as ProblemDifficulty,
        timeComplexity: '',
        spaceComplexity: '',
        startTime: '',
        endTime: ''
    });

    const [selectedLanguages, setSelectedLanguages] = useState<ProgrammingLanguage[]>(['python']);
    const [testCases, setTestCases] = useState<Omit<TestCase, 'id'>[]>([
        { input: '', expectedOutput: '', isSample: true, explanation: '' },
        { input: '', expectedOutput: '', isSample: true, explanation: '' },
        { input: '', expectedOutput: '', isSample: true, explanation: '' }
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTestDataChange = (field: string, value: string | number) => {
        setTestData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLanguageToggle = (language: ProgrammingLanguage) => {
        setSelectedLanguages(prev => {
            if (prev.includes(language)) {
                if (prev.length === 1) return prev;
                return prev.filter(lang => lang !== language);
            } else {
                return [...prev, language];
            }
        });
    };

    const handleTestCaseChange = (index: number, field: keyof Omit<TestCase, 'id'>, value: string | boolean) => {
        const newTestCases = [...testCases];
        newTestCases[index] = {
            ...newTestCases[index],
            [field]: value
        };
        setTestCases(newTestCases);
    };

    const addTestCase = (isSample: boolean = false) => {
        const newTestCase: any = {
            input: '',
            expectedOutput: '',
            isSample
        };

        // Only add explanation field for sample test cases
        if (isSample) {
            newTestCase.explanation = '';
        }

        setTestCases(prev => [...prev, newTestCase]);
    };

    const removeTestCase = (index: number) => {
        if (testCases.length <= 3) return;
        setTestCases(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        setError('');

        if (!testData.title.trim()) {
            setError('Test title is required.');
            return false;
        }

        if (!testData.problemStatement.trim()) {
            setError('Problem statement is required.');
            return false;
        }

        if (!testData.functionName.trim()) {
            setError('Function name is required.');
            return false;
        }

        if (!testData.startTime) {
            setError('Start time is required.');
            return false;
        }

        if (!testData.endTime) {
            setError('End time is required.');
            return false;
        }

        const startDate = new Date(testData.startTime);
        const endDate = new Date(testData.endTime);
        const now = new Date();

        if (startDate <= now) {
            setError('Start time must be in the future.');
            return false;
        }

        if (endDate <= startDate) {
            setError('End time must be after the start time.');
            return false;
        }

        if (selectedLanguages.length === 0) {
            setError('At least one programming language must be selected.');
            return false;
        }

        if (testCases.length < 3) {
            setError('At least 3 test cases are required.');
            return false;
        }

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            if (!tc.expectedOutput.trim()) {
                setError(`Test case ${i + 1} must have an expected output.`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const testRef = push(ref(database, 'programmingTests'));
            const testId = testRef.key!;

            const generateStarterCode = (lang: ProgrammingLanguage, funcName: string, params: string): string => {
                const name = funcName.trim() || 'solution';
                const p = params.trim() || 'a, b';
                switch (lang) {
                    case 'python':
                        return `def ${name}(${p}):\n    # Write your code here\n    # Example: return a + b\n    pass`;
                    case 'c':
                        return `#include <stdio.h>\n\n// Implement the function\n// Example: int ${name}(int a, int b) { return a + b; }\n\nint main() {\n    // Testing code here\n    return 0;\n}`;
                    case 'cpp':
                        return `#include <iostream>\nusing namespace std;\n\n// Implement the function\n// Example: int ${name}(int a, int b) { return a + b; }\n\nint main() {\n    // Testing code here\n    return 0;\n}`;
                    case 'java':
                        return `public class Solution {\n    // Implement the function\n    // public static int ${name}(int a, int b) { return a + b; }\n\n    public static void main(String[] args) {\n        // Testing code here\n    }\n}`;
                    default:
                        return '';
                }
            };

            const starterCode: StarterCode = {};
            selectedLanguages.forEach(lang => {
                starterCode[lang] = generateStarterCode(lang, testData.functionName, testData.functionParams);
            });

            const sampleCount = testCases.filter(tc => tc.isSample).length;

            const programmingTest: Omit<ProgrammingTest, 'id' | 'testCases'> = {
                title: testData.title,
                description: testData.description,
                problemStatement: testData.problemStatement,
                constraints: testData.constraints,
                functionName: testData.functionName,
                timeLimit: testData.timeLimit,
                memoryLimit: testData.memoryLimit,
                difficulty: testData.difficulty,
                supportedLanguages: selectedLanguages,
                starterCode,
                timeComplexity: testData.timeComplexity || undefined,
                spaceComplexity: testData.spaceComplexity || undefined,
                startTime: testData.startTime,
                endTime: testData.endTime,
                createdAt: new Date().toISOString(),
                testType: 'programming',
                totalTestCases: testCases.length,
                sampleTestCases: sampleCount
            };

            await set(testRef, programmingTest);

            const testCasesRef = ref(database, `programmingTestCases/${testId}`);
            const testCasesData: Record<string, any> = {};

            testCases.forEach((tc, index) => {
                const tcId = `tc${index + 1}`;
                const testCaseData: any = {
                    id: tcId,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isSample: tc.isSample
                };

                // Only add explanation if it exists and is not undefined
                if (tc.explanation !== undefined && tc.explanation !== null && tc.explanation !== '') {
                    testCaseData.explanation = tc.explanation;
                }

                testCasesData[tcId] = testCaseData;
            });

            await set(testCasesRef, testCasesData);

            onTestCreated();
        } catch (err) {
            console.error('Error creating programming test:', err);
            setError('Failed to create programming test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sampleTestCases = testCases.filter(tc => tc.isSample);
    const hiddenTestCases = testCases.filter(tc => !tc.isSample);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            <div className="card-modern w-full max-w-5xl my-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-themed-border bg-gradient-to-r from-purple-600 to-blue-600 sticky top-0 z-10">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white rounded-lg flex items-center justify-center">
                            <Code className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white">Create Programming Test</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 rounded-lg p-2 hover:bg-white/10"
                    >
                        <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</span>
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-themed-primary">Basic Information</h3>

                            <div>
                                <label className="block text-sm font-medium text-themed-secondary mb-2">Test Title</label>
                                <input
                                    type="text"
                                    value={testData.title}
                                    onChange={(e) => handleTestDataChange('title', e.target.value)}
                                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    placeholder="e.g., Two Sum Problem"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-themed-secondary mb-2">Description</label>
                                <input
                                    type="text"
                                    value={testData.description}
                                    onChange={(e) => handleTestDataChange('description', e.target.value)}
                                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    placeholder="Brief description of the problem"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Function Name</label>
                                    <input
                                        type="text"
                                        value={testData.functionName}
                                        onChange={(e) => handleTestDataChange('functionName', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                                        placeholder="e.g., solution, calculate, add"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Function Parameters</label>
                                    <input
                                        type="text"
                                        value={testData.functionParams}
                                        onChange={(e) => handleTestDataChange('functionParams', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                                        placeholder="e.g., a, b"
                                    />
                                </div>
                            </div>

                            {/* Starter Code Preview */}
                            {testData.functionName && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Starter Code Preview (Python)</h4>
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        </div>
                                    </div>
                                    <pre className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                        {`def ${testData.functionName.trim() || 'solution'}(${testData.functionParams.trim() || 'a, b'}):\n    # Write your code here\n    # Example: return a + b\n    pass`}
                                    </pre>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Difficulty</label>
                                    <select
                                        value={testData.difficulty}
                                        onChange={(e) => handleTestDataChange('difficulty', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Time Limit (seconds)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={testData.timeLimit}
                                        onChange={(e) => handleTestDataChange('timeLimit', parseInt(e.target.value) || 1)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Memory Limit (MB)</label>
                                    <input
                                        type="number"
                                        min="128"
                                        max="512"
                                        step="64"
                                        value={testData.memoryLimit}
                                        onChange={(e) => handleTestDataChange('memoryLimit', parseInt(e.target.value) || 128)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Problem Statement */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-themed-primary">Problem Statement</h3>

                            <div>
                                <label className="block text-sm font-medium text-themed-secondary mb-2">Problem Description</label>
                                <textarea
                                    value={testData.problemStatement}
                                    onChange={(e) => handleTestDataChange('problemStatement', e.target.value)}
                                    rows={6}
                                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none font-mono text-sm"
                                    placeholder="Describe the problem in detail..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-themed-secondary mb-2">Constraints</label>
                                <textarea
                                    value={testData.constraints}
                                    onChange={(e) => handleTestDataChange('constraints', e.target.value)}
                                    rows={3}
                                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none font-mono text-sm"
                                    placeholder="e.g., 1 <= n <= 10^5"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Time Complexity (Optional)</label>
                                    <input
                                        type="text"
                                        value={testData.timeComplexity}
                                        onChange={(e) => handleTestDataChange('timeComplexity', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                                        placeholder="e.g., O(n log n)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Space Complexity (Optional)</label>
                                    <input
                                        type="text"
                                        value={testData.spaceComplexity}
                                        onChange={(e) => handleTestDataChange('spaceComplexity', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                                        placeholder="e.g., O(n)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Supported Languages */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-themed-primary">Supported Languages</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['python', 'c', 'cpp', 'java'] as ProgrammingLanguage[]).map(lang => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => handleLanguageToggle(lang)}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedLanguages.includes(lang)
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                            : 'border-themed-border bg-themed-bg text-themed-secondary hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            {selectedLanguages.includes(lang) && <CheckCircle className="h-5 w-5" />}
                                            <span className="font-medium capitalize">{lang === 'cpp' ? 'C++' : lang}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Test Cases */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-themed-primary">Test Cases</h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addTestCase(true)}
                                        className="btn-modern text-sm px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30"
                                    >
                                        <Plus className="h-4 w-4 inline mr-1" />
                                        Add Sample
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addTestCase(false)}
                                        className="btn-modern text-sm px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30"
                                    >
                                        <Plus className="h-4 w-4 inline mr-1" />
                                        Add Hidden
                                    </button>
                                </div>
                            </div>

                            {/* Sample Test Cases */}
                            {sampleTestCases.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center">
                                        <Play className="h-4 w-4 mr-2" />
                                        Sample Test Cases (Visible to Students)
                                    </h4>
                                    {testCases.map((tc, index) => tc.isSample && (
                                        <div key={index} className="p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-themed-primary">Test Case {index + 1}</span>
                                                {testCases.length > 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTestCase(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-themed-secondary mb-1">Input</label>
                                                    <textarea
                                                        value={tc.input}
                                                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-themed-border bg-white dark:bg-gray-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                                        placeholder="Input data..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-themed-secondary mb-1">Expected Output</label>
                                                    <textarea
                                                        value={tc.expectedOutput}
                                                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-themed-border bg-white dark:bg-gray-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                                        placeholder="Expected output..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-themed-secondary mb-1">Explanation (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={tc.explanation || ''}
                                                    onChange={(e) => handleTestCaseChange(index, 'explanation', e.target.value)}
                                                    className="block w-full px-3 py-2 border border-themed-border bg-white dark:bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                                    placeholder="Explain this test case..."
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Hidden Test Cases */}
                            {hiddenTestCases.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center">
                                        <Code className="h-4 w-4 mr-2" />
                                        Hidden Test Cases (Used on Submit Only)
                                    </h4>
                                    {testCases.map((tc, index) => !tc.isSample && (
                                        <div key={index} className="p-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-themed-primary">Test Case {index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTestCase(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-themed-secondary mb-1">Input</label>
                                                    <textarea
                                                        value={tc.input}
                                                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-themed-border bg-white dark:bg-gray-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                        placeholder="Input data..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-themed-secondary mb-1">Expected Output</label>
                                                    <textarea
                                                        value={tc.expectedOutput}
                                                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                                                        rows={3}
                                                        className="block w-full px-3 py-2 border border-themed-border bg-white dark:bg-gray-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                        placeholder="Expected output..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Test Schedule */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-themed-primary">Test Schedule</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={testData.startTime}
                                        onChange={(e) => handleTestDataChange('startTime', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-themed-secondary mb-2">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={testData.endTime}
                                        onChange={(e) => handleTestDataChange('endTime', e.target.value)}
                                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-themed-border">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-modern px-6 py-3 bg-themed-bg-secondary text-themed-secondary hover:bg-themed-bg-tertiary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-modern px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Programming Test'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateProgrammingTestModal;
