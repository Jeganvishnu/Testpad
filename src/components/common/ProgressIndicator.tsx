import React from 'react';

interface ProgressIndicatorProps {
    current: number;
    total: number;
    variant?: 'linear' | 'circular' | 'steps';
    showLabel?: boolean;
    showPercentage?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    current,
    total,
    variant = 'linear',
    showLabel = true,
    showPercentage = true,
    className = '',
    size = 'md',
}) => {
    const percentage = Math.min(Math.round((current / total) * 100), 100);

    // Size configurations
    const sizeClasses = {
        sm: { height: 'h-2', text: 'text-xs', circle: 'w-12 h-12' },
        md: { height: 'h-3', text: 'text-sm', circle: 'w-16 h-16' },
        lg: { height: 'h-4', text: 'text-base', circle: 'w-20 h-20' },
    };

    const config = sizeClasses[size];

    if (variant === 'circular') {
        const radius = size === 'sm' ? 20 : size === 'md' ? 28 : 36;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className={`relative inline-flex items-center justify-center ${className}`}>
                <svg className={config.circle} viewBox="0 0 80 80">
                    {/* Background circle */}
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 ease-out"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                    />
                    <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent-primary)" />
                            <stop offset="100%" stopColor="var(--accent-secondary)" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-bold gradient-warp ${config.text}`}>
                        {percentage}%
                    </span>
                    {showLabel && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {current}/{total}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'steps') {
        return (
            <div className={`space-y-2 ${className}`}>
                {showLabel && (
                    <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.text}`}>
                            Question {current} of {total}
                        </span>
                        {showPercentage && (
                            <span className={`font-semibold gradient-warp ${config.text}`}>
                                {percentage}%
                            </span>
                        )}
                    </div>
                )}
                <div className="flex gap-1">
                    {Array.from({ length: total }).map((_, index) => {
                        const isCompleted = index < current;
                        const isCurrent = index === current - 1;

                        return (
                            <div
                                key={index}
                                className={`
                  flex-1 ${config.height} rounded-full transition-all duration-300
                  ${isCompleted
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 dark:from-warp-primary dark:to-warp-secondary'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }
                  ${isCurrent ? 'ring-2 ring-blue-400 dark:ring-warp-primary ring-offset-2 dark:ring-offset-gray-900' : ''}
                `}
                                role="progressbar"
                                aria-valuenow={isCompleted ? 100 : 0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // Linear variant (default)
    return (
        <div className={`w-full ${className}`}>
            {showLabel && (
                <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.text}`}>
                        Progress
                    </span>
                    {showPercentage && (
                        <span className={`font-semibold gradient-warp ${config.text}`}>
                            {percentage}%
                        </span>
                    )}
                </div>
            )}
            <div className={`w-full ${config.height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 dark:from-warp-primary dark:to-warp-secondary rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
            </div>
            {showLabel && (
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {current} of {total} completed
                    </span>
                </div>
            )}
        </div>
    );
};

// Shimmer animation for progress bar
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
document.head.appendChild(style);

export default ProgressIndicator;
