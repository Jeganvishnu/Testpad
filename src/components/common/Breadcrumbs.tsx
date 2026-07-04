import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
    icon?: React.ReactNode;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    className?: string;
    showHome?: boolean;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    items,
    className = '',
    showHome = true,
}) => {
    const location = useLocation();

    // Auto-generate breadcrumbs from URL if items not provided
    const getBreadcrumbs = (): BreadcrumbItem[] => {
        if (items) return items;

        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];

        pathSegments.forEach((segment, index) => {
            const path = '/' + pathSegments.slice(0, index + 1).join('/');
            const label = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            breadcrumbs.push({ label, path });
        });

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    if (breadcrumbs.length === 0 && !showHome) {
        return null;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center space-x-2 text-sm ${className}`}
        >
            {showHome && (
                <>
                    <Link
                        to="/dashboard"
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-warp-primary transition-colors group"
                        aria-label="Home"
                    >
                        <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    {breadcrumbs.length > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                    )}
                </>
            )}

            {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                    <React.Fragment key={item.path || index}>
                        {item.path && !isLast ? (
                            <Link
                                to={item.path}
                                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-warp-primary transition-colors group"
                            >
                                {item.icon && (
                                    <span className="group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </span>
                                )}
                                <span className="hover:underline">{item.label}</span>
                            </Link>
                        ) : (
                            <span
                                className="flex items-center space-x-1 text-gray-900 dark:text-white font-medium"
                                aria-current="page"
                            >
                                {item.icon && <span>{item.icon}</span>}
                                <span>{item.label}</span>
                            </span>
                        )}

                        {!isLast && (
                            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;
