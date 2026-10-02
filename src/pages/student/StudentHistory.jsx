import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserResults } from '../../services/resultService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    loadUserHistory();
  }, [currentUser]);

  const loadUserHistory = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');
      const data = await getUserResults(currentUser.uid);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load past attempts.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving your past quiz attempts..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Quiz History</h1>
          <p className="page-subtitle">Track your performance across all completed quizzes.</p>
        </div>
        <Link to="/" className="btn btn-primary">
          Explore Quizzes
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Past Attempts Yet</h3>
          <p>You haven't completed any quizzes yet. Take your first quiz to see your scores here!</p>
          <Link to="/" className="btn btn-primary">Browse Available Quizzes</Link>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Time Taken</th>
                <th>Submitted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const score = item.score || 0;
                const total = item.totalMarks || 1;
                const pct = Math.round((score / total) * 100);

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.quizTitle || 'Quiz'}</strong>
                    </td>
                    <td>
                      <span className="score-highlight">{score} / {total}</span>
                    </td>
                    <td>
                      <span className={`pct-pill ${pct >= 70 ? 'pill-success' : pct >= 40 ? 'pill-warning' : 'pill-danger'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td>{formatTime(item.timeTaken || 0)}</td>
                    <td>{formatDate(item.submittedAt)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/quiz/${item.quizId}/result`}
                          className="btn-sm btn-outline"
                        >
                          Review
                        </Link>
                        <Link
                          to={`/quiz/${item.quizId}/leaderboard`}
                          className="btn-sm btn-secondary"
                        >
                          Leaderboard
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
