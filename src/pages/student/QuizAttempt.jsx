import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getQuizById } from '../../services/quizService';
import { submitQuiz, getResultById } from '../../services/resultService';
import { useAuth } from '../../context/AuthContext';
import Timer from '../../components/Timer';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function QuizAttempt() {
  const { quizId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [existingResult, setExistingResult] = useState(null);

  const startTimeRef = useRef(Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    checkAndLoadQuiz();
  }, [quizId, currentUser]);

  const checkAndLoadQuiz = async () => {
    if (!quizId || !currentUser) return;

    try {
      setLoading(true);
      setError('');

      // Check if student already submitted this quiz
      const resultId = `${currentUser.uid}_${quizId}`;
      const pastResult = await getResultById(resultId);

      if (pastResult) {
        setAlreadyAttempted(true);
        setExistingResult(pastResult);
        setLoading(false);
        return;
      }

      // Load sanitized quiz
      const data = await getQuizById(quizId);
      if (!data) {
        setError('Quiz not found or has been removed.');
        setLoading(false);
        return;
      }

      if (!data.isPublished) {
        setError('This quiz is not currently accepting submissions.');
        setLoading(false);
        return;
      }

      setQuiz(data);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Failed to load quiz details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitting) return;

    if (!isAutoSubmit) {
      const answeredCount = Object.keys(answersRef.current).length;
      const totalCount = quiz.questions?.length || 0;
      if (answeredCount < totalCount) {
        const confirmSubmit = window.confirm(
          `You have answered ${answeredCount} of ${totalCount} questions. Are you sure you want to submit?`
        );
        if (!confirmSubmit) return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      const submissionResult = await submitQuiz(quizId, answersRef.current, timeTakenSeconds);

      // Navigate to result view passing the result state
      navigate(`/quiz/${quizId}/result`, {
        replace: true,
        state: { result: submissionResult }
      });
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const handleTimerExpire = () => {
    alert('Time has expired! Submitting your answers automatically.');
    handleSubmit(true);
  };

  if (loading) {
    return <LoadingSpinner message="Preparing your quiz..." />;
  }

  if (alreadyAttempted) {
    return (
      <div className="centered-page">
        <div className="status-card">
          <div className="status-icon">✅</div>
          <h2>Quiz Already Completed</h2>
          <p>
            You have already attempted and submitted this quiz. Under the platform security policy, duplicate attempts are prohibited.
          </p>
          <div className="score-badge-card">
            <span>Score: {existingResult?.score} / {existingResult?.totalMarks}</span>
          </div>
          <div className="card-actions">
            <Link to={`/quiz/${quizId}/result`} className="btn btn-primary">
              View Your Detailed Result
            </Link>
            <Link to="/" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="centered-page">
        <div className="status-card">
          <div className="status-icon">⚠️</div>
          <h2>Unable to Load Quiz</h2>
          <p>{error || 'An unexpected error occurred.'}</p>
          <Link to="/" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = quiz.questions?.length || 0;

  return (
    <div className="page-container">
      {/* Sticky attempt header */}
      <div className="attempt-sticky-header">
        <div className="attempt-info">
          <h2>{quiz.title}</h2>
          <span className="progress-badge">
            Progress: {answeredCount} / {totalCount} Answered
          </span>
        </div>

        <div className="attempt-timer-box">
          <Timer
            durationMinutes={quiz.duration}
            onExpire={handleTimerExpire}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Question list */}
      <div className="questions-container">
        {quiz.questions?.map((question, qIdx) => {
          const selectedOption = answers[qIdx];

          return (
            <div key={qIdx} className="question-box">
              <div className="question-header">
                <span className="question-num">Question {qIdx + 1}</span>
                <span className="question-marks">{question.marks} mark{question.marks > 1 ? 's' : ''}</span>
              </div>

              <p className="question-text">{question.questionText}</p>

              <div className="options-list">
                {question.options?.map((option, optIdx) => {
                  const isChecked = selectedOption === optIdx;

                  return (
                    <label
                      key={optIdx}
                      className={`option-card ${isChecked ? 'option-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question_${qIdx}`}
                        value={optIdx}
                        checked={isChecked}
                        onChange={() => handleOptionSelect(qIdx, optIdx)}
                        disabled={submitting}
                      />
                      <span className="option-label">
                        <strong>{String.fromCharCode(65 + optIdx)}.</strong> {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="attempt-footer">
        <button
          onClick={() => handleSubmit(false)}
          className="btn btn-primary btn-large"
          disabled={submitting}
        >
          {submitting ? 'Submitting Answers...' : 'Submit Quiz Final Answers'}
        </button>
      </div>
    </div>
  );
}
