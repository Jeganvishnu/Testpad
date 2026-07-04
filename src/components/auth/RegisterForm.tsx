import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, Hash, AlertCircle, GraduationCap, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    studentType: '', // 'school' or 'college'
    class: '', // for school students (5-12)
    department: '', // for college students
    registrationNumber: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Clear department/class when student type changes
    if (name === 'studentType') {
      setFormData(prev => ({
        ...prev,
        studentType: value,
        class: '',
        department: ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    // Check if all required fields are filled
    if (!formData.name.trim()) {
      setError('Full name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.registrationNumber.trim()) {
      setError('Registration number is required');
      return false;
    }

    if (!formData.studentType) {
      setError('Student type is required');
      return false;
    }

    if (formData.studentType === 'school' && !formData.class) {
      setError('Class is required');
      return false;
    }

    if (formData.studentType === 'college' && !formData.department) {
      setError('Department is required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare registration data without undefined values
      const registrationData: any = {
        name: formData.name,
        studentType: formData.studentType as 'school' | 'college',
        registrationNumber: formData.registrationNumber,
        role: 'student' as const
      };

      // Only add class or department if they have values
      if (formData.studentType === 'school' && formData.class) {
        registrationData.class = formData.class;
      } else if (formData.studentType === 'college' && formData.department) {
        registrationData.department = formData.department;
      }

      console.log('Registration data being sent:', registrationData);

      // Register the user and wait for completion
      await register(formData.email, formData.password, registrationData);

      // Wait a bit for the AuthContext to update its state
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Navigate to email verification page
      navigate('/verify-email', { replace: true });

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  const departments = [
    'AI & DS',
    'BIO MEDICAL',
    'CIVIL',
    'CSE',
    'ECE',
    'EEE',
    'IT',
    'MBA',
    'MECH',
    'ROBOTICS'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-gray-900 dark:to-black flex items-center justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-4 sm:space-y-6 bg-white dark:bg-gray-900 mobile-p-safe rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300">
        {/* Header with TestPad branding */}
        <div className="text-center">
          <img src="/logo.png" alt="TestPad" className="mx-auto h-16 w-16 mb-4" />

          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            TestPad
          </h1>

          <div className="flex items-center justify-center space-x-2 mb-4 mt-4">
            <UserPlus className="h-5 w-5 text-green-500" />
            <span className="text-lg font-medium text-slate-700 dark:text-slate-300">Student Registration</span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Join TestPad's testing platform today
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-mobile pl-10 block w-full px-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-mobile pl-10 block w-full px-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Registration Number
              </label>
              <div className="mt-1 relative">
                <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="registrationNumber"
                  name="registrationNumber"
                  type="text"
                  required
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                  placeholder="Enter your registration number"
                />
              </div>
            </div>

            {/* Student Type Selector */}
            <div>
              <label htmlFor="studentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Student Type
              </label>
              <div className="mt-1 relative">
                <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <select
                  id="studentType"
                  name="studentType"
                  required
                  value={formData.studentType}
                  onChange={handleChange}
                  className="select-mobile pl-10 block w-full px-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                >
                  <option value="" className="text-gray-400 dark:text-gray-500">Select student type</option>
                  <option value="school" className="text-gray-900 dark:text-gray-100">School Student</option>
                  <option value="college" className="text-gray-900 dark:text-gray-100">College Student</option>
                </select>
              </div>
            </div>

            {/* Conditional Field: Class for School Students */}
            {formData.studentType === 'school' && (
              <div className="card-slide-in">
                <label htmlFor="class" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Class
                </label>
                <div className="mt-1 relative">
                  <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    id="class"
                    name="class"
                    required
                    value={formData.class}
                    onChange={handleChange}
                    className="select-mobile pl-10 block w-full px-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                  >
                    <option value="" className="text-gray-400 dark:text-gray-500">Select your class</option>
                    {[5, 6, 7, 8, 9, 10, 11, 12].map(classNum => (
                      <option key={classNum} value={`Class ${classNum}`} className="text-gray-900 dark:text-gray-100">
                        Class {classNum}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Conditional Field: Department for College Students */}
            {formData.studentType === 'college' && (
              <div className="card-slide-in">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <div className="mt-1 relative">
                  <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    id="department"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    className="select-mobile pl-10 block w-full px-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-300"
                  >
                    <option value="" className="text-gray-400 dark:text-gray-500">Select your department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept} className="text-gray-900 dark:text-gray-100">{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-focus pl-12 pr-12 block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-300"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-focus pl-12 pr-12 block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-300"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors duration-200 focus:outline-none"
                >
                  {showConfirmPassword ? (
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
            className="btn-touch-lg group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Already have an account? </span>
            <Link
              to="/login"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;