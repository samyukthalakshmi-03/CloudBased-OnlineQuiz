import { useEffect, useState } from "react";
import {
  Search,
  Users,
  Mail,
  BookOpen,
  Eye,
  UserPlus,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getFacultyQuizzes } from "../../services/quizService";
import { getQuizResults } from "../../services/resultService";
import LoadingSpinner from "../../components/LoadingSpinner";

import "./Students.css";

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

function percentage(score, totalMarks) {
  const total = Number(totalMarks) || 0;

  if (total <= 0) return 0;

  const value = ((Number(score) || 0) / total) * 100;

  return Math.min(Math.max(Math.round(value), 0), 100);
}

export default function Students() {
  const { userProfile } = useAuth();

  const [students, setStudents] = useState([]);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState(null);

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

        const allResults = [];

        quizzes.forEach((quiz, index) => {
          const quizTotalMarks = Number(quiz.totalMarks) || 0;

          (resultsByQuiz[index] || []).forEach((result) => {
            const totalMarks =
              Number(result.totalMarks) || quizTotalMarks;

            allResults.push({
              id: result.id,
              quizId: quiz.id,
              quizTitle: quiz.title || "Quiz",
              studentId: result.studentId,
              studentName: result.studentName || "Registered Student",
              studentEmail: result.studentEmail || "",
              score: Number(result.score) || 0,
              totalMarks,
              pct: percentage(result.score, totalMarks),
              timeTaken: Number(result.timeTaken) || 0,
              submittedAt: result.submittedAt,
            });
          });
        });

        // Group submissions by unique student so each student is
        // listed once regardless of how many quizzes they attempted.
        const grouped = new Map();

        allResults.forEach((result) => {
          const key =
            result.studentId || result.studentEmail || result.id;

          if (!grouped.has(key)) {
            grouped.set(key, []);
          }

          grouped.get(key).push(result);
        });

        const studentList = [];

        grouped.forEach((attempts, key) => {
          const first = attempts[0];
          const percentages = attempts.map((item) => item.pct);

          let lastActivity = null;
          let lastActivityMs = 0;

          attempts.forEach((item) => {
            const date = toDate(item.submittedAt);
            const ms = date ? date.getTime() : 0;

            if (ms > lastActivityMs) {
              lastActivityMs = ms;
              lastActivity = item.submittedAt;
            }
          });

          studentList.push({
            id: key,
            name: first.studentName,
            email: first.studentEmail || "Not linked",
            department: "Not specified",
            year: "Not specified",
            status: "Active",
            quizzes: attempts.length,
            uniqueQuizzes: new Set(
              attempts.map((item) => String(item.quizId))
            ).size,
            averageScore: Math.round(
              percentages.reduce((a, b) => a + b, 0) /
                percentages.length
            ),
            bestScore: Math.max(...percentages),
            lastActivity,
            attempts,
          });
        });

        studentList.sort((a, b) => a.name.localeCompare(b.name));

        if (!active) return;

        setStudents(studentList);
        setTotalAttempts(allResults.length);
      } catch (err) {
        console.error("Failed to load students:", err);

        if (active) {
          setError("Failed to load students. Please try again later.");
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

  const allStudents = students;

  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase()) ||
      (student.department || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = allStudents.filter(
    (student) => student.status === "Active"
  ).length;

  if (loading || authLoading) {
    return <LoadingSpinner message="Loading students..." />;
  }

  return (
    <div className="faculty-students-page">
      <header className="students-header">
        <div>
          <h1>Students</h1>
          <p>View students participating in your quizzes.</p>
        </div>

        <div className="students-count-badge">
          <Users size={17} />
          {allStudents.length} Students
        </div>
      </header>

      {error && (
        <div className="students-empty" role="alert">
          {error}
        </div>
      )}

      <section className="students-summary">
        <div className="students-summary-card">
          <div className="students-summary-icon purple">
            <Users size={21} />
          </div>
          <div>
            <p>My Students</p>
            <h2>{allStudents.length}</h2>
          </div>
        </div>

        <div className="students-summary-card">
          <div className="students-summary-icon green">
            <UserPlus size={21} />
          </div>
          <div>
            <p>Active Students</p>
            <h2>{activeCount}</h2>
          </div>
        </div>

        <div className="students-summary-card">
          <div className="students-summary-icon orange">
            <BookOpen size={21} />
          </div>
          <div>
            <p>My Quiz Attempts</p>
            <h2>{totalAttempts}</h2>
          </div>
        </div>
      </section>

      <section className="students-content">
        <div className="students-section-heading">
          <div>
            <h2>Student Directory</h2>
            <p>Students who have attempted your quizzes</p>
          </div>
        </div>

        <div className="students-toolbar">
          <div className="students-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Students</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="students-table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th>Academic Year</th>
                <th>Quiz Attempts</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="students-person">
                      <div className="students-avatar">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>{student.department}</td>
                  <td>{student.year}</td>
                  <td>{student.quizzes}</td>

                  <td>
                    <span
                      className={`students-status ${student.status.toLowerCase()}`}
                    >
                      {student.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="students-view-btn"
                      onClick={() => setSelectedStudent(student)}
                      title={`View ${student.name}`}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="students-empty">
              {allStudents.length === 0
                ? "No students have attempted your quizzes yet. Students will appear here once they submit an attempt."
                : "No students found. Try another search."}
            </div>
          )}
        </div>
      </section>

      {selectedStudent && (
        <div
          className="students-modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="students-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="students-modal-close"
              onClick={() => setSelectedStudent(null)}
            >
              ×
            </button>

            <div className="students-modal-avatar">
              {selectedStudent.name.charAt(0).toUpperCase()}
            </div>

            <h2>{selectedStudent.name}</h2>

            <p className="students-modal-email">
              <Mail size={15} />
              {selectedStudent.email}
            </p>

            <div className="students-modal-details">
              <div>
                <span>Department</span>
                <strong>{selectedStudent.department}</strong>
              </div>

              <div>
                <span>Academic Year</span>
                <strong>{selectedStudent.year}</strong>
              </div>

              <div>
                <span>Total Attempts</span>
                <strong>{selectedStudent.quizzes}</strong>
              </div>

              <div>
                <span>Different Quizzes</span>
                <strong>{selectedStudent.uniqueQuizzes}</strong>
              </div>

              <div>
                <span>Average Score</span>
                <strong>{selectedStudent.averageScore}%</strong>
              </div>

              <div>
                <span>Best Score</span>
                <strong>{selectedStudent.bestScore}%</strong>
              </div>

              <div>
                <span>Last Activity</span>
                <strong>{formatDate(selectedStudent.lastActivity)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedStudent.status}</strong>
              </div>
            </div>

            <div className="students-attempt-history">
              <h3>Quiz Participation</h3>

              {selectedStudent.attempts.map((attempt, index) => (
                <div key={attempt.id || index}>
                  <strong>{attempt.quizTitle || "Quiz"}</strong>
                  <span>Score: {attempt.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="students-demo-note">
        Student participation is calculated from attempts on the quizzes you
        created and loaded live from Firebase.
      </p>
    </div>
  );
}
