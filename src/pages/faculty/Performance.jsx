import { useEffect, useState } from "react";
import {
  Search,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  ArrowUpDown,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getFacultyQuizzes } from "../../services/quizService";
import { getQuizResults } from "../../services/resultService";
import LoadingSpinner from "../../components/LoadingSpinner";

import "./Performance.css";

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

function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value.toMillis === "function") {
    return new Date(value.toMillis());
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);

  return date ? date.toLocaleDateString("en-IN") : "—";
}

function formatTime(seconds) {
  const total = Number(seconds) || 0;
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);

  return `${mins}m ${secs}s`;
}

function percentage(score, totalMarks) {
  const total = Number(totalMarks) || 0;

  if (total <= 0) return 0;

  const value = ((Number(score) || 0) / total) * 100;

  return Math.min(Math.max(Math.round(value), 0), 100);
}

export default function Performance() {
  const { userProfile } = useAuth();

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("high");

  const [rows, setRows] = useState([]);
  const [quizSummaries, setQuizSummaries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const facultyId = userProfile?.uid;

    if (!facultyId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const quizzes = await getFacultyQuizzes(facultyId);

        const resultsByQuiz = await Promise.all(
          quizzes.map((quiz) => getQuizResults(quiz.id))
        );

        const aggregatedRows = [];

        const summaries = quizzes.map((quiz, index) => {
          const quizResults = resultsByQuiz[index] || [];
          const quizTotalMarks = Number(quiz.totalMarks) || 0;

          const percentages = quizResults.map((result) =>
            percentage(result.score, result.totalMarks || quizTotalMarks)
          );

          const times = quizResults.map(
            (result) => Number(result.timeTaken) || 0
          );

          quizResults.forEach((result) => {
            const totalMarks =
              Number(result.totalMarks) || quizTotalMarks;
            const scoreValue = percentage(result.score, totalMarks);

            aggregatedRows.push({
              displayId: result.id,
              quizId: quiz.id,
              title: quiz.title,
              subject: quiz.subject,
              studentId: result.studentId,
              studentName: result.studentName || "Guest Student",
              studentEmail: result.studentEmail || "Not linked",
              earnedMarks: Number(result.score) || 0,
              totalMarks,
              scoreValue,
              timeTaken: Number(result.timeTaken) || 0,
              status: getPerformanceStatus(scoreValue),
              submittedAt: result.submittedAt,
            });
          });

          return {
            id: quiz.id,
            title: quiz.title || "Untitled Quiz",
            subject: quiz.subject || "General",
            submissions: quizResults.length,
            average: percentages.length
              ? Math.round(
                  percentages.reduce((a, b) => a + b, 0) /
                    percentages.length
                )
              : 0,
            highest: percentages.length ? Math.max(...percentages) : 0,
            lowest: percentages.length ? Math.min(...percentages) : 0,
            averageTime: times.length
              ? Math.round(
                  times.reduce((a, b) => a + b, 0) / times.length
                )
              : 0,
          };
        });

        if (!active) return;

        setRows(aggregatedRows);
        setQuizSummaries(summaries);
      } catch (err) {
        console.error("Failed to load performance data:", err);

        if (active) {
          setError(
            "Failed to load performance data. Please try again later."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [userProfile?.uid]);

  if (loading) {
    return (
      <LoadingSpinner message="Loading performance analytics..." />
    );
  }

  const totalSubmissions = rows.length;

  const identifiedStudents = new Set(
    rows
      .filter(
        (result) =>
          result.studentEmail !== "Not linked" || result.studentId
      )
      .map((result) =>
        result.studentEmail !== "Not linked"
          ? result.studentEmail.toLowerCase()
          : String(result.studentId)
      )
  );

  const uniqueStudents = identifiedStudents.size;

  const averageScore =
    totalSubmissions > 0
      ? Math.round(
          rows.reduce((total, row) => total + row.scoreValue, 0) /
            totalSubmissions
        )
      : 0;

  const excellentCount = rows.filter(
    (row) => row.scoreValue >= 85
  ).length;

  const filteredResults = rows
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
          <p>Monitor submissions and performance across your quizzes.</p>
        </div>
      </header>

      {error && (
        <div className="performance-empty" role="alert">
          {error}
        </div>
      )}

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
            <h2>Quiz Performance Overview</h2>
            <p>
              Average, highest and lowest scores for each of your quizzes.
            </p>
          </div>
        </div>

        <div className="performance-table-wrapper">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Subject</th>
                <th>Submissions</th>
                <th>Average</th>
                <th>Highest</th>
                <th>Lowest</th>
                <th>Avg. Time</th>
              </tr>
            </thead>

            <tbody>
              {quizSummaries.map((quiz) => (
                <tr key={quiz.id}>
                  <td>
                    <strong>{quiz.title}</strong>
                  </td>

                  <td>{quiz.subject}</td>

                  <td>{quiz.submissions}</td>

                  <td>
                    <div className="performance-score">
                      <strong>{quiz.average}%</strong>
                      <div className="performance-progress">
                        <div
                          style={{
                            width: `${quiz.average}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>{quiz.highest}%</td>

                  <td>{quiz.lowest}%</td>

                  <td>{formatTime(quiz.averageTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {quizSummaries.length === 0 && (
            <div className="performance-empty">
              You haven't created any quizzes yet. Create a quiz to begin
              tracking student performance.
            </div>
          )}
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
                      className={`performance-status ${result.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
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
              {quizSummaries.length === 0
                ? "No quizzes created yet. Create a quiz to start collecting results."
                : rows.length === 0
                ? "No submissions for your quizzes yet. Results appear once students attempt your quizzes."
                : "No matching submissions found."}
            </div>
          )}
        </div>
      </section>

      <p className="performance-demo-note">
        Performance data is aggregated from submissions to the quizzes you
        created and loaded live from Firebase.
      </p>
    </div>
  );
}
