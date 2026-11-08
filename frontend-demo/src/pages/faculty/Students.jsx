
import { useEffect, useState } from "react";
import {
  Search,
  Users,
  Mail,
  BookOpen,
  Eye,
  UserPlus,
} from "lucide-react";
import "./Students.css";

const STUDENTS_KEY = "quizcloud_students";
const RESULTS_KEY = "quizcloud_results";
const QUIZZES_KEY = "quizcloud_quizzes";
const USER_KEY = "quizcloud_current_user";

function readStorage(key, fallback = []) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
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

export default function Students() {
  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(USER_KEY, null)
  );

  const [registeredStudents, setRegisteredStudents] = useState(() =>
    readStorage(STUDENTS_KEY)
  );

  const [results, setResults] = useState(() =>
    readStorage(RESULTS_KEY)
  );

  const [allQuizzes, setAllQuizzes] = useState(() =>
    readStorage(QUIZZES_KEY)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const refreshData = () => {
      setCurrentUser(readStorage(USER_KEY, null));
      setRegisteredStudents(readStorage(STUDENTS_KEY));
      setResults(readStorage(RESULTS_KEY));
      setAllQuizzes(readStorage(QUIZZES_KEY));
    };

    window.addEventListener("focus", refreshData);
    window.addEventListener("storage", refreshData);

    return () => {
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  const myQuizzes = allQuizzes.filter((quiz) =>
    belongsToFaculty(quiz, currentUser)
  );

  const myQuizIds = myQuizzes.map((quiz) => String(quiz.id));

  const myResults = results.filter((result) =>
    myQuizIds.includes(String(result.quizId))
  );

  const students = registeredStudents
    .map((student) => {
      const studentResults = myResults.filter(
        (result) =>
          result.studentEmail &&
          student.email &&
          result.studentEmail.toLowerCase() ===
            student.email.toLowerCase()
      );

      if (studentResults.length === 0) return null;

      const attemptedQuizIds = [
        ...new Set(
          studentResults.map((result) => String(result.quizId))
        ),
      ];

      return {
        ...student,
        year: student.year || "Not specified",
        quizzes: studentResults.length,
        uniqueQuizzes: attemptedQuizIds.length,
        status: student.status || "Active",
        isDemo: false,
        attempts: studentResults,
      };
    })
    .filter(Boolean);

  // Include result records even if the student registration
  // is unavailable, provided the submission has an email.
  const knownEmails = new Set(
    students.map((student) => student.email.toLowerCase())
  );

  const guestStudents = [];

  myResults.forEach((result) => {
    const email = result.studentEmail;

    if (!email || knownEmails.has(email.toLowerCase())) return;

    if (
      guestStudents.some(
        (student) => student.email.toLowerCase() === email.toLowerCase()
      )
    ) {
      return;
    }

    const studentAttempts = myResults.filter(
      (item) =>
        item.studentEmail &&
        item.studentEmail.toLowerCase() === email.toLowerCase()
    );

    guestStudents.push({
      id: result.studentId || email,
      name: result.studentName || "Registered Student",
      email,
      department: "Not specified",
      year: "Not specified",
      status: "Active",
      quizzes: studentAttempts.length,
      uniqueQuizzes: [
        ...new Set(studentAttempts.map((item) => String(item.quizId))),
      ].length,
      isDemo: false,
      attempts: studentAttempts,
    });
  });

  const allStudents = [...students, ...guestStudents];

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

  const totalAttempts = myResults.length;

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
            <p>
              Students who have attempted your quizzes
            </p>
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
                ? "No students have attempted your quizzes yet."
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
                <span>Status</span>
                <strong>{selectedStudent.status}</strong>
              </div>

              <div>
                <span>Account Type</span>
                <strong>Student Record</strong>
              </div>
            </div>

            <div className="students-attempt-history">
              <h3>Quiz Participation</h3>

              {selectedStudent.attempts.map((attempt, index) => {
                const quiz = myQuizzes.find(
                  (item) =>
                    String(item.id) === String(attempt.quizId)
                );

                return (
                  <div key={attempt.id || index}>
                    <strong>
                      {quiz?.title || attempt.title || "Quiz"}
                    </strong>
                    <span>
                      Score: {attempt.percentage ?? attempt.score ?? 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="students-demo-note">
        Student participation is calculated from attempts on your quizzes.
        Data is stored in browser localStorage. Backend integration is pending.
      </p>
    </div>
  );
}
