import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminLoginForm: React.FC = () => {
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

      // Verify user is admin
      if (userData.role !== 'admin') {
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }

      // Redirect to admin dashboard
      navigate('/admin', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to log in. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-100 dark:from-slate-900 dark:via-orange-950 dark:to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300">
        {/* Header */}
        <div className="text-center">
          <img src="/logo.png" alt="TestPad" className="mx-auto h-16 w-16 mb-4" />

          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            TestPad
          </h1>

          <div className="flex items-center justify-center space-x-2 mb-4 mt-4">
            <Shield className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            <span className="text-lg font-medium text-slate-700 dark:text-slate-300">Admin Portal</span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter admin credentials to access dashboard
          </p>
        </div>

        <form className="mt-6 space-y-6 animate-fadeInUp" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl animate-fadeInUp">
              <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
              <span className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="animate-fadeInUp">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Admin Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-focus pl-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter admin email address"
                />
              </div>
            </div>

            <div className="animate-fadeInUp">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Admin Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-focus pl-12 pr-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter admin password"
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
            className="btn-professional animate-fadeInUp group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Signing in...
              </>
            ) : (
              'Sign in to Admin Portal'
            )}
          </button>

          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/login"
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300"
            >
              Student Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginForm;