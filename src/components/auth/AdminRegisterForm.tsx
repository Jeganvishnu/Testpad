import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminRegisterForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (!name.trim()) {
            setError('Full name is required');
            return;
        }

        setLoading(true);

        try {
            await register(email, password, {
                name: name.trim(),
                role: 'admin',
                registrationNumber: 'ADMIN-' + Date.now(), // Generate unique admin ID
            });

            setSuccess(true);

            // Clear form
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setName('');

            // Show success message for 2 seconds then redirect
            setTimeout(() => {
                navigate('/admin');
            }, 2000);

        } catch (error: any) {
            setError(error.message || 'Failed to create admin account. Please try again.');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-100 dark:from-slate-900 dark:via-purple-950 dark:to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300">
                {/* Header */}
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <Shield className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Create Admin Account
                        </h1>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Register a new administrator for the platform
                    </p>
                </div>

                <form className="mt-6 space-y-6 animate-fadeInUp" onSubmit={handleSubmit}>
                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl animate-fadeInUp">
                            <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
                            <span className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center space-x-2 p-4 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border border-green-200/50 dark:border-green-800/50 rounded-xl animate-fadeInUp">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                                Admin account created successfully! Redirecting...
                            </span>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Full Name */}
                        <div className="animate-fadeInUp">
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Full Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400" />
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-focus pl-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 focus:border-purple-500 dark:focus:border-purple-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                                    placeholder="Enter admin full name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="animate-fadeInUp">
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-focus pl-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 focus:border-purple-500 dark:focus:border-purple-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                                    placeholder="Enter admin email address"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="animate-fadeInUp">
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-focus pl-12 pr-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 focus:border-purple-500 dark:focus:border-purple-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                                    placeholder="Create a strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="animate-fadeInUp">
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-purple-500 dark:group-focus-within:text-purple-400" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-focus pl-12 pr-12 block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 focus:border-purple-500 dark:focus:border-purple-400 bg-white/80 dark:bg-slate-800/80 dark:text-slate-100 backdrop-blur-sm transition-all duration-300"
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin')}
                            className="flex-1 py-3 px-6 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="flex-1 btn-professional animate-fadeInUp group relative flex justify-center py-3 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    Creating...
                                </>
                            ) : (
                                'Create Admin'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminRegisterForm;
