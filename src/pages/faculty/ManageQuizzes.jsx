
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  BookOpen,
  Clock,
  Users,
  MoreVertical,
  Pencil,
  X,
  Send,
  FileEdit,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getFacultyQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
} from "../../services/quizService";
import { getQuizResults } from "../../services/resultService";
import "./ManageQuizzes.css";

function getQuestionCount(quiz) {
  if (Array.isArray(quiz.questions)) {
    return quiz.questions.length;
  }

  return Number(quiz.questions) || 0;
}

function normalizeStatus(status) {
  if (status === "Active") return "Published";
  if (status === "Completed") return "Closed";
  return status || "Draft";
}

// Build the quizData payload expected by the quiz service while
// preserving the quiz's existing questions (including answer keys).
function buildQuizData(quiz, overrides = {}) {
  const status = overrides.status ?? normalizeStatus(quiz.status);

  return {
    title: overrides.title ?? quiz.title,
    description: overrides.description ?? quiz.description ?? "",
    subject: overrides.subject ?? quiz.subject,
    difficulty: overrides.difficulty ?? quiz.difficulty,
    duration: Number(overrides.duration ?? quiz.duration),
    status,
    isPublished: status === "Published",
    questions: (quiz.questions || []).map((question) => ({
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: Number(question.marks),
    })),
  };
}

