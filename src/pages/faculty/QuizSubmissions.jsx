import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuizResults } from '../../services/resultService';
import { getQuizById } from '../../services/quizService';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function QuizSubmissions() {
  const { quizId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubmissionsData();
  }, [quizId]);

  const loadSubmissionsData = async () => {
    if (!quizId) return;

    try {
      setLoading(true);
      setError('');
      const [resultsList, quizData] = await Promise.all([
        getQuizResults(quizId),
        getQuizById(quizId)
      ]);
      setSubmissions(resultsList);
      setQuiz(quizData);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Failed to load submissions for this quiz.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
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
    return <LoadingSpinner message="Aggregating quiz performance data..." />;
  }

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const totalMarks = quiz?.totalMarks || 1;
  const scores = submissions.map(s => s.score || 0);
  const avgScore = totalSubmissions > 0
    ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(1)
    : 0;
  const maxScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
  const minScore = totalSubmissions > 0 ? Math.min(...scores) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quiz Performance & Submissions</h1>
          <p className="page-subtitle">
            Quiz: <strong>{quiz?.title || 'Quiz'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <Link to={`/quiz/${quizId}/leaderboard`} className="btn btn-outline">
            View Public Leaderboard
          </Link>
          <Link to="/faculty" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Analytics Overview Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <span className="analytics-label">Total Submissions</span>
          <span className="analytics-value">{totalSubmissions}</span>
        </div>
        <div className="analytics-card">
          <span className="analytics-label">Average Score</span>
          <span className="analytics-value">
            {avgScore} <small>/ {totalMarks}</small>
          </span>
        </div>
        <div className="analytics-card">
          <span className="analytics-label">Highest Score</span>
          <span className="analytics-value text-success">
            {maxScore} <small>/ {totalMarks}</small>
          </span>
        </div>
        <div className="analytics-card">
          <span className="analytics-label">Lowest Score</span>
          <span className="analytics-value text-danger">
            {minScore} <small>/ {totalMarks}</small>
          </span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h3>No Student Submissions Yet</h3>
          <p>
            Students haven't submitted any attempts for this quiz yet. Make sure the quiz is <strong>Published</strong> in your dashboard.
          </p>
        </div>
      ) : (
        <div className="submissions-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Time Taken</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const score = sub.score || 0;
                const pct = Math.round((score / totalMarks) * 100);

                return (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.studentName || 'Student'}</strong>
                    </td>
                    <td>{sub.studentEmail || 'N/A'}</td>
                    <td>
                      <span className="score-highlight">{score} / {totalMarks}</span>
                    </td>
                    <td>
                      <span className={`pct-pill ${pct >= 70 ? 'pill-success' : pct >= 40 ? 'pill-warning' : 'pill-danger'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td>{formatTime(sub.timeTaken || 0)}</td>
                    <td>{formatDate(sub.submittedAt)}</td>
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
