
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  Eye,
  X,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getQuizById,
  createQuiz,
  updateQuiz,
} from "../../services/quizService";
import "./CreateQuiz.css";

const createQuestion = () => ({
  id: Date.now() + Math.random(),
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  marks: 1,
});

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("id") || "";
  const isEditing = Boolean(quizId);

  const [quiz, setQuiz] = useState({
    title: "",
    subject: "",
    difficulty: "Easy",
    status: "Draft",
    duration: 30,
    description: "",
  });

  const [questions, setQuestions] = useState([createQuestion()]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) return;

    let active = true;

    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getQuizById(quizId);

        if (!active) return;

        if (!data) {
          setError("Quiz not found.");
          return;
        }

        setQuiz({
          title: data.title || "",
          subject: data.subject || "",
          difficulty: ["Easy", "Medium", "Hard"].includes(data.difficulty)
            ? data.difficulty
            : "Medium",
          status: data.status === "Published" ? "Published" : "Draft",
          duration: data.duration || 30,
          description: data.description || "",
        });

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(
            data.questions.map((question, index) => ({
              id: Date.now() + index,
              question: question.questionText || "",
              options:
                Array.isArray(question.options) && question.options.length > 0
                  ? [...question.options]
                  : ["", "", "", ""],
              correctAnswer:
                typeof question.correctAnswer === "number"
                  ? question.correctAnswer
                  : 0,
              marks: question.marks || 1,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load quiz:", err);

        if (active) {
          setError("Failed to load quiz details. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadQuiz();

    return () => {
      active = false;
    };
  }, [quizId]);

  const updateQuizField = (e) => {
    setQuiz({
      ...quiz,
      [e.target.name]: e.target.value,
    });
  };

  const updateQuestion = (id, value) => {
    setQuestions((previous) =>
      previous.map((q) =>
        q.id === id ? { ...q, question: value } : q
      )
    );
  };

  const updateOption = (id, index, value) => {
    setQuestions((previous) =>
      previous.map((q) =>
        q.id === id
          ? {
              ...q,
              options: q.options.map((option, i) =>
                i === index ? value : option
              ),
            }
          : q
      )
    );
  };

  const updateCorrectAnswer = (id, index) => {
    setQuestions((previous) =>
      previous.map((q) =>
        q.id === id ? { ...q, correctAnswer: index } : q
      )
    );
  };

  const updateMarks = (id, value) => {
    setQuestions((previous) =>
      previous.map((q) =>
        q.id === id ? { ...q, marks: value } : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions((previous) => [...previous, createQuestion()]);
  };

  const removeQuestion = (id) => {
    if (questions.length === 1) {
      alert("A quiz must have at least one question.");
      return;
    }

    setQuestions((previous) => previous.filter((q) => q.id !== id));
  };

  const totalMarks = questions.reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );

  const validateQuiz = () => {
    if (!quiz.title.trim() || !quiz.subject) {
      alert("Please enter the quiz title and select a subject.");
      return false;
    }

    const invalidQuestion = questions.some(
      (q) =>
        !q.question.trim() ||
        q.options.some((option) => !option.trim())
    );

    if (invalidQuestion) {
      alert("Please complete every question and all four options.");
      return false;
    }

    if (questions.some((q) => Number(q.marks) < 1)) {
      alert("Every question must have marks of at least 1.");
      return false;
    }

    if (Number(quiz.duration) < 1) {
      alert("Duration must be at least 1 minute.");
      return false;
    }

    return true;
  };

  const handlePreview = () => {
    if (!validateQuiz()) return;
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateQuiz()) return;

    if (!userProfile?.uid) {
      alert("Please log in with a faculty account before saving a quiz.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const quizData = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        duration: Number(quiz.duration),
        status: quiz.status,
        isPublished: quiz.status === "Published",
        questions: questions.map((q) => ({
          questionText: q.question.trim(),
          options: q.options.map((option) => option.trim()),
          correctAnswer: q.correctAnswer,
          marks: Number(q.marks),
        })),
      };

      if (isEditing) {
        await updateQuiz(quizId, quizData);
      } else {
        await createQuiz(quizData);
      }

      navigate("/faculty/quizzes");
    } catch (err) {
      console.error("Unable to save quiz:", err);
      const message =
        err.message || "Unable to save the quiz. Please try again.";
      setError(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && loading) {
    return (
      <div className="create-quiz-page">
        <div className="create-quiz-header">
          <button
            className="create-back-btn"
            onClick={() => navigate("/faculty/quizzes")}
          >
            <ArrowLeft size={18} />
            Back to Quizzes
          </button>

          <div>
            <h1>Edit Quiz</h1>
            <p>Loading quiz details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-quiz-page">
      <div className="create-quiz-header">
        <button
          className="create-back-btn"
          onClick={() => navigate("/faculty/quizzes")}
        >
          <ArrowLeft size={18} />
          Back to Quizzes
        </button>

        <div>
          <h1>{isEditing ? "Edit Quiz" : "Create New Quiz"}</h1>
          <p>
            {isEditing
              ? "Update your quiz details and questions."
              : "Build a quiz for your students."}
          </p>
        </div>
      </div>

      {error && <p className="create-demo-note">{error}</p>}

      <form onSubmit={handleSubmit}>
        <section className="create-quiz-section">
          <div className="create-section-title">
            <BookOpen size={20} />
            <h2>Quiz Information</h2>
          </div>

          <div className="create-form-grid">
            <div className="create-field full">
              <label>Quiz Title</label>
              <input
                name="title"
                value={quiz.title}
                onChange={updateQuizField}
                placeholder="Enter quiz title"
                required
              />
            </div>

            <div className="create-field">
              <label>Subject</label>
              <select
                name="subject"
                value={quiz.subject}
                onChange={updateQuizField}
                required
              >
                <option value="">Select Subject</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Internet of Things">Internet of Things</option>
                <option value="Database Management">Database Management</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
              </select>
            </div>

            <div className="create-field">
              <label>Difficulty</label>
              <select
                name="difficulty"
                value={quiz.difficulty}
                onChange={updateQuizField}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="create-field">
              <label>Duration (Minutes)</label>
              <div className="create-input-icon">
                <Clock size={18} />
                <input
                  type="number"
                  name="duration"
                  min="1"
                  value={quiz.duration}
                  onChange={updateQuizField}
                  required
                />
              </div>
            </div>

            <div className="create-field">
              <label>Total Marks</label>
              <div className="create-input-icon">
                <Award size={18} />
                <input
                  type="number"
                  name="totalMarks"
                  value={totalMarks}
                  readOnly
                />
              </div>
            </div>

            <div className="create-field">
              <label>Status</label>
              <select
                name="status"
                value={quiz.status}
                onChange={updateQuizField}
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div className="create-field full">
              <label>Description</label>
              <textarea
                name="description"
                value={quiz.description}
                onChange={updateQuizField}
                placeholder="Enter a short quiz description..."
                rows="3"
              />
            </div>
          </div>
        </section>

        <section className="create-quiz-section">
          <div className="create-section-heading">
            <div className="create-section-title">
              <BookOpen size={20} />
              <h2>Quiz Questions</h2>
            </div>

            <span>{questions.length} Questions</span>
          </div>

          {questions.map((question, questionIndex) => (
            <div className="create-question-card" key={question.id}>
              <div className="create-question-heading">
                <h3>Question {questionIndex + 1}</h3>

                <button
                  type="button"
                  className="create-delete-btn"
                  onClick={() => removeQuestion(question.id)}
                  title="Remove question"
                >
                  <Trash2 size={17} />
                  Remove
                </button>
              </div>

              <div className="create-field">
                <label>Question</label>
                <textarea
                  value={question.question}
                  onChange={(e) =>
                    updateQuestion(question.id, e.target.value)
                  }
                  placeholder="Enter your question..."
                  rows="2"
                  required
                />
              </div>

              <label className="create-options-label">
                Answer Options
              </label>

              <p className="create-hint">
                Select the radio button next to the correct answer.
              </p>

              <div className="create-options-grid">
                {question.options.map((option, optionIndex) => (
                  <div className="create-option" key={optionIndex}>
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctAnswer === optionIndex}
                      onChange={() =>
                        updateCorrectAnswer(question.id, optionIndex)
                      }
                    />

                    <span>{String.fromCharCode(65 + optionIndex)}.</span>

                    <input
                      type="text"
                      value={option}
                      onChange={(e) =>
                        updateOption(
                          question.id,
                          optionIndex,
                          e.target.value
                        )
                      }
                      placeholder={`Enter option ${optionIndex + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="create-field">
                <label>Marks</label>
                <input
                  type="number"
                  min="1"
                  value={question.marks}
                  onChange={(e) =>
                    updateMarks(question.id, e.target.value)
                  }
                  required
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="create-add-question"
            onClick={addQuestion}
          >
            <Plus size={18} />
            Add Another Question
          </button>
        </section>

        <div className="create-quiz-actions">
          <button
            type="button"
            className="create-cancel-btn"
            onClick={() => navigate("/faculty/quizzes")}
          >
            Cancel
          </button>

          <button
            type="button"
            className="create-preview-btn"
            onClick={handlePreview}
          >
            <Eye size={18} />
            Preview Quiz
          </button>

          <button
            type="submit"
            className="create-save-btn"
            disabled={saving}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Quiz"}
          </button>
        </div>
      </form>

      {showPreview && (
        <div className="quiz-preview-overlay">
          <div className="quiz-preview-modal">
            <div className="quiz-preview-header">
              <div>
                <span className="quiz-preview-label">QUIZ PREVIEW</span>
                <h2>{quiz.title}</h2>
                <p>{quiz.subject}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="quiz-preview-close"
              >
                <X size={22} />
              </button>
            </div>

            <p className="quiz-preview-description">
              {quiz.description || "No description provided."}
            </p>

            <div className="quiz-preview-stats">
              <div>
                <Clock size={19} />
                <span>
                  <strong>{quiz.duration} min</strong>
                  Duration
                </span>
              </div>

              <div>
                <BookOpen size={19} />
                <span>
                  <strong>{questions.length}</strong>
                  Questions
                </span>
              </div>

              <div>
                <Award size={19} />
                <span>
                  <strong>{totalMarks}</strong>
                  Total Marks
                </span>
              </div>
            </div>

            <div className="quiz-preview-questions">
              <h3>Questions and Answers</h3>

              {questions.map((question, index) => (
                <div className="quiz-preview-question" key={question.id}>
                  <h4>
                    {index + 1}. {question.question}
                  </h4>

                  <div className="quiz-preview-options">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={
                          question.correctAnswer === optionIndex
                            ? "quiz-preview-option correct"
                            : "quiz-preview-option"
                        }
                      >
                        <span>
                          {String.fromCharCode(65 + optionIndex)}. {option}
                        </span>

                        {question.correctAnswer === optionIndex && (
                          <span className="quiz-correct-label">
                            <CheckCircle size={15} />
                            Correct Answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="quiz-preview-done"
              onClick={() => setShowPreview(false)}
            >
              Back to Editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
