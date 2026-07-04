// Interface for the generated question format
export interface GeneratedQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

/**
 * Service to handle AI interactions for question generation
 */
export const aiService = {
    /**
     * Generate study advice for a test topic
     * @param title The test title
     * @param description The test description
     * @param apiKey The API key for the service
     * @returns Formatted study advice as HTML string
     */
    generateStudyAdvice: async (title: string, description: string, apiKey: string): Promise<string> => {
        try {
            const prompt = `
You are a study advisor. Provide concise study advice for this test:

Test: ${title}
Description: ${description}

Provide:
1. Key Topics (3-5 main concepts)
2. Study Strategies (practical tips)
3. Important Areas (what to prioritize)
4. Time Management (brief suggestions)

CRITICAL: Start directly with the advice. NO introductory phrases like "Below is...", "Here's...", or "I'll provide...". Use clear headings and bullet points. Be concise and actionable.
            `.trim();

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'ATS Study Advisor'
                },
                body: JSON.stringify({
                    model: 'tngtech/deepseek-r1t2-chimera:free',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`AI API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';

            // Clean up the response to remove preamble
            const cleanedContent = cleanAIResponse(content);

            // Format the content with basic HTML for better display
            return formatStudyAdvice(cleanedContent);
        } catch (error) {
            console.error('Error generating study advice:', error);
            throw error;
        }
    },

    /**
     * Generate questions from text content using Deepseek-R1 via compatible API
     * @param text The source text content to generate questions from
     * @param apiKey The API key for the service
     * @param questionCount Number of questions to generate (default: 10)
     * @returns Array of generated questions
     */
    generateQuestionsFromText: async (text: string, apiKey: string, questionCount: number = 10): Promise<GeneratedQuestion[]> => {
        try {
            const prompt = `
        You are a helpful assistant that generates multiple-choice questions from text.
        Based on the following text, generate exactly ${questionCount} multiple-choice questions.
        
        The output must be in a strictly CSV-like format with the following columns:
        Question, OptionA, OptionB, OptionC, OptionD, OptionE, Base 0 Index of Correct Answer (0-4)
        
        Do not include a header row.
        Do not include any other text, explanations, or markdown formatting. Just the CSV lines.
        Ensure options are distinct.
        Generate exactly ${questionCount} questions - no more, no less.
        
        Text content:
        ${text.substring(0, 8000)} // Increased limit for more content
      `;

            // Using OpenRouter API endpoint for DeepSeek R1T2 Chimera
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'ATS Question Generator'
                },
                body: JSON.stringify({
                    model: 'tngtech/deepseek-r1t2-chimera:free',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 4000 // Increased to allow more questions
                })
            });

            if (!response.ok) {
                throw new Error(`AI API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '';

            return parseCsvToQuestions(content);
        } catch (error) {
            console.error('Error generating questions:', error);
            throw error;
        }
    }
};

/**
 * Helper to clean AI response by removing preamble text
 */
function cleanAIResponse(content: string): string {
    // Remove common preamble phrases
    const preamblePatterns = [
        /^(Below is|Here's|Here is|I'll provide|I will provide|Let me provide|I've prepared|I have prepared).*?[\n:]/i,
        /^(Sure!|Certainly!|Of course!|Absolutely!).*?\n/i,
        /^(Based on|Given|For).*?test.*?[:,]\s*/i,
    ];

    let cleaned = content.trim();

    for (const pattern of preamblePatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}

/**
 * Helper to format study advice with HTML
 */
function formatStudyAdvice(content: string): string {
    // Convert markdown-style formatting to HTML
    let formatted = content
        // Convert headers (## Header -> <h3>)
        .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-3">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">$1</h2>')
        // Convert bold text
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
        // Convert bullet points
        .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300">$1</li>')
        // Convert numbered lists
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300">$1</li>');

    // Wrap lists in ul tags
    formatted = formatted.replace(/(<li class="ml-4[^>]*>.*<\/li>\n?)+/g, (match) => {
        return `<ul class="list-disc space-y-1 mb-3">${match}</ul>`;
    });

    // Convert paragraphs
    formatted = formatted
        .split('\n\n')
        .map(para => {
            if (para.trim() && !para.includes('<h') && !para.includes('<ul') && !para.includes('<li')) {
                return `<p class="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">${para.trim()}</p>`;
            }
            return para;
        })
        .join('\n');

    return formatted;
}

/**
 * Helper to parse the CSV-like output from AI
 */
function parseCsvToQuestions(csvContent: string): GeneratedQuestion[] {
    const lines = csvContent.trim().split('\n');
    const questions: GeneratedQuestion[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Simple CSV parser that handles quoted strings if the AI produces them
        // This regex looks for comma-separated values, respecting quotes
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        // We expect at least Question + 2 Options + Answer
        if (parts.length >= 4) {
            const questionText = parts[0];
            // Options are from index 1 to length-2 (last one is answer)
            // But we constrained it to 5 options in prompt. Let's be flexible.

            const answerPart = parts[parts.length - 1];
            const answerIndex = parseInt(answerPart);

            // Extract options (middle parts)
            const options = parts.slice(1, parts.length - 1).filter(opt => opt);

            // Ensure we have valid data
            if (questionText && options.length >= 2 && !isNaN(answerIndex)) {
                questions.push({
                    question: questionText,
                    options: options,
                    correctAnswer: Math.min(Math.max(0, answerIndex), options.length - 1)
                });
            }
        }
    }

    return questions;
}
