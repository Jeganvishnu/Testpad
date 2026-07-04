import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, RefreshCcw, Clock, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommonNotifications } from '../common/NotificationSystem';

interface EmailVerificationProps {
  onComplete?: () => void;
  redirectPath?: string;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ 
  onComplete, 
  redirectPath = '/dashboard' 
}) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  const { currentUser, sendEmailVerification, checkEmailVerification } = useAuth();
  const { showSuccess, showError, showEmailSent, showEmailVerified } = useCommonNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if email is already verified on component mount
  useEffect(() => {
    const verifiedQuery = searchParams.get('verified');

    if (verifiedQuery === 'true') {
      setVerified(true);
      showEmailVerified();
      if (onComplete) {
        onComplete();
      } else {
        setTimeout(() => navigate(redirectPath), 2000);
      }
    } else if (currentUser?.emailVerified) {
      setVerified(true);
      if (onComplete) {
        onComplete();
      } else {
        setTimeout(() => navigate(redirectPath), 2000);
      }
    }
  }, [currentUser, onComplete, navigate, redirectPath, showEmailVerified, searchParams]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendVerification = async () => {
    if (cooldown > 0) return;
    
    setLoading(true);
    setError('');

    try {
      await sendEmailVerification();
      setEmailSent(true);
      showEmailSent(currentUser?.email || 'your email');
      setCooldown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      // Enhanced error handling with user-friendly messages
      let errorMessage = error.message;
      
      if (error.message?.includes('visibility-check-was-unavailable')) {
        errorMessage = 'Email verification service is temporarily unavailable. This is usually temporary - please try again in a few minutes.';
      } else if (error.message?.includes('503')) {
        errorMessage = 'Firebase servers are temporarily unavailable. Please try again in a few minutes.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setError('');

    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setVerified(true);
        if (onComplete) {
          onComplete();
        } else {
          setTimeout(() => navigate(redirectPath), 2000);
        }
      } else {
        setError('Email not verified yet. Please check your email and click the verification link.');
        showError('Verification Incomplete', 'Email not yet verified. Please follow the link in the verification email.');
      }
    } catch (error: any) {
      setError(error.message);
      showError('Verification Error', error.message || 'Failed to check verification status. Please try again later.');
    } finally {
      setChecking(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg text-center">
          <div>
            <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified. You can now access all features.
            </p>
          </div>
          <div className="animate-pulse">
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please verify your email address to complete your registration and ensure account security.
          </p>
          {currentUser?.email && (
            <p className="mt-2 text-sm text-blue-600 font-medium">
              {currentUser.email}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {emailSent && !error && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700">
                Verification email sent! Please check your inbox and spam folder.
              </span>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleSendVerification}
              disabled={loading || cooldown > 0}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCcw className="animate-spin -ml-1 mr-3 h-4 w-4" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock className="-ml-1 mr-3 h-4 w-4" />
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <Mail className="-ml-1 mr-3 h-4 w-4" />
                  {emailSent ? 'Resend Verification Email' : 'Send Verification Email'}
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">After clicking the email link</span>
              </div>
            </div>

            <button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full flex justify-center items-center py-3 px-4 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? (
                <>
                  <RefreshCcw className="animate-spin -ml-1 mr-3 h-4 w-4" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="-ml-1 mr-3 h-4 w-4" />
                  I've Verified My Email
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or try resending after the cooldown period.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
