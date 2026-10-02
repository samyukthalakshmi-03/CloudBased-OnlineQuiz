import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableQuizzes } from '../../services/quizService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function StudentDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAvailableQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Error fetching available quizzes:', err);
      setError('Failed to load published quizzes. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching available quizzes..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Available Quizzes</h1>
          <p className="page-subtitle">
            Welcome back, {currentUser?.displayName || 'Student'}! Select an active quiz below to test your knowledge.
          </p>
        </div>
        <button onClick={loadQuizzes} className="btn btn-secondary">
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No Quizzes Available</h3>
          <p>There are currently no published quizzes available for attempt. Check back soon!</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-card-header">
                <span className="quiz-tag">Published</span>
                <span className="quiz-duration">⏱ {quiz.duration} min</span>
              </div>

              <h3 className="quiz-title">{quiz.title}</h3>
              <p className="quiz-desc">
                {quiz.description || 'No description provided by the instructor.'}
              </p>

              <div className="quiz-meta-row">
                <div className="quiz-meta-item">
                  <span className="meta-label">Questions</span>
                  <span className="meta-value">{quiz.questionCount || quiz.questions?.length || 0}</span>
                </div>
                <div className="quiz-meta-item">
                  <span className="meta-label">Total Marks</span>
                  <span className="meta-value">{quiz.totalMarks || 0}</span>
                </div>
              </div>

              <div className="quiz-card-footer">
                <Link
                  to={`/quiz/${quiz.id}/leaderboard`}
                  className="btn btn-outline"
                >
                  🏆 Leaderboard
                </Link>
                <Link
                  to={`/quiz/${quiz.id}/attempt`}
                  className="btn btn-primary"
                >
                  Start Quiz →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
