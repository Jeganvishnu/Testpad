// Firebase Storage Test Utility
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const testFirebaseStorage = async () => {
  try {
    console.log('Testing Firebase Storage...');
    console.log('Storage instance:', storage);
    
    // Create a simple test file
    const testData = new Blob(['test'], { type: 'text/plain' });
    const testRef = ref(storage, 'test/test.txt');
    
    console.log('Test ref created:', testRef);
    
    // Try to upload
    const result = await uploadBytes(testRef, testData);
    console.log('Upload successful:', result);
    
    // Try to get download URL
    const url = await getDownloadURL(testRef);
    console.log('Download URL:', url);
    
    return { success: true, url };
  } catch (error) {
    console.error('Firebase Storage test failed:', error);
    return { success: false, error };
  }
};

// You can call this in the browser console:
// import('./utils/firebaseTest.js').then(module => module.testFirebaseStorage())
