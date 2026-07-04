import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../lib/firebase';

interface UserData {
  uid: string;
  email: string;
  name: string;
  studentType?: 'school' | 'college';
  class?: string; // for school students (Class 5-12)
  department?: string; // for college students
  registrationNumber?: string;
  role: 'student' | 'admin';
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserData>;
  register: (
    email: string,
    password: string,
    userData: Omit<UserData, 'uid' | 'email'>
  ) => Promise<UserData>;
  logout: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const validateUserData = (data: any): data is UserData => {
  return (
    data &&
    typeof data.uid === 'string' &&
    typeof data.email === 'string' &&
    typeof data.name === 'string' &&
    typeof data.role === 'string' &&
    (data.role === 'student' || data.role === 'admin')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const waitForAuthToken = async (user: User): Promise<void> => {
    try {
      await user.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      throw new Error('Authentication failed. Please try again.');
    }
  };

  const retryDatabaseOperation = async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<any> => {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.log(`Database operation attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    throw lastError || new Error('Max retries exceeded');
  };

  const fetchUserData = useCallback(async (uid: string): Promise<UserData | null> => {
    try {
      const userDataRef = ref(database, `users/${uid}`);
      const snapshot = await get(userDataRef);
      if (!snapshot.exists()) {
        console.error('User data not found for UID:', uid);
        return null;
      }
      const data = snapshot.val();
      if (!validateUserData(data)) {
        console.error('Invalid user data format for UID:', uid);
        return null;
      }
      return data;
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      if (error.code === 'PERMISSION_DENIED') {
        console.error('Permission denied when fetching user data');
        return null;
      }
      throw error;
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserData> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await waitForAuthToken(user);
      const userData = await retryDatabaseOperation(async () => {
        const data = await fetchUserData(user.uid);
        if (!data) {
          throw new Error('User data not found. Please contact administrator.');
        }
        return data;
      });
      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact administrator.');
      }
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    data: Omit<UserData, 'uid' | 'email'>
  ): Promise<UserData> => {
    let createdUser: User | null = null;
    try {
      if (!data.registrationNumber?.trim()) {
        throw new Error('Registration number is required');
      }
      if (!data.name?.trim()) {
        throw new Error('Full name is required');
      }

      // Only validate studentType for student accounts, not admin accounts
      if (data.role === 'student') {
        if (!data.studentType) {
          throw new Error('Student type is required');
        }
        if (data.studentType === 'school' && !data.class?.trim()) {
          throw new Error('Class is required for school students');
        }
        if (data.studentType === 'college' && !data.department?.trim()) {
          throw new Error('Department is required for college students');
        }
      }

      console.log('Creating authentication user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = userCredential.user;

      console.log('Waiting for authentication token...');
      await waitForAuthToken(createdUser);

      const newUserData: UserData = {
        uid: createdUser.uid,
        email: createdUser.email!,
        name: data.name.trim(),
        registrationNumber: data.registrationNumber.trim(),
        role: data.role,
      };

      // Only add optional fields if they have values (avoid undefined in Firebase)
      if (data.studentType) {
        newUserData.studentType = data.studentType;
      }
      if (data.studentType === 'school' && data.class?.trim()) {
        newUserData.class = data.class.trim();
      }
      if (data.studentType === 'college' && data.department?.trim()) {
        newUserData.department = data.department.trim();
      }

      console.log('Saving user data to database...');
      console.log('User data object:', JSON.stringify(newUserData, null, 2));

      await retryDatabaseOperation(async () => {
        const userRef = ref(database, `users/${createdUser!.uid}`);
        await set(userRef, newUserData);
      });

      console.log('Registration completed successfully:', newUserData);

      // Immediately update the context state to avoid loading issues
      setUserData(newUserData);

      return newUserData;

    } catch (error: any) {
      console.error('Registration error:', error);
      if (createdUser) {
        console.log('Attempting to clean up created user due to error...');
        try {
          await createdUser.delete();
          console.log('Successfully cleaned up created user');
        } catch (cleanupError) {
          console.error('Failed to cleanup created user:', cleanupError);
        }
      }
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please use a different email or try logging in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.message === 'PERMISSION_DENIED: Permission denied') {
        throw new Error('Unable to save user data. Please try again in a moment or contact support.');
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const sendEmailVerificationHandler = async (): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user is currently logged in.');
    }

    try {
      // Retry mechanism for email verification
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting email verification (attempt ${attempt}/${maxRetries})`);

          // First try without action code settings for compatibility
          if (attempt === 1) {
            await sendEmailVerification(currentUser);
          } else {
            // Professional email verification settings with fallback
            const actionCodeSettings = {
              url: `${window.location.origin}/verify-email?verified=true`,
              handleCodeInApp: false,
            };
            await sendEmailVerification(currentUser, actionCodeSettings);
          }

          console.log('Email verification sent successfully');
          return; // Success, exit the retry loop

        } catch (retryError: any) {
          lastError = retryError;
          console.error(`Email verification attempt ${attempt} failed:`, retryError);

          // Don't retry for certain error codes
          if (retryError.code === 'auth/too-many-requests' ||
            retryError.code === 'auth/user-disabled' ||
            retryError.code === 'auth/invalid-email') {
            break;
          }

          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // If we get here, all retries failed
      throw lastError;

    } catch (error: any) {
      console.error('Error sending email verification:', error);

      // Enhanced error handling
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many verification emails sent. Please wait a few minutes before requesting another.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Your account has been disabled. Please contact our support team.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address. Please contact support if this persists.');
      } else if (error.code === 'auth/visibility-check-was-unavailable') {
        throw new Error('Email verification service is temporarily unavailable. Please try again in a few minutes.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (error.message?.includes('503')) {
        throw new Error('Firebase service is temporarily unavailable. Please try again in a few minutes.');
      }

      throw new Error(`Unable to send verification email: ${error.message || 'Unknown error'}. Please try again later.`);
    }
  };

  const checkEmailVerificationHandler = async (): Promise<boolean> => {
    if (!currentUser) {
      throw new Error('No user is currently logged in.');
    }

    try {
      // Reload the user to get the latest emailVerified status
      await reload(currentUser);
      return currentUser.emailVerified;
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      throw new Error('Failed to check email verification status.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      if (user) {
        try {
          const data = await fetchUserData(user.uid);
          if (isMounted) setUserData(data);
        } catch (error) {
          console.error('Error fetching user data in auth state change:', error);
          if (isMounted) setUserData(null);
        }
      } else {
        if (isMounted) setUserData(null);
      }
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserData]);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    sendEmailVerification: sendEmailVerificationHandler,
    checkEmailVerification: checkEmailVerificationHandler,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
