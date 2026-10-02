import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthChanged,
  getUserProfile,
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
    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('[AuthContext] Failed to load user profile:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const user = await loginUser(email, password);
    const profile = await getUserProfile(user.uid);
    setUserProfile(profile);
    return user;
  };

  const register = async (name, email, password, role) => {
    const profile = await registerUser(name, email, password, role);
    setUserProfile(profile);
    return profile;
  };

  const logout = async () => {
    await logoutUser();
    setUserProfile(null);
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
      return profile;
    }
    return null;
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || 'student',
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
      {!loading && children}
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
