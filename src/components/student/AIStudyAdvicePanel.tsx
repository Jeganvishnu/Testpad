import React from 'react';
import { X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

interface AIStudyAdvicePanelProps {
    isOpen: boolean;
    isClosing: boolean;
    onClose: () => void;
    testTitle: string;
    testDescription: string;
    advice: string | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const AIStudyAdvicePanel: React.FC<AIStudyAdvicePanelProps> = ({
    isOpen,
    isClosing,
    onClose,
    testTitle,
    testDescription,
    advice,
    loading,
    error,
    onRetry
}) => {
    if (!isOpen && !isClosing) return null;

    return (
        <>
            {/* Backdrop Overlay - Fades out faster to prevent black flash */}
            <div
                className={`fixed inset-0 bg-black/60 z-[9998] cursor-pointer transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={onClose}
                style={{ pointerEvents: 'auto' }}
            />

            {/* Sliding Panel */}
            <div
                className={`fixed top-0 right-0 bottom-0 w-full md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[9999] ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
                style={{ display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                                AI Study Assistant
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                Personalized preparation tips
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-2 p-2 hover:bg-purple-100 dark:hover:bg-purple-800/30 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close panel"
                        type="button"
                    >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Test Info */}
                    <div className="card-modern p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                            {testTitle}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {testDescription}
                        </p>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="relative">
                            {/* Animated AI Thinking Indicator */}
                            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                {/* Animated Sparkles Circle */}
                                <div className="relative w-24 h-24">
                                    {/* Rotating outer ring */}
                                    <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>

                                    {/* Pulsing inner circle */}
                                    <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 dark:from-purple-600 dark:to-blue-600 animate-pulse flex items-center justify-center">
                                        <Sparkles className="h-10 w-10 text-white animate-pulse" />
                                    </div>

                                    {/* Orbiting sparkles */}
                                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                                        <Sparkles className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-purple-400" />
                                    </div>
                                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                                        <Sparkles className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '2s' }}>
                                        <Sparkles className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 dark:text-pink-400" />
                                    </div>
                                </div>

                                {/* Animated Text */}
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        AI is thinking...
                                    </h3>
                                    <div className="flex items-center justify-center space-x-1">
                                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Generating personalized study tips for you
                                    </p>
                                </div>

                                {/* Progress hints */}
                                <div className="w-full max-w-md space-y-2">
                                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                                    </div>
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        Analyzing test topics and preparing recommendations...
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="card-modern p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Unable to Generate Advice
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {error}
                            </p>
                            <button
                                onClick={onRetry}
                                className="btn-modern btn-primary-modern"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Success State - AI Advice */}
                    {advice && !loading && !error && (
                        <div className="card-modern p-4 sm:p-6">
                            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Study Preparation Guide
                                </h3>
                            </div>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none study-advice-content"
                                dangerouslySetInnerHTML={{ __html: advice }}
                            />
                        </div>
                    )}

                    {/* Disclaimer */}
                    {advice && !loading && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p>
                                💡 This advice is AI-generated and provides general study guidance.
                                Always refer to your course materials and instructor's recommendations.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AIStudyAdvicePanel;
