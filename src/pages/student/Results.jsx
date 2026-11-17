
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
import { useAuth } from "../../context/AuthContext";
import { getUserResults } from "../../services/resultService";
import "./Results.css";

function formatDate(timestamp) {
  if (!timestamp) return "Recently";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(seconds) {
  const total = Number(seconds) || 0;
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;

  return `${minutes}m ${remainder}s`;
}

export default function Results() {
  const { userProfile } = useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadResults = async () => {
      if (!userProfile?.uid) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getUserResults(userProfile.uid);

        if (active) {
          setResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(
          "[Results] Failed to load student results:",
          err
        );

        if (active) {
          setError(
            "We couldn't load your quiz results. Please try again."
          );
          setResults([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      active = false;
    };
  }, [userProfile]);

  const allResults = results.map((result, index) => {
    const totalMarks = Number(result.totalMarks) || 0;
    const score = Number(result.score) || 0;
    const percentage =
      totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    return {
      id: result.id || `${result.quizId || "quiz"}-${index}`,
      title: result.quizTitle || "Untitled Quiz",
      date: formatDate(result.submittedAt),
      score,
      totalMarks,
      scoreLabel: `${score}/${totalMarks}`,
      percentage,
      time: formatTime(result.timeTaken),
      status: "Completed",
    };
  });

  const filteredResults = allResults.filter((result) =>
    result.title.toLowerCase().includes(search.toLowerCase())
  );

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

        {loading && (
          <div className="results-empty">
            <BookOpen size={30} />
            <h3>Loading your results...</h3>
            <p>Fetching your completed quiz attempts.</p>
          </div>
        )}

        {!loading && error && (
          <div className="results-empty">
            <Search size={30} />
            <h3>Unable to load results</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
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
              </div>

              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Quiz Name</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Time Taken</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={result.id}>
                        <td className="result-quiz-name">
                          {result.title}
                        </td>

                        <td>
                          <span className="result-date">
                            <Calendar size={14} />
                            {result.date}
                          </span>
                        </td>

                        <td className="result-score">
                          {result.scoreLabel}
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

                        <td>{result.time}</td>

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
                        : "Try another quiz name."}
                    </p>
                  </div>
                )}
              </div>

              <p className="results-disclaimer">
                Your results are loaded securely from your student
                account.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
