import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import {
  Github,
  Linkedin,
  Globe,
  Phone,
  Code,
  User,
  Calendar,
  Trophy,
  TrendingUp,
  Edit3,
  Save,
  ExternalLink,
  Award,
  Target,
  BarChart3,
  Camera,
  AlertCircle,
  CheckCircle,
  Mail,
  RefreshCcw,
  Clock
} from 'lucide-react';
import { database } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validateRegistrationNumber, updateUserEmail, sendEmailChangeVerification, verifyEmailChangeCode, checkEmailExists } from '../../services/userValidationService';
import Navbar from '../common/Navbar';
import AvatarModal from './AvatarModal';
import { getRandomAvatar, getAvatarById } from '../../assets/avatars';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  department: string;
  registrationNumber: string;
  role: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  phone?: string;
  leetcode?: string;
  hackerrank?: string;
  profilePictureUrl?: string;
  createdAt: string;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  completedAt: string;
  testTitle?: string;
}

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [tests, setTests] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [phone, setPhone] = useState('');
  const [leetcode, setLeetcode] = useState('');
  const [hackerrank, setHackerrank] = useState('');

  // Avatar selection states
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [regNoError, setRegNoError] = useState('');
  const [emailValidating, setEmailValidating] = useState(false);
  const [regNoValidating, setRegNoValidating] = useState(false);
  const [validationResults, setValidationResults] = useState({
    emailValid: false,
    regNoValid: false
  });

  // Email change verification states
  const [pendingEmailChange, setPendingEmailChange] = useState(false);
  const [newPendingEmail, setNewPendingEmail] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const isOwnProfile = userData?.uid === userId;

  // Handle sending verification email
  const handleSendEmailVerification = async () => {
    if (verificationCooldown > 0 || !email.trim()) return;

    setVerificationSending(true);
    try {
      const result = await sendEmailChangeVerification(email.trim(), userId!);

      if (!result.success) {
        if (result.requiresReauth) {
          const shouldLogout = confirm(
            result.message + '\n\n' +
            'Would you like to log out now? After logging back in, you can change your email.'
          );

          if (shouldLogout) {
            await logout();
            navigate('/login');
          }
        } else {
          alert(result.message);
        }
        return;
      }

      // Success! Email sent
      if (result.message.includes('sent to')) {
        alert(`Verification code has been sent to ${email.trim()}!\n\nPlease check your inbox (and spam folder) and enter the 6-digit code below.`);
      } else {
        // Fallback if email failed
        alert(result.message);
      }
      setVerificationCooldown(60); // 60 second cooldown
      setNewPendingEmail(email.trim());
      setShowCodeInput(true);

      console.log('Verification code sent to:', email.trim());

    } catch (error) {
      console.error('Error changing email:', error);
      alert('Failed to change email. Please try again.');
    } finally {
      setVerificationSending(false);
    }
  };

  // Handle verifying the code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter the 6-digit verification code.');
      return;
    }

    setSaving(true);
    try {
      const result = await verifyEmailChangeCode(verificationCode, userId!);

      if (!result.success) {
        if (result.requiresReauth) {
          const shouldLogout = confirm(
            result.message + '\n\n' +
            'Would you like to log out now?'
          );

          if (shouldLogout) {
            await logout();
            navigate('/login');
          }
        } else {
          alert(result.message);
        }
        return;
      }

      // Success!
      alert(result.message);
      setProfile(prev => prev ? { ...prev, email: newPendingEmail } : null);
      setEmail(newPendingEmail);
      setNewPendingEmail('');
      setVerificationCode('');
      setShowCodeInput(false);

      // Refresh page
      window.location.reload();

    } catch (error: any) {
      console.error('Error verifying code:', error);
      alert('Failed to verify code: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfileData();
      fetchTestResults();
      fetchTests();
    }
  }, [userId]);

  // Cooldown timer for verification email
  useEffect(() => {
    if (verificationCooldown > 0) {
      const timer = setTimeout(() => setVerificationCooldown(verificationCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [verificationCooldown]);

  const fetchProfileData = async () => {
    try {
      const profileRef = ref(database, `users/${userId}`);
      const snapshot = await get(profileRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setRegistrationNumber(data.registrationNumber || '');
        setGithub(data.github || '');
        setLinkedin(data.linkedin || '');
        setPortfolio(data.portfolio || '');
        setPhone(data.phone || '');
        setLeetcode(data.leetcode || '');
        setHackerrank(data.hackerrank || '');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };


  const fetchTestResults = async () => {
    try {
      const responsesRef = ref(database, 'responses');
      const snapshot = await get(responsesRef);
      if (snapshot.exists()) {
        const allResponses = snapshot.val();
        const userResults: Record<string, TestResult> = {};

        Object.entries(allResponses).forEach(([testId, testResponses]: [string, any]) => {
          if (testResponses[userId!]) {
            userResults[testId] = testResponses[userId!];
          }
        });

        setTestResults(userResults);
      }
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const testsRef = ref(database, 'tests');
      const snapshot = await get(testsRef);
      if (snapshot.exists()) {
        const testsData = snapshot.val();
        const testsArray = Object.entries(testsData).map(([id, test]: [string, any]) => ({
          id,
          ...test
        }));
        setTests(testsArray);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const validateEmail = async (newEmail: string) => {
    setEmailError('');
    setValidationResults(prev => ({ ...prev, emailValid: false }));

    if (!newEmail.trim()) {
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if email already exists (skip if it's the user's current email)
    if (newEmail !== profile?.email) {
      setEmailValidating(true);
      try {
        const emailExists = await checkEmailExists(newEmail, userId);
        if (emailExists) {
          setEmailError('This email address is already in use by another account');
        } else {
          setValidationResults(prev => ({ ...prev, emailValid: true }));
        }
      } catch (error) {
        setEmailError('Unable to validate email. Please try again.');
      } finally {
        setEmailValidating(false);
      }
    } else {
      setValidationResults(prev => ({ ...prev, emailValid: true }));
    }
  };

  // Registration number validation
  const validateRegNo = async (newRegNo: string) => {
    setRegNoError('');
    setValidationResults(prev => ({ ...prev, regNoValid: false }));

    if (!newRegNo.trim() || !profile?.department) {
      return;
    }

    setRegNoValidating(true);
    try {
      const validation = await validateRegistrationNumber(newRegNo, profile.department, userId);
      if (!validation.isValid) {
        setRegNoError(validation.message);
      } else {
        setValidationResults(prev => ({ ...prev, regNoValid: true }));
      }
    } catch (error) {
      setRegNoError('Unable to validate registration number. Please try again.');
    } finally {
      setRegNoValidating(false);
    }
  };

  const handleSave = async () => {
    if (!isOwnProfile) return;

    // Validate before saving
    if (emailError || regNoError) {
      alert('Please fix the validation errors before saving.');
      return;
    }

    if (emailValidating || regNoValidating) {
      alert('Please wait for validation to complete.');
      return;
    }

    const emailChanged = email.trim() !== profile?.email;
    const regNoChanged = registrationNumber.trim() !== profile?.registrationNumber;

    if (emailChanged && !validationResults.emailValid) {
      alert('Please enter a valid email address.');
      return;
    }

    if (regNoChanged && !validationResults.regNoValid) {
      alert('Please enter a valid registration number.');
      return;
    }

    setSaving(true);
    try {
      // Handle email change - just warn user
      if (emailChanged) {
        alert('To change your email, use the "Send Verification Email" and "I Have Verified" buttons below the email field.');
        return;
      }

      // Update profile in database (email was already updated if it changed)
      const profileRef = ref(database, `users/${userId}`);
      const updatedData = {
        ...profile,
        name: name.trim(),
        // Email already updated above if it changed, so use current email value
        email: email.trim(),
        registrationNumber: registrationNumber.trim(),
        github: github.trim(),
        linkedin: linkedin.trim(),
        portfolio: portfolio.trim(),
        phone: phone.trim(),
        leetcode: leetcode.trim(),
        hackerrank: hackerrank.trim(),
      };

      // Only update if email wasn't changed (to avoid overwriting the email update above)
      if (!emailChanged) {
        await set(profileRef, updatedData);
        console.log('Profile updated successfully');
      }

      setProfile(prev => prev ? {
        ...prev,
        name: name.trim(),
        email: email.trim(),
        registrationNumber: registrationNumber.trim(),
        github: github.trim(),
        linkedin: linkedin.trim(),
        portfolio: portfolio.trim(),
        phone: phone.trim(),
        leetcode: leetcode.trim(),
        hackerrank: hackerrank.trim(),
      } : null);

      setIsEditing(false);

      // Show appropriate success message (only if email wasn't changed, as we already showed that message)
      if (!emailChanged) {
        alert('Profile updated successfully!');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getProgressData = () => {
    const completedTests = Object.entries(testResults).map(([testId, result]) => {
      const test = tests.find(t => t.id === testId);
      return {
        testName: test?.title || `Test ${testId.slice(-4)}`,
        score: (result.score / result.totalQuestions) * 100,
        date: new Date(result.completedAt).toLocaleDateString(),
        completedAt: result.completedAt
      };
    }).sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    return {
      labels: completedTests.map(t => t.testName),
      datasets: [
        {
          label: 'Test Scores (%)',
          data: completedTests.map(t => t.score),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    };
  };

  const getPerformanceStats = () => {
    const scores = Object.values(testResults).map(result =>
      (result.score / result.totalQuestions) * 100
    );

    if (scores.length === 0) return { average: 0, highest: 0, lowest: 0, total: 0 };

    return {
      average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      highest: Math.round(Math.max(...scores)),
      lowest: Math.round(Math.min(...scores)),
      total: scores.length
    };
  };

  const getPerformanceDistribution = () => {
    const scores = Object.values(testResults).map(result =>
      (result.score / result.totalQuestions) * 100
    );

    const ranges = {
      'Excellent (90-100%)': scores.filter(s => s >= 90).length,
      'Good (80-89%)': scores.filter(s => s >= 80 && s < 90).length,
      'Average (70-79%)': scores.filter(s => s >= 70 && s < 80).length,
      'Below Average (<70%)': scores.filter(s => s < 70).length,
    };

    return {
      labels: Object.keys(ranges),
      datasets: [
        {
          data: Object.values(ranges),
          backgroundColor: [
            '#10B981', // Green
            '#3B82F6', // Blue  
            '#F59E0B', // Amber
            '#EF4444', // Red
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  // Function to assign random avatar to new users
  const assignRandomAvatar = async () => {
    if (!profile?.profilePictureUrl) {
      const randomAvatar = getRandomAvatar();
      const profileRef = ref(database, `users/${userId}`);
      const updatedProfile = {
        ...profile,
        profilePictureUrl: randomAvatar.url,
      };

      await set(profileRef, updatedProfile);
      setProfile(prev => prev ? {
        ...prev,
        profilePictureUrl: randomAvatar.url,
      } : null);
    }
  };

  // Function to handle avatar selection
  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!isOwnProfile) return;

    setSavingAvatar(true);
    try {
      const profileRef = ref(database, `users/${userId}`);
      const updatedProfile = {
        ...profile,
        profilePictureUrl: avatarUrl,
      };

      await set(profileRef, updatedProfile);
      console.log('Avatar updated successfully');

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        profilePictureUrl: avatarUrl,
      } : null);

      setShowAvatarModal(false);

    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleProfilePictureClick = () => {
    if (isOwnProfile && !savingAvatar) {
      setShowAvatarModal(true);
    }
  };

  // Assign random avatar on first load if user doesn't have one
  useEffect(() => {
    if (profile && isOwnProfile && !profile.profilePictureUrl) {
      assignRandomAvatar();
    }
  }, [profile, isOwnProfile]);

  const renderSocialLink = (url: string, icon: React.ReactNode, label: string) => {
    if (!url) return null;

    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        {icon}
        <span className="text-sm">{label}</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="sliding-squares-loader mx-auto mb-4">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center card-modern glass p-8">
            <User className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 float-animation" />
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Profile not found</h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">The user profile you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = getPerformanceStats();
  const progressData = getProgressData();
  const distributionData = getPerformanceDistribution();

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="card-modern glass p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative flex-shrink-0">
                <div
                  className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden ${isOwnProfile ? 'cursor-pointer group' : ''
                    } ${profile.profilePictureUrl ? '' : 'bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center'}`}
                  onClick={handleProfilePictureClick}
                >
                  {profile.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  )}
                  {isOwnProfile && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      {savingAvatar ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-warp leading-tight break-words">{profile.name}</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base break-words">
                  <span className="inline-block">{profile.department}</span>
                  <span className="hidden sm:inline mx-2">•</span>
                  <span className="block sm:inline">{profile.registrationNumber}</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-1">{profile.role}</p>
              </div>
            </div>

            {isOwnProfile && (
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={saving}
                className="btn-modern btn-primary-modern disabled:opacity-50"
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Basic Information */}
          {isEditing && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        validateEmail(e.target.value);
                      }}
                      placeholder="Enter your email address"
                      className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${emailError ? 'border-red-300 bg-red-50' : validationResults.emailValid ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailValidating && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                      )}
                      {!emailValidating && validationResults.emailValid && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {!emailValidating && emailError && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                  {validationResults.emailValid && email !== profile?.email && (
                    <p className="mt-1 text-sm text-green-600">Email is available</p>
                  )}
                  {email !== profile?.email && (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={handleSendEmailVerification}
                        disabled={verificationSending || verificationCooldown > 0}
                        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {verificationSending ? (
                          <>
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : verificationCooldown > 0 ? (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>Resend in {verificationCooldown}s</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Get Verification Code</span>
                          </>
                        )}
                      </button>

                      {showCodeInput && (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className="w-40 border border-gray-300 rounded-md px-3 py-2 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={saving || verificationCode.length !== 6}
                            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {saving ? (
                              <>
                                <RefreshCcw className="h-4 w-4 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Verify Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => {
                        setRegistrationNumber(e.target.value);
                        validateRegNo(e.target.value);
                      }}
                      placeholder="Enter your registration number (e.g., 4207XXXXXX)"
                      className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${regNoError ? 'border-red-300 bg-red-50' : validationResults.regNoValid ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {regNoValidating && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                      )}
                      {!regNoValidating && validationResults.regNoValid && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {!regNoValidating && regNoError && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {regNoError && (
                    <p className="mt-1 text-sm text-red-600">{regNoError}</p>
                  )}
                  {validationResults.regNoValid && registrationNumber !== profile?.registrationNumber && (
                    <p className="mt-1 text-sm text-green-600">Registration number is valid and available</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Must start with 4207, be at least 10 digits long, and be unique in your department
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Social Links */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact & Social Links</h3>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Profile</label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portfolio Website</label>
                  <input
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LeetCode Profile</label>
                  <input
                    type="url"
                    value={leetcode}
                    onChange={(e) => setLeetcode(e.target.value)}
                    placeholder="https://leetcode.com/username"
                    className="form-input-modern w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HackerRank Profile</label>
                  <input
                    type="url"
                    value={hackerrank}
                    onChange={(e) => setHackerrank(e.target.value)}
                    placeholder="https://hackerrank.com/username"
                    className="form-input-modern w-full"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {renderSocialLink(profile.github, <Github className="h-4 w-4" />, 'GitHub')}
                {renderSocialLink(profile.linkedin, <Linkedin className="h-4 w-4" />, 'LinkedIn')}
                {renderSocialLink(profile.portfolio, <Globe className="h-4 w-4" />, 'Portfolio')}
                {profile.phone && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                {renderSocialLink(profile.leetcode, <Code className="h-4 w-4" />, 'LeetCode')}
                {renderSocialLink(profile.hackerrank, <Code className="h-4 w-4" />, 'HackerRank')}
              </div>
            )}

            {!isEditing && !profile.github && !profile.linkedin && !profile.portfolio && !profile.phone && !profile.leetcode && !profile.hackerrank && (
              <p className="text-gray-500 italic">No contact information or social links added yet.</p>
            )}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className="card-modern p-4 sm:p-6 transform hover:scale-105 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl mr-3 sm:mr-4 float-animation">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">Average Score</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.average}%</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4 sm:p-6 transform hover:scale-105 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-xl mr-3 sm:mr-4 float-animation">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">Highest Score</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.highest}%</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4 sm:p-6 transform hover:scale-105 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3 sm:mr-4 float-animation">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">Tests Taken</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="card-modern p-4 sm:p-6 transform hover:scale-105 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-3 sm:mr-4 float-animation">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 truncate">Lowest Score</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.lowest}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Line Chart */}
          <div className="card-modern glass p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Trend</h2>
            </div>
            {stats.total > 0 ? (
              <Line
                data={progressData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function (value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 float-animation" />
                  <p className="font-medium">No test data available yet</p>
                  <p className="text-sm mt-1 opacity-75">Complete some tests to see your progress</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Distribution */}
          <div className="card-modern glass p-6">
            <div className="flex items-center mb-4">
              <Target className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Score Distribution</h2>
            </div>
            {stats.total > 0 ? (
              <Doughnut
                data={distributionData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 float-animation" />
                  <p className="font-medium">No score data available yet</p>
                  <p className="text-sm mt-1 opacity-75">Take tests to see your score distribution</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Tests */}
        {stats.total > 0 && (
          <div className="card-modern glass p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Test Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(testResults)
                    .sort(([, a], [, b]) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                    .slice(0, 5)
                    .map(([testId, result]) => {
                      const test = tests.find(t => t.id === testId);
                      const percentage = Math.round((result.score / result.totalQuestions) * 100);
                      return (
                        <tr key={testId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {test?.title || `Test ${testId.slice(-4)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {result.score}/{result.totalQuestions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${percentage >= 90 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                percentage >= 80 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                  percentage >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(result.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Avatar Selection Modal */}
        <AvatarModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelect={handleAvatarSelect}
          currentAvatar={profile?.profilePictureUrl || ''}
        />
      </div>
    </div>
  );
};

export default Profile;

