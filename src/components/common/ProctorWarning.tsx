import React from 'react';
import { AlertTriangle, Eye, Shield, X } from 'lucide-react';

interface ProctorWarningProps {
  violationCount: number;
  maxViolations: number;
  violations: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }>;
  isVisible: boolean;
  onClose?: () => void;
  onForceExit?: () => void;
}

const ProctorWarning: React.FC<ProctorWarningProps> = ({
  violationCount,
  maxViolations,
  violations,
  isVisible,
  onClose,
  onForceExit
}) => {
  if (!isVisible) return null;

  const remainingViolations = maxViolations - violationCount;
  const isNearLimit = remainingViolations <= 1;
  const hasReachedLimit = violationCount >= maxViolations;

  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'FULLSCREEN_EXIT':
      case 'FULLSCREEN_FAILED':
        return <Eye className="h-4 w-4" />;
      case 'TAB_SWITCH':
      case 'WINDOW_BLUR':
      case 'MOBILE_APP_SWITCH':
      case 'MOBILE_FOCUS_LOSS':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MOBILE_CONTEXT_MENU':
      case 'MOBILE_MULTI_TOUCH':
      case 'MOBILE_ORIENTATION_CHANGE':
      case 'MOBILE_SCREEN_CAPTURE':
      case 'MOBILE_CLIPBOARD':
      case 'MOBILE_INACTIVITY':
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getViolationColor = (type: string) => {
    switch (type) {
      case 'FULLSCREEN_EXIT':
      case 'TAB_SWITCH':
        return 'text-red-600';
      case 'COPY_PASTE_ATTEMPT':
      case 'DEV_TOOLS_ATTEMPT':
        return 'text-orange-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 ${
        hasReachedLimit ? 'border-2 border-red-500' : isNearLimit ? 'border-2 border-orange-500' : 'border-2 border-yellow-500'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-lg ${
          hasReachedLimit ? 'bg-red-50' : isNearLimit ? 'bg-orange-50' : 'bg-yellow-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                hasReachedLimit ? 'bg-red-100' : isNearLimit ? 'bg-orange-100' : 'bg-yellow-100'
              }`}>
                <Shield className={`h-6 w-6 ${
                  hasReachedLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-yellow-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  hasReachedLimit ? 'text-red-900' : isNearLimit ? 'text-orange-900' : 'text-yellow-900'
                }`}>
                  {hasReachedLimit ? 'Test Terminated' : 'Test Proctoring Alert'}
                </h3>
                <p className={`text-sm ${
                  hasReachedLimit ? 'text-red-700' : isNearLimit ? 'text-orange-700' : 'text-yellow-700'
                }`}>
                  {hasReachedLimit 
                    ? 'Maximum violations reached'
                    : `${violationCount}/${maxViolations} violations detected`
                  }
                </p>
              </div>
            </div>
            {!hasReachedLimit && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {hasReachedLimit ? (
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                Your test has been terminated due to multiple proctoring violations. 
                Your responses have been recorded up to this point.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Final Score:</strong> Penalties may apply due to violations
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-4">
                {isNearLimit
                  ? `⚠️ Final Warning: You have ${remainingViolations} violation(s) remaining before your test is terminated.`
                  : `Please return to the test immediately. You have ${remainingViolations} violation(s) remaining.`
                }
              </p>

              {/* Violation List */}
              {violations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Violations:</h4>
                  <div className="space-y-1">
                    {violations.slice(-3).map((violation, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        <span className={getViolationColor(violation.type)}>
                          {getViolationIcon(violation.type)}
                        </span>
                        <span className="text-gray-600">
                          {violation.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-gray-800">{violation.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Test Guidelines:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Stay in fullscreen mode</li>
                  <li>• Do not switch tabs or applications</li>
                  <li>• Do not use copy/paste functions</li>
                  <li>• Do not open developer tools</li>
                  <li>• Do not take screenshots</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          {hasReachedLimit ? (
            <div className="flex space-x-3">
              <button
                onClick={onForceExit}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Exit Test
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue Test
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProctorWarning;
