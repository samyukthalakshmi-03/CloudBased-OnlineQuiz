
import { useEffect, useState } from "react";
import {
  Search,
  BookOpen,
  Trophy,
  Target,
  Calendar,
  CheckCircle,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import "./Results.css";

const RESULTS_STORAGE = "quizcloud_results";
const USER_STORAGE = "quizcloud_current_user";

function getSavedResults() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(RESULTS_STORAGE) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem(USER_STORAGE) || "null"
    );
  } catch {
    return null;
  }
}

function formatDate(date) {
  if (!date) return "Recently";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Results() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [savedResults, setSavedResults] = useState(getSavedResults);
  const [currentUser, setCurrentUser] = useState(getCurrentUser);

  useEffect(() => {
    const loadResults = () => {
      setSavedResults(getSavedResults());
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener("focus", loadResults);
    window.addEventListener("storage", loadResults);

    return () => {
      window.removeEventListener("focus", loadResults);
      window.removeEventListener("storage", loadResults);
    };
  }, []);

  // Only show results belonging to the logged-in student.
  const myResults = savedResults.filter((result) => {
    if (!currentUser) return false;

    if (
      currentUser.email &&
      result.studentEmail &&
      currentUser.email.toLowerCase() ===
        result.studentEmail.toLowerCase()
    ) {
      return true;
    }

    if (
      currentUser.id &&
      result.studentId &&
      String(currentUser.id) === String(result.studentId)
    ) {
      return true;
    }

    return false;
  });

  const allResults = myResults.map((result, index) => {
    const percentage = Math.min(
      100,
      Math.max(0, Number(result.percentage) || 0)
    );

    return {
      ...result,
      id: result.id || `${result.quizId || "quiz"}-${index}`,
      title: result.title || "Untitled Quiz",
      subject: result.subject || "General",
      percentage,
      score:
        result.score ||
        `${result.earnedMarks || 0}/${result.totalMarks || 0}`,
      date: formatDate(result.submittedAt),
      status: "Completed",
    };
  });

  const filteredResults = allResults.filter((result) => {
    const query = search.toLowerCase();

    const matchesSearch =
      result.title.toLowerCase().includes(query) ||
      result.subject.toLowerCase().includes(query);

    const matchesSubject =
      subject === "All" || result.subject === subject;

    return matchesSearch && matchesSubject;
  });

  const completedCount = allResults.length;

  const averageScore =
    completedCount > 0
      ? Math.round(
          allResults.reduce(
            (total, result) => total + result.percentage,
            0
          ) / completedCount
        )
      : 0;

  const bestPerformance =
    completedCount > 0
      ? Math.max(
          ...allResults.map((result) => result.percentage)
        )
      : 0;

  const subjects = [
    ...new Set(
      allResults.map((result) => result.subject).filter(Boolean)
    ),
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main results-page">
        <div className="results-header">
          <div>
            <h1>My Results</h1>
            <p>
              Track your quiz performance and learning progress.
            </p>
          </div>
        </div>

        <section className="results-stats">
          <div className="results-stat-card">
            <div className="results-stat-icon purple">
              <BookOpen size={23} />
            </div>
            <span>Quizzes Completed</span>
            <h2>{completedCount}</h2>
          </div>

          <div className="results-stat-card">
            <div className="results-stat-icon green">
              <Target size={23} />
            </div>
            <span>Average Score</span>
            <h2>{averageScore}%</h2>
          </div>

          <div className="results-stat-card">
            <div className="results-stat-icon orange">
              <Trophy size={23} />
            </div>
            <span>Best Performance</span>
            <h2>{bestPerformance}%</h2>
          </div>
        </section>

        <section className="results-history">
          <div className="results-section-heading">
            <div>
              <h2>Quiz History</h2>
              <p>Review your previous quiz attempts.</p>
            </div>
          </div>

          <div className="results-filters">
            <div className="results-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search quizzes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>

              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Quiz Name</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id}>
                    <td className="result-quiz-name">
                      {result.title}
                    </td>

                    <td>{result.subject}</td>

                    <td>
                      <span className="result-date">
                        <Calendar size={14} />
                        {result.date}
                      </span>
                    </td>

                    <td className="result-score">
                      {result.score}
                    </td>

                    <td>
                      <div className="result-progress">
                        <div className="result-progress-track">
                          <div
                            className="result-progress-fill"
                            style={{
                              width: `${result.percentage}%`,
                            }}
                          />
                        </div>

                        <span>{result.percentage}%</span>
                      </div>
                    </td>

                    <td>
                      <span className="result-status">
                        <CheckCircle size={14} />
                        {result.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredResults.length === 0 && (
              <div className="results-empty">
                <Search size={30} />

                <h3>
                  {allResults.length === 0
                    ? "No quiz results yet"
                    : "No results found"}
                </h3>

                <p>
                  {allResults.length === 0
                    ? "Complete a quiz using your student account to see your results here."
                    : "Try another quiz name or subject."}
                </p>
              </div>
            )}
          </div>

          <p className="results-disclaimer">
            Your results are filtered using your logged-in student
            account. Data is currently stored in this browser.
            Backend integration is pending.
          </p>
        </section>
      </main>
    </div>
  );
}
