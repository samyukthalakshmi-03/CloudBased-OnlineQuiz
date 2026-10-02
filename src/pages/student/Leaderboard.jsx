import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLeaderboard } from '../../services/resultService';
import { getQuizById } from '../../services/quizService';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Leaderboard() {
  const { quizId } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboardData();
  }, [quizId]);

  const loadLeaderboardData = async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      setError('');
      const [boardData, quizData] = await Promise.all([
        getLeaderboard(quizId),
        getQuizById(quizId)
      ]);
      setLeaderboard(boardData);
      setQuiz(quizData);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge gold">🥇 1st</span>;
    if (rank === 2) return <span className="rank-badge silver">🥈 2nd</span>;
    if (rank === 3) return <span className="rank-badge bronze">🥉 3rd</span>;
    return <span className="rank-badge standard">#{rank}</span>;
  };

  if (loading) {
    return <LoadingSpinner message="Calculating leaderboard rankings..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Quiz Leaderboard</h1>
          <p className="page-subtitle">
            Rankings and performance for: <strong>{quiz?.title || 'Quiz'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <Link to={`/quiz/${quizId}/attempt`} className="btn btn-primary">
            Take This Quiz
          </Link>
          <Link to="/" className="btn btn-secondary">
            All Quizzes
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎖</div>
          <h3>No Submissions Yet</h3>
          <p>Be the first student to complete this quiz and claim the top spot on the leaderboard!</p>
          <Link to={`/quiz/${quizId}/attempt`} className="btn btn-primary">
            Attempt Quiz Now
          </Link>
        </div>
      ) : (
        <div className="leaderboard-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Rank</th>
                <th>Student</th>
                <th>Score</th>
                <th>Time Taken</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.id} className={entry.rank <= 3 ? `top-rank rank-${entry.rank}` : ''}>
                  <td>{getRankBadge(entry.rank)}</td>
                  <td>
                    <strong>{entry.studentName}</strong>
                  </td>
                  <td>
                    <span className="score-highlight">
                      {entry.score} / {entry.totalMarks || quiz?.totalMarks || entry.score}
                    </span>
                  </td>
                  <td>{formatTime(entry.timeTaken || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
