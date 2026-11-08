
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { quizzes, quizQuestions } from "../../data/mockData";
import "./QuizTaking.css";

const QUIZ_STORAGE = "quizcloud_quizzes";
const RESULTS_STORAGE = "quizcloud_results";
const CURRENT_USER_KEY = "quizcloud_current_user";

function getCorrectOption(question) {
  const answer = question.correctAnswer;

  if (typeof answer === "number") {
    return question.options[answer];
  }

  if (typeof answer === "string") {
    const letterIndex = ["A", "B", "C", "D"].indexOf(
      answer.trim().toUpperCase()
    );

    if (letterIndex !== -1) {
      return question.options[letterIndex];
    }

    return answer;
  }

  return null;
}

function calculateScore(questions, answers) {
  let earnedMarks = 0;
  let totalMarks = 0;

  questions.forEach((question) => {
    const marks = Number(question.marks) || 1;
    totalMarks += marks;

    const correctOption = getCorrectOption(question);

    if (
      correctOption !== null &&
      answers[question.id] === correctOption
    ) {
      earnedMarks += marks;
    }
  });

  const percentage =
    totalMarks > 0
      ? Math.round((earnedMarks / totalMarks) * 100)
      : 0;

  return {
    earnedMarks,
    totalMarks,
    percentage,
  };
}

export default function QuizTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const savedOnce = useRef(false);

  let facultyQuizzes = [];

  try {
    facultyQuizzes = JSON.parse(
      localStorage.getItem(QUIZ_STORAGE) || "[]"
    );
  } catch {
    facultyQuizzes = [];
  }

  const facultyQuiz = facultyQuizzes.find(
    (item) => String(item.id) === String(id)
  );

  const mockQuiz = quizzes.find(
    (item) => String(item.id) === String(id)
  );

  const quiz = facultyQuiz || mockQuiz;

  const questions = facultyQuiz
    ? Array.isArray(facultyQuiz.questions)
      ? facultyQuiz.questions
      : []
    : quizQuestions[id] || [];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(
    (Number(quiz?.duration) || 30) * 60
  );
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const score = calculateScore(questions, answers);
  const answeredCount = Object.keys(answers).length;

  const handleSubmit = () => {
    setShowConfirmation(false);
    setSubmitted(true);
  };

  // Automatically submit when the timer reaches zero.
  useEffect(() => {
    if (submitted || !quiz || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          setSubmitted(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, quiz, questions.length]);

  // Save the result with the logged-in student's identity.
  useEffect(() => {
    if (!submitted || !quiz || savedOnce.current) return;

    savedOnce.current = true;

    let currentUser = null;

    try {
      currentUser = JSON.parse(
        localStorage.getItem(CURRENT_USER_KEY) || "null"
      );
    } catch {
      currentUser = null;
    }

    const result = {
      id: `${quiz.id}-${Date.now()}`,
      quizId: quiz.id,
      title: quiz.title,
      subject: quiz.subject || "General",

      studentId: currentUser?.id || null,
      studentName: currentUser?.name || "Guest Student",
      studentEmail: currentUser?.email || null,

      earnedMarks: score.earnedMarks,
      totalMarks: score.totalMarks,
      score: `${score.earnedMarks}/${score.totalMarks}`,
      percentage: score.percentage,
      answeredCount,
      totalQuestions: questions.length,
      submittedAt: new Date().toISOString(),
      status: "Completed",
    };

    try {
      const existingResults = JSON.parse(
        localStorage.getItem(RESULTS_STORAGE) || "[]"
      );

      const results = Array.isArray(existingResults)
        ? existingResults
        : [];

      localStorage.setItem(
        RESULTS_STORAGE,
        JSON.stringify([result, ...results])
      );
    } catch (error) {
      console.error("Could not save quiz result:", error);
    }
  }, [
    submitted,
    quiz,
    score.earnedMarks,
    score.totalMarks,
    score.percentage,
    answeredCount,
    questions.length,
  ]);

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-error">
        <h2>Quiz not found</h2>
        <button onClick={() => navigate("/student/quizzes")}>
          Back to quizzes
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const selectAnswer = (option) => {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: option,
    }));
  };

  if (submitted) {
    return (
      <div className="quiz-completion">
        <div className="completion-icon">
          <CheckCircle size={42} />
        </div>

        <h1>Quiz Submitted!</h1>
        <p>Your quiz has been evaluated successfully.</p>

        <div className="completion-summary">
          <div>
            <span>Quiz</span>
            <strong>{quiz.title}</strong>
          </div>

          <div>
            <span>Marks Obtained</span>
            <strong>
              {score.earnedMarks} / {score.totalMarks}
            </strong>
          </div>

          <div>
            <span>Percentage</span>
            <strong>{score.percentage}%</strong>
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
          Your result has been saved with your student identity in this browser.
        </p>

        <button
          className="completion-button"
          onClick={() => navigate("/student/results")}
        >
          View My Results
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <header className="quiz-topbar">
        <div>
          <h2>QuizCloud</h2>
          <span>{quiz.title}</span>
        </div>

        <div className={`quiz-timer ${timeLeft < 300 ? "timer-warning" : ""}`}>
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
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
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

            <h2>{question.question}</h2>

            <p className="answer-instruction">
              Select one answer from the options below.
            </p>

            <div className="answer-options">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className={`answer-option ${
                    answers[question.id] === option ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => selectAnswer(option)}
                  />

                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
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
                  key={item.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={[
                    "question-number-button",
                    currentQuestion === index ? "current" : "",
                    answers[item.id] !== undefined ? "answered" : "",
                  ].join(" ")}
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
              onClick={() => setShowConfirmation(true)}
            >
              Submit Quiz
            </button>
          </aside>
        </div>
      </main>

      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-box">
            <AlertCircle size={36} />

            <h2>Submit your quiz?</h2>

            <p>
              You have answered {answeredCount} out of {questions.length}
              {" "}questions. Unanswered questions will remain blank.
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
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
