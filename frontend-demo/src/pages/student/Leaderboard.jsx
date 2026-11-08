
import { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  Search,
  TrendingUp,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import "./Leaderboard.css";

const RESULTS_KEY = "quizcloud_results";
const USER_KEY = "quizcloud_current_user";
const STUDENTS_KEY = "quizcloud_students";

function buildLeaderboard(results, registeredStudents) {
  const studentMap = new Map();

  results.forEach((result) => {
    if (!result || typeof result !== "object") return;

    const email = (result.studentEmail || "").toLowerCase().trim();
    const studentId = result.studentId;

    if (!email && !studentId) return;

    // Use email as the primary identity when available.
    const key = email || `id-${studentId}`;

    const registeredStudent = registeredStudents.find(
      (student) =>
        (email && student.email?.toLowerCase().trim() === email) ||
        (studentId && String(student.id) === String(studentId))
    );

    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: key,
        name:
          result.studentName ||
          registeredStudent?.name ||
          "Student",
        email,
        department:
          registeredStudent?.department ||
          result.department ||
          "Not specified",
        quizzes: 0,
        score: 0,
      });
    }

    const student = studentMap.get(key);

    student.quizzes += 1;

    const points = Number(
      result.earnedMarks ?? result.score ?? 0
    );

    student.score += Number.isFinite(points) ? points : 0;
  });

  return Array.from(studentMap.values()).sort(
    (a, b) =>
      b.score - a.score ||
      b.quizzes - a.quizzes ||
      a.name.localeCompare(b.name)
  );
}

export default function Leaderboard() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadLeaderboard = () => {
    try {
      const results = JSON.parse(
        localStorage.getItem(RESULTS_KEY) || "[]"
      );

      const registeredStudents = JSON.parse(
        localStorage.getItem(STUDENTS_KEY) || "[]"
      );

      const user = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      );

      setCurrentUser(user);

      setStudents(
        buildLeaderboard(
          Array.isArray(results) ? results : [],
          Array.isArray(registeredStudents)
            ? registeredStudents
            : []
        )
      );
    } catch (error) {
      console.error("Leaderboard loading error:", error);
      setStudents([]);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    window.addEventListener("focus", loadLeaderboard);
    window.addEventListener("storage", loadLeaderboard);

    return () => {
      window.removeEventListener("focus", loadLeaderboard);
      window.removeEventListener("storage", loadLeaderboard);
    };
  }, []);

  const currentStudent = students.find((student) => {
    if (!currentUser) return false;

    const userEmail = currentUser.email?.toLowerCase().trim();

    return (
      (userEmail && student.email === userEmail) ||
      (currentUser.id &&
        student.id === `id-${currentUser.id}`)
    );
  });

  const currentRank = currentStudent
    ? students.findIndex(
        (student) => student.id === currentStudent.id
      ) + 1
    : null;

  const filteredStudents = students
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }))
    .filter((student) => {
      const query = search.toLowerCase().trim();

      return (
        student.name.toLowerCase().includes(query) ||
        student.department.toLowerCase().includes(query)
      );
    });

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
              <span> of {students.length} students</span>
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
                Rankings based on accumulated quiz points.
              </p>
            </div>

            <span className="ranking-label">
              Overall Rankings
            </span>
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

          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Quizzes</th>
                  <th>Total Points</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const isCurrentStudent =
                    currentStudent?.id === student.id;

                  return (
                    <tr
                      key={student.id}
                      className={
                        isCurrentStudent ? "current-student" : ""
                      }
                    >
                      <td>
                        <span
                          className={`rank-number rank-${student.rank}`}
                        >
                          {student.rank <= 3 ? (
                            <Medal size={17} />
                          ) : (
                            `#${student.rank}`
                          )}
                        </span>
                      </td>

                      <td className="leaderboard-student-name">
                        {student.name}

                        {isCurrentStudent && (
                          <span className="you-label">You</span>
                        )}
                      </td>

                      <td>{student.department}</td>
                      <td>{student.quizzes}</td>

                      <td className="leaderboard-points">
                        {student.score} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="leaderboard-empty">
                {students.length === 0
                  ? "No quiz submissions available yet."
                  : "No students found."}
              </div>
            )}
          </div>

          <p className="leaderboard-note">
            Rankings are calculated from quiz submissions
            stored in this browser.
          </p>
        </section>
      </main>
    </div>
  );
}
