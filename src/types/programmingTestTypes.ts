// Programming Test Type Definitions

export type ProgrammingLanguage = 'python' | 'c' | 'cpp' | 'java';

export type TestCaseStatus = 'Passed' | 'Failed' | 'Error' | 'Timeout';

export type SubmissionVerdict =
    | 'Accepted'
    | 'Wrong Answer'
    | 'Time Limit Exceeded'
    | 'Runtime Error'
    | 'Compilation Error'
    | 'Memory Limit Exceeded';

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    explanation?: string;
}

export interface StarterCode {
    python?: string;
    c?: string;
    cpp?: string;
    java?: string;
}

export interface ProgrammingTest {
    id: string;
    title: string;
    description: string;
    problemStatement: string;
    constraints: string;
    timeLimit: number;
    memoryLimit: number;
    difficulty: ProblemDifficulty;
    supportedLanguages: ProgrammingLanguage[];
    starterCode: StarterCode;
    testCases: TestCase[];
    functionName: string; // The function name students must implement
    timeComplexity?: string;
    spaceComplexity?: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    testType: 'programming';
    totalTestCases: number;
    sampleTestCases: number;
}

export interface TestCaseResult {
    testCaseId: string;
    status: TestCaseStatus;
    executionTime: number;
    memoryUsed: number;
    output?: string;
    expectedOutput: string;
    error?: string;
    input?: string;
}

export interface CodeSubmission {
    testId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    language: ProgrammingLanguage;
    code: string;
    submittedAt: string;
    results: TestCaseResult[];
    overallVerdict: SubmissionVerdict;
    totalTime: number;
    totalMemory: number;
    passedCount: number;
    totalCount: number;
    score: number;
    isRunOnly?: boolean;
}

export interface CodeExecutionRequest {
    language: ProgrammingLanguage;
    sourceCode: string;
    input: string;
    timeLimit: number;
    memoryLimit: number;
}

export interface CodeExecutionResponse {
    status: TestCaseStatus;
    output?: string;
    error?: string;
    executionTime: number;
    memoryUsed: number;
    compilationError?: string;
}
