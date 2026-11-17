
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  BookOpen,
  Clock,
  ArrowRight,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { getAvailableQuizzes } from "../../services/quizService";
import "./AvailableQuizzes.css";

export default function AvailableQuizzes() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadQuizzes = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAvailableQuizzes();

        if (!active) return;

        setQuizzes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching available quizzes:", err);

        if (active) {
          setError(
            "Failed to load quizzes. Please try refreshing."
          );
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
  }, []);

  const filteredQuizzes = quizzes.filter((quiz) => {
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

        {error && (
          <div className="empty-quizzes">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="empty-quizzes">
            <p>Loading quizzes...</p>
          </div>
        ) : (
          <>
            <div className="available-quiz-grid">
              {filteredQuizzes.map((quiz) => {
                const questionCount =
                  Number(quiz.questionCount) ||
                  (Array.isArray(quiz.questions)
                    ? quiz.questions.length
                    : 0);

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
          </>
        )}
      </main>
    </div>
  );
}
