import { auth } from '../lib/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';

interface TroubleshootResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export class FirebaseTroubleshooter {
  static async checkFirebaseConnection(): Promise<TroubleshootResult> {
    try {
      // Test basic Firebase Auth connection
      const user = auth.currentUser;
      if (!user) {
        return {
          status: 'error',
          message: 'No authenticated user found.',
          suggestion: 'Please ensure the user is logged in before attempting email verification.'
        };
      }

      // Test token refresh
      await user.getIdToken(true);
      
      return {
        status: 'success',
        message: 'Firebase connection is working properly.'
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: `Firebase connection failed: ${error.message}`,
        suggestion: 'Check your internet connection and Firebase configuration.'
      };
    }
  }

  static async testEmailVerification(): Promise<TroubleshootResult> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          status: 'error',
          message: 'No authenticated user found.',
          suggestion: 'Please log in before testing email verification.'
        };
      }

      // Try to send email verification without action code settings first
      await sendEmailVerification(user);
      
      return {
        status: 'success',
        message: 'Email verification test successful.'
      };
    } catch (error: any) {
      let suggestion = '';
      
      if (error.code === 'auth/visibility-check-was-unavailable') {
        suggestion = 'This is a temporary Firebase issue. Try again in a few minutes. If the problem persists, check Firebase project settings.';
      } else if (error.code === 'auth/too-many-requests') {
        suggestion = 'Rate limit exceeded. Wait a few minutes before trying again.';
      } else if (error.message?.includes('503')) {
        suggestion = 'Firebase service is temporarily unavailable. This usually resolves within a few minutes.';
      } else {
        suggestion = 'Check Firebase project configuration and ensure email verification is enabled.';
      }

      return {
        status: 'error',
        message: `Email verification failed: ${error.message}`,
        suggestion
      };
    }
  }

  static async validateProjectSettings(): Promise<TroubleshootResult[]> {
    const results: TroubleshootResult[] = [];

    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      results.push({
        status: 'error',
        message: 'User is not authenticated.',
        suggestion: 'Ensure the user is logged in before validating project settings.'
      });
      return results;
    }

    // Check API key format
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || 
                   (window as any).firebaseConfig?.apiKey;
    
    if (!apiKey || !apiKey.startsWith('AIza')) {
      results.push({
        status: 'error',
        message: 'Invalid or missing Firebase API key.',
        suggestion: 'Check your Firebase configuration. API key should start with "AIza".'
      });
    } else {
      results.push({
        status: 'success',
        message: 'Firebase API key format is valid.'
      });
    }

    // Check if email verification is enabled (indirect check)
    try {
      await reload(user);
      results.push({
        status: 'success',
        message: 'User reload successful - Firebase Auth is properly configured.'
      });
    } catch (error: any) {
      results.push({
        status: 'error',
        message: `User reload failed: ${error.message}`,
        suggestion: 'Check Firebase project permissions and configuration.'
      });
    }

    return results;
  }

  static getCommonSolutions(): string[] {
    return [
      '1. Wait 5-10 minutes and try again (503 errors are usually temporary)',
      '2. Check your internet connection stability',
      '3. Ensure Firebase project billing is active (required for email sending)',
      '4. Verify Firebase project quotas haven\'t been exceeded',
      '5. Check Firebase project settings in console (firebase.google.com)',
      '6. Ensure email/password authentication is enabled in Firebase Console',
      '7. Try using a different network (mobile data vs WiFi)',
      '8. Clear browser cache and cookies for your domain',
      '9. Disable browser extensions that might interfere with Firebase',
      '10. If problem persists, contact Firebase Support with project ID'
    ];
  }

  static async runFullDiagnostic(): Promise<{
    connectionTest: TroubleshootResult;
    emailVerificationTest: TroubleshootResult;
    projectValidation: TroubleshootResult[];
    commonSolutions: string[];
  }> {
    const [connectionTest, emailVerificationTest, projectValidation] = await Promise.all([
      this.checkFirebaseConnection(),
      this.testEmailVerification(),
      this.validateProjectSettings()
    ]);

    return {
      connectionTest,
      emailVerificationTest,
      projectValidation,
      commonSolutions: this.getCommonSolutions()
    };
  }

  static formatDiagnosticReport(diagnostic: Awaited<ReturnType<typeof FirebaseTroubleshooter.runFullDiagnostic>>): string {
    let report = '=== Firebase Email Verification Diagnostic Report ===\n\n';
    
    report += `Connection Test: ${diagnostic.connectionTest.status.toUpperCase()}\n`;
    report += `- ${diagnostic.connectionTest.message}\n`;
    if (diagnostic.connectionTest.suggestion) {
      report += `- Suggestion: ${diagnostic.connectionTest.suggestion}\n`;
    }
    report += '\n';

    report += `Email Verification Test: ${diagnostic.emailVerificationTest.status.toUpperCase()}\n`;
    report += `- ${diagnostic.emailVerificationTest.message}\n`;
    if (diagnostic.emailVerificationTest.suggestion) {
      report += `- Suggestion: ${diagnostic.emailVerificationTest.suggestion}\n`;
    }
    report += '\n';

    report += 'Project Validation:\n';
    diagnostic.projectValidation.forEach((result, index) => {
      report += `${index + 1}. ${result.status.toUpperCase()}: ${result.message}\n`;
      if (result.suggestion) {
        report += `   Suggestion: ${result.suggestion}\n`;
      }
    });
    report += '\n';

    report += 'Common Solutions (try in order):\n';
    diagnostic.commonSolutions.forEach(solution => {
      report += `${solution}\n`;
    });

    return report;
  }
}

export default FirebaseTroubleshooter;
