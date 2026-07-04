import React from 'react';

interface LoadingSkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    className?: string;
    count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    variant = 'text',
    width = '100%',
    height,
    className = '',
    count = 1,
}) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'circular':
                return 'rounded-full';
            case 'rectangular':
                return 'rounded-lg';
            case 'card':
                return 'rounded-xl';
            case 'text':
            default:
                return 'rounded';
        }
    };

    const getDefaultHeight = () => {
        switch (variant) {
            case 'circular':
                return width;
            case 'card':
                return '200px';
            case 'text':
                return '1em';
            default:
                return height || '20px';
        }
    };

    const skeletonStyle = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height || getDefaultHeight(),
    };

    const baseClasses = `
    bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
    dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
    animate-shimmer bg-[length:200%_100%]
    ${getVariantClasses()}
    ${className}
  `;

    if (count > 1) {
        return (
            <div className="space-y-2">
                {Array.from({ length: count }).map((_, index) => (
                    <div key={index} className={baseClasses} style={skeletonStyle} />
                ))}
            </div>
        );
    }

    return <div className={baseClasses} style={skeletonStyle} />;
};

// Preset skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`card-modern p-6 ${className}`}>
        <div className="flex items-center space-x-4 mb-4">
            <LoadingSkeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
                <LoadingSkeleton width="60%" height={20} />
                <LoadingSkeleton width="40%" height={16} />
            </div>
        </div>
        <LoadingSkeleton count={3} height={16} className="mb-2" />
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
    rows = 5,
    className = ''
}) => (
    <div className={`card-modern overflow-hidden ${className}`}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800">
            <LoadingSkeleton width="30%" height={20} />
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="p-4 flex items-center space-x-4">
                    <LoadingSkeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <LoadingSkeleton width="70%" height={16} />
                        <LoadingSkeleton width="50%" height={14} />
                    </div>
                    <LoadingSkeleton width={80} height={32} className="rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonDashboard: React.FC = () => (
    <div className="space-y-6">
        {/* Header skeleton */}
        <div className="card-modern p-6 glass">
            <div className="flex items-center space-x-4">
                <LoadingSkeleton variant="circular" width={80} height={80} />
                <div className="flex-1 space-y-3">
                    <LoadingSkeleton width="40%" height={32} />
                    <LoadingSkeleton width="60%" height={20} />
                </div>
            </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="card-modern p-6 animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center">
                        <LoadingSkeleton variant="circular" width={48} height={48} />
                        <div className="ml-4 flex-1 space-y-2">
                            <LoadingSkeleton width="60%" height={14} />
                            <LoadingSkeleton width="40%" height={24} />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Content cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-fadeInUp" style={{ animationDelay: `${index * 150}ms` }}>
                    <SkeletonCard />
                </div>
            ))}
        </div>
    </div>
);

// Sliding Squares Loading Animation
export const SkeletonTestLoading: React.FC = () => {
    const messages = [
        "🧬 Preparing your test...",
        "⚡ Loading questions...",
        "🎯 Setting up environment...",
        "✨ Almost ready...",
        "🚀 Get ready to ace this!"
    ];
    
    const [messageIndex, setMessageIndex] = React.useState(0);
    
    React.useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-[500px] relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20"></div>
            
            <div className="text-center relative z-10">
                {/* Sliding Squares Container */}
                <div className="relative w-32 h-32 mx-auto mb-12">
                    {/* Square 1 - Top Left to Bottom Right */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg animate-slide-square-1"></div>
                    
                    {/* Square 2 - Top Right to Bottom Left */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg animate-slide-square-2"></div>
                    
                    {/* Square 3 - Bottom Left to Top Right */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-lg animate-slide-square-3"></div>
                    
                    {/* Square 4 - Bottom Right to Top Left */}
                    <div className="absolute w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-lg animate-slide-square-4"></div>
                    
                    {/* Center glow effect */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-2xl animate-pulse"></div>
                    </div>
                </div>

                {/* Animated wave progress bar */}
                <div className="w-80 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-blue-500 via-pink-500 to-purple-500 animate-progress bg-[length:200%_100%] relative"
                        style={{
                            width: `${((messageIndex + 1) / messages.length) * 100}%`,
                            transition: 'width 0.5s ease-out'
                        }}
                    >
                        <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                    </div>
                </div>

                {/* Cycling messages with emoji */}
                <div className="space-y-3">
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent animate-fadeIn" key={messageIndex}>
                        {messages[messageIndex]}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Watch the squares dance while we prepare everything
                    </p>
                </div>
            </div>
        </div>
    );
};

// AI Generation loading with special effects and interactivity
export const SkeletonAIGeneration: React.FC<{ stage: 'extracting' | 'generating' | 'formatting' }> = ({ stage }) => {
    const [caughtParticles, setCaughtParticles] = React.useState<number[]>([]);
    const [particleScore, setParticleScore] = React.useState(0);
    const [iconRotation, setIconRotation] = React.useState(0);

    const stageConfig = {
        extracting: {
            icon: (
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            title: 'Extracting Text',
            description: 'Reading document content...',
            color: 'purple'
        },
        generating: {
            icon: (
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            title: 'AI Generating Questions',
            description: 'Creating intelligent questions...',
            color: 'blue'
        },
        formatting: {
            icon: (
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Formatting Questions',
            description: 'Finalizing your questions...',
            color: 'green'
        }
    };

    const config = stageConfig[stage];

    const handleParticleClick = (index: number) => {
        if (!caughtParticles.includes(index)) {
            setCaughtParticles([...caughtParticles, index]);
            setParticleScore(particleScore + 1);
            setTimeout(() => {
                setCaughtParticles(prev => prev.filter(i => i !== index));
            }, 600);
        }
    };

    const handleIconClick = () => {
        setIconRotation(iconRotation + 360);
    };

    return (
        <div className="relative py-8">
            {/* Score display */}
            {particleScore > 0 && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full shadow-lg text-xs font-bold animate-fadeIn">
                    ✨ Caught: {particleScore}
                </div>
            )}

            {/* Interactive Particle background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full cursor-pointer pointer-events-auto transition-all hover:scale-150 ${caughtParticles.includes(i)
                            ? 'bg-yellow-400 animate-ping'
                            : 'bg-purple-400 animate-float opacity-40 hover:bg-yellow-300 hover:opacity-100'
                            }`}
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                        onClick={() => handleParticleClick(i)}
                        title="Click to catch!"
                    ></div>
                ))}
            </div>

            {/* Main content */}
            <div className="relative text-center">
                <div className="inline-block relative mb-6">
                    {/* Rotating glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50 animate-spin-slow"></div>

                    {/* Interactive Icon container */}
                    <div
                        className="relative bg-white dark:bg-gray-800 rounded-full p-6 shadow-2xl animate-bounce-slow cursor-pointer hover:scale-110 transition-transform active:scale-95"
                        onClick={handleIconClick}
                        style={{
                            transform: `rotate(${iconRotation}deg)`,
                            transition: 'transform 0.5s ease-out'
                        }}
                        title="Click me to spin!"
                    >
                        {config.icon}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">
                    {config.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {config.description}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    💡 Catch the floating particles while you wait!
                </p>
            </div>
        </div>
    );
};

export default LoadingSkeleton;

