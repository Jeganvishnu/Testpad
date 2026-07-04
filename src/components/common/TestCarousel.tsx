import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TestCard from '../student/TestCard';

interface Test {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalQuestions: number;
  testType?: 'programming' | 'mcq';
}

interface TestResult {
  score: number;
  totalQuestions: number;
  completedAt: string;
}

interface TestCarouselProps {
  tests: Test[];
  status: 'upcoming' | 'active' | 'completed' | 'expired';
  completedTests: Record<string, TestResult>;
  title: string;
  icon: React.ReactNode;
  onTestClick?: (testId: string, status: string, testType?: string) => void;
}

const TestCarousel: React.FC<TestCarouselProps> = ({
  tests,
  status,
  completedTests,
  title,
  icon,
  onTestClick
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Check scroll position and update button states
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tests]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && !isScrolling) {
      setIsScrolling(true);
      const container = scrollContainerRef.current;
      const cardWidth = 320; // Approximate width of a test card + gap
      const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time

      const targetScrollLeft = direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });

      // Reset scrolling state after animation
      setTimeout(() => {
        setIsScrolling(false);
        checkScrollPosition();
      }, 300);
    }
  };

  const handleScroll = () => {
    if (!isScrolling) {
      checkScrollPosition();
    }
  };

  if (tests.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Header with title and navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          {icon}
          {title}
        </h2>

        {/* Navigation arrows - only show if there are more cards than visible */}
        {tests.length > 3 && (
          <div className="flex space-x-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft || isScrolling}
              className={`p-2 rounded-full border transition-all duration-200 ${canScrollLeft && !isScrolling
                ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm transform hover:scale-105'
                : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight || isScrolling}
              className={`p-2 rounded-full border transition-all duration-200 ${canScrollRight && !isScrolling
                ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm transform hover:scale-105'
                : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto scrollbar-hide space-x-6 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitScrollbar: { display: 'none' }
          }}
        >
          {tests.map((test) => (
            <div key={test.id} className="flex-shrink-0 w-80">
              <TestCard
                test={test}
                status={status}
                completedResult={completedTests[test.id]}
                onClick={onTestClick ? (testId, testStatus) => onTestClick(testId, testStatus, test.testType) : undefined}
              />
            </div>
          ))}
        </div>

        {/* Gradient overlays for better visual indication */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-slate-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-50 dark:from-gray-900 to-transparent pointer-events-none z-10" />
        )}
      </div>

      {/* Scroll indicator dots (optional) */}
      {tests.length > 3 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(tests.length / 2) }).map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-300 transition-colors duration-200"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TestCarousel;
