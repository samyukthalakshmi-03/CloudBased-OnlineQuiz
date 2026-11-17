import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Authentication Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/Unauthorized';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableQuizzes from './pages/student/AvailableQuizzes';
import QuizTaking from './pages/student/QuizTaking';
import Results from './pages/student/Results';
import Leaderboard from './pages/student/Leaderboard';
import Profile from './pages/student/Profile';

// Faculty Pages
import FacultyLayout from './pages/faculty/FacultyLayout';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import ManageQuizzes from './pages/faculty/ManageQuizzes';
import CreateQuiz from './pages/faculty/CreateQuiz';
import Performance from './pages/faculty/Performance';
import Students from './pages/faculty/Students';
import FacultyProfile from './pages/faculty/FacultyProfile';

import './App.css';

// Redirect the home route to the correct dashboard based on the role.
function HomeRedirect() {
  const { isFaculty, isStudent, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (isFaculty) {
    return <Navigate to="/faculty" replace />;
  }

  if (isStudent) {
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Role-aware home redirect */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/quizzes"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <AvailableQuizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/quiz/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <QuizTaking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/results"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Results />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/leaderboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Faculty Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/faculty" element={<FacultyDashboard />} />
            <Route path="/faculty/quizzes" element={<ManageQuizzes />} />
            <Route path="/faculty/create-quiz" element={<CreateQuiz />} />
            <Route path="/faculty/students" element={<Students />} />
            <Route path="/faculty/performance" element={<Performance />} />
            <Route path="/faculty/profile" element={<FacultyProfile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
