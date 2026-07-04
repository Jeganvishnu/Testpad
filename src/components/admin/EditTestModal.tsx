import React, { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { X, Plus, Trash2, Clock, Calendar, Save, AlertCircle, Eye, EyeOff, Code, Image as ImageIcon, FileText, UploadCloud } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as XLSX from 'xlsx';
import { extractQuestionsFromPdf, validateExtractedQuestions } from '../../utils/pdfUtils';
import { database } from '../../lib/firebase';

interface Question {
  id: string;
  question: string;
  questionType: 'text' | 'image' | 'code';
  imageUrl?: string;
  codeContent?: string;
  codeLanguage?: string;
  options: string[];
  correctAnswer: number;
}

interface EditTestModalProps {
  testId: string;
  onClose: () => void;
  onTestUpdated: () => void;
}

const EditTestModal: React.FC<EditTestModalProps> = ({ testId, onClose, onTestUpdated }) => {
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 0,
    totalQuestions: 0,
    createdAt: '',
    category: 'Quantitative Aptitude'
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'questions'>('details');
  const [previewQuestions, setPreviewQuestions] = useState<Record<number, boolean>>({});
  const [fileUploadMessage, setFileUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const testRef = ref(database, `tests/${testId}`);
      const testSnapshot = await get(testRef);
      const questionsRef = ref(database, `questions/${testId}`);
      const questionsSnapshot = await get(questionsRef);

      if (testSnapshot.exists()) {
        const testInfo = testSnapshot.val();
        setTestData({
          title: testInfo.title || '',
          description: testInfo.description || '',
          startTime: testInfo.startTime || '',
          endTime: testInfo.endTime || '',
          duration: testInfo.duration || 0,
          totalQuestions: testInfo.totalQuestions || 0,
          createdAt: testInfo.createdAt || '',
          category: testInfo.category || 'Quantitative Aptitude'
        });
      }

      if (questionsSnapshot.exists()) {
        const questionsData = questionsSnapshot.val();
        const questionsArray = Object.entries(questionsData).map(([id, q]: [string, any]) => {
          // Normalize options to a maximum of 5
          let opts: string[] = Array.isArray(q.options) ? [...q.options] : ['', '', '', '', ''];
          if (opts.length > 5) opts = opts.slice(0, 5);
          while (opts.length < 5) opts.push('');

          // Ensure correctAnswer is within range
          let correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
          if (correctIdx < 0 || correctIdx >= opts.length) correctIdx = 0;

          return ({
            id,
            question: q.question || '',
            questionType: q.questionType || 'text',
            imageUrl: q.imageUrl || '',
            codeContent: q.codeContent || '',
            codeLanguage: q.codeLanguage || 'javascript',
            options: opts,
            correctAnswer: correctIdx
          });
        });
        setQuestions(questionsArray);
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
      setError('Failed to load test details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDataChange = (field: string, value: string | number) => {
    setTestData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswer = optionIndex;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      question: '',
      questionType: 'text',
      options: ['', '', '', '', ''],
      correctAnswer: 0
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const togglePreview = (index: number) => {
    setPreviewQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      handleQuestionChange(index, 'imageUrl', imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const updateTest = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate required fields
      if (!testData.title.trim()) {
        setError('Test title is required.');
        return;
      }

      if (!testData.startTime || !testData.endTime) {
        setError('Start time and end time are required.');
        return;
      }

      if (testData.duration <= 0) {
        setError('Duration must be greater than 0.');
        return;
      }

      // Validate questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) {
          setError(`Question ${i + 1} text is required.`);
          return;
        }
        if (q.options.some(opt => !opt.trim())) {
          setError(`All options for question ${i + 1} are required.`);
          return;
        }
      }

      // Update test data with current question count
      const updatedTestData = {
        ...testData,
        totalQuestions: questions.length
      };

      // Save test data
      await set(ref(database, `tests/${testId}`), updatedTestData);

      // Save questions
      const questionsRef = ref(database, `questions/${testId}`);
      const questionsToSave: Record<string, any> = {};
      
      questions.forEach((question) => {
        const { id, ...questionData } = question;
        questionsToSave[id] = questionData;
      });

      await set(questionsRef, questionsToSave);

      onTestUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating test:', error);
      setError('Failed to update test. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Edit Test</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Test Details
                  </button>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'questions'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Questions ({questions.length})
                  </button>
                </nav>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Test Title</label>
                    <input
                      type="text" id="title" value={testData.title}
                      onChange={(e) => handleTestDataChange('title', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="description" value={testData.description}
                      onChange={(e) => handleTestDataChange('description', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                      <input
                        type="datetime-local" id="startTime" value={formatDateTime(testData.startTime)}
                        onChange={(e) => handleTestDataChange('startTime', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                      <input
                        type="datetime-local" id="endTime" value={formatDateTime(testData.endTime)}
                        onChange={(e) => handleTestDataChange('endTime', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                    <input
                      type="number" 
                      id="duration" 
                      min="1"
                      value={testData.duration || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        handleTestDataChange('duration', isNaN(value) ? 0 : value);
                      }}
                      onBlur={(e) => {
                        // On blur, ensure minimum value of 1
                        if (testData.duration < 1) {
                          handleTestDataChange('duration', 1);
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Test Category</label>
                    <select
                      id="category"
                      value={testData.category}
                      onChange={(e) => handleTestDataChange('category', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Quantitative Aptitude">📊 Quantitative Aptitude</option>
                      <option value="Verbal">📚 Verbal</option>
                      <option value="Logical Reasoning">🧩 Logical Reasoning</option>
                      <option value="Technical MCQs">⚙️ Technical MCQs</option>
                      <option value="Programming">💻 Programming</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'questions' && (
                 <div className="space-y-4">
                    {questions.map((q, index) => (
                    <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        {questions.length > 1 && (
                            <button type="button" onClick={() => removeQuestion(index)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                        </div>
                        
                        <label className="block text-sm font-medium text-gray-700">Question Text</label>
                        <textarea
                        value={q.question}
                        onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder="Enter the question"
                        />

                        <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Options</label>
                        <div className="mt-2 space-y-2">
                            {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center space-x-3">
                                <input
                                type="radio"
                                name={`correct-answer-${q.id}`}
                                checked={q.correctAnswer === optIndex}
                                onChange={() => handleCorrectAnswerChange(index, optIndex)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                />
                            </div>
                            ))}
                        </div>
                        </div>
                    </div>
                    ))}
                    <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                    <Plus className="h-4 w-4" />
                    <span>Add Question</span>
                    </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={updateTest}
            disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTestModal;

