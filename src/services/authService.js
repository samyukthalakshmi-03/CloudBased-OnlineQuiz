
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
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
 * Register a new student with Firebase Authentication
 * and create their profile in Cloud Firestore.
 *
 * Public registration never accepts a role parameter.
 * Faculty accounts must be provisioned through a trusted
 * administrative process.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{uid: string, email: string, name: string, role: string}>}
 */
export async function registerUser(name, email, password) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Name is required.');
  }

  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('A valid email address is required.');
  }

  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  let user = null;
  let profileCreated = false;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

    user = userCredential.user;

    await updateProfile(user, {
      displayName: name.trim()
    });

    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      role: 'student',
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    profileCreated = true;

    return {
      uid: user.uid,
      email: user.email,
      name: name.trim(),
      role: 'student'
    };
  } catch (error) {
    console.error('[authService.registerUser]', error);

    // Avoid leaving an incomplete Auth account when profile
    // creation fails. If profile creation succeeded, preserve
    // the account rather than deleting a valid registered user.
    if (user && !profileCreated) {
      try {
        await deleteUser(user);
      } catch (cleanupError) {
        console.error(
          '[authService.registerUser] Account cleanup failed:',
          cleanupError
        );
      }
    }

    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists.');
    }

    if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak. Use at least 6 characters.');
    }

    if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is invalid.');
    }

    if (error.code === 'permission-denied') {
      throw new Error(
        'Your profile could not be created because database access was denied. Please contact support.'
      );
    }

    throw error;
  }
}

/**
 * Log in an existing user.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function loginUser(email, password) {
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new Error('Email and password are required.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    return userCredential.user;
  } catch (error) {
    console.error('[authService.loginUser]', error);

    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid email or password.');
    }

    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    }

    if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is invalid.');
    }

    throw error;
  }
}

/**
 * Log out the current user.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('[authService.logoutUser]', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Get the current authenticated user.
 *
 * @returns {import('firebase/auth').User | null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Fetch a profile from Cloud Firestore.
 *
 * @param {string} uid
 * @returns {Promise<object | null>}
 */
export async function getUserProfile(uid) {
  if (!uid || typeof uid !== 'string') {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(db, 'users', uid));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      uid: snapshot.id,
      ...snapshot.data()
    };
  } catch (error) {
    console.error('[authService.getUserProfile]', error);
    throw error;
  }
}

/**
 * Subscribe to Firebase Authentication state changes.
 *
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {import('firebase/auth').Unsubscribe}
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
