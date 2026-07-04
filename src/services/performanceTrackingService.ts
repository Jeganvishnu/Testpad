import { ref, get } from 'firebase/database';
import { database } from '../lib/firebase';

/**
 * Interface for a single test history item
 */
export interface TestHistoryItem {
    testId: string;
    testTitle: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    completedAt: string;
    timeSpent?: number;
}

/**
 * Interface for performance trend analysis
 */
export interface PerformanceTrend {
    trend: 'improving' | 'declining' | 'stable' | 'insufficient-data';
    trendPercentage: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    improvementFromAverage: number;
    consistency: number; // 0-100, higher means more consistent
}

/**
 * Interface for performance insights
 */
export interface PerformanceInsights {
    message: string;
    recommendation: string;
    badge?: string;
    color: 'green' | 'blue' | 'yellow' | 'red';
}

/**
 * Fetch user's test history sorted by completion date
 * @param userId - The user's ID
 * @param limit - Maximum number of tests to fetch (default: 10)
 * @returns Array of test history items
 */
export async function getUserTestHistory(
    userId: string,
    limit: number = 10
): Promise<TestHistoryItem[]> {
    try {
        const testHistory: TestHistoryItem[] = [];

        // Fetch all tests to get test titles
        const testsRef = ref(database, 'tests');
        const testsSnapshot = await get(testsRef);

        if (!testsSnapshot.exists()) {
            return [];
        }

        const testsData = testsSnapshot.val();

        // Fetch all responses for this user across all tests
        for (const testId in testsData) {
            const responseRef = ref(database, `responses/${testId}/${userId}`);
            const responseSnapshot = await get(responseRef);

            if (responseSnapshot.exists()) {
                const response = responseSnapshot.val();

                // Validate response data
                if (
                    response &&
                    typeof response.score === 'number' &&
                    typeof response.totalQuestions === 'number' &&
                    response.completedAt
                ) {
                    const percentage = response.totalQuestions > 0
                        ? Math.round((response.score / response.totalQuestions) * 100)
                        : 0;

                    testHistory.push({
                        testId,
                        testTitle: testsData[testId].title || 'Untitled Test',
                        score: response.score,
                        totalQuestions: response.totalQuestions,
                        percentage,
                        completedAt: response.completedAt,
                        timeSpent: response.timeSpent,
                    });
                }
            }
        }

        // Sort by completion date (most recent first)
        testHistory.sort((a, b) => {
            const dateA = new Date(a.completedAt).getTime();
            const dateB = new Date(b.completedAt).getTime();
            return dateB - dateA;
        });

        // Return limited results
        return testHistory.slice(0, limit);
    } catch (error) {
        console.error('Error fetching user test history:', error);
        return [];
    }
}

/**
 * Calculate performance trend based on scores
 * @param scores - Array of percentage scores (most recent first)
 * @returns Trend type
 */
export function calculatePerformanceTrend(
    currentScore: number,
    historicalScores: number[]
): PerformanceTrend {
    // If no historical data
    if (historicalScores.length === 0) {
        return {
            trend: 'insufficient-data',
            trendPercentage: 0,
            averageScore: currentScore,
            bestScore: currentScore,
            worstScore: currentScore,
            improvementFromAverage: 0,
            consistency: 100,
        };
    }

    // Calculate statistics
    const allScores = [currentScore, ...historicalScores];
    const averageScore = Math.round(
        allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    );
    const bestScore = Math.max(...allScores);
    const worstScore = Math.min(...allScores);
    const improvementFromAverage = currentScore - averageScore;

    // Calculate consistency (inverse of standard deviation, normalized to 0-100)
    const variance =
        allScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) /
        allScores.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - standardDeviation));

    // Determine trend based on recent performance
    let trend: 'improving' | 'declining' | 'stable' | 'insufficient-data' = 'stable';
    let trendPercentage = 0;

    if (historicalScores.length >= 2) {
        // Use last 3 scores including current (or all available if less than 3)
        const recentScores = allScores.slice(0, Math.min(3, allScores.length));

        // Calculate linear regression slope
        const n = recentScores.length;
        const xValues = Array.from({ length: n }, (_, i) => n - i - 1); // Reverse order for chronological
        const yValues = recentScores.reverse(); // Chronological order

        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        // Determine trend based on slope
        if (slope > 2) {
            trend = 'improving';
            trendPercentage = Math.min(100, Math.abs(slope) * 10);
        } else if (slope < -2) {
            trend = 'declining';
            trendPercentage = Math.min(100, Math.abs(slope) * 10);
        } else {
            trend = 'stable';
            trendPercentage = consistency;
        }
    } else {
        // Only one historical score - simple comparison
        const previousScore = historicalScores[0];
        const difference = currentScore - previousScore;

        if (difference > 5) {
            trend = 'improving';
            trendPercentage = Math.min(100, Math.abs(difference));
        } else if (difference < -5) {
            trend = 'declining';
            trendPercentage = Math.min(100, Math.abs(difference));
        } else {
            trend = 'stable';
            trendPercentage = consistency;
        }
    }

    return {
        trend,
        trendPercentage: Math.round(trendPercentage),
        averageScore,
        bestScore,
        worstScore,
        improvementFromAverage,
        consistency: Math.round(consistency),
    };
}

