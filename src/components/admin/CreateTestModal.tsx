import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { X, Plus, Trash2, AlertCircle, UploadCloud, Image, Code, Eye, EyeOff, FileText, Target, Sparkles } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as XLSX from 'xlsx';
import { extractQuestionsFromPdf, validateExtractedQuestions, extractTextFromPdf } from '../../utils/pdfUtils';
import { DifficultyLevel, adaptiveTestService } from '../../services/adaptiveTestService';
import { aiService } from '../../services/aiService';
import DifficultyBadge from '../common/DifficultyBadge';
import AiGenerationModal from './AiGenerationModal';

// This imports the pre-configured Firebase instances from your separate file.
// Please ensure the import path is correct for your project structure.
import { database } from '../../lib/firebase';

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

interface CreateTestModalProps {
  onClose: () => void;
  onTestCreated: () => void;
}

const CreateTestModal: React.FC<CreateTestModalProps> = ({ onClose, onTestCreated }) => {
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 60, // Duration in minutes for individual student time limit
    category: 'Quantitative Aptitude', // Default category
    isAdaptive: true // Enable adaptive mode by default
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      question: '',
      questionType: 'text',
      options: ['', '', '', ''], // Start with 4 options
      correctAnswer: 0,
      difficulty: 'medium'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileUploadMessage, setFileUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Record<number, boolean>>({});
  const [showAiModal, setShowAiModal] = useState(false);

  const handleTestDataChange = (field: string, value: string | number | boolean) => {
    setTestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: string | number) => {
    const newQuestions = [...questions];
    if (field === 'question') {
      newQuestions[index] = {
        ...newQuestions[index],
        [field]: value as string
      };
    } else if (field === 'correctAnswer') {
      newQuestions[index] = {
        ...newQuestions[index],
        [field]: value as number
      };
    }
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question: '',
        questionType: 'text',
        options: ['', '', '', ''], // Start with 4 options
        correctAnswer: 0,
        difficulty: 'medium'
      }
    ]);
  };

  // Add option to a question (max 5 options)
  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 5) {
      newQuestions[questionIndex].options.push('');
      setQuestions(newQuestions);
    }
  };

  // Remove option from a question (min 4 options)
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 4) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      // Adjust correct answer if needed
      if (newQuestions[questionIndex].correctAnswer >= newQuestions[questionIndex].options.length) {
        newQuestions[questionIndex].correctAnswer = newQuestions[questionIndex].options.length - 1;
      }
      setQuestions(newQuestions);
    }
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuestionTypeChange = (index: number, type: 'text' | 'image' | 'code') => {
    const newQuestions = [...questions];
    const baseQuestion = {
      ...newQuestions[index],
      questionType: type,
    };

    // Remove properties that shouldn't exist for this type
    delete baseQuestion.imageUrl;
    delete baseQuestion.codeContent;
    delete baseQuestion.codeLanguage;

    // Add back only the properties needed for the selected type
    if (type === 'image') {
      baseQuestion.imageUrl = newQuestions[index].imageUrl || '';
    } else if (type === 'code') {
      baseQuestion.codeContent = newQuestions[index].codeContent || '';
      baseQuestion.codeLanguage = newQuestions[index].codeLanguage || 'javascript';
    }

    newQuestions[index] = baseQuestion;
    setQuestions(newQuestions);
  };

  const handleQuestionFieldChange = (index: number, field: string, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    };
    setQuestions(newQuestions);
  };

  const handleDifficultyChange = (index: number, difficulty: DifficultyLevel) => {
    const newQuestions = [...questions];
    newQuestions[index] = {
      ...newQuestions[index],
      difficulty
    };
    setQuestions(newQuestions);
  };

  const togglePreview = (index: number) => {
    setPreviewQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      handleQuestionFieldChange(index, 'imageUrl', imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // Function to parse markdown-style code blocks from question text
  const parseCodeFromQuestion = (questionText: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const match = codeBlockRegex.exec(questionText);

    if (match) {
      const language = match[1] || 'javascript'; // Default to javascript if no language specified
      const code = match[2].trim();
      return { language, code, hasCodeBlock: true };
    }

    return { language: 'javascript', code: '', hasCodeBlock: false };
  };

  // Enhanced question change handler that detects code blocks
  const handleQuestionChangeWithCodeDetection = (index: number, field: string, value: string) => {
    const newQuestions = [...questions];

    if (field === 'question') {
      const { language, code, hasCodeBlock } = parseCodeFromQuestion(value);

      newQuestions[index] = {
        ...newQuestions[index],
        question: value,
        // Auto-detect and switch to code type if code block is found
        questionType: hasCodeBlock ? 'code' : newQuestions[index].questionType,
        codeContent: hasCodeBlock ? code : newQuestions[index].codeContent,
        codeLanguage: hasCodeBlock ? language : newQuestions[index].codeLanguage,
      };
    } else if (field === 'correctAnswer') {
      newQuestions[index] = {
        ...newQuestions[index],
        [field]: value as number
      };
    }

    setQuestions(newQuestions);
  };

  // Function to render question content with proper formatting
  const renderQuestionContent = (question: Question, index: number) => {
    if (question.questionType === 'code' && question.codeContent) {
      // Split question text to show text before/after code block
      const parts = question.question.split(/```\w*\n[\s\S]*?```/);
      return (
        <div className="space-y-3">
          {parts[0] && <p className="text-gray-700">{parts[0].trim()}</p>}
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
          {parts[1] && <p className="text-gray-700">{parts[1].trim()}</p>}
        </div>
      );
    }

    if (question.questionType === 'image' && question.imageUrl) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700">{question.question}</p>
          <img
            src={question.imageUrl}
            alt="Question image"
            className="max-w-full h-auto rounded-lg border"
            style={{ maxHeight: '300px' }}
          />
        </div>
      );
    }

    return <p className="text-gray-700">{question.question}</p>;
  };

  // Handle Excel/CSV file upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newQuestions: Question[] = parsedData.map((row: any) => {
          // Collect all possible options
          const allOptions = [
            String(row.OptionA || ''),
            String(row.OptionB || ''),
            String(row.OptionC || ''),
            String(row.OptionD || ''),
            String(row.OptionE || '')
          ];

          // Filter out empty options but keep at least 4
          const options = allOptions.filter(opt => opt.trim() !== '');

          // Ensure we have at least 4 options
          while (options.length < 4) {
            options.push('');
          }

          // Limit to 5 options max
          const finalOptions = options.slice(0, 5);

          let correctAnswerIndex = 0;

          if (typeof row.Answer === 'string') {
            const answerLetter = row.Answer.trim().toUpperCase();
            if (answerLetter === 'A') correctAnswerIndex = 0;
            else if (answerLetter === 'B') correctAnswerIndex = 1;
            else if (answerLetter === 'C') correctAnswerIndex = 2;
            else if (answerLetter === 'D') correctAnswerIndex = 3;
            else if (answerLetter === 'E') correctAnswerIndex = 4;
          } else if (typeof row.Answer === 'number') {
            correctAnswerIndex = Math.max(0, Math.min(finalOptions.length - 1, row.Answer));
          }

          // Parse difficulty from Excel
          let difficulty: DifficultyLevel = 'medium'; // Default
          if (row.Difficulty) {
            const diffStr = String(row.Difficulty).toLowerCase().trim();
            if (diffStr === 'easy' || diffStr === 'e') difficulty = 'easy';
            else if (diffStr === 'medium' || diffStr === 'm') difficulty = 'medium';
            else if (diffStr === 'hard' || diffStr === 'h') difficulty = 'hard';
          }

          return {
            question: String(row.Question || ''),
            questionType: 'text' as const,
            options: finalOptions,
            correctAnswer: correctAnswerIndex,
            difficulty: difficulty,
          };
        }).filter(q => q.question.trim() !== '');

        if (newQuestions.length > 0) {
          setQuestions(prevQuestions => [...prevQuestions, ...newQuestions]);
          setFileUploadMessage({ type: 'success', text: `${newQuestions.length} questions added from Excel/CSV file.` });
        } else {
          setFileUploadMessage({ type: 'error', text: 'No valid questions found in the Excel file. Please check column headers (Question, OptionA, OptionB, OptionC, OptionD, OptionE, Answer, Difficulty[optional]).' });
        }
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        setFileUploadMessage({ type: 'error', text: 'Failed to read Excel file. Make sure it\'s a valid Excel/CSV and columns are correct.' });
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Handle PDF file upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploadMessage(null);
    setLoading(true);

    try {
      const result = await extractQuestionsFromPdf(file);

      if (result.questions.length === 0) {
        setFileUploadMessage({
          type: 'error',
          text: 'No valid questions found in the PDF. Please ensure the questions are properly formatted with options A), B), C), D), E).'
        });
        return;
      }

      const { valid, invalid } = validateExtractedQuestions(result.questions);

      if (valid.length > 0) {
        // Convert to our Question format
        const formattedQuestions: Question[] = valid.map(q => ({
          question: q.question,
          questionType: 'text',
          options: q.options,
          correctAnswer: q.correctAnswer,
          difficulty: 'medium'
        }));

        setQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);

        let message = `${valid.length} questions added from PDF.`;
        if (invalid.length > 0) {
          message += ` ${invalid.length} questions were skipped due to formatting issues.`;
        }
        if (result.errors.length > 0) {
          message += ` Please review the extracted questions.`;
        }

        setFileUploadMessage({ type: 'success', text: message });
      } else {
        setFileUploadMessage({
          type: 'error',
          text: `No valid questions were extracted from the PDF. ${invalid.length} questions had formatting issues.`
        });
      }
    } catch (err) {
      console.error('Error processing PDF:', err);
      setFileUploadMessage({
        type: 'error',
        text: 'Failed to process PDF file. Please ensure it\'s a valid PDF with readable text.'
      });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleAiQuestionsGenerated = (generatedQuestions: Question[]) => {
    // Remove the initial empty question if it's still empty
    setQuestions(prev => {
      const filteredQuestions = prev.filter(q => q.question.trim() !== '');
      return [...filteredQuestions, ...generatedQuestions];
    });
    setFileUploadMessage({
      type: 'success',
      text: `Successfully generated ${generatedQuestions.length} questions using AI!`
    });
  };

  const validateForm = () => {
    setError('');

    if (!testData.title.trim()) {
      setError('Test title is required.');
      return false;
    }

    if (!testData.description.trim()) {
      setError('Test description is required.');
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

    // Convert datetime-local strings to Date objects for comparison
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

    // Check if the test window duration makes sense (at least 5 minutes between start and end)
    const timeDifference = endDate.getTime() - startDate.getTime();
    const minimumDuration = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (timeDifference < minimumDuration) {
      setError('End time must be at least 5 minutes after start time.');
      return false;
    }

    // Validate individual student duration
    if (testData.duration < 1) {
      setError('Individual test duration must be at least 1 minute.');
      return false;
    }

    // Check if individual duration is reasonable compared to test window
    const testWindowMinutes = timeDifference / (1000 * 60);
    if (testData.duration > testWindowMinutes) {
      setError('Individual test duration cannot be longer than the test window.');
      return false;
    }

    if (questions.length === 0) {
      setError('At least one question is required.');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question.trim()) {
        setError(`Question ${i + 1} text is required.`);
        return false;
      }
      if (question.options.some(option => !option.trim())) {
        setError(`All options for Question ${i + 1} are required.`);
        return false;
      }
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        setError(`A valid correct answer must be selected for Question ${i + 1}.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFileUploadMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const testRef = push(ref(database, 'tests'));
      const testId = testRef.key!;

      // Create proper Date objects from the datetime-local inputs
      const startDate = new Date(testData.startTime);
      const endDate = new Date(testData.endTime);

      // Get timestamps in milliseconds
      const startTimeMs = startDate.getTime();
      const closeTimeMs = endDate.getTime();

      // Debug logging to verify timestamps
      console.log('Start Time:', testData.startTime);
      console.log('End Time:', testData.endTime);
      console.log('Start Date Object:', startDate);
      console.log('End Date Object:', endDate);
      console.log('Start Time Ms:', startTimeMs);
      console.log('Close Time Ms:', closeTimeMs);
      console.log('Current Time Ms:', Date.now());

      const testPayload = {
        title: testData.title,
        description: testData.description,
        startTime: testData.startTime, // Keep original string for display
        endTime: testData.endTime, // Keep original string for display
        closeTime: testData.endTime, // For backward compatibility with TestInterface
        duration: testData.duration, // Individual student time limit in minutes
        category: testData.category, // Test category
        isAdaptive: testData.isAdaptive, // Enable/disable adaptive mode
        totalQuestions: questions.length,
        createdAt: new Date().toISOString(),
        startTimeMs: startTimeMs,
        closeTimeMs: closeTimeMs,
        timesAttempted: 0
      };

      await set(testRef, testPayload);

      const questionsRef = ref(database, `questions/${testId}`);
      const questionsData: Record<string, any> = {};

      questions.forEach((question, index) => {
        const questionId = `q${index + 1}`;

        // Clean the question object by removing undefined properties
        const cleanQuestion: any = {
          question: question.question,
          questionType: question.questionType || 'text', // Ensure questionType is never undefined
          options: question.options,
          correctAnswer: question.correctAnswer,
          difficulty: question.difficulty || 'medium' // Include difficulty for adaptive testing
        };

        // Only add optional properties if they have values
        if (question.questionType === 'image' && question.imageUrl) {
          cleanQuestion.imageUrl = question.imageUrl;
        }

        if (question.questionType === 'code') {
          if (question.codeContent) {
            cleanQuestion.codeContent = question.codeContent;
          }
          if (question.codeLanguage) {
            cleanQuestion.codeLanguage = question.codeLanguage;
          }
        }

        questionsData[questionId] = cleanQuestion;
      });

      await set(questionsRef, questionsData);

      onTestCreated();
    } catch (err) {
      console.error('Error creating test:', err);
      setError('Failed to create test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="card-modern w-full max-w-4xl my-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-themed-border bg-themed-bg sticky top-0 z-10">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-themed-primary rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-themed-primary">Create New Test</h2>
          </div>
          <button
            onClick={onClose}
            className="text-themed-muted hover:text-themed-primary rounded-lg p-2 hover:bg-themed-bg-secondary"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700 font-medium">{error}</span>
              </div>
            )}
            {fileUploadMessage && (
              <div className={`flex items-center space-x-3 p-4 ${fileUploadMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'} rounded-xl`}>
                {fileUploadMessage.type === 'success' ? (
                  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${fileUploadMessage.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{fileUploadMessage.text}</span>
              </div>
            )}

            {/* Test Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-themed-primary flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Test Details
              </h3>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-themed-secondary mb-2">Test Title</label>
                <input
                  type="text"
                  id="title"
                  value={testData.title}
                  onChange={(e) => handleTestDataChange('title', e.target.value)}
                  className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150"
                  placeholder="Enter test title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-themed-secondary mb-2">Description</label>
                <textarea
                  id="description"
                  value={testData.description}
                  onChange={(e) => handleTestDataChange('description', e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 resize-none"
                  placeholder="Enter test description"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-themed-secondary mb-2">Test Category</label>
                <div className="relative">
                  <select
                    id="category"
                    value={testData.category}
                    onChange={(e) => handleTestDataChange('category', e.target.value)}
                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 cursor-pointer appearance-none"
                  >
                    <option value="Quantitative Aptitude">📊 Quantitative Aptitude</option>
                    <option value="Verbal">📚 Verbal</option>
                    <option value="Logical Reasoning">🧩 Logical Reasoning</option>
                    <option value="Technical MCQs">⚙️ Technical MCQs</option>
                    <option value="Programming">💻 Programming</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="h-5 w-5 text-themed-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Adaptive Test Mode Toggle */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Adaptive Test Mode</h4>
                      <p className="text-sm text-gray-600">Questions adapt to student performance in real-time</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAdaptive"
                      checked={testData.isAdaptive}
                      onChange={(e) => handleTestDataChange('isAdaptive', e.target.checked)}
                      className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="isAdaptive" className="ml-2 text-sm font-medium text-gray-700">
                      {testData.isAdaptive ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>
                {testData.isAdaptive && (
                  <div className="mt-4 p-3 bg-white/70 border border-purple-200/50 rounded-lg">
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">🎯 Adaptive Features:</p>
                      <ul className="space-y-1 text-xs list-disc list-inside ml-2">
                        <li>Questions difficulty adjusts based on student performance</li>
                        <li>2+ correct answers = difficulty increases</li>
                        <li>2+ wrong answers = difficulty decreases</li>
                        <li>Weighted scoring system (Easy: 1pt, Medium: 2pts, Hard: 3pts)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-themed-secondary mb-2">Test Window Start</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    value={testData.startTime}
                    onChange={(e) => handleTestDataChange('startTime', e.target.value)}
                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-themed-secondary mb-2">Test Window End</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    value={testData.endTime}
                    onChange={(e) => handleTestDataChange('endTime', e.target.value)}
                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-themed-secondary mb-2">Individual Time Limit (minutes)</label>
                  <input
                    type="number"
                    id="duration"
                    min="1"
                    value={testData.duration || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                      handleTestDataChange('duration', isNaN(value) ? 0 : value);
                    }}
                    onBlur={(e) => {
                      // On blur, ensure minimum value of 1
                      if (testData.duration < 1) {
                        handleTestDataChange('duration', 1);
                      }
                    }}
                    className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 cursor-pointer"
                  />
                </div>
              </div>

              {/* Display calculated times for verification */}
              {testData.startTime && testData.endTime && (
                <div className="bg-themed-primary/5 border border-themed-primary/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-themed-primary mb-3 flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test Schedule Preview
                  </h4>
                  <div className="text-sm text-themed-secondary space-y-2">
                    <p><strong className="text-themed-primary">Test Window Start:</strong> {new Date(testData.startTime).toLocaleString()}</p>
                    <p><strong className="text-themed-primary">Test Window End:</strong> {new Date(testData.endTime).toLocaleString()}</p>
                    <p><strong className="text-themed-primary">Test Window Duration:</strong> {Math.round((new Date(testData.endTime).getTime() - new Date(testData.startTime).getTime()) / (1000 * 60))} minutes</p>
                    <p><strong className="text-themed-primary">Individual Time Limit:</strong> {testData.duration} minutes</p>
                  </div>
                </div>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-themed-primary flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Questions ({questions.length})
                  </h3>

                  {/* Difficulty Statistics */}
                  {testData.isAdaptive && questions.length > 0 && (
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        Difficulty Distribution
                      </h4>
                      <div className="flex items-center space-x-6">
                        {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => {
                          const count = questions.filter(q => q.difficulty === level).length;
                          const percentage = questions.length > 0 ? Math.round((count / questions.length) * 100) : 0;
                          return (
                            <div key={level} className="text-center">
                              <div className="flex items-center space-x-1 mb-1">
                                <DifficultyBadge difficulty={level} size="small" showIcon={false} />
                                <span className="text-sm font-medium text-gray-600">{count}</span>
                              </div>
                              <div className="text-xs text-gray-500">{percentage}%</div>
                            </div>
                          );
                        })}
                      </div>
                      {questions.length >= 5 && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ Good distribution for adaptive testing
                        </div>
                      )}
                      {questions.length < 5 && (
                        <div className="mt-2 text-xs text-orange-600 font-medium">
                          ⚠ Recommended: 5+ questions per difficulty level for optimal adaptive testing
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Excel/CSV Upload Button */}
                  <label htmlFor="excel-upload" className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100">
                    <UploadCloud className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium">Excel</span>
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>

                  {/* PDF Upload Button */}
                  <label htmlFor="pdf-upload" className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-lg cursor-pointer hover:bg-red-100">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium">PDF</span>
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>

                  {/* AI Upload Button */}
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-purple-50 text-purple-700 border border-purple-300 rounded-lg cursor-pointer hover:bg-purple-100"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium">Create with AI</span>
                  </button>

                  {/* Add Manual Question Button */}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-themed-primary/10 text-themed-primary border border-themed-primary/30 rounded-lg hover:bg-themed-primary/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium">Add</span>
                  </button>
                </div>
              </div>

              {/* File Upload Instructions */}
              <div className="bg-themed-bg-secondary border border-themed-border rounded-xl p-4 sm:p-6">

                <h4 className="text-sm font-semibold text-themed-primary mb-3 flex items-center">
                  <div className="h-7 w-7 bg-themed-primary rounded-lg flex items-center justify-center mr-2">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  Quick Upload Guide
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-white border border-emerald-300 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-2">
                        <span className="text-white text-lg font-bold">📊</span>
                      </div>
                      <h5 className="font-semibold text-sm text-emerald-800">Excel/CSV</h5>
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-700 space-y-1">
                      <p className="flex items-start"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>Question, OptionA-E, Answer</p>
                      <p className="flex items-start"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>Answer: A, B, C, D, or E</p>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-white border border-red-300 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="h-8 w-8 bg-red-500 rounded-lg flex items-center justify-center mr-2">
                        <span className="text-white text-lg font-bold">📄</span>
                      </div>
                      <h5 className="font-semibold text-sm text-red-800">PDF Format</h5>
                    </div>
                    <div className="text-xs sm:text-sm text-red-700 space-y-1">
                      <p className="flex items-start"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>Questions: Q1, 2., etc.</p>
                      <p className="flex items-start"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>Options: A), B), C), D)</p>
                    </div>
                  </div>
                </div>
              </div>

              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="card-modern p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-themed-primary flex items-center">
                      <span className="h-6 w-6 bg-themed-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-themed-primary mr-2">
                        {questionIndex + 1}
                      </span>
                      Question {questionIndex + 1}
                    </h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg p-2 transition-all duration-150"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {/* Question Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-themed-secondary mb-2">Question Type</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(questionIndex, 'text')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium ${question.questionType === 'text'
                            ? 'bg-themed-primary text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <span>📝</span>
                          <span>Text</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(questionIndex, 'image')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium ${question.questionType === 'image'
                            ? 'bg-themed-primary text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <Image className="h-4 w-4" />
                          <span>Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(questionIndex, 'code')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium ${question.questionType === 'code'
                            ? 'bg-themed-primary text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <Code className="h-4 w-4" />
                          <span>Code</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Difficulty Selector */}
                    <div>
                      <label className="block text-sm font-medium text-themed-secondary mb-2">Difficulty Level</label>
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-2">
                          {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleDifficultyChange(questionIndex, level)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${question.difficulty === level
                                ? 'ring-2 ring-offset-1'
                                : 'hover:scale-105'
                                }`}
                              style={{
                                backgroundColor: question.difficulty === level ? adaptiveTestService.getDifficultyBadgeStyle(level).backgroundColor : '#f3f4f6',
                                color: question.difficulty === level ? adaptiveTestService.getDifficultyBadgeStyle(level).color : '#6b7280',
                                borderColor: question.difficulty === level ? adaptiveTestService.getDifficultyBadgeStyle(level).borderColor : '#d1d5db',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                // ringColor is not a valid style prop, handling via className if needed
                              }}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          ))}
                        </div>
                        <DifficultyBadge difficulty={question.difficulty} size="small" />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {testData.isAdaptive
                          ? 'This affects adaptive question selection and scoring weights'
                          : 'Set the difficulty level for this question'
                        }
                      </p>
                    </div>

                    {/* Question Text */}
                    <div>
                      <label htmlFor={`question-${questionIndex}`} className="block text-sm font-medium text-themed-secondary mb-2">Question Text</label>
                      <textarea
                        id={`question-${questionIndex}`}
                        value={question.question}
                        onChange={(e) => handleQuestionChangeWithCodeDetection(questionIndex, 'question', e.target.value)}
                        rows={question.questionType === 'code' ? 6 : 3}
                        className="block w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 resize-none"
                        placeholder={
                          question.questionType === 'code'
                            ? "Enter your question with code blocks using:\n\n```python\nprint('Hello World')\n```"
                            : "Enter your question"
                        }
                      />
                      {question.questionType === 'code' && (
                        <p className="mt-2 text-xs text-themed-muted bg-themed-bg-secondary px-3 py-2 rounded-lg">
                          <strong>Tip:</strong> Use markdown-style code blocks: ```language followed by your code and closing ```
                        </p>
                      )}
                    </div>

                    {/* Image Upload Section */}
                    {question.questionType === 'image' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Question Image</label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 border border-blue-300">
                              <Image className="h-4 w-4" />
                              <span>Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(questionIndex, e)}
                                className="hidden"
                              />
                            </label>
                            <span className="text-sm text-gray-500">or</span>
                            <input
                              type="url"
                              placeholder="Enter image URL"
                              value={question.imageUrl || ''}
                              onChange={(e) => handleQuestionFieldChange(questionIndex, 'imageUrl', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          {question.imageUrl && (
                            <div className="mt-3">
                              <img
                                src={question.imageUrl}
                                alt="Preview"
                                className="max-w-full h-auto max-h-48 rounded-lg border shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  setError('Failed to load image. Please check the URL or upload a different image.');
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Code Input Section */}
                    {question.questionType === 'code' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-themed-secondary mb-2">Code Language</label>
                            <select
                              value={question.codeLanguage || 'javascript'}
                              onChange={(e) => handleQuestionFieldChange(questionIndex, 'codeLanguage', e.target.value)}
                              className="w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 cursor-pointer"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                              <option value="c">C</option>
                              <option value="csharp">C#</option>
                              <option value="php">PHP</option>
                              <option value="ruby">Ruby</option>
                              <option value="go">Go</option>
                              <option value="rust">Rust</option>
                              <option value="sql">SQL</option>
                              <option value="html">HTML</option>
                              <option value="css">CSS</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => togglePreview(questionIndex)}
                              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300"
                            >
                              {previewQuestions[questionIndex] ? (
                                <>
                                  <EyeOff className="h-4 w-4" />
                                  <span>Hide Preview</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4" />
                                  <span>Show Preview</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-themed-secondary mb-2">Code Content</label>
                          <textarea
                            value={question.codeContent || ''}
                            onChange={(e) => handleQuestionFieldChange(questionIndex, 'codeContent', e.target.value)}
                            rows={8}
                            className="w-full px-4 py-3 border border-themed-border bg-themed-bg rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150 font-mono text-sm resize-none"
                            placeholder="Enter your code here..."
                          />
                        </div>

                        {previewQuestions[questionIndex] && question.codeContent && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Code Preview</label>
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
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Preview for all types */}
                    {(question.questionType !== 'code' || !previewQuestions[questionIndex]) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Question Preview</label>
                          <button
                            type="button"
                            onClick={() => togglePreview(questionIndex)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {previewQuestions[questionIndex] ? 'Hide Preview' : 'Show Preview'}
                          </button>
                        </div>
                        {previewQuestions[questionIndex] && (
                          <div className="p-3 bg-gray-50 border rounded-md">
                            {renderQuestionContent(question, questionIndex)}
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-themed-secondary">Answer Options ({question.options.length}/5)</label>
                        <div className="flex items-center space-x-2">
                          {question.options.length < 5 && (
                            <button
                              type="button"
                              onClick={() => addOption(questionIndex)}
                              className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors flex items-center space-x-1"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Option</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name={`correct-${questionIndex}`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
                              className="text-themed-primary focus:ring-themed-primary/20 cursor-pointer"
                            />
                            <span className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${question.correctAnswer === optionIndex
                              ? 'bg-emerald-500 text-white'
                              : 'bg-themed-bg-secondary text-themed-secondary'
                              }`}>
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-themed-border bg-themed-bg rounded-lg focus:outline-none focus:ring-2 focus:ring-themed-primary/20 focus:border-themed-primary transition-all duration-150"
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            />
                            {question.options.length > 4 && (
                              <button
                                type="button"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Remove option"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-themed-muted">
                        Select the correct answer by clicking the radio button. You can have 4-5 options per question.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-themed-border bg-themed-bg sticky bottom-0">
          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium order-2 sm:order-1"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm sm:text-base">Add Question</span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base text-themed-secondary bg-themed-bg-secondary hover:bg-themed-bg border border-themed-border rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              <div className="flex items-center justify-center space-x-2 text-sm sm:text-base">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Test</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAiModal && (
        <AiGenerationModal
          onClose={() => setShowAiModal(false)}
          onQuestionsGenerated={handleAiQuestionsGenerated}
        />
      )}
    </div>
  );
};

export default CreateTestModal;