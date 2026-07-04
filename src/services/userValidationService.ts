import { ref, get, set } from 'firebase/database';
import { updateEmail, sendEmailVerification, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { database, auth } from '../lib/firebase';
import EmailService from './emailService';

export interface RegistrationValidationResult {
  isValid: boolean;
  message: string;
  conflictingUser?: {
    name: string;
    email: string;
    registrationNumber: string;
  };
}

export interface EmailUpdateResult {
  success: boolean;
  message: string;
  requiresReauth?: boolean;
}

/**
 * Check if a registration number already exists in the same department
 */
export async function validateRegistrationNumber(
  registrationNumber: string,
  department: string,
  currentUserId?: string
): Promise<RegistrationValidationResult> {
  try {
    // Clean and validate the registration number format first
    const cleanRegNo = registrationNumber.replace(/\D/g, '');
    
    if (cleanRegNo.length === 0) {
      return {
        isValid: false,
        message: 'Registration number must contain digits'
      };
    }
    
    if (!cleanRegNo.startsWith('4207')) {
      return {
        isValid: false,
        message: 'Registration number must start with 4207 (CKCET college ID)'
      };
    }
    
    if (cleanRegNo.length < 10) {
      return {
        isValid: false,
        message: `Registration number must be at least 10 digits (currently ${cleanRegNo.length} digits)`
      };
    }

    // Check for duplicates in the database
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return { isValid: true, message: 'Registration number is valid' };
    }

    const users = snapshot.val();
    
    // Look for existing registration number in the same department
    for (const [userId, userData] of Object.entries(users as Record<string, any>)) {
      // Skip current user when updating
      if (currentUserId && userId === currentUserId) {
        continue;
      }
      
      // Skip if not a student
      if (userData.role !== 'student') {
        continue;
      }
      
      // Check if same registration number exists in same department
      if (userData.registrationNumber === registrationNumber && 
          userData.department === department) {
        return {
          isValid: false,
          message: `Registration number ${registrationNumber} is already registered by another student in ${department} department`,
          conflictingUser: {
            name: userData.name,
            email: userData.email,
            registrationNumber: userData.registrationNumber
          }
        };
      }
    }

    return {
      isValid: true,
      message: 'Registration number is available'
    };

  } catch (error) {
    console.error('Error validating registration number:', error);
    return {
      isValid: false,
      message: 'Unable to validate registration number. Please try again.'
    };
  }
}

/**
 * Send verification code to NEW email address using custom verification
 * Stores verification code in database and shows it to user (temporary solution)
 */
export async function sendEmailChangeVerification(newEmail: string, userId: string): Promise<EmailUpdateResult & { verificationCode?: string }> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found'
      };
    }

    const oldEmail = user.email;
    console.log('Preparing email change from', oldEmail, 'to', newEmail);

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    // Store pending email change with verification code in database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return {
        success: false,
        message: 'User data not found'
      };
    }
    
    const userData = snapshot.val();
    await set(userRef, {
      ...userData,
      pendingEmail: newEmail,
      verificationCode: verificationCode,
      verificationCodeExpiresAt: expiresAt,
      pendingEmailSentAt: new Date().toISOString()
    });
    console.log('Verification code stored in database');
    
    // Send verification code to NEW email address using EmailJS
    try {
      const emailService = EmailService;
      const emailResult = await emailService.sendEmailVerificationCode({
        recipientEmail: newEmail,
        recipientName: userData.name || 'User',
        verificationCode: verificationCode,
        expiresInMinutes: 15
      });
      
      if (emailResult.success) {
        console.log('Verification code sent to:', newEmail);
        return {
          success: true,
          message: `Verification code sent to ${newEmail}! Please check your inbox and enter the 6-digit code.`,
          verificationCode: verificationCode // Also return in case email fails
        };
      } else {
        console.warn('Email sending failed:', emailResult.message);
        // Still return success but with the code shown
        return {
          success: true,
          message: `Email sending failed, but here's your verification code: ${verificationCode}\n\nThis code will expire in 15 minutes.`,
          verificationCode: verificationCode
        };
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Fallback: show code in alert
      return {
        success: true,
        message: `Could not send email. Your verification code is: ${verificationCode}\n\nThis code will expire in 15 minutes.`,
        verificationCode: verificationCode
      };
    }

  } catch (error: any) {
    console.error('Error preparing email change:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: 'For security reasons, please log out and log back in before changing your email.',
        requiresReauth: true
      };
    } else if (error.code === 'auth/email-already-in-use') {
      return {
        success: false,
        message: 'This email address is already in use by another account.'
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'Please enter a valid email address.'
      };
    } else {
      return {
        success: false,
        message: `Failed to prepare email change: ${error.message}`
      };
    }
  }
}