/**
 * Generate performance insights and recommendations
 * @param performanceTrend - The calculated performance trend
 * @param currentScore - Current test score percentage
 * @returns Performance insights object
 */
export function generatePerformanceInsights(
    performanceTrend: PerformanceTrend,
    currentScore: number
): PerformanceInsights {
    const { trend, improvementFromAverage, consistency, averageScore, bestScore } = performanceTrend;

    // Handle insufficient data
    if (trend === 'insufficient-data') {
        return {
            message: '🎯 This is your first test!',
            recommendation: 'Complete more tests to track your progress and see performance trends.',
            badge: 'First Steps',
            color: 'blue',
        };
    }

    // Generate insights based on trend
    let message = '';
    let recommendation = '';
    let badge = '';
    let color: 'green' | 'blue' | 'yellow' | 'red' = 'blue';

    switch (trend) {
        case 'improving':
            message = `📈 Great progress! You're on an upward trend with ${improvementFromAverage > 0 ? '+' : ''}${improvementFromAverage}% from your average.`;
            recommendation = 'Keep up the excellent work! Your consistent improvement shows dedication.';
            badge = consistency > 70 ? 'Consistent Achiever' : 'Rising Star';
            color = 'green';
            break;

        case 'declining':
            message = `📉 Your recent scores show a declining trend (${improvementFromAverage}% from average).`;
            recommendation = 'Review the topics you struggled with and practice more. Consider revisiting fundamentals.';
            badge = 'Room for Growth';
            color = 'red';
            break;

        case 'stable':
            if (currentScore >= 80) {
                message = `⭐ Excellent! You're maintaining a strong performance at ${currentScore}%.`;
                recommendation = 'Challenge yourself with more advanced topics to continue growing.';
                badge = consistency > 80 ? 'Steady Performer' : 'Reliable Achiever';
                color = 'green';
            } else if (currentScore >= 60) {
                message = `📊 You're maintaining steady performance around ${averageScore}%.`;
                recommendation = 'Focus on improving weak areas to boost your scores to the next level.';
                badge = 'Consistent Learner';
                color = 'blue';
            } else {
                message = `📊 Your performance is stable but below target at ${currentScore}%.`;
                recommendation = 'Identify challenging topics and dedicate more time to practice and review.';
                badge = 'Building Foundation';
                color = 'yellow';
            }
            break;
    }

    // Add special badges for achievements
    if (currentScore === bestScore && currentScore >= 90) {
        badge = 'Top Performer';
    } else if (consistency > 90) {
        badge = 'Remarkably Consistent';
    }

    return {
        message,
        recommendation,
        badge,
        color,
    };
}

/**
 * Get comprehensive performance metrics
 * @param userId - The user's ID
 * @param currentScore - Current test score percentage
 * @param currentTestId - Current test ID (to exclude from history)
 * @returns Performance trend and insights
 */
export async function getPerformanceMetrics(
    userId: string,
    currentScore: number,
    currentTestId?: string
): Promise<{
    trend: PerformanceTrend;
    insights: PerformanceInsights;
    history: TestHistoryItem[];
}> {
    try {
        // Fetch test history (last 10 tests)
        const fullHistory = await getUserTestHistory(userId, 10);

        // Filter out current test if provided
        const history = currentTestId
            ? fullHistory.filter(item => item.testId !== currentTestId)
            : fullHistory;

        // Get last 3 scores for trend analysis (excluding current)
        const historicalScores = history.slice(0, 3).map(item => item.percentage);

        // Calculate trend
        const trend = calculatePerformanceTrend(currentScore, historicalScores);

        // Generate insights
        const insights = generatePerformanceInsights(trend, currentScore);

        return {
            trend,
            insights,
            history: history.slice(0, 3), // Return only last 3 for display
        };
    } catch (error) {
        console.error('Error getting performance metrics:', error);

        // Return default values on error
        return {
            trend: {
                trend: 'insufficient-data',
                trendPercentage: 0,
                averageScore: currentScore,
                bestScore: currentScore,
                worstScore: currentScore,
                improvementFromAverage: 0,
                consistency: 100,
            },
            insights: {
                message: 'Unable to load performance data.',
                recommendation: 'Please try again later.',
                color: 'blue',
            },
            history: [],
        };
    }
}
