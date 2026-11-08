
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import "./CreateQuiz.css";

const STORAGE_KEY = "quizcloud_quizzes";
const USER_KEY = "quizcloud_current_user";

const createQuestion = () => ({
  id: Date.now() + Math.random(),
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  marks: 1,
});

export default function CreateQuiz() {
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState({
    title: "",
    subject: "",
    duration: 30,
    totalMarks: 10,
    description: "",
  });

  const [questions, setQuestions] = useState([createQuestion()]);
  const [showPreview, setShowPreview] = useState(false);

  const updateQuiz = (e) => {
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

    if (Number(quiz.duration) < 1 || Number(quiz.totalMarks) < 1) {
      alert("Duration and total marks must be at least 1.");
      return false;
    }

    return true;
  };

  const handlePreview = () => {
    if (!validateQuiz()) return;
    setShowPreview(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateQuiz()) return;

    try {
      const currentUser = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      );

      if (!currentUser || currentUser.role !== "faculty") {
        alert("Please log in with a faculty account before creating a quiz.");
        return;
      }

      const savedData = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      const savedQuizzes = Array.isArray(savedData) ? savedData : [];

      const quizData = {
        id: Date.now(),
        ...quiz,
        duration: Number(quiz.duration),
        totalMarks: Number(quiz.totalMarks),
        questions,
        questionCount: questions.length,
        status: "Published",
        createdAt: new Date().toISOString(),

        // Faculty ownership information
        creatorId: currentUser.id || null,
        creatorEmail: currentUser.email || "",
        creatorName: currentUser.name || "Faculty Member",
      };

      const updatedQuizzes = [...savedQuizzes, quizData];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedQuizzes)
      );

      alert(
        `Quiz "${quiz.title}" created successfully! ${questions.length} questions added.`
      );

      navigate("/faculty/quizzes");
    } catch (error) {
      console.error("Unable to save quiz:", error);
      alert("Unable to save the quiz. Please try again.");
    }
  };

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
          <h1>Create New Quiz</h1>
          <p>Build a quiz for your students.</p>
        </div>
      </div>

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
                onChange={updateQuiz}
                placeholder="Enter quiz title"
                required
              />
            </div>

            <div className="create-field">
              <label>Subject</label>
              <select
                name="subject"
                value={quiz.subject}
                onChange={updateQuiz}
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
              <label>Duration (Minutes)</label>
              <div className="create-input-icon">
                <Clock size={18} />
                <input
                  type="number"
                  name="duration"
                  min="1"
                  value={quiz.duration}
                  onChange={updateQuiz}
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
                  min="1"
                  value={quiz.totalMarks}
                  onChange={updateQuiz}
                  required
                />
              </div>
            </div>

            <div className="create-field full">
              <label>Description</label>
              <textarea
                name="description"
                value={quiz.description}
                onChange={updateQuiz}
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

          <button type="submit" className="create-save-btn">
            <Save size={18} />
            Save Quiz
          </button>
        </div>
      </form>

      <p className="create-demo-note">
        Demo mode: Quiz data and faculty ownership are saved in your
        browser's local storage. Backend database integration is pending.
      </p>

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
                  <strong>{quiz.totalMarks}</strong>
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
