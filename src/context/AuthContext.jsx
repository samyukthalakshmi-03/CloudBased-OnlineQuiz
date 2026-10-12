
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import {
  onAuthChanged,
  getUserProfile,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthChanged(async (user) => {
      if (!active) return;

      setCurrentUser(user);
      setLoading(true);

      if (user) {
        try {
          const profile = await getUserProfile(user.uid);

          if (active) {
            setUserProfile(profile);
          }
        } catch (err) {
          console.error(
            '[AuthContext] Failed to load user profile:',
            err
          );

          if (active) {
            setUserProfile(null);
          }
        }
      } else if (active) {
        setUserProfile(null);
      }

      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const user = await loginUser(email, password);

    try {
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        throw new Error(
          'Your account profile was not found. Please contact support.'
        );
      }

      setCurrentUser(user);
      setUserProfile(profile);

      return user;
    } catch (error) {
      console.error('[AuthContext.login] Profile loading failed:', error);
      throw error;
    }
  };

  // Public registration always creates a student account.
  const register = async (name, email, password) => {
    const profile = await registerUser(name, email, password);
  
    setCurrentUser(getCurrentUser());
    setUserProfile(profile);
  
    return profile;
  };

  const logout = async () => {
    await logoutUser();

    setCurrentUser(null);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (!currentUser) {
      return null;
    }

    const profile = await getUserProfile(currentUser.uid);
    setUserProfile(profile);

    return profile;
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    isFaculty: userProfile?.role === 'faculty',
    isStudent: userProfile?.role === 'student',
    loading,
    login,
    register,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
