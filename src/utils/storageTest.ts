import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const testStorageUpload = async () => {
  console.log('Testing Firebase Storage upload...');
  
  try {
    // Test with a simple text blob
    const testBlob = new Blob(['Hello, World!'], { type: 'text/plain' });
    const testRef = storageRef(storage, 'test/hello.txt');
    
    console.log('Attempting upload...');
    const uploadResult = await uploadBytes(testRef, testBlob);
    console.log('Upload successful:', uploadResult);
    
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(testRef);
    console.log('Download URL:', downloadURL);
    
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Storage test failed:', error);
    return { success: false, error };
  }
};

export const checkStorageConfiguration = () => {
  console.log('Storage configuration:');
  console.log('Storage bucket:', storage.app.options.storageBucket);
  console.log('Storage instance:', storage);
  
  return {
    bucket: storage.app.options.storageBucket,
    configured: !!storage.app.options.storageBucket
  };
};
