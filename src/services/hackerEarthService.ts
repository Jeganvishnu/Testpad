// HackerEarth Code Execution Service

import {
    ProgrammingLanguage,
    CodeExecutionRequest,
    CodeExecutionResponse,
    TestCaseStatus
} from '../types/programmingTestTypes';

const HACKEREARTH_API_URL = 'https://api.hackerearth.com/v4/partner/code-evaluation/submissions/';

const LANGUAGE_MAP: Record<ProgrammingLanguage, string> = {
    python: 'PYTHON3',
    c: 'C',
    cpp: 'CPP14',
    java: 'JAVA8'
};

interface HackerEarthSubmission {
    source: string;
    lang: string;
    input: string;
    memory_limit: number;
    time_limit: number;
    callback?: string;
}

interface HackerEarthResponse {
    he_id: string;
    status_update_url: string;
    html_url: string;
    message?: string;
}

interface HackerEarthResult {
    request_status: {
        message: string;
        code: string;
    };
    result: {
        run_status: {
            memory_used: string;
            time_used: string;
            signal: string;
            exit_code: string;
            status: string;
            status_detail: string;
        };
        compile_status: string;
        stdout: string;
        stderr: string;
    };
}

class HackerEarthCodeExecutionService {
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.clientId = import.meta.env.VITE_HACKEREARTH_CLIENT_ID || '';
        this.clientSecret = import.meta.env.VITE_HACKEREARTH_CLIENT_SECRET || '';
    }

    /**
     * Execute code with a single test case
     */
    async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
        try {
            if (!this.clientId || !this.clientSecret) {
                console.warn('HackerEarth credentials not found. Using mock execution.');
                return this.mockExecution(request);
            }

            const submission: HackerEarthSubmission = {
                source: request.sourceCode,
                lang: LANGUAGE_MAP[request.language],
                input: request.input,
                memory_limit: request.memoryLimit * 1024, // Convert MB to KB
                time_limit: request.timeLimit
            };

            // Submit code for execution
            const submitResponse = await this.submitCode(submission);

            if (!submitResponse.he_id) {
                throw new Error(submitResponse.message || 'Failed to submit code');
            }

            // Poll for results
            const result = await this.pollForResult(submitResponse.he_id);

            return this.parseHackerEarthResponse(result);
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

    /**
     * Execute code against multiple test cases
     */
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

            // Stop on compilation error
            if (result.compilationError) {
                break;
            }
        }

        return results;
    }

    /**
     * Submit code to HackerEarth API
     */
    private async submitCode(submission: HackerEarthSubmission): Promise<HackerEarthResponse> {
        const formData = new FormData();
        formData.append('source', submission.source);
        formData.append('lang', submission.lang);
        formData.append('input', submission.input);
        formData.append('memory_limit', submission.memory_limit.toString());
        formData.append('time_limit', submission.time_limit.toString());
        formData.append('client_secret', this.clientSecret);

        const response = await fetch(HACKEREARTH_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HackerEarth API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Poll for execution result
     */
    private async pollForResult(heId: string, maxAttempts = 10): Promise<HackerEarthResult> {
        const statusUrl = `${HACKEREARTH_API_URL}${heId}/?client_secret=${this.clientSecret}`;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await this.sleep(1000); // Wait 1 second between polls

            const response = await fetch(statusUrl);

            if (!response.ok) {
                throw new Error(`Failed to get result: ${response.statusText}`);
            }

            const result: HackerEarthResult = await response.json();

            // Check if execution is complete
            if (result.request_status.code === 'REQUEST_COMPLETED') {
                return result;
            }

            // Check for errors
            if (result.request_status.code === 'REQUEST_FAILED') {
                throw new Error(result.request_status.message);
            }
        }

        throw new Error('Execution timeout - result not available');
    }

    /**
     * Parse HackerEarth response to our format
     */
    private parseHackerEarthResponse(result: HackerEarthResult): CodeExecutionResponse {
        const runStatus = result.result.run_status;
        const compileStatus = result.result.compile_status;

        // Check for compilation error
        if (compileStatus !== 'OK') {
            return {
                status: 'Error',
                compilationError: result.result.stderr || 'Compilation failed',
                executionTime: 0,
                memoryUsed: 0
            };
        }

        // Parse execution time and memory
        const rawTime = parseFloat(runStatus.time_used);
        const executionTime = isFinite(rawTime) ? rawTime * 1000 : 0; // Convert to ms

        const rawMemory = parseInt(runStatus.memory_used);
        const memoryUsed = isFinite(rawMemory) ? rawMemory : 0; // Already in KB

        // Determine status
        let status: TestCaseStatus;
        let error: string | undefined;

        switch (runStatus.status) {
            case 'AC': // Accepted
                status = 'Passed';
                break;
            case 'TLE': // Time Limit Exceeded
                status = 'Timeout';
                break;
            case 'RE': // Runtime Error
                status = 'Error';
                error = result.result.stderr || 'Runtime error occurred';
                break;
            case 'WA': // Wrong Answer (shouldn't happen at this level)
                status = 'Failed';
                break;
            default:
                status = 'Error';
                error = runStatus.status_detail || 'Unknown error';
        }

        return {
            status,
            output: result.result.stdout.trim(),
            error,
            executionTime,
            memoryUsed,
            compilationError: compileStatus !== 'OK' ? result.result.stderr : undefined
        };
    }

    /**
     * Mock execution for development
     */
    private mockExecution(request: CodeExecutionRequest): CodeExecutionResponse {
        console.log('Mock execution:', request);

        return {
            status: 'Passed',
            output: 'Mock output',
            executionTime: Math.random() * 100,
            memoryUsed: Math.random() * 10000
        };
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const hackerEarthService = new HackerEarthCodeExecutionService();
