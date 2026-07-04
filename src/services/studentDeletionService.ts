import { ref, remove, get } from 'firebase/database';
import { database } from '../lib/firebase';

export interface StudentDeletionResult {
  success: boolean;
  message: string;
  deletedData?: {
    userData: boolean;
    testResponses: number;
    testStates: boolean;
  };
}

/**
 * Deletes a student's complete data from the Firebase Realtime Database
 * This includes:
 * 1. User profile data
 * 2. All test responses
 * 3. User test states
 * 
 * Note: This does not delete the Firebase Auth account as we don't have
 * access to the Admin SDK in the frontend. The Auth account will remain
 * but the user won't be able to access anything without the database record.
 */
export async function deleteStudentData(studentId: string): Promise<StudentDeletionResult> {
  try {
    const deletionResult = {
      userData: false,
      testResponses: 0,
      testStates: false,
    };

    // 1. Check if student exists
    const userRef = ref(database, `users/${studentId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      return {
        success: false,
        message: 'Student not found in database'
      };
    }

    const userData = userSnapshot.val();
    if (userData.role !== 'student') {
      return {
        success: false,
        message: 'Can only delete student accounts'
      };
    }

    // 2. Delete user profile data
    await remove(userRef);
    deletionResult.userData = true;

    // 3. Delete all test responses by this student
    const responsesRef = ref(database, 'responses');
    const responsesSnapshot = await get(responsesRef);
    
    if (responsesSnapshot.exists()) {
      const responsesData = responsesSnapshot.val();
      let responseCount = 0;

      for (const testId in responsesData) {
        const testResponses = responsesData[testId];
        if (testResponses && testResponses[studentId]) {
          const studentResponseRef = ref(database, `responses/${testId}/${studentId}`);
          await remove(studentResponseRef);
          responseCount++;
        }
      }
      deletionResult.testResponses = responseCount;
    }

    // 4. Delete user test states
    const userTestStatesRef = ref(database, `userTestStates/${studentId}`);
    const testStatesSnapshot = await get(userTestStatesRef);
    
    if (testStatesSnapshot.exists()) {
      await remove(userTestStatesRef);
      deletionResult.testStates = true;
    }

    return {
      success: true,
      message: `Student data deleted successfully. Removed ${deletionResult.testResponses} test responses.`,
      deletedData: deletionResult
    };

  } catch (error) {
    console.error('Error deleting student data:', error);
    return {
      success: false,
      message: `Failed to delete student data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get student deletion preview - shows what data would be deleted
 */
export async function getStudentDeletionPreview(studentId: string): Promise<{
  found: boolean;
  studentName?: string;
  email?: string;
  department?: string;
  registrationNumber?: string;
  testResponseCount: number;
  hasTestStates: boolean;
}> {
  try {
    // Check user data
    const userRef = ref(database, `users/${studentId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      return {
        found: false,
        testResponseCount: 0,
        hasTestStates: false
      };
    }

    const userData = userSnapshot.val();

    // Count test responses
    let testResponseCount = 0;
    const responsesRef = ref(database, 'responses');
    const responsesSnapshot = await get(responsesRef);
    
    if (responsesSnapshot.exists()) {
      const responsesData = responsesSnapshot.val();
      for (const testId in responsesData) {
        const testResponses = responsesData[testId];
        if (testResponses && testResponses[studentId]) {
          testResponseCount++;
        }
      }
    }

    // Check test states
    const userTestStatesRef = ref(database, `userTestStates/${studentId}`);
    const testStatesSnapshot = await get(userTestStatesRef);
    const hasTestStates = testStatesSnapshot.exists();

    return {
      found: true,
      studentName: userData.name,
      email: userData.email,
      department: userData.department,
      registrationNumber: userData.registrationNumber,
      testResponseCount,
      hasTestStates
    };

  } catch (error) {
    console.error('Error getting deletion preview:', error);
    return {
      found: false,
      testResponseCount: 0,
      hasTestStates: false
    };
  }
}