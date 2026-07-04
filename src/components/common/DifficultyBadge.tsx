import React from 'react';
import { DifficultyLevel, adaptiveTestService } from '../../services/adaptiveTestService';

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  className?: string;
}

const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  size = 'medium',
  showIcon = true,
  className = ''
}) => {
  const badgeStyle = adaptiveTestService.getDifficultyBadgeStyle(difficulty);
  
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    small: 'h-3 w-3',
    medium: 'h-4 w-4',
    large: 'h-5 w-5'
  };

  const getDifficultyIcon = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'easy':
        return (
          <svg
            className={`${iconSizes[size]} mr-1`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'medium':
        return (
          <svg
            className={`${iconSizes[size]} mr-1`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'hard':
        return (
          <svg
            className={`${iconSizes[size]} mr-1`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        transition-all duration-200 hover:shadow-md
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color,
        borderColor: badgeStyle.borderColor,
      }}
    >
      {showIcon && getDifficultyIcon(difficulty)}
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
};

export default DifficultyBadge;