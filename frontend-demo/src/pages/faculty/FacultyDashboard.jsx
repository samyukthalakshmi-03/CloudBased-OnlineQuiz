
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  ClipboardList,
  Award,
  GraduationCap,
  PlusCircle,
} from "lucide-react";

const STORAGE_KEYS = {
  students: "quizcloud_students",
  quizzes: "quizcloud_quizzes",
  results: "quizcloud_results",
  currentUser: "quizcloud_current_user",
};

function readStorage(key, fallback = []) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );

    return saved;
  } catch {
    return fallback;
  }
}

function getDashboardData(currentUser) {
  const students = readStorage(STORAGE_KEYS.students);
  const allQuizzes = readStorage(STORAGE_KEYS.quizzes);
  const allResults = readStorage(STORAGE_KEYS.results);

  const validStudents = Array.isArray(students) ? students : [];
  const validQuizzes = Array.isArray(allQuizzes) ? allQuizzes : [];
  const validResults = Array.isArray(allResults) ? allResults : [];

  // Identify quizzes belonging to the logged-in faculty.
  const facultyQuizzes = validQuizzes.filter((quiz) => {
    // New quizzes have creatorId and creatorEmail.
    const matchesId =
      currentUser?.id != null &&
      quiz.creatorId != null &&
      String(quiz.creatorId) === String(currentUser.id);

    const matchesEmail =
      currentUser?.email &&
      quiz.creatorEmail &&
      quiz.creatorEmail.toLowerCase() === currentUser.email.toLowerCase();

    return matchesId || matchesEmail;
  });

  // Get submissions only for this faculty's quizzes.
  const facultyQuizIds = new Set(
    facultyQuizzes.map((quiz) => String(quiz.id))
  );

  const facultyResults = validResults.filter((result) =>
    facultyQuizIds.has(String(result.quizId))
  );

  // Calculate average score for this faculty's submissions.
  const percentages = facultyResults
    .map((result) => {
      const percentage = Number(result.percentage);

      if (
        result.percentage !== undefined &&
        result.percentage !== null &&
        result.percentage !== "" &&
        Number.isFinite(percentage)
      ) {
        return percentage;
      }

      const total = Number(result.totalMarks);
      const earned = Number(result.earnedMarks);

      if (total > 0 && Number.isFinite(earned)) {
        return (earned / total) * 100;
      }

      return null;
    })
    .filter((value) => value !== null);

  const averageScore =
    percentages.length > 0
      ? Math.round(
          percentages.reduce((sum, score) => sum + score, 0) /
            percentages.length
        )
      : 0;

  // Get the five most recently created quizzes.
  const recentQuizzes = [...facultyQuizzes]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      return dateB - dateA;
    })
    .slice(0, 5)
    .map((quiz) => {
      const quizResults = facultyResults.filter(
        (result) => String(result.quizId) === String(quiz.id)
      );

      const status =
        quiz.status === "Active"
          ? "Published"
          : quiz.status || "Draft";

      return {
        ...quiz,
        submissions: quizResults.length,
        status,
      };
    });

  return {
    students: validStudents.length,
    quizzes: facultyQuizzes.length,
    submissions: facultyResults.length,
    averageScore,
    recentQuizzes,
  };
}

export default function FacultyDashboard() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(STORAGE_KEYS.currentUser, null)
  );

  const [dashboard, setDashboard] = useState(() =>
    getDashboardData(readStorage(STORAGE_KEYS.currentUser, null))
  );

  useEffect(() => {
    const refreshDashboard = () => {
      const user = readStorage(STORAGE_KEYS.currentUser, null);

      setCurrentUser(user);
      setDashboard(getDashboardData(user));
    };

    window.addEventListener("focus", refreshDashboard);
    window.addEventListener("storage", refreshDashboard);

    return () => {
      window.removeEventListener("focus", refreshDashboard);
      window.removeEventListener("storage", refreshDashboard);
    };
  }, []);

  const stats = [
    {
      title: "My Quizzes",
      value: dashboard.quizzes,
      icon: BookOpen,
      color: "purple",
    },
    {
      title: "Total Students",
      value: dashboard.students,
      icon: Users,
      color: "blue",
    },
    {
      title: "My Submissions",
      value: dashboard.submissions,
      icon: ClipboardList,
      color: "green",
    },
    {
      title: "Average Score",
      value: `${dashboard.averageScore}%`,
      icon: Award,
      color: "orange",
    },
  ];

  const facultyName = currentUser?.name || "Faculty Member";
  const facultyInitial = facultyName.charAt(0).toUpperCase();

  return (
    <>
      <header className="faculty-header">
        <div>
          <h1>Faculty Dashboard</h1>
          <p>Welcome back! Here's your teaching overview.</p>
        </div>

        <div className="faculty-user">
          <div className="faculty-avatar">{facultyInitial}</div>
          <div>
            <strong>{facultyName}</strong>
            <span>Faculty</span>
          </div>
        </div>
      </header>

      <section className="faculty-welcome">
        <div>
          <span>FACULTY OVERVIEW</span>
          <h2>Manage your classroom with ease.</h2>
          <p>
            Create quizzes, monitor submissions and track student progress.
          </p>

          <button onClick={() => navigate("/faculty/create-quiz")}>
            <PlusCircle size={18} />
            Create New Quiz
          </button>
        </div>

        <GraduationCap size={90} />
      </section>

      <section className="faculty-stats">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="faculty-stat-card" key={item.title}>
              <div className={`faculty-stat-icon ${item.color}`}>
                <Icon size={23} />
              </div>

              <div>
                <p>{item.title}</p>
                <h2>{item.value}</h2>
              </div>
            </div>
          );
        })}
      </section>

      <section className="faculty-activity">
        <div className="faculty-section-heading">
          <div>
            <h2>My Recent Quizzes</h2>
            <p>Recently created quizzes by you</p>
          </div>

          <button onClick={() => navigate("/faculty/quizzes")}>
            View All
          </button>
        </div>

        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Subject</th>
                <th>Submissions</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {dashboard.recentQuizzes.length > 0 ? (
                dashboard.recentQuizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>{quiz.title || "Untitled Quiz"}</td>
                    <td>{quiz.subject || "General"}</td>
                    <td>{quiz.submissions}</td>
                    <td>
                      <span
                        className={`faculty-status ${quiz.status.toLowerCase()}`}
                      >
                        {quiz.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "25px",
                    }}
                  >
                    No quizzes created by you yet. Create your first quiz!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="faculty-demo-note">
        Faculty-specific statistics are calculated using browser storage.
        Backend database integration is still pending.
      </p>
    </>
  );
}
