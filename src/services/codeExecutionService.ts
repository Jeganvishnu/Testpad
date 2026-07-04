// Code Execution Service using Judge0 CE API
import {
    CodeExecutionRequest,
    CodeExecutionResponse,
    ProgrammingLanguage,
    TestCaseStatus
} from '../types/programmingTestTypes';

// Judge0 CE Language IDs
const LANGUAGE_IDS: Record<ProgrammingLanguage, number> = {
    python: 71,  // Python 3.8.1
    c: 50,       // C (GCC 9.2.0)
    cpp: 54,     // C++ (GCC 9.2.0)
    java: 62     // Java (OpenJDK 13.0.1)
};

// Judge0 CE Free API endpoint
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY || '';

interface Judge0SubmissionRequest {
    source_code: string;
    language_id: number;
    stdin?: string;
    expected_output?: string;
    cpu_time_limit?: number;
    memory_limit?: number;
}

interface Judge0SubmissionResponse {
    token: string;
}

interface Judge0StatusResponse {
    status: {
        id: number;
        description: string;
    };
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    message?: string;
    time?: string;
    memory?: number;
}

class CodeExecutionService {
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.apiKey = JUDGE0_API_KEY;
        this.apiUrl = JUDGE0_API_URL;
    }

    async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
        try {
            if (!this.apiKey) {
                console.warn('Judge0 API key not found. Using mock execution.');
                return this.mockExecution(request);
            }

            const languageId = LANGUAGE_IDS[request.language];

            const submissionResponse = await this.submitCode({
                source_code: request.sourceCode,
                language_id: languageId,
                stdin: request.input,
                cpu_time_limit: request.timeLimit,
                memory_limit: request.memoryLimit * 1024
            });

            const result = await this.getSubmissionResult(submissionResponse.token);
            return this.parseJudge0Response(result);
        } catch (error) {
            console.error('Code execution error:', error);
            return {
                status: 'Error',
                error: error instanceof Error ? error.message : 'Unknown execution error',
                executionTime: 0,
                memoryUsed: 0
            };
        }
    }

    async executeMultipleTestCases(
        language: ProgrammingLanguage,
        sourceCode: string,
        testCases: Array<{ input: string; expectedOutput: string }>,
        timeLimit: number,
        memoryLimit: number
    ): Promise<CodeExecutionResponse[]> {
        const results: CodeExecutionResponse[] = [];

        for (const testCase of testCases) {
            const result = await this.executeCode({
                language,
                sourceCode,
                input: testCase.input,
                timeLimit,
                memoryLimit
            });

            results.push(result);

            if (results.length === 1 && (result.status === 'Error' || result.compilationError)) {
                break;
            }
        }

        return results;
    }

    private async submitCode(request: Judge0SubmissionRequest): Promise<Judge0SubmissionResponse> {
        const response = await fetch(`${this.apiUrl}/submissions?base64_encoded=false&wait=false`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': this.apiKey,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`Failed to submit code: ${response.statusText}`);
        }

        return response.json();
    }

    private async getSubmissionResult(token: string, maxAttempts = 10): Promise<Judge0StatusResponse> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(`${this.apiUrl}/submissions/${token}?base64_encoded=false`, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': this.apiKey,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get submission result: ${response.statusText}`);
            }

            const result: Judge0StatusResponse = await response.json();

            if (result.status.id > 2) {
                return result;
            }

            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(1.5, attempt), 5000)));
        }

        throw new Error('Code execution timeout - took too long to complete');
    }

    private parseJudge0Response(response: Judge0StatusResponse): CodeExecutionResponse {
        const statusId = response.status.id;

        let status: TestCaseStatus = 'Error';
        let output: string | undefined;
        let error: string | undefined;
        let compilationError: string | undefined;

        if (statusId === 3) {
            status = 'Passed';
            output = response.stdout?.trim() || '';
        } else if (statusId === 4) {
            status = 'Failed';
            output = response.stdout?.trim() || '';
        } else if (statusId === 5) {
            status = 'Timeout';
            error = 'Time Limit Exceeded';
        } else if (statusId === 6) {
            status = 'Error';
            compilationError = response.compile_output || 'Compilation failed';
        } else {
            status = 'Error';
            error = response.stderr || response.message || 'Runtime error occurred';
        }

        return {
            status,
            output,
            error,
            compilationError,
            executionTime: parseFloat(response.time || '0') * 1000,
            memoryUsed: response.memory || 0
        };
    }

    private async mockExecution(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        const hasInput = request.input.trim().length > 0;

        if ((request.language === 'c' || request.language === 'cpp') &&
            !request.sourceCode.includes('int main')) {
            return {
                status: 'Error',
                compilationError: 'error: expected declaration or statement at end of input',
                executionTime: 0,
                memoryUsed: 0
            };
        }

        return {
            status: 'Passed',
            output: hasInput ? `Processed: ${request.input}` : 'Hello, World!',
            executionTime: 50 + Math.random() * 150,
            memoryUsed: 2048 + Math.random() * 1024
        };
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }
}

export const codeExecutionService = new CodeExecutionService();
