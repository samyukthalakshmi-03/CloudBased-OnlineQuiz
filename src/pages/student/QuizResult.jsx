import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getResultById } from '../../services/resultService';
import { getQuizById } from '../../services/quizService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function QuizResult() {
  const { quizId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [result, setResult] = useState(location.state?.result || null);
  const [quiz, setQuiz] = useState(null);
  const [answerKey, setAnswerKey] = useState(location.state?.result?.answerKey || []);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFullResultData();
  }, [quizId, currentUser]);

  const loadFullResultData = async () => {
    if (!quizId || !currentUser) return;

    try {
      setLoading(true);

      // 1. Fetch result if not passed via location state
      let activeResult = result;
      if (!activeResult) {
        const resultId = `${currentUser.uid}_${quizId}`;
        activeResult = await getResultById(resultId);
        if (!activeResult) {
          setError('No completed submission found for this quiz.');
          setLoading(false);
          return;
        }
        setResult(activeResult);
      }

      // 2. Fetch quiz questions
      const quizData = await getQuizById(quizId);
      setQuiz(quizData);

      // 3. Fetch answer key now that submission exists
      try {
        const answerDocRef = doc(db, 'quizAnswers', quizId);
        const answerSnap = await getDoc(answerDocRef);
        if (answerSnap.exists()) {
          setAnswerKey(answerSnap.data().answers || []);
        }
      } catch (err) {
        console.warn('Could not load answer key breakdown:', err);
      }
    } catch (err) {
      console.error('Error loading result:', err);
      setError('Failed to load result details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating and retrieving your result..." />;
  }

  if (error || !result) {
    return (
      <div className="centered-page">
        <div className="status-card">
          <div className="status-icon">⚠️</div>
          <h2>Result Not Found</h2>
          <p>{error || 'Unable to retrieve your quiz submission.'}</p>
          <Link to="/" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const score = result.score || 0;
  const totalMarks = result.totalMarks || (quiz?.totalMarks || 1);
  const percentage = Math.round((score / (totalMarks || 1)) * 100);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="page-container">
      {/* Result Summary Card */}
      <div className="result-summary-card">
        <div className="result-badge-top">
          {percentage >= 70 ? '🎉 Excellent Job!' : percentage >= 40 ? '👍 Good Effort!' : '📚 Keep Practicing!'}
        </div>
        <h1 className="result-title">{result.quizTitle || quiz?.title || 'Quiz Result'}</h1>
        <p className="result-subtitle">Submission Finalized & Recorded on Cloud Firestore</p>

        <div className="score-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Your Score</span>
            <span className="metric-value highlight">{score} / {totalMarks}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Accuracy</span>
            <span className="metric-value">{percentage}%</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Time Taken</span>
            <span className="metric-value">{formatTime(result.timeTaken || 0)}</span>
          </div>
        </div>

        <div className="result-actions">
          <Link to={`/quiz/${quizId}/leaderboard`} className="btn btn-outline">
            🏆 View Quiz Leaderboard
          </Link>
          <Link to="/student/history" className="btn btn-secondary">
            📋 My Past Attempts
          </Link>
          <Link to="/" className="btn btn-primary">
            Back to Quizzes
          </Link>
        </div>
      </div>

      {/* Question by Question Detailed Review */}
      {quiz && quiz.questions && (
        <div className="review-section">
          <h2 className="section-title">Question Breakdown</h2>
          <div className="review-list">
            {quiz.questions.map((q, idx) => {
              const studentAnswer = result.answers ? result.answers[idx] : undefined;
              const keyItem = answerKey.find(a => a.questionIndex === idx);
              const correctAnswer = keyItem ? keyItem.correctAnswer : undefined;
              const isCorrect = studentAnswer !== undefined && studentAnswer === correctAnswer;

              return (
                <div
                  key={idx}
                  className={`review-card ${isCorrect ? 'review-correct' : 'review-incorrect'}`}
                >
                  <div className="review-header">
                    <span className="question-num">Question {idx + 1}</span>
                    <span className={`status-pill ${isCorrect ? 'pill-success' : 'pill-danger'}`}>
                      {isCorrect ? `✓ Correct (+${q.marks} pts)` : '✗ Incorrect (0 pts)'}
                    </span>
                  </div>

                  <p className="question-text">{q.questionText}</p>

                  <div className="review-options">
                    {q.options?.map((option, optIdx) => {
                      const isStudentSelected = studentAnswer === optIdx;
                      const isOptionCorrect = correctAnswer === optIdx;

                      let optionClass = 'review-option';
                      if (isOptionCorrect) {
                        optionClass += ' option-answer-correct';
                      } else if (isStudentSelected && !isCorrect) {
                        optionClass += ' option-answer-wrong';
                      }

                      return (
                        <div key={optIdx} className={optionClass}>
                          <span className="opt-letter">{String.fromCharCode(65 + optIdx)}.</span>
                          <span className="opt-text">{option}</span>
                          {isOptionCorrect && <span className="opt-tag tag-correct">Correct Answer</span>}
                          {isStudentSelected && !isOptionCorrect && <span className="opt-tag tag-selected">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
