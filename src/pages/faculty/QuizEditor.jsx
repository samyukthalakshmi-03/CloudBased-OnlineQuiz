import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createQuiz, getQuizById, updateQuiz } from '../../services/quizService';
import LoadingSpinner from '../../components/LoadingSpinner';

const defaultQuestion = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  marks: 1
});

export default function QuizEditor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(quizId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState([defaultQuestion()]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getQuizById(quizId);
      if (!data) {
        setError('Quiz not found.');
        return;
      }
      setTitle(data.title || '');
      setDescription(data.description || '');
      setDuration(data.duration || 15);
      setIsPublished(Boolean(data.isPublished));
      if (data.questions && data.questions.length > 0) {
        setQuestions(
          data.questions.map(q => ({
            questionText: q.questionText || '',
            options: q.options || ['', '', '', ''],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
            marks: q.marks || 1
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching quiz for editing:', err);
      setError('Failed to load quiz details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, defaultQuestion()]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;
      updated[qIndex] = {
        ...updated[qIndex],
        options: newOptions
      };
      return updated;
    });
  };

  const handleAddOption = (qIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[qIndex].options.push('');
      return updated;
    });
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      if (updated[qIndex].options.length <= 2) {
        alert('Each question must have at least 2 options.');
        return prev;
      }
      const newOptions = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
      let newCorrect = updated[qIndex].correctAnswer;
      if (newCorrect >= newOptions.length) {
        newCorrect = newOptions.length - 1;
      }
      updated[qIndex] = {
        ...updated[qIndex],
        options: newOptions,
        correctAnswer: newCorrect
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Please provide a quiz title.');
      return;
    }
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError('Duration must be a positive number of minutes.');
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (q.options.length < 2) {
        setError(`Question ${i + 1} must have at least two options.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          setError(`Question ${i + 1}, Option ${String.fromCharCode(65 + j)} cannot be empty.`);
          return;
        }
      }
      if (Number(q.marks) <= 0) {
        setError(`Question ${i + 1} must have marks > 0.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        duration: durationNum,
        isPublished,
        questions
      };

      if (isEditing) {
        await updateQuiz(quizId, payload);
      } else {
        await createQuiz(payload);
      }

      navigate('/faculty', { replace: true });
    } catch (err) {
      console.error('Failed to save quiz:', err);
      setError(err.message || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading quiz data..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
          <p className="page-subtitle">
            Configure quiz details, add MCQ questions, set the correct answers, and allocate marks.
          </p>
        </div>
        <Link to="/faculty" className="btn btn-secondary">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="editor-form">
        {/* Basic Settings Card */}
        <div className="editor-card">
          <h2 className="editor-card-title">1. Quiz Details</h2>

          <div className="form-group">
            <label htmlFor="title">Quiz Title *</label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cloud Computing Architecture & Virtualization"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description / Instructions</label>
            <textarea
              id="description"
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, guidelines, or topics covered in this quiz..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duration">Quiz Duration (minutes) *</label>
              <input
                id="duration"
                type="number"
                min="1"
                max="300"
                className="form-input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span>Publish immediately (visible to students)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions Builder Card */}
        <div className="editor-card">
          <div className="card-header-flex">
            <h2 className="editor-card-title">
              2. Questions & Answer Key ({questions.length} Question{questions.length > 1 ? 's' : ''})
            </h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="btn btn-secondary btn-sm"
            >
              + Add Question
            </button>
          </div>

          <div className="questions-builder-list">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="builder-question-item">
                <div className="builder-item-header">
                  <span className="builder-q-num">Question #{qIndex + 1}</span>
                  <div className="builder-item-controls">
                    <div className="marks-input-wrapper">
                      <label>Marks:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(qIndex, 'marks', Number(e.target.value))}
                        className="marks-input"
                      />
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="btn-text-danger"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                    placeholder="Enter question text here..."
                    required
                  />
                </div>

                <div className="options-builder">
                  <p className="options-helper-text">
                    Select the radio button next to the <strong>correct answer</strong>:
                  </p>

                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="option-builder-row">
                      <input
                        type="radio"
                        name={`correct_q_${qIndex}`}
                        checked={Number(q.correctAnswer) === optIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                        title="Mark as correct answer"
                      />
                      <span className="opt-letter-tag">
                        {String.fromCharCode(65 + optIndex)}
                      </span>
                      <input
                        type="text"
                        className="form-input option-builder-input"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        required
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          className="opt-remove-btn"
                          title="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIndex)}
                      className="btn-add-opt"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="add-question-bottom">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="btn btn-outline btn-block"
            >
              + Add Another Question
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="editor-submit-bar">
          <Link to="/faculty" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={saving}
          >
            {saving ? 'Saving Quiz...' : isEditing ? 'Save Changes' : 'Create & Publish Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
