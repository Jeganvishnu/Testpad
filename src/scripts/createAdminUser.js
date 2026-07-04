import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBGVNBsuGPaP98rPHXyr51qUou1Z7oaocM",
  authDomain: "online-test-web.firebaseapp.com",
  projectId: "online-test-web",
  storageBucket: "online-test-web.firebasestorage.app",
  messagingSenderId: "128014086913",
  appId: "1:128014086913:web:16178746daaab0eed7a100",
  measurementId: "G-5SN8SQEBLV",
  databaseURL: "https://online-test-web-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Create admin user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@gmail.com', 
      'admin@123'
    );
    
    const user = userCredential.user;
    console.log('Admin user created with UID:', user.uid);
    
    // Add admin user data to database
    const adminData = {
      uid: user.uid,
      email: user.email,
      name: 'System Administrator',
      role: 'admin',
      department: 'Administration',
      registrationNumber: 'ADMIN001',
      createdAt: new Date().toISOString()
    };
    
    await set(ref(database, `users/${user.uid}`), adminData);
    console.log('Admin user data saved to database successfully');
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists with this email.');
    } else if (error.code === 'auth/weak-password') {
      console.log('Password is too weak.');
    } else {
      console.log('Failed to create admin user:', error.message);
    }
    
    process.exit(1);
  }
}

createAdminUser();