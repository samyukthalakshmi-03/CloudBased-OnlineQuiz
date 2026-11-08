
import { useEffect, useState } from "react";
import {
  Search,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  ArrowUpDown,
} from "lucide-react";

import "./Performance.css";

const RESULTS_STORAGE = "quizcloud_results";
const QUIZZES_STORAGE = "quizcloud_quizzes";
const USER_STORAGE = "quizcloud_current_user";

function readStorage(key, fallback = []) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );

    return saved ?? fallback;
  } catch {
    return fallback;
  }
}

function belongsToFaculty(quiz, user) {
  if (!user) return false;

  const matchesId =
    user.id != null &&
    quiz.creatorId != null &&
    String(quiz.creatorId) === String(user.id);

  const matchesEmail =
    user.email &&
    quiz.creatorEmail &&
    quiz.creatorEmail.toLowerCase() === user.email.toLowerCase();

  return matchesId || matchesEmail;
}

function getPerformanceStatus(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

function getStudentInitials(name) {
  return (name || "Guest Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN");
}

export default function Performance() {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("high");

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(USER_STORAGE, null)
  );

  const [allResults, setAllResults] = useState(() =>
    readStorage(RESULTS_STORAGE)
  );

  const [allQuizzes, setAllQuizzes] = useState(() =>
    readStorage(QUIZZES_STORAGE)
  );

  useEffect(() => {
    const loadData = () => {
      setCurrentUser(readStorage(USER_STORAGE, null));
      setAllResults(readStorage(RESULTS_STORAGE));
      setAllQuizzes(readStorage(QUIZZES_STORAGE));
    };

    window.addEventListener("focus", loadData);
    window.addEventListener("storage", loadData);

    return () => {
      window.removeEventListener("focus", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  const myQuizzes = allQuizzes.filter((quiz) =>
    belongsToFaculty(quiz, currentUser)
  );

  const myQuizIds = myQuizzes.map((quiz) => String(quiz.id));

  const results = allResults.filter((result) =>
    myQuizIds.includes(String(result.quizId))
  );

  const totalSubmissions = results.length;

  const identifiedStudents = new Set(
    results
      .filter((result) => result.studentEmail || result.studentId)
      .map(
        (result) =>
          result.studentEmail?.toLowerCase() ||
          String(result.studentId)
      )
  );

  const uniqueStudents = identifiedStudents.size;

  const averageScore =
    totalSubmissions > 0
      ? Math.round(
          results.reduce(
            (total, result) =>
              total + (Number(result.percentage) || 0),
            0
          ) / totalSubmissions
        )
      : 0;

  const excellentCount = results.filter(
    (result) => Number(result.percentage) >= 85
  ).length;

  const quizPerformance = results.map((result, index) => {
    const scoreValue = Math.min(
      Math.max(Number(result.percentage) || 0, 0),
      100
    );

    return {
      ...result,
      displayId: result.id || `${result.quizId || "quiz"}-${index}`,
      studentName: result.studentName || "Guest Student",
      studentEmail: result.studentEmail || "Not linked",
      scoreValue,
      status: getPerformanceStatus(scoreValue),
    };
  });

  const filteredResults = quizPerformance
    .filter((result) => {
      const query = search.toLowerCase();

      return (
        result.studentName.toLowerCase().includes(query) ||
        result.studentEmail.toLowerCase().includes(query) ||
        (result.title || "").toLowerCase().includes(query) ||
        (result.subject || "").toLowerCase().includes(query)
      );
    })
    .sort((a, b) =>
      sortOrder === "high"
        ? b.scoreValue - a.scoreValue
        : a.scoreValue - b.scoreValue
    );

  return (
    <div className="performance-page">
      <header className="performance-header">
        <div>
          <h1>Student Performance</h1>
          <p>
            Monitor submissions and performance across your quizzes.
          </p>
        </div>
      </header>

      <section className="performance-stats">
        <div className="performance-stat-card">
          <div className="performance-stat-icon purple">
            <Users size={22} />
          </div>
          <div>
            <p>Unique Students</p>
            <h2>{uniqueStudents}</h2>
          </div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon blue">
            <TrendingUp size={22} />
          </div>
          <div>
            <p>Average Score</p>
            <h2>{averageScore}%</h2>
          </div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon green">
            <Award size={22} />
          </div>
          <div>
            <p>Excellent Attempts</p>
            <h2>{excellentCount}</h2>
          </div>
        </div>

        <div className="performance-stat-card">
          <div className="performance-stat-icon orange">
            <BookOpen size={22} />
          </div>
          <div>
            <p>My Submissions</p>
            <h2>{totalSubmissions}</h2>
          </div>
        </div>
      </section>

      <section className="performance-content">
        <div className="performance-section-heading">
          <div>
            <h2>Student Submission Report</h2>
            <p>
              View student details, quiz attempts and individual scores.
            </p>
          </div>
        </div>

        <div className="performance-toolbar">
          <div className="performance-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search student, email, quiz or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="performance-sort-btn"
            onClick={() =>
              setSortOrder(sortOrder === "high" ? "low" : "high")
            }
          >
            <ArrowUpDown size={16} />
            {sortOrder === "high" ? "Highest Score" : "Lowest Score"}
          </button>
        </div>

        <div className="performance-table-wrapper">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Quiz</th>
                <th>Subject</th>
                <th>Marks Obtained</th>
                <th>Percentage</th>
                <th>Performance</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.displayId}>
                  <td>
                    <div className="performance-student">
                      <div className="performance-avatar">
                        {getStudentInitials(result.studentName)}
                      </div>
                      <div>
                        <strong>{result.studentName}</strong>
                        <span>
                          {result.studentEmail === "Not linked"
                            ? "Identity unavailable"
                            : "Registered student"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{result.studentEmail}</td>

                  <td>
                    <strong>{result.title || "Untitled Quiz"}</strong>
                  </td>

                  <td>{result.subject || "General"}</td>

                  <td>
                    {result.earnedMarks ?? 0}/
                    {result.totalMarks ?? 0}
                  </td>

                  <td>
                    <div className="performance-score">
                      <strong>{result.scoreValue}%</strong>
                      <div className="performance-progress">
                        <div
                          style={{
                            width: `${result.scoreValue}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`performance-status ${
                        result.status.toLowerCase().replaceAll(" ", "-")
                      }`}
                    >
                      {result.status}
                    </span>
                  </td>

                  <td>{formatDate(result.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredResults.length === 0 && (
            <div className="performance-empty">
              {results.length === 0
                ? "No submissions for your quizzes yet."
                : "No matching submissions found."}
            </div>
          )}
        </div>
      </section>

      <p className="performance-demo-note">
        Performance data is filtered using your faculty quiz ownership.
        Data is stored in browser localStorage. Backend integration is pending.
      </p>
    </div>
  );
}
