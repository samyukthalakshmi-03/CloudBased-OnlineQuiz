
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  BookOpen,
  Clock,
  ArrowRight,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { quizzes as mockQuizzes } from "../../data/mockData";
import "./AvailableQuizzes.css";

const STORAGE_KEY = "quizcloud_quizzes";

function getFacultyQuizzes() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved
      .filter(
        (quiz) =>
          quiz &&
          (quiz.status === "Published" || quiz.status === "Active")
      )
      .map((quiz) => ({
        ...quiz,
        questions: Array.isArray(quiz.questions)
          ? quiz.questions.length
          : Number(quiz.questions) || 0,
        difficulty: quiz.difficulty || "Medium",
      }));
  } catch (error) {
    console.error("Unable to load faculty quizzes:", error);
    return [];
  }
}

export default function AvailableQuizzes() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [facultyQuizzes, setFacultyQuizzes] = useState(getFacultyQuizzes);

  useEffect(() => {
    const loadQuizzes = () => {
      setFacultyQuizzes(getFacultyQuizzes());
    };

    window.addEventListener("focus", loadQuizzes);
    window.addEventListener("storage", loadQuizzes);

    return () => {
      window.removeEventListener("focus", loadQuizzes);
      window.removeEventListener("storage", loadQuizzes);
    };
  }, []);

  const combinedQuizzes = [
    ...(Array.isArray(mockQuizzes) ? mockQuizzes : []),
    ...facultyQuizzes,
  ].filter(
    (quiz, index, array) =>
      quiz &&
      quiz.id &&
      array.findIndex(
        (item) => String(item.id) === String(quiz.id)
      ) === index
  );

  const filteredQuizzes = combinedQuizzes.filter((quiz) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      (quiz.title || "").toLowerCase().includes(searchText) ||
      (quiz.subject || "").toLowerCase().includes(searchText);

    const matchesDifficulty =
      difficulty === "All" ||
      (quiz.difficulty || "Medium").toLowerCase() ===
        difficulty.toLowerCase();

    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="available-header">
          <div>
            <h1>Available Quizzes</h1>
            <p>Explore quizzes and challenge your knowledge.</p>
          </div>

          <span className="quiz-count">
            {filteredQuizzes.length} Quizzes Available
          </span>
        </div>

        <div className="quiz-filters">
          <div className="quiz-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search quizzes or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search quizzes or subjects"
            />
          </div>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Filter by difficulty"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div className="available-quiz-grid">
          {filteredQuizzes.map((quiz) => {
            const questionCount = Array.isArray(quiz.questions)
              ? quiz.questions.length
              : Number(quiz.questions) || 0;

            const quizDifficulty = quiz.difficulty || "Medium";

            return (
              <article className="available-quiz-card" key={quiz.id}>
                <div className="available-quiz-icon">
                  <BookOpen size={24} />
                </div>

                <span className="quiz-subject">
                  {quiz.subject || "General"}
                </span>

                <h2>{quiz.title || "Untitled Quiz"}</h2>

                <div className="available-quiz-details">
                  <span>
                    <BookOpen size={16} />
                    {questionCount} Questions
                  </span>

                  <span>
                    <Clock size={16} />
                    {Number(quiz.duration) || 0} Minutes
                  </span>
                </div>

                <div className="available-quiz-footer">
                  <span
                    className={`difficulty ${quizDifficulty.toLowerCase()}`}
                  >
                    {quizDifficulty}
                  </span>

                  <Link
                    to={`/student/quiz/${quiz.id}`}
                    className="start-quiz"
                  >
                    Start Quiz <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="empty-quizzes">
            <BookOpen size={35} />
            <h3>No quizzes found</h3>
            <p>Try changing your search or difficulty filter.</p>
          </div>
        )}
      </main>
    </div>
  );
}
