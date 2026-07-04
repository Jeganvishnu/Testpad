import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, BarChart3, Target, Zap } from 'lucide-react';
import {
    getPerformanceMetrics,
    PerformanceTrend,
    PerformanceInsights,
    TestHistoryItem,
} from '../../services/performanceTrackingService';

interface PerformanceTrackerProps {
    currentScore: number;
    userId: string;
    currentTestId?: string;
}

const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({
    currentScore,
    userId,
    currentTestId,
}) => {
    const [loading, setLoading] = useState(true);
    const [trend, setTrend] = useState<PerformanceTrend | null>(null);
    const [insights, setInsights] = useState<PerformanceInsights | null>(null);
    const [history, setHistory] = useState<TestHistoryItem[]>([]);

    useEffect(() => {
        const fetchPerformanceData = async () => {
            setLoading(true);
            try {
                const metrics = await getPerformanceMetrics(userId, currentScore, currentTestId);
                setTrend(metrics.trend);
                setInsights(metrics.insights);
                setHistory(metrics.history);
            } catch (error) {
                console.error('Error fetching performance metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchPerformanceData();
        }
    }, [userId, currentScore, currentTestId]);

    if (loading) {
        return (
            <div className="card-modern p-8">
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="sliding-squares-loader mb-4">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!trend || !insights) {
        return null;
    }

    const getTrendIcon = () => {
        switch (trend.trend) {
            case 'improving':
                return <TrendingUp className="h-5 w-5" />;
            case 'declining':
                return <TrendingDown className="h-5 w-5" />;
            case 'stable':
                return <Minus className="h-5 w-5" />;
            default:
                return <BarChart3 className="h-5 w-5" />;
        }
    };

    const getTrendColor = () => {
        switch (insights.color) {
            case 'green':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300';
            case 'red':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300';
            case 'yellow':
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-300';
            default:
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300';
        }
    };

    return (
        <div className="card-modern glass p-3 mb-4">
            {/* Header */}
            <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 mr-2">
                    <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Performance Tracker</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Last {history.length + 1} test{history.length !== 0 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Insight Banner */}
            <div className={`rounded-lg p-2 border mb-2 ${getTrendColor()}`}>
                <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">{getTrendIcon()}</div>
                    <div className="flex-1">
                        <p className="text-xs font-medium">{insights.message}</p>
                        <p className="text-xs mt-0.5 opacity-90">{insights.recommendation}</p>
                    </div>
                </div>
            </div>

            {/* Badge */}
            {insights.badge && (
                <div className="mb-2 flex justify-center">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-semibold shadow">
                        <Award className="h-3 w-3 mr-1" />
                        {insights.badge}
                    </div>
                </div>
            )}

            {/* Statistics Grid - Compact 2x2 Grid */}
            {trend.trend !== 'insufficient-data' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-1">
                            <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{trend.averageScore}%</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">Average</p>
                    </div>

                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50">
                        <div className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-1">
                            <Award className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{trend.bestScore}%</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">Best</p>
                    </div>

                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50">
                        <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-1">
                            <Zap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{trend.consistency}%</p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">Consistency</p>
                    </div>

                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50">
                        <div className="flex items-center justify-center w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg mx-auto mb-1">
                            {trend.improvementFromAverage >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                            )}
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                            {trend.improvementFromAverage >= 0 ? '+' : ''}{trend.improvementFromAverage}%
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400">vs Average</p>
                    </div>
                </div>
            )}

            {/* Score Progression Chart */}
            {history.length > 0 && (
                <div className="mb-2">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Score Progression (Last {history.length + 1} Tests)
                    </h4>
                    <div className="relative h-20 flex items-end justify-between gap-1">
                        {[...history.map((item, idx) => ({
                            percentage: item.percentage,
                            label: `-${history.length - idx}`,
                            isCurrent: false
                        })).reverse(), {
                            percentage: currentScore,
                            label: 'Now',
                            isCurrent: true
                        }].map((item, index) => {
                            const maxScore = Math.max(...history.map(h => h.percentage), currentScore, 100);
                            const minScore = Math.min(...history.map(h => h.percentage), currentScore, 0);
                            const range = maxScore - minScore || 1;
                            const height = ((item.percentage - minScore) / range) * 100;

                            return (
                                <div key={index} className="flex-1 flex flex-col items-center">
                                    <div className="relative w-full h-full flex items-end">
                                        <div
                                            className={`w-full rounded-t transition-all ${item.isCurrent
                                                ? 'bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500'
                                                : 'bg-gradient-to-t from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-500'
                                                }`}
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        >
                                            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {item.percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        {item.isCurrent ? (
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">Now</span>
                                        ) : (
                                            <span>{item.label}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Test History Table */}
            {history.length > 0 && (
                <div>
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recent Test History</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-1 px-2 text-xs text-gray-600 dark:text-gray-400 font-medium">Test</th>
                                    <th className="text-center py-1 px-2 text-xs text-gray-600 dark:text-gray-400 font-medium">Score</th>
                                    <th className="text-center py-1 px-2 text-xs text-gray-600 dark:text-gray-400 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item, index) => (
                                    <tr key={item.testId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="py-1 px-2 text-gray-900 dark:text-white">
                                            <div className="flex items-center">
                                                <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium mr-1.5">
                                                    {index + 1}
                                                </span>
                                                <span className="truncate max-w-[150px] text-xs">{item.testTitle}</span>
                                            </div>
                                        </td>
                                        <td className="py-1 px-2 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${item.percentage >= 80
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                : item.percentage >= 60
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                }`}>
                                                {item.percentage}%
                                            </span>
                                        </td>
                                        <td className="py-1 px-2 text-center text-xs text-gray-600 dark:text-gray-400">
                                            {new Date(item.completedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceTracker;
