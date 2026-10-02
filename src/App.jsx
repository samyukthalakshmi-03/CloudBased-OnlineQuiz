import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import QuizAttempt from './pages/student/QuizAttempt';
import QuizResult from './pages/student/QuizResult';
import StudentHistory from './pages/student/StudentHistory';
import Leaderboard from './pages/student/Leaderboard';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import QuizEditor from './pages/faculty/QuizEditor';
import QuizSubmissions from './pages/faculty/QuizSubmissions';

import './App.css';

// Home redirector based on user role
function HomeRoute() {
  const { isFaculty } = useAuth();
  if (isFaculty) {
    return <Navigate to="/faculty" replace />;
  }
  return <StudentDashboard />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Shared Protected Home */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomeRoute />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId/attempt"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <QuizAttempt />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId/result"
                element={
                  <ProtectedRoute>
                    <QuizResult />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quiz/:quizId/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />

              {/* Faculty Routes */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/create"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <QuizEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/edit/:quizId"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <QuizEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/submissions/:quizId"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <QuizSubmissions />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}
