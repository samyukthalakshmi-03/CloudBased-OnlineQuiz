
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
import { useAuth } from "../../context/AuthContext";
import { getFacultyQuizzes } from "../../services/quizService";
import { getQuizResults } from "../../services/resultService";

function normalizeStatus(status) {
  if (status === "Active") return "Published";
  return status || "Draft";
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [resultsByQuiz, setResultsByQuiz] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userProfile?.uid) return;

    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const facultyQuizzes = await getFacultyQuizzes(userProfile.uid);

        // Fetch submissions for each quiz to build real performance stats.
        const resultsEntries = await Promise.all(
          facultyQuizzes.map(async (quiz) => {
            try {
              const quizResults = await getQuizResults(quiz.id);
              return [quiz.id, quizResults];
            } catch (err) {
              console.error(
                `Failed to load results for quiz ${quiz.id}:`,
                err
              );
              return [quiz.id, []];
            }
          })
        );

        if (!active) return;

        setQuizzes(facultyQuizzes);
        setResultsByQuiz(Object.fromEntries(resultsEntries));
      } catch (err) {
        console.error("Error loading faculty dashboard:", err);

        if (active) {
          setError("Failed to load your dashboard. Please try again.");
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
  }, [userProfile?.uid]);

  const totalQuizzes = quizzes.length;

  const publishedQuizzes = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === "Published"
  ).length;

  const allResults = Object.values(resultsByQuiz).flat();

  const totalSubmissions = allResults.length;

  const percentages = allResults
    .map((result) => {
      const total = Number(result.totalMarks);
      const score = Number(result.score);

      if (total > 0 && Number.isFinite(score)) {
        return (score / total) * 100;
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
  const recentQuizzes = [...quizzes]
    .sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;

      return dateB - dateA;
    })
    .slice(0, 5)
    .map((quiz) => ({
      ...quiz,
      submissions: (resultsByQuiz[quiz.id] || []).length,
      status: normalizeStatus(quiz.status),
    }));

  const stats = [
    {
      title: "Total Quizzes",
      value: totalQuizzes,
      icon: BookOpen,
      color: "purple",
    },
    {
      title: "Published Quizzes",
      value: publishedQuizzes,
      icon: Users,
      color: "blue",
    },
    {
      title: "Total Submissions",
      value: totalSubmissions,
      icon: ClipboardList,
      color: "green",
    },
    {
      title: "Average Score",
      value: `${averageScore}%`,
      icon: Award,
      color: "orange",
    },
  ];

  const facultyName = userProfile?.name || "Faculty Member";
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
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "25px",
                    }}
                  >
                    Loading your quizzes...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "25px",
                    }}
                  >
                    {error}
                  </td>
                </tr>
              ) : recentQuizzes.length > 0 ? (
                recentQuizzes.map((quiz) => (
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
    </>
  );
}