/**
 * Verify code and complete email change
 */
export async function verifyEmailChangeCode(code: string, userId: string): Promise<EmailUpdateResult> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found'
      };
    }

    // Get user data from database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return {
        success: false,
        message: 'User data not found'
      };
    }
    
    const userData = snapshot.val();
    
    // Check if there's a pending email change
    if (!userData.pendingEmail || !userData.verificationCode) {
      return {
        success: false,
        message: 'No pending email change found. Please request a new verification code.'
      };
    }
    
    // Check if code expired
    if (Date.now() > userData.verificationCodeExpiresAt) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }
    
    // Check if code matches
    if (userData.verificationCode !== code) {
      return {
        success: false,
        message: 'Invalid verification code. Please try again.'
      };
    }
    
    // Code is valid! Update email in database only
    const newEmail = userData.pendingEmail;
    const oldEmail = userData.email;
    
    console.log('Updating email in database from', oldEmail, 'to', newEmail);
    
    // Update database
    await set(userRef, {
      ...userData,
      email: newEmail,
      emailVerified: true,
      previousEmail: oldEmail,
      emailChangedAt: new Date().toISOString(),
      pendingEmail: null,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      pendingEmailSentAt: null
    });
    
    console.log('Email updated in database successfully');
    
    // Note: Firebase Auth email remains the old email
    // User can create a new account with the new email or admin can update it
    
    return {
      success: true,
      message: `Email successfully changed to ${newEmail}!\n\nIMPORTANT: You can now update your login email by:\n1. Logout\n2. Go to login page\n3. Click "Forgot Password"\n4. Enter your NEW email: ${newEmail}\n5. Reset your password\n6. Login with new email and new password`
    };

  } catch (error: any) {
    console.error('Error verifying code:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: 'For security reasons, please log out and log back in.',
        requiresReauth: true
      };
    }
    
    return {
      success: false,
      message: `Failed to change email: ${error.message}`
    };
  }
}

/**
 * Update email after verification - call this after user clicks verification link
 */
export async function updateUserEmail(newEmail: string, userId: string): Promise<EmailUpdateResult> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found'
      };
    }

    const oldEmail = user.email;
    console.log('Updating email from', oldEmail, 'to', newEmail);

    // Update email in Firebase Auth
    await updateEmail(user, newEmail);
    console.log('Email updated in Firebase Auth');
    
    // Update email in database
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      await set(userRef, {
        ...userData,
        email: newEmail,
        emailVerified: true,
        previousEmail: oldEmail,
        emailChangedAt: new Date().toISOString()
      });
      console.log('Email updated in database');
    }
    
    return {
      success: true,
      message: 'Email updated successfully!'
    };

  } catch (error: any) {
    console.error('Error updating email:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: 'For security reasons, please log out and log back in before changing your email.',
        requiresReauth: true
      };
    } else if (error.code === 'auth/email-already-in-use') {
      return {
        success: false,
        message: 'This email address is already in use by another account.'
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'Please enter a valid email address.'
      };
    } else {
      return {
        success: false,
        message: `Failed to update email: ${error.message}`
      };
    }
  }
}

/**
 * Check if an email already exists in the system
 */
export async function checkEmailExists(email: string, currentUserId?: string): Promise<boolean> {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return false;
    }

    const users = snapshot.val();
    
    for (const [userId, userData] of Object.entries(users as Record<string, any>)) {
      // Skip current user when updating
      if (currentUserId && userId === currentUserId) {
        continue;
      }
      
      if (userData.email === email) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
}