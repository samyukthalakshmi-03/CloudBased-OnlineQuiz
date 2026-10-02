import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { currentUser, userProfile, isFaculty, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CloudQuiz</span>
          <span className="cloud-badge">GCP / Firebase</span>
        </Link>

        <div className="navbar-links">
          {currentUser ? (
            <>
              {isFaculty ? (
                <>
                  <Link to="/faculty" className="nav-link">Faculty Dashboard</Link>
                  <Link to="/faculty/create" className="nav-btn nav-btn-primary">+ Create Quiz</Link>
                </>
              ) : (
                <>
                  <Link to="/" className="nav-link">Quizzes</Link>
                  <Link to="/student/history" className="nav-link">My Attempts</Link>
                </>
              )}

              <div className="user-profile-badge">
                <div className="user-info">
                  <span className="user-name">{currentUser.displayName || currentUser.email}</span>
                  <span className={`role-badge ${isFaculty ? 'role-faculty' : 'role-student'}`}>
                    {isFaculty ? 'Faculty' : 'Student'}
                  </span>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-btn nav-btn-primary">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
