
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
import "./ManageQuizzes.css";

const STORAGE_KEY = "quizcloud_quizzes";
const USER_KEY = "quizcloud_current_user";
const RESULTS_KEY = "quizcloud_results";

function readStorage(key, fallback = []) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

function getQuestionCount(quiz) {
  if (Array.isArray(quiz.questions)) {
    return quiz.questions.length;
  }

  return Number(quiz.questions) || 0;
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

function normalizeStatus(status) {
  if (status === "Active") return "Published";
  if (status === "Completed") return "Closed";
  return status || "Draft";
}

export default function ManageQuizzes() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(USER_KEY, null)
  );

  const [allQuizzes, setAllQuizzes] = useState(() =>
    readStorage(STORAGE_KEY, [])
  );

  const [allResults, setAllResults] = useState(() =>
    readStorage(RESULTS_KEY, [])
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => {
    const refreshData = () => {
      setCurrentUser(readStorage(USER_KEY, null));
      setAllQuizzes(readStorage(STORAGE_KEY, []));
      setAllResults(readStorage(RESULTS_KEY, []));
    };

    window.addEventListener("focus", refreshData);
    window.addEventListener("storage", refreshData);

    return () => {
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  const quizzes = allQuizzes.filter((quiz) =>
    belongsToFaculty(quiz, currentUser)
  );

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      (quiz.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (quiz.subject || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      normalizeStatus(quiz.status) === filter;

    return matchesSearch && matchesFilter;
  });

  const updateQuizStatus = (id, newStatus) => {
    const updatedQuizzes = allQuizzes.map((quiz) => {
      if (
        String(quiz.id) === String(id) &&
        belongsToFaculty(quiz, currentUser)
      ) {
        return {
          ...quiz,
          status: newStatus,
        };
      }

      return quiz;
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedQuizzes)
    );

    setAllQuizzes(updatedQuizzes);
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz?"
    );

    if (!confirmed) return;

    const updatedQuizzes = allQuizzes.filter(
      (quiz) =>
        String(quiz.id) !== String(id) ||
        !belongsToFaculty(quiz, currentUser)
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedQuizzes)
    );

    setAllQuizzes(updatedQuizzes);
  };

  const handleEditSave = (e) => {
    e.preventDefault();

    if (!belongsToFaculty(editingQuiz, currentUser)) {
      alert("You can only edit your own quizzes.");
      setEditingQuiz(null);
      return;
    }

    const updatedQuizzes = allQuizzes.map((quiz) => {
      if (
        String(quiz.id) !== String(editingQuiz.id) ||
        !belongsToFaculty(quiz, currentUser)
      ) {
        return quiz;
      }

      return {
        ...quiz,
        title: editingQuiz.title,
        subject: editingQuiz.subject,
        questions: Array.isArray(quiz.questions)
          ? quiz.questions
          : Number(editingQuiz.questions),
        duration: Number(editingQuiz.duration),
        status: editingQuiz.status,
      };
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedQuizzes)
    );

    setAllQuizzes(updatedQuizzes);
    setEditingQuiz(null);

    window.alert("Quiz updated and saved successfully!");
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
          {filteredQuizzes.map((quiz) => {
            const status = normalizeStatus(quiz.status);

            const submissions = allResults.filter(
              (result) =>
                String(result.quizId) === String(quiz.id)
            ).length;

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
                          questions: getQuestionCount(quiz),
                        })
                      }
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      title="Delete quiz"
                      onClick={() => handleDelete(quiz.id)}
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
                    >
                      <Lock size={15} />
                      Close
                    </button>
                  )}
                </div>

                <button
                  className="manage-edit-btn"
                  onClick={() =>
                    setEditingQuiz({
                      ...quiz,
                      status,
                      questions: getQuestionCount(quiz),
                    })
                  }
                >
                  <Pencil size={15} />
                  Edit Quiz
                </button>
              </article>
            );
          })}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="manage-empty">
            <BookOpen size={35} />
            <h3>No quizzes found</h3>
            <p>
              {quizzes.length === 0
                ? "You haven't created any quizzes yet."
                : "Try changing your search or filter."}
            </p>
          </div>
        )}
      </section>

      <p className="manage-demo-note">
        Only quizzes created by your faculty account are displayed.
        Data is stored in browser localStorage. Backend integration is pending.
      </p>

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
                  <label>Questions</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingQuiz.questions}
                    onChange={(e) =>
                      setEditingQuiz({
                        ...editingQuiz,
                        questions: Number(e.target.value),
                      })
                    }
                  />
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

                <button type="submit" className="quiz-save-btn">
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
