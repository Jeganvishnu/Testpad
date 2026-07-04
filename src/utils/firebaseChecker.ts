import { auth, storage, database } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const checkFirebaseConfig = () => {
  console.log('=== Firebase Configuration Check ===');
  
  // Check Firebase app configuration
  const app = storage.app;
  console.log('Project ID:', app.options.projectId);
  console.log('Storage Bucket:', app.options.storageBucket);
  console.log('Auth Domain:', app.options.authDomain);
  console.log('Database URL:', app.options.databaseURL);
  
  // Check if storage bucket exists and is properly formatted
  const bucketName = app.options.storageBucket;
  if (!bucketName) {
    console.error('❌ Storage bucket not configured!');
    return false;
  }
  
  if (!bucketName.includes('.appspot.com') && !bucketName.includes('.firebasestorage.app')) {
    console.warn('⚠️ Storage bucket format might be incorrect:', bucketName);
  } else {
    console.log('✅ Storage bucket configured correctly');
  }
  
  return true;
};

export const checkAuthentication = (): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log('=== Authentication Check ===');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ User is authenticated');
        console.log('User ID:', user.uid);
        console.log('User Email:', user.email);
        console.log('Auth Token Available:', !!user.accessToken);
        
        // Check if user has custom claims
        user.getIdTokenResult().then((idTokenResult) => {
          console.log('Token Claims:', idTokenResult.claims);
          console.log('Token Expiration:', new Date(idTokenResult.expirationTime));
        }).catch((error) => {
          console.log('Could not get token result:', error);
        });
        
        resolve(true);
      } else {
        console.log('❌ User is not authenticated');
        resolve(false);
      }
      unsubscribe();
    });
  });
};

export const testStorageAccess = async () => {
  console.log('=== Storage Access Test ===');
  
  try {
    // Check if we can access storage
    const storageRef = storage._delegate || storage;
    console.log('Storage instance:', storageRef);
    
    // Test basic storage operations
    const { ref: storageRefFunc } = await import('firebase/storage');
    const testRef = storageRefFunc(storage, 'test-access');
    console.log('✅ Can create storage references');
    
    return true;
  } catch (error) {
    console.error('❌ Storage access test failed:', error);
    return false;
  }
};

export const runFullDiagnostic = async () => {
  console.log('🔍 Running Firebase Diagnostic...\n');
  
  // Check configuration
  const configOk = checkFirebaseConfig();
  
  // Check authentication
  const authOk = await checkAuthentication();
  
  // Check storage access
  const storageOk = await testStorageAccess();
  
  console.log('\n=== Diagnostic Summary ===');
  console.log('Configuration:', configOk ? '✅' : '❌');
  console.log('Authentication:', authOk ? '✅' : '❌');
  console.log('Storage Access:', storageOk ? '✅' : '❌');
  
  if (configOk && authOk && storageOk) {
    console.log('🎉 All checks passed! The issue might be with security rules.');
  } else {
    console.log('🚨 Issues found. Please check the failed items above.');
  }
  
  return { configOk, authOk, storageOk };
};
