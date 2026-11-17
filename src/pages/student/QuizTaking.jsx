import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getQuizById } from '../../services/quizService';
import { getUserResults, submitQuiz } from '../../services/resultService';
import './QuizTaking.css';

export default function QuizTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState(null);

  const submittedRef = useRef(false);
  const answersRef = useRef({});
  const timeLeftRef = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Load the sanitized quiz and detect prior submissions.
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError('');

      try {
        const quizData = await getQuizById(id);

        if (!active) return;

        if (!quizData) {
          setLoadError('Quiz not found.');
          setLoading(false);
          return;
        }

        const quizQuestions = Array.isArray(quizData.questions)
          ? quizData.questions
          : [];

        setQuiz(quizData);
        setQuestions(quizQuestions);
        setTimeLeft((Number(quizData.duration) || 30) * 60);

        if (currentUser?.uid) {
          const myResults = await getUserResults(currentUser.uid);
          if (!active) return;

          const existing = myResults.find(
            (item) => String(item.quizId) === String(id)
          );

          if (existing) {
            setAlreadyCompleted(true);
          }
        }
      } catch (err) {
        console.error('Unable to load quiz:', err);
        if (active) {
          setLoadError(
            err?.code === 'permission-denied'
              ? 'This quiz is not available.'
              : 'Unable to load this quiz. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, currentUser?.uid]);

  const handleSubmit = async () => {
    if (submittedRef.current || submitting) return;

    setShowConfirmation(false);
    setSubmitting(true);
    setSubmitError('');

    // Time taken in whole seconds, based on the authoritative duration.
    const totalSeconds = (Number(quiz?.duration) || 30) * 60;
    const remaining = Math.max(0, Math.round(timeLeftRef.current));
    const timeTaken = Math.max(0, totalSeconds - remaining);

    try {
      const serverResult = await submitQuiz(
        id,
        answersRef.current,
        timeTaken
      );

      submittedRef.current = true;
      setResult(serverResult);
    } catch (err) {
      console.error('Quiz submission failed:', err);
      setSubmitError(
        err.message || 'Unable to submit the quiz. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown timer with automatic submission at zero.
  useEffect(() => {
    if (loading || loadError || alreadyCompleted) return;
    if (result || submitting) return;
    if (questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadError, alreadyCompleted, result, submitting, questions.length]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds
    ).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="quiz-error">
        <h2>Loading quiz...</h2>
      </div>
    );
  }

  if (loadError || !quiz || questions.length === 0) {
    return (
      <div className="quiz-error">
        <h2>{loadError || 'Quiz not found'}</h2>
        <button onClick={() => navigate('/student/quizzes')}>
          Back to quizzes
        </button>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="quiz-completion">
        <div className="completion-icon">
          <CheckCircle size={42} />
        </div>

        <h1>Quiz Already Completed</h1>
        <p>You have already attempted and submitted this quiz.</p>

        <button
          className="completion-button"
          onClick={() => navigate('/student/results')}
        >
          View My Results
        </button>
      </div>
    );
  }

  if (result) {
    const percentage =
      result.totalMarks > 0
        ? Math.round((result.score / result.totalMarks) * 100)
        : 0;

    const answeredCount = Object.keys(result.answers || {}).length;

    return (
      <div className="quiz-completion">
        <div className="completion-icon">
          <CheckCircle size={42} />
        </div>

        <h1>Quiz Submitted!</h1>
        <p>Your quiz was graded securely on the server.</p>

        <div className="completion-summary">
          <div>
            <span>Quiz</span>
            <strong>{result.quizTitle || quiz.title}</strong>
          </div>

          <div>
            <span>Marks Obtained</span>
            <strong>
              {result.score} / {result.totalMarks}
            </strong>
          </div>

          <div>
            <span>Percentage</span>
            <strong>{percentage}%</strong>
          </div>

          <div>
            <span>Questions Answered</span>
            <strong>
              {answeredCount} / {questions.length}
            </strong>
          </div>

          <div>
            <span>Submission Status</span>
            <strong>Completed</strong>
          </div>
        </div>

        <p className="completion-note">
          Your result has been recorded and is available in your results
          history and the quiz leaderboard.
        </p>

        <button
          className="completion-button"
          onClick={() => navigate('/student/results')}
        >
          View My Results
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (optionIndex) => {
    setAnswers((previous) => ({
      ...previous,
      [question.questionIndex]: optionIndex
    }));
  };

  return (
    <div className="quiz-page">
      <header className="quiz-topbar">
        <div>
          <h2>QuizCloud</h2>
          <span>{quiz.title}</span>
        </div>

        <div
          className={`quiz-timer ${
            timeLeft < 300 ? 'timer-warning' : ''
          }`}
        >
          <Clock size={19} />
          <div>
            <small>Time Remaining</small>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
        </div>
      </header>

      <main className="quiz-content">
        <div className="quiz-progress-heading">
          <div>
            <span>
              QUESTION {currentQuestion + 1} OF {questions.length}
            </span>
            <h1>{quiz.title}</h1>
          </div>

          <div className="answered-count">
            {answeredCount} of {questions.length} answered
          </div>
        </div>

        <div className="quiz-progress-track">
          <div
            className="quiz-progress-fill"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`
            }}
          />
        </div>

        <div className="quiz-workspace">
          <section className="question-panel">
            <div className="question-number">
              Question {currentQuestion + 1}
              <span>
                {currentQuestion + 1} / {questions.length}
              </span>
            </div>

            <h2>{question.questionText}</h2>

            <p className="answer-instruction">
              Select one answer from the options below.
            </p>

            <div className="answer-options">
              {question.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`answer-option ${
                    answers[question.questionIndex] === optionIndex
                      ? 'selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.questionIndex}`}
                    value={optionIndex}
                    checked={
                      answers[question.questionIndex] === optionIndex
                    }
                    onChange={() => selectAnswer(optionIndex)}
                  />

                  <span className="option-letter">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>

                  <span>{option}</span>
                </label>
              ))}
            </div>

            <div className="question-navigation">
              <button
                className="previous-button"
                disabled={currentQuestion === 0}
                onClick={() =>
                  setCurrentQuestion((previous) => previous - 1)
                }
              >
                <ChevronLeft size={18} />
                Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  className="next-button"
                  onClick={() =>
                    setCurrentQuestion((previous) => previous + 1)
                  }
                >
                  Next Question
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  className="submit-button"
                  disabled={submitting}
                  onClick={() => setShowConfirmation(true)}
                >
                  <Send size={17} />
                  Submit Quiz
                </button>
              )}
            </div>
          </section>

          <aside className="question-sidebar">
            <h3>Question Navigator</h3>
            <p>Click a number to visit that question.</p>

            <div className="question-number-grid">
              {questions.map((item, index) => (
                <button
                  key={item.questionIndex}
                  onClick={() => setCurrentQuestion(index)}
                  className={[
                    'question-number-button',
                    currentQuestion === index ? 'current' : '',
                    answers[item.questionIndex] !== undefined
                      ? 'answered'
                      : ''
                  ].join(' ')}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="navigator-legend">
              <span><i className="legend-current" /> Current</span>
              <span><i className="legend-answered" /> Answered</span>
              <span><i className="legend-unanswered" /> Unanswered</span>
            </div>

            <div className="navigator-summary">
              <Flag size={18} />
              <span>
                {questions.length - answeredCount} questions remaining
              </span>
            </div>

            <button
              className="sidebar-submit"
              disabled={submitting}
              onClick={() => setShowConfirmation(true)}
            >
              Submit Quiz
            </button>
          </aside>
        </div>
      </main>

      {submitError && (
        <div className="confirmation-overlay">
          <div className="confirmation-box">
            <AlertCircle size={36} />

            <h2>Submission failed</h2>
            <p>{submitError}</p>

            <div className="confirmation-actions">
              <button
                className="cancel-submit"
                onClick={() => setSubmitError('')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-box">
            <AlertCircle size={36} />

            <h2>Submit your quiz?</h2>

            <p>
              You have answered {answeredCount} out of {questions.length}
              {' '}questions. Unanswered questions will remain blank.
            </p>

            <div className="confirmation-actions">
              <button
                className="cancel-submit"
                onClick={() => setShowConfirmation(false)}
              >
                Continue Quiz
              </button>

              <button
                className="confirm-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
