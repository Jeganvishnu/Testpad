import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, User, CheckCircle, XCircle, Play, AlertCircle, Sparkles } from 'lucide-react';
import { aiService } from '../../services/aiService';
import AIStudyAdvicePanel from './AIStudyAdvicePanel';

interface Test {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  completedAt: string;
}

interface TestCardProps {
  test: Test;
  status: 'upcoming' | 'active' | 'completed' | 'expired';
  completedResult?: TestResult;
  onClick?: (testId: string, status: string) => void;
}

const TestCard: React.FC<TestCardProps> = ({ test, status, completedResult, onClick }) => {
  const navigate = useNavigate();

  // AI Study Assistant state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isClosingPanel, setIsClosingPanel] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50 text-orange-800 dark:text-orange-300';
      case 'upcoming':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-300';
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-800 dark:text-green-300';
      case 'expired':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <Play className="h-4 w-4" />;
      case 'upcoming':
        return <Calendar className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(test.id, status);
      return;
    }

    // Default behavior if no onClick provided
    if (status === 'active') {
      navigate(`/test/${test.id}`);
    } else if (status === 'completed' && completedResult) {
      navigate(`/result/${test.id}`);
    }
  };

  const isClickable = status === 'active' || status === 'completed';

  // Handle AI button click
  const handleAIClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    setShowAIPanel(true);
    setAiLoading(true);
    setAiError(null);
    setAiAdvice(null);

    try {
      // Get API key from environment or prompt user
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error('AI service is not configured. Please contact your administrator.');
      }

      const advice = await aiService.generateStudyAdvice(
        test.title,
        test.description,
        apiKey
      );

      setAiAdvice(advice);
    } catch (error: any) {
      console.error('Error generating AI advice:', error);
      setAiError(error.message || 'Failed to generate study advice. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Handle panel close with animation
  const handleClosePanel = () => {
    setIsClosingPanel(true);
    setTimeout(() => {
      setShowAIPanel(false);
      setIsClosingPanel(false);
    }, 300);
  };

  // Handle retry
  const handleRetry = () => {
    handleAIClick({ stopPropagation: () => { } } as React.MouseEvent);
  };

  return (
    <>
      <div
        className={`card-modern card-padding-mobile h-full flex flex-col ${isClickable ? 'cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 touch-feedback' : ''
          }`}
        onClick={isClickable ? handleCardClick : undefined}
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 min-w-0">
            {test.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* AI Study Assistant Button */}
            <button
              onClick={handleAIClick}
              className="p-2 rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 hover:from-purple-200 hover:to-blue-200 dark:hover:from-purple-800/40 dark:hover:to-blue-800/40 transition-all duration-200 transform hover:scale-110 group"
              title="Get AI Study Advice"
              aria-label="Get AI study advice for this test"
            >
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:rotate-12 transition-transform" />
            </button>

            <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize hidden sm:inline">{status}</span>
            </span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 flex-1">
          {test.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
            <span>Starts: {formatDate(test.startTime)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
            <span>Closes: {formatDate(test.endTime)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
            <span>Time Limit: {test.duration} minutes</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
            {test.totalQuestions} questions
          </div>
        </div>

        {status === 'completed' && completedResult && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Score:</span>
              <span className={`text-lg font-bold ${(completedResult.score / completedResult.totalQuestions) * 100 >= 70
                ? 'text-green-600 dark:text-green-400'
                : (completedResult.score / completedResult.totalQuestions) * 100 >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                {completedResult.score}/{completedResult.totalQuestions}
              </span>
            </div>
            <div className="progress-bar mt-3">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(completedResult.score / completedResult.totalQuestions) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {status === 'active' && (
          <button className="w-full mt-4 btn-modern btn-primary-modern btn-touch">
            <Play className="h-4 w-4" />
            Start Test
          </button>
        )}

        {status === 'upcoming' && (
          <div className="text-center mt-4 py-3 px-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Starts on {formatDate(test.startTime)}
            </p>
          </div>
        )}
      </div>

      {/* AI Study Advice Panel - Rendered outside card for proper positioning */}
      {showAIPanel && (
        <AIStudyAdvicePanel
          isOpen={showAIPanel}
          isClosing={isClosingPanel}
          onClose={handleClosePanel}
          testTitle={test.title}
          testDescription={test.description}
          advice={aiAdvice}
          loading={aiLoading}
          error={aiError}
          onRetry={handleRetry}
        />
      )}
    </>
  );
};

export default TestCard;