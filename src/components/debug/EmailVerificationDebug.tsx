import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Play, Download } from 'lucide-react';
import FirebaseTroubleshooter from '../../utils/firebaseTroubleshooter';

interface DiagnosticResult {
  connectionTest: {
    status: 'success' | 'warning' | 'error';
    message: string;
    suggestion?: string;
  };
  emailVerificationTest: {
    status: 'success' | 'warning' | 'error';
    message: string;
    suggestion?: string;
  };
  projectValidation: Array<{
    status: 'success' | 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  commonSolutions: string[];
}

const EmailVerificationDebug: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const diagnostic = await FirebaseTroubleshooter.runFullDiagnostic();
      setResults(diagnostic);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!results) return;

    const report = FirebaseTroubleshooter.formatDiagnosticReport(results);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firebase-diagnostic-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Firebase Email Verification Diagnostic
        </h2>
        <p className="text-gray-600">
          Use this tool to diagnose and troubleshoot email verification issues.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
        </button>

        {results && (
          <button
            onClick={downloadReport}
            className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </button>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          {/* Connection Test */}
          <div className={`p-4 border rounded-lg ${getStatusColor(results.connectionTest.status)}`}>
            <div className="flex items-center mb-2">
              {getStatusIcon(results.connectionTest.status)}
              <h3 className="ml-2 text-lg font-medium text-gray-900">
                Firebase Connection Test
              </h3>
            </div>
            <p className="text-gray-700">{results.connectionTest.message}</p>
            {results.connectionTest.suggestion && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>Suggestion:</strong> {results.connectionTest.suggestion}
              </p>
            )}
          </div>

          {/* Email Verification Test */}
          <div className={`p-4 border rounded-lg ${getStatusColor(results.emailVerificationTest.status)}`}>
            <div className="flex items-center mb-2">
              {getStatusIcon(results.emailVerificationTest.status)}
              <h3 className="ml-2 text-lg font-medium text-gray-900">
                Email Verification Test
              </h3>
            </div>
            <p className="text-gray-700">{results.emailVerificationTest.message}</p>
            {results.emailVerificationTest.suggestion && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>Suggestion:</strong> {results.emailVerificationTest.suggestion}
              </p>
            )}
          </div>

          {/* Project Validation */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Project Validation
            </h3>
            <div className="space-y-3">
              {results.projectValidation.map((result, index) => (
                <div key={index} className={`p-3 border rounded ${getStatusColor(result.status)}`}>
                  <div className="flex items-center mb-1">
                    {getStatusIcon(result.status)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {result.message}
                    </span>
                  </div>
                  {result.suggestion && (
                    <p className="text-xs text-gray-600 ml-7">
                      {result.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Common Solutions */}
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Common Solutions
            </h3>
            <div className="space-y-2">
              {results.commonSolutions.map((solution, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {solution}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Running diagnostic tests...</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          How to Use This Tool
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Make sure you're logged in before running the diagnostic</li>
          <li>• The tool will test your Firebase connection and email verification setup</li>
          <li>• Follow the suggestions provided for any failed tests</li>
          <li>• Download the report to share with support if needed</li>
          <li>• Most 503 errors are temporary and resolve within 5-10 minutes</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailVerificationDebug;
