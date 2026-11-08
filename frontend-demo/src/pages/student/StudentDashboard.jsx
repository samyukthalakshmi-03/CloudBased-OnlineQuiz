
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  Clock,
  ChartNoAxesColumnIncreasing,
  ArrowUpRight,
  CalendarDays,
  Bell,
  Search,
  Trophy,
  Target,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { quizzes as mockQuizzes } from "../../data/mockData";

import "./StudentDashboard.css";

const RESULTS_STORAGE = "quizcloud_results";
const USER_STORAGE = "quizcloud_current_user";
const QUIZ_STORAGE = "quizcloud_quizzes";

function readStorage(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return saved ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDate(date) {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Recently";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(USER_STORAGE, null)
  );

  const [allResults, setAllResults] = useState(() =>
    readStorage(RESULTS_STORAGE, [])
  );

  const [facultyQuizzes, setFacultyQuizzes] = useState(() =>
    readStorage(QUIZ_STORAGE, [])
  );

  useEffect(() => {
    const refreshDashboard = () => {
      setCurrentUser(readStorage(USER_STORAGE, null));
      setAllResults(readStorage(RESULTS_STORAGE, []));
      setFacultyQuizzes(readStorage(QUIZ_STORAGE, []));
    };

    window.addEventListener("focus", refreshDashboard);
    window.addEventListener("storage", refreshDashboard);

    return () => {
      window.removeEventListener("focus", refreshDashboard);
      window.removeEventListener("storage", refreshDashboard);
    };
  }, []);

  const myResults = (Array.isArray(allResults) ? allResults : []).filter(
    (result) => {
      if (!currentUser || !result) return false;

      const emailMatch =
        currentUser.email &&
        result.studentEmail &&
        currentUser.email.toLowerCase() ===
          result.studentEmail.toLowerCase();

      const idMatch =
        currentUser.id &&
        result.studentId &&
        String(currentUser.id) === String(result.studentId);

      return emailMatch || idMatch;
    }
  );

  const completedCount = myResults.length;

  const averageScore =
    completedCount > 0
      ? Math.round(
          myResults.reduce(
            (total, result) =>
              total + (Number(result.percentage) || 0),
            0
          ) / completedCount
        )
      : 0;

  const bestScore =
    completedCount > 0
      ? Math.max(
          ...myResults.map(
            (result) => Number(result.percentage) || 0
          )
        )
      : 0;

  const publishedQuizzes = (
    Array.isArray(facultyQuizzes) ? facultyQuizzes : []
  ).filter(
    (quiz) =>
      quiz.status === "Published" || quiz.status === "Active"
  );

  const availableQuizzes = [
    ...(Array.isArray(mockQuizzes) ? mockQuizzes : []),
    ...publishedQuizzes,
  ].filter(
    (quiz, index, array) =>
      quiz.id &&
      array.findIndex(
        (item) => String(item.id) === String(quiz.id)
      ) === index
  );

  const recentAttempts = [...myResults]
    .sort(
      (a, b) =>
        new Date(b.submittedAt || 0) -
        new Date(a.submittedAt || 0)
    )
    .slice(0, 5);

  const studentName = currentUser?.name || "Student";
  const firstLetter = studentName.charAt(0).toUpperCase();

  const stats = [
    {
      title: "Quizzes Completed",
      value: completedCount,
      icon: BookOpen,
      color: "purple",
    },
    {
      title: "Average Score",
      value: `${averageScore}%`,
      icon: ChartNoAxesColumnIncreasing,
      color: "blue",
    },
    {
      title: "Best Performance",
      value: `${bestScore}%`,
      icon: Trophy,
      color: "green",
    },
    {
      title: "Available Quizzes",
      value: availableQuizzes.length,
      icon: Target,
      color: "orange",
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-date">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <h1>Welcome back, {studentName}! 👋</h1>

            <p className="dashboard-subtitle">
              Here's what's happening with your learning today.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="header-icon"
              aria-label="Search quizzes"
              onClick={() => navigate("/student/quizzes")}
            >
              <Search size={20} />
            </button>

            <button
              className="header-icon"
              aria-label="Notifications"
              title="No new notifications"
            >
              <Bell size={20} />
            </button>

            <div className="profile-avatar">
              {firstLetter}
            </div>
          </div>
        </header>

        <section className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="stat-card" key={stat.title}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>

                <p>{stat.title}</p>
                <h2>{stat.value}</h2>
                <span>Learning overview</span>
              </div>
            );
          })}
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Available Quizzes</h2>
              <p>Continue learning and test your knowledge.</p>
            </div>

            <Link to="/student/quizzes" className="view-all">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="quiz-grid">
            {availableQuizzes.slice(0, 3).map((quiz) => {
              const questionCount = Array.isArray(quiz.questions)
                ? quiz.questions.length
                : Number(quiz.questions) || 0;

              const difficulty = quiz.difficulty || "Medium";

              return (
                <article className="quiz-card" key={quiz.id}>
                  <div className="quiz-card-top">
                    <span className="quiz-subject">
                      {quiz.subject || "General"}
                    </span>
                    <BookOpen size={21} />
                  </div>

                  <h3>{quiz.title}</h3>

                  <div className="quiz-meta">
                    <span>
                      <BookOpen size={15} />
                      {questionCount} Questions
                    </span>

                    <span>
                      <Clock size={15} />
                      {quiz.duration || 0} min
                    </span>
                  </div>

                  <div className="quiz-card-bottom">
                    <span
                      className={`difficulty ${difficulty.toLowerCase()}`}
                    >
                      {difficulty}
                    </span>

                    <Link
                      to={`/student/quiz/${quiz.id}`}
                      className="start-quiz"
                    >
                      Start Quiz <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}

            {availableQuizzes.length === 0 && (
              <p>No quizzes are available right now.</p>
            )}
          </div>
        </section>

        <section className="dashboard-section recent-section">
          <div className="section-heading">
            <div>
              <h2>Recent Attempts</h2>
              <p>Track your recent quiz activity.</p>
            </div>

            <Link to="/student/results" className="view-all">
              View results <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="attempt-table-wrapper">
            <table className="attempt-table">
              <thead>
                <tr>
                  <th>Quiz Name</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentAttempts.map((attempt, index) => (
                  <tr key={attempt.id || `${attempt.quizId}-${index}`}>
                    <td>{attempt.title || "Untitled Quiz"}</td>

                    <td>{formatDate(attempt.submittedAt)}</td>

                    <td className="attempt-score">
                      {attempt.score ??
                        `${attempt.earnedMarks || 0}/${attempt.totalMarks || 0}`}
                    </td>

                    <td>
                      <span className="completed-badge">
                        <CheckCircle size={14} />
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {recentAttempts.length === 0 && (
              <div className="results-empty">
                <BookOpen size={28} />
                <h3>No quiz attempts yet</h3>
                <p>Complete your first quiz to see your activity here.</p>
                <Link to="/student/quizzes" className="view-all">
                  Explore quizzes <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
