import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, GraduationCap, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  isAdmin?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ isAdmin = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);

      // Enforce role-based login restrictions
      if (isAdmin && userData.role !== 'admin') {
        setError('Access denied. Admin credentials required for admin portal.');
        setLoading(false);
        return;
      }

      if (!isAdmin && userData.role === 'admin') {
        setError('Admin users must login through the Admin Portal.');
        setLoading(false);
        return;
      }

      // Check for return URL from session storage
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        navigate(returnUrl, { replace: true });
        return;
      }

      // Redirect based on user role
      if (userData.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to log in. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-gray-900 dark:to-black flex items-center justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white dark:bg-gray-900 mobile-p-safe rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300">
        {/* Header with TestPad branding */}
        <div className="text-center">
          <img src="/logo.png" alt="TestPad" className="mx-auto h-16 w-16 mb-4" />

          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            TestPad
          </h1>

          <div className="flex items-center justify-center space-x-2 mb-4 mt-4">
            {isAdmin ? (
              <>
                <Shield className="h-5 w-5 text-amber-500" />
                <span className="text-lg font-medium text-slate-700 dark:text-slate-300">Admin Portal</span>
              </>
            ) : (
              <>
                <GraduationCap className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                <span className="text-lg font-medium text-slate-700 dark:text-slate-300">Student Portal</span>
              </>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isAdmin ? 'Access administrative controls' : 'Access your aptitude test platform'}
          </p>
        </div>

        <form className="mt-6 space-y-6 animate-fadeInUp stagger-2" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl animate-fadeInUp">
              <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
              <span className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="animate-fadeInUp stagger-3">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-focus input-mobile pl-12 block w-full px-4 py-3 sm:py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div className="animate-fadeInUp stagger-4">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-focus input-mobile pl-12 pr-12 block w-full px-4 py-3 sm:py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-professional btn-touch-lg animate-fadeInUp stagger-5 group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 touch-feedback"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Signing in...
              </>
            ) : (
              'Sign in to TestPad'
            )}
          </button>

          {!isAdmin && (
            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Don't have an account? </span>
              <Link
                to="/register"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Register here
              </Link>
            </div>
          )}

          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={isAdmin ? '/login' : '/admin/login'}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              {isAdmin ? 'Student Login' : 'Admin Login'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;