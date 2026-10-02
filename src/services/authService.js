import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

/**
 * Register a new user with Firebase Authentication and create their profile in Cloud Firestore.
 * 
 * @param {string} name - Full name of the user
 * @param {string} email - Email address
 * @param {string} password - Minimum 6-character password
 * @param {'student'|'faculty'} role - Designated role
 * @returns {Promise<{ uid: string, email: string, name: string, role: string }>}
 */
export async function registerUser(name, email, password, role = 'student') {
  // Input validation
  if (!name || !name.trim()) {
    throw new Error('Name is required.');
  }
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const normalizedRole = role.toLowerCase().trim();
  if (!['student', 'faculty'].includes(normalizedRole)) {
    throw new Error('Invalid user role. Must be either "student" or "faculty".');
  }

  try {
    // 1. Create auth user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // 2. Set Firebase Auth displayName
    await updateProfile(user, { displayName: name.trim() });

    // 3. Create user document in Cloud Firestore /users/{uid}
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: normalizedRole,
      createdAt: serverTimestamp()
    };
    await setDoc(userDocRef, userData);

    return {
      uid: user.uid,
      name: name.trim(),
      email: user.email,
      role: normalizedRole
    };
  } catch (error) {
    console.error('[authService.registerUser] Error registering user:', error);
    // Provide clean, human-readable error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak. Please use at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is improperly formatted.');
    }
    throw error;
  }
}

/**
 * Log in an existing user with Firebase Authentication.
 * 
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (error) {
    console.error('[authService.loginUser] Error logging in:', error);
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid email or password.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }
    throw error;
  }
}

/**
 * Log out the currently authenticated user.
 * 
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[authService.logoutUser] Error signing out:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Get the current active user from Firebase Authentication.
 * 
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Fetch a user profile document from Cloud Firestore.
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{ uid: string, name: string, email: string, role: string, createdAt: any } | null>}
 */
export async function getUserProfile(uid) {
  if (!uid) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);

    if (snapshot.exists()) {
      return {
        uid: snapshot.id,
        ...snapshot.data()
      };
    }
    return null;
  } catch (error) {
    console.error('[authService.getUserProfile] Error fetching profile:', error);
    throw error;
  }
}

/**
 * Subscribe to authentication state changes.
 * 
 * @param {function(import('firebase/auth').User | null): void} callback
 * @returns {import('firebase/auth').Unsubscribe}
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
