import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Loader2, FileText, Zap, Upload } from 'lucide-react';
import { extractTextFromDocument, isSupportedDocumentFormat } from '../../utils/documentUtils';
import { aiService, GeneratedQuestion } from '../../services/aiService';
import { DifficultyLevel } from '../../services/adaptiveTestService';
import { SkeletonAIGeneration } from '../common/LoadingSkeleton';

interface Question {
    question: string;
    questionType: 'text' | 'image' | 'code';
    imageUrl?: string;
    codeContent?: string;
    codeLanguage?: string;
    options: string[];
    correctAnswer: number;
    difficulty: DifficultyLevel;
}

interface AiGenerationModalProps {
    onClose: () => void;
    onQuestionsGenerated: (questions: Question[]) => void;
}

const AiGenerationModal: React.FC<AiGenerationModalProps> = ({ onClose, onQuestionsGenerated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [questionCount, setQuestionCount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');
    const [aiStage, setAiStage] = useState<'extracting' | 'generating' | 'formatting'>('extracting');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!isSupportedDocumentFormat(selectedFile)) {
                setError('Please select a valid PDF, DOC, or DOCX file');
                return;
            }
            setFile(selectedFile);
            setError('');
        }
    };

    const handleGenerate = async () => {
        if (!file) {
            setError('Please select a document file first');
            return;
        }

        setLoading(true);
        setError('');
        setAiStage('extracting');
        setProgress('Extracting text from document...');

        try {
            // Step 1: Extract text from document (PDF or Word)
            const text = await extractTextFromDocument(file);

            if (!text || text.trim().length < 100) {
                throw new Error('Document appears to be empty or contains insufficient text. Please ensure the document has readable text content.');
            }

            setAiStage('generating');
            setProgress('Generating questions with AI...');

            // Step 2: Get API key from environment
            const apiKey = import.meta.env.VITE_AI_API_KEY;

            if (!apiKey) {
                throw new Error('AI API key not configured. Please add VITE_AI_API_KEY to your .env file.');
            }

            // Step 3: Generate questions using AI service
            const generatedQuestions = await aiService.generateQuestionsFromText(text, apiKey, questionCount);

            if (generatedQuestions.length === 0) {
                throw new Error('AI did not generate any questions. The document content may not be suitable for question generation.');
            }

            setAiStage('formatting');
            setProgress('Formatting questions...');

            // Step 4: Convert to our Question format with difficulty levels
            const formattedQuestions: Question[] = generatedQuestions.slice(0, questionCount).map((q, index) => {
                // Assign difficulty levels in a balanced way
                let difficulty: DifficultyLevel;
                const difficultyIndex = index % 3;
                if (difficultyIndex === 0) difficulty = 'easy';
                else if (difficultyIndex === 1) difficulty = 'medium';
                else difficulty = 'hard';

                // Ensure we have at least 4 options, max 5
                const options = [...q.options];
                while (options.length < 4) {
                    options.push(''); // Pad to minimum 4 options
                }
                // Trim to max 5 options
                options.splice(5);

                return {
                    question: q.question,
                    questionType: 'text' as const,
                    options: options,
                    correctAnswer: q.correctAnswer,
                    difficulty: difficulty
                };
            });

            setProgress('Complete!');

            // Step 5: Pass questions back to parent
            onQuestionsGenerated(formattedQuestions);

            // Close modal after a brief delay
            setTimeout(() => {
                onClose();
            }, 500);

        } catch (err) {
            console.error('Error generating questions:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate questions. Please try again.');
            setProgress('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="card-modern w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-themed-border">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold text-themed-primary">AI Question Generator</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-themed-muted hover:text-themed-primary rounded-lg p-2 hover:bg-themed-bg-secondary disabled:opacity-50"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-themed-secondary mb-2">
                            Upload Document
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileChange}
                                disabled={loading}
                                className="hidden"
                                id="pdf-file-input"
                            />
                            <label
                                htmlFor="pdf-file-input"
                                className={`flex items-center justify-center space-x-2 w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file
                                    ? 'border-purple-300 bg-purple-50'
                                    : 'border-themed-border bg-themed-bg-secondary hover:border-purple-300 hover:bg-purple-50'
                                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {file ? (
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-6 w-6 text-purple-600" />
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-purple-900 truncate max-w-xs">{file.name}</p>
                                            <p className="text-xs text-purple-600">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="h-8 w-8 text-themed-muted mx-auto mb-2" />
                                        <p className="text-sm font-medium text-themed-secondary">Click to upload document</p>
                                        <p className="text-xs text-themed-muted mt-1">PDF, DOC, or DOCX</p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Question Count Input */}
                    <div>
                        <label htmlFor="questionCount" className="block text-sm font-medium text-themed-secondary mb-2">
                            Number of Questions to Generate
                        </label>
                        <input
                            type="number"
                            id="questionCount"
                            min="1"
                            max="50"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                            disabled={loading}
                            className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-150 disabled:opacity-50"
                            placeholder="Enter number of questions"
                        />
                        <p className="mt-2 text-xs text-themed-muted">
                            The AI will attempt to generate up to {questionCount} questions from the document content.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-700 font-medium">Error</p>
                                <p className="text-sm text-red-600 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* AI Generation Animation */}
                    {loading && (
                        <SkeletonAIGeneration stage={aiStage} />
                    )}

                    {/* Info Box */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <Zap className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-purple-900 mb-2">How it works</h4>
                                <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                                    <li>AI extracts text from your document (PDF or Word)</li>
                                    <li>Generates multiple-choice questions automatically</li>
                                    <li>Questions are balanced across difficulty levels</li>
                                    <li>You can edit questions after generation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-themed-border bg-themed-bg-secondary">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-themed-secondary hover:text-themed-primary font-medium rounded-lg hover:bg-themed-bg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !file}
                        className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>Generate Questions</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiGenerationModal;