export default function ManageQuizzes() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [resultsByQuiz, setResultsByQuiz] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userProfile?.uid) return;

    let active = true;

    const loadQuizzes = async () => {
      try {
        setLoading(true);
        setError("");

        const facultyQuizzes = await getFacultyQuizzes(userProfile.uid);

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
        console.error("Error loading faculty quizzes:", err);

        if (active) {
          setError("Failed to load your quizzes. Please try refreshing.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadQuizzes();

    return () => {
      active = false;
    };
  }, [userProfile?.uid]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      (quiz.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (quiz.subject || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || normalizeStatus(quiz.status) === filter;

    return matchesSearch && matchesFilter;
  });

  const updateQuizStatus = async (id, newStatus) => {
    try {
      setActionLoading(id);
      setError("");

      const fullQuiz = await getQuizById(id);

      if (!fullQuiz) {
        setError("Quiz not found.");
        return;
      }

      await updateQuiz(id, buildQuizData(fullQuiz, { status: newStatus }));

      setQuizzes((previous) =>
        previous.map((quiz) =>
          quiz.id === id
            ? {
                ...quiz,
                status: newStatus,
                isPublished: newStatus === "Published",
              }
            : quiz
        )
      );
    } catch (err) {
      console.error("Failed to update quiz status:", err);
      const message = err.message || "Failed to update quiz status.";
      setError(message);
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(id);
      setError("");

      await deleteQuiz(id);

      setQuizzes((previous) =>
        previous.filter((quiz) => quiz.id !== id)
      );
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      const message = err.message || "Failed to delete quiz.";
      setError(message);
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();

    if (!editingQuiz) return;

    try {
      setActionLoading(editingQuiz.id);
      setError("");

      // Load the quiz (creator receives the correct answers) so the
      // existing questions and answer keys are preserved on update.
      const fullQuiz = await getQuizById(editingQuiz.id);

      if (!fullQuiz) {
        window.alert("Quiz not found.");
        setEditingQuiz(null);
        return;
      }

      const quizData = buildQuizData(fullQuiz, {
        title: editingQuiz.title,
        subject: editingQuiz.subject,
        difficulty: editingQuiz.difficulty,
        duration: editingQuiz.duration,
        status: editingQuiz.status,
      });

      await updateQuiz(editingQuiz.id, quizData);

      setQuizzes((previous) =>
        previous.map((quiz) =>
          quiz.id === editingQuiz.id
            ? {
                ...quiz,
                title: quizData.title,
                subject: quizData.subject,
                difficulty: quizData.difficulty,
                duration: quizData.duration,
                status: quizData.status,
                isPublished: quizData.isPublished,
              }
            : quiz
        )
      );

      setEditingQuiz(null);

      window.alert("Quiz updated and saved successfully!");
    } catch (err) {
      console.error("Failed to save quiz changes:", err);
      window.alert(err.message || "Failed to save quiz changes.");
    } finally {
      setActionLoading(null);
    }
  };

  const publishedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === "Published"
  ).length;

  const closedCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === "Closed"
  ).length;

  const draftCount = quizzes.filter(
    (quiz) => normalizeStatus(quiz.status) === "Draft"
  ).length;

  return (
    <div className="manage-quizzes-page">
      <header className="manage-header">
        <div>
          <h1>Manage Quizzes</h1>
          <p>Create, organize and monitor your quizzes.</p>
        </div>

        <button
          className="manage-create-btn"
          onClick={() => navigate("/faculty/create-quiz")}
        >
          <Plus size={18} />
          Create Quiz
        </button>
      </header>

      <section className="manage-summary">
        <div>
          <span>My Quizzes</span>
          <h2>{quizzes.length}</h2>
        </div>

        <div>
          <span>Published</span>
          <h2>{publishedCount}</h2>
        </div>

        <div>
          <span>Closed</span>
          <h2>{closedCount}</h2>
        </div>

        <div>
          <span>Drafts</span>
          <h2>{draftCount}</h2>
        </div>
      </section>

      <section className="manage-content">
        <div className="manage-toolbar">
          <div className="manage-search">
            <Search size={18} />
            <input
              placeholder="Search quizzes or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Quizzes</option>
            <option value="Published">Published</option>
            <option value="Closed">Closed</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        <div className="manage-quiz-grid">
          {!loading &&
            filteredQuizzes.map((quiz) => {
              const status = normalizeStatus(quiz.status);

              const submissions = (resultsByQuiz[quiz.id] || []).length;

              return (
                <article className="manage-quiz-card" key={quiz.id}>
                  <div className="manage-quiz-top">
                    <div className="manage-quiz-icon">
                      <BookOpen size={22} />
                    </div>

                    <div className="manage-menu">
                      <button
                        title="Edit quiz"
                        onClick={() =>
                          setEditingQuiz({
                            ...quiz,
                            status,
                            difficulty: quiz.difficulty || "Medium",
                          })
                        }
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title="Delete quiz"
                        onClick={() => handleDelete(quiz.id)}
                        disabled={actionLoading === quiz.id}
                      >
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>

                  <span
                    className={`manage-status ${status.toLowerCase()}`}
                  >
                    {status}
                  </span>

                  <h3>{quiz.title}</h3>
                  <p className="manage-subject">{quiz.subject}</p>

                  <div className="manage-quiz-details">
                    <span>
                      <BookOpen size={15} />
                      {getQuestionCount(quiz)} Questions
                    </span>

                    <span>
                      <Clock size={15} />
                      {quiz.duration} Minutes
                    </span>

                    <span>
                      <Users size={15} />
                      {submissions} Submissions
                    </span>
                  </div>

                  <div className="manage-status-actions">
                    {status !== "Published" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateQuizStatus(quiz.id, "Published")
                        }
                        disabled={actionLoading === quiz.id}
                      >
                        <Send size={15} />
                        Publish
                      </button>
                    )}

                    {status !== "Draft" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateQuizStatus(quiz.id, "Draft")
                        }
                        disabled={actionLoading === quiz.id}
                      >
                        <FileEdit size={15} />
                        Draft
                      </button>
                    )}

                    {status !== "Closed" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateQuizStatus(quiz.id, "Closed")
                        }
                        disabled={actionLoading === quiz.id}
                      >
                        <Lock size={15} />
                        Close
                      </button>
                    )}
                  </div>

                  <button
                    className="manage-edit-btn"
                    onClick={() =>
                      navigate("/faculty/create-quiz?id=" + quiz.id)
                    }
                  >
                    <Pencil size={15} />
                    Edit Quiz
                  </button>
                </article>
              );
            })}
        </div>

        {loading ? (
          <div className="manage-empty">
            <h3>Loading your quizzes...</h3>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="manage-empty">
            <BookOpen size={35} />
            <h3>{error ? "Unable to load quizzes" : "No quizzes found"}</h3>
            <p>
              {error
                ? error
                : quizzes.length === 0
                ? "You haven't created any quizzes yet."
                : "Try changing your search or filter."}
            </p>
          </div>
        ) : null}
      </section>

      {editingQuiz && (
        <div className="quiz-modal-overlay">
          <div className="quiz-edit-modal">
            <div className="quiz-modal-header">
              <div>
                <h2>Edit Quiz</h2>
                <p>Update the quiz details below.</p>
              </div>

              <button
                type="button"
                className="quiz-modal-close"
                onClick={() => setEditingQuiz(null)}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleEditSave}>
              <label>Quiz Title</label>
              <input
                required
                value={editingQuiz.title}
                onChange={(e) =>
                  setEditingQuiz({
                    ...editingQuiz,
                    title: e.target.value,
                  })
                }
              />

              <label>Subject</label>
              <input
                required
                value={editingQuiz.subject}
                onChange={(e) =>
                  setEditingQuiz({
                    ...editingQuiz,
                    subject: e.target.value,
                  })
                }
              />

              <div className="quiz-modal-row">
                <div>
                  <label>Difficulty</label>
                  <select
                    value={editingQuiz.difficulty}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        difficulty: e.target.value,
                      })
                    }
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label>Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingQuiz.duration}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        duration: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <label>Quiz Status</label>
              <select
                value={editingQuiz.status}
                onChange={(e) =>
                  setEditingQuiz({
                    ...editingQuiz,
                    status: e.target.value,
                  })
                }
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Closed">Closed</option>
              </select>

              <div className="quiz-modal-actions">
                <button
                  type="button"
                  className="quiz-cancel-btn"
                  onClick={() => setEditingQuiz(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="quiz-save-btn"
                  disabled={actionLoading === editingQuiz.id}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
