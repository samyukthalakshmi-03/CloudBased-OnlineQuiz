
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
import { useAuth } from "../../context/AuthContext";
import { getAvailableQuizzes } from "../../services/quizService";
import { getUserResults } from "../../services/resultService";

import "./StudentDashboard.css";

function percentOf(result) {
  const totalMarks = Number(result?.totalMarks) || 0;

  if (totalMarks <= 0) return 0;

  return Math.round(((Number(result?.score) || 0) / totalMarks) * 100);
}

function formatDate(timestamp) {
  if (!timestamp) return "Recently";

  const date = timestamp?.toDate?.();

  if (!date) return "Recently";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const { currentUser, userProfile } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const uid = userProfile?.uid || currentUser?.uid;

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [quizData, resultData] = await Promise.all([
          getAvailableQuizzes(),
          uid ? getUserResults(uid) : Promise.resolve([]),
        ]);

        if (!active) return;

        setQuizzes(Array.isArray(quizData) ? quizData : []);
        setResults(Array.isArray(resultData) ? resultData : []);
      } catch (err) {
        console.error("Error loading student dashboard:", err);

        if (active) {
          setError(
            "Failed to load dashboard data. Please try refreshing."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [uid]);

  const percentages = results.map(percentOf);

  const completedCount = results.length;

  const averageScore =
    completedCount > 0
      ? Math.round(
          percentages.reduce((total, value) => total + value, 0) /
            completedCount
        )
      : 0;

  const bestScore =
    completedCount > 0 ? Math.max(...percentages) : 0;

  const availableQuizzes = quizzes;

  const recentAttempts = [...results]
    .sort(
      (a, b) =>
        (b.submittedAt?.toMillis?.() || 0) -
        (a.submittedAt?.toMillis?.() || 0)
    )
    .slice(0, 5);

  const studentName = userProfile?.name || "Student";
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

        {error && <p className="dashboard-subtitle">{error}</p>}

        {loading ? (
          <p className="dashboard-subtitle">
            Loading your dashboard...
          </p>
        ) : (
          <>
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
                  const questionCount =
                    Number(quiz.questionCount) ||
                    (Array.isArray(quiz.questions)
                      ? quiz.questions.length
                      : 0);

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
                        <td>
                          {attempt.quizTitle ||
                            attempt.title ||
                            "Untitled Quiz"}
                        </td>

                        <td>{formatDate(attempt.submittedAt)}</td>

                        <td className="attempt-score">
                          {`${Number(attempt.score) || 0}/${
                            Number(attempt.totalMarks) || 0
                          }`}
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
          </>
        )}
      </main>
    </div>
  );
}
