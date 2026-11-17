
import { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  Search,
  TrendingUp,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { getAvailableQuizzes } from "../../services/quizService";
import { getLeaderboard } from "../../services/resultService";
import "./Leaderboard.css";

function formatTime(seconds) {
  const total = Number(seconds) || 0;
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;

  return `${minutes}m ${remainder}s`;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Leaderboard() {
  const { userProfile } = useAuth();

  const [search, setSearch] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadQuizzes = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAvailableQuizzes();

        if (!active) return;

        const available = Array.isArray(data) ? data : [];
        setQuizzes(available);
        setSelectedQuizId(available.length > 0 ? available[0].id : "");

        if (available.length === 0) {
          setEntries([]);
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "[Leaderboard] Failed to load available quizzes:",
          err
        );

        if (active) {
          setError("Failed to load quizzes. Please try again.");
          setQuizzes([]);
          setEntries([]);
          setLoading(false);
        }
      }
    };

    loadQuizzes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLeaderboard = async () => {
      if (!selectedQuizId) {
        setEntries([]);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getLeaderboard(selectedQuizId);

        if (active) {
          setEntries(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(
          "[Leaderboard] Failed to load leaderboard:",
          err
        );

        if (active) {
          setError("Failed to load leaderboard data.");
          setEntries([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, [selectedQuizId]);

  const currentStudent = entries.find(
    (entry) => entry.studentName === userProfile?.name
  );

  const currentRank = currentStudent ? currentStudent.rank : null;

  const filteredEntries = entries.filter((entry) =>
    (entry.studentName || "")
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main leaderboard-page">
        <div className="leaderboard-header">
          <div>
            <h1>Leaderboard</h1>
            <p>Discover top performers and track your ranking.</p>
          </div>

          <div className="leaderboard-heading-icon">
            <Trophy size={28} />
          </div>
        </div>

        <section className="leaderboard-highlight">
          <div>
            <span className="highlight-label">
              Your Current Position
            </span>

            <h2>
              {currentRank ? `#${currentRank}` : "Not Ranked"}
              <span> of {entries.length} students</span>
            </h2>

            <p>
              <TrendingUp size={16} />
              {currentRank
                ? "Keep learning and improve your rank!"
                : "Complete a quiz to appear on the leaderboard."}
            </p>
          </div>

          <div className="highlight-trophy">
            <Trophy size={48} />
          </div>
        </section>

        <section className="leaderboard-card">
          <div className="leaderboard-card-heading">
            <div>
              <h2>Top Students</h2>
              <p>
                Rankings based on quiz performance.
              </p>
            </div>

            <span className="ranking-label">
              Overall Rankings
            </span>
          </div>

          <div className="leaderboard-search">
            <Trophy size={18} />

            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                padding: "13px 0",
                fontSize: 13,
                color: "#45455c",
                cursor: "pointer",
              }}
            >
              {quizzes.length === 0 && (
                <option value="">No quizzes available</option>
              )}

              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>

          <div className="leaderboard-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading && (
            <div className="leaderboard-empty">
              Loading leaderboard...
            </div>
          )}

          {!loading && error && (
            <div className="leaderboard-empty">{error}</div>
          )}

          {!loading && !error && (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Time Taken</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEntries.map((entry) => {
                    const isCurrentStudent =
                      currentStudent?.id === entry.id;

                    return (
                      <tr
                        key={entry.id}
                        className={
                          isCurrentStudent ? "current-student" : ""
                        }
                      >
                        <td>
                          <span
                            className={`rank-number rank-${entry.rank}`}
                          >
                            {entry.rank <= 3 ? (
                              <Medal size={17} />
                            ) : (
                              `#${entry.rank}`
                            )}
                          </span>
                        </td>

                        <td className="leaderboard-student-name">
                          {entry.studentName}

                          {isCurrentStudent && (
                            <span className="you-label">You</span>
                          )}
                        </td>

                        <td className="leaderboard-points">
                          {entry.score}/{entry.totalMarks}
                        </td>

                        <td>{formatTime(entry.timeTaken)}</td>

                        <td>{formatDate(entry.submittedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredEntries.length === 0 && (
                <div className="leaderboard-empty">
                  {entries.length === 0
                    ? "No quiz submissions available yet."
                    : "No students found."}
                </div>
              )}
            </div>
          )}

          <p className="leaderboard-note">
            Rankings reflect official quiz submissions for the
            selected quiz.
          </p>
        </section>
      </main>
    </div>
  );
}
