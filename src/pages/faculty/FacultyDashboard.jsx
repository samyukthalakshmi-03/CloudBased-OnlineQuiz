import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFacultyQuizzes, deleteQuiz, updateQuiz } from '../../services/quizService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function FacultyDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    loadQuizzes();
  }, [currentUser]);

  const loadQuizzes = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      const data = await getFacultyQuizzes(currentUser.uid);
      setQuizzes(data);
    } catch (err) {
      console.error('Error loading faculty quizzes:', err);
      setError('Failed to fetch your quizzes. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId, quizTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${quizTitle}"? This will permanently remove the quiz and its answer key.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(quizId);
      await deleteQuiz(quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      setSuccessMsg(`Quiz "${quizTitle}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setError(err.message || 'Failed to delete quiz.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (quiz) => {
    const newStatus = !quiz.isPublished;
    try {
      setActionLoading(quiz.id);
      await updateQuiz(quiz.id, {
        ...quiz,
        isPublished: newStatus
      });
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, isPublished: newStatus } : q));
      setSuccessMsg(`Quiz "${quiz.title}" is now ${newStatus ? 'Published' : 'Unpublished (Draft)'}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      setError('Failed to change publish status.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your faculty portal..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Quiz Management</h1>
          <p className="page-subtitle">
            Create, publish, edit quizzes, and review student performance analytics.
          </p>
        </div>
        <Link to="/faculty/create" className="btn btn-primary">
          + Create New Quiz
        </Link>
      </div>

      {successMsg && (
        <div className="alert alert-success" role="alert">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No Quizzes Created Yet</h3>
          <p>Get started by creating your first online MCQ quiz with customized questions and duration.</p>
          <Link to="/faculty/create" className="btn btn-primary">
            Create Your First Quiz
          </Link>
        </div>
      ) : (
        <div className="faculty-grid">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="faculty-quiz-card">
              <div className="card-top-row">
                <span className={`status-badge ${quiz.isPublished ? 'status-published' : 'status-draft'}`}>
                  {quiz.isPublished ? '● Published' : '○ Draft'}
                </span>
                <span className="quiz-meta-tag">⏱ {quiz.duration} mins</span>
              </div>

              <h3 className="card-title">{quiz.title}</h3>
              <p className="card-desc">
                {quiz.description || 'No description provided.'}
              </p>

              <div className="card-metrics">
                <div className="metric">
                  <span className="label">Questions</span>
                  <span className="val">{quiz.questionCount || quiz.questions?.length || 0}</span>
                </div>
                <div className="metric">
                  <span className="label">Total Marks</span>
                  <span className="val">{quiz.totalMarks || 0}</span>
                </div>
              </div>

              <div className="card-actions-row">
                <button
                  onClick={() => handleTogglePublish(quiz)}
                  className={`btn-sm ${quiz.isPublished ? 'btn-outline-warning' : 'btn-outline-success'}`}
                  disabled={actionLoading === quiz.id}
                >
                  {quiz.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <Link
                  to={`/faculty/edit/${quiz.id}`}
                  className="btn-sm btn-secondary"
                >
                  Edit
                </Link>
                <Link
                  to={`/faculty/submissions/${quiz.id}`}
                  className="btn-sm btn-primary"
                >
                  Submissions
                </Link>
                <button
                  onClick={() => handleDelete(quiz.id, quiz.title)}
                  className="btn-sm btn-danger"
                  disabled={actionLoading === quiz.id}
                >
                  {actionLoading === quiz.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
