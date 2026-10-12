
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

import { db, auth } from '../firebase/config';

// ==========================================
// Validation
// ==========================================

function validateQuizData(quizData) {
  if (!quizData || typeof quizData !== 'object') {
    throw new Error('Quiz data is required.');
  }

  if (
    typeof quizData.title !== 'string' ||
    !quizData.title.trim()
  ) {
    throw new Error('Quiz title is required.');
  }

  const duration = Number(quizData.duration);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Quiz duration must be a positive number of minutes.');
  }

  if (
    !Array.isArray(quizData.questions) ||
    quizData.questions.length === 0
  ) {
    throw new Error('A quiz must contain at least one question.');
  }

  quizData.questions.forEach((q, index) => {
    if (
      typeof q.questionText !== 'string' ||
      !q.questionText.trim()
    ) {
      throw new Error(`Question ${index + 1} is missing its text.`);
    }

    if (
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 10
    ) {
      throw new Error(
        `Question ${index + 1} must have between 2 and 10 options.`
      );
    }

    if (
      q.options.some(
        option => typeof option !== 'string' || !option.trim()
      )
    ) {
      throw new Error(`Question ${index + 1} contains an empty option.`);
    }

    const correctAnswer = Number(q.correctAnswer);

    if (
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer >= q.options.length
    ) {
      throw new Error(
        `Question ${index + 1} has an invalid correct answer.`
      );
    }

    const marks = Number(q.marks);

    if (!Number.isFinite(marks) || marks <= 0) {
      throw new Error(
        `Question ${index + 1} must have positive marks.`
      );
    }
  });
}

// Keep correct answers separate from student-visible quiz data.
function prepareQuizData(quizData, facultyUid) {
  const sanitizedQuestions = quizData.questions.map((q, index) => ({
    questionIndex: index,
    questionText: q.questionText.trim(),
    options: q.options.map(option => option.trim()),
    marks: Number(q.marks)
  }));

  const answers = quizData.questions.map((q, index) => ({
    questionIndex: index,
    correctAnswer: Number(q.correctAnswer),
    marks: Number(q.marks)
  }));

  return {
    quiz: {
      title: quizData.title.trim(),
      description: (quizData.description || '').trim(),
      createdBy: facultyUid,
      creatorEmail: auth.currentUser.email || '',
      duration: Number(quizData.duration),
      questions: sanitizedQuestions,
      questionCount: sanitizedQuestions.length,
      totalMarks: sanitizedQuestions.reduce(
        (sum, question) => sum + question.marks,
        0
      ),
      isPublished: Boolean(quizData.isPublished),
      updatedAt: serverTimestamp()
    },
    answerKey: {
      createdBy: facultyUid,
      answers,
      updatedAt: serverTimestamp()
    }
  };
}

function requireSignedInUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in to perform this action.');
  }

  return user;
}

// ==========================================
// Create quiz
// ==========================================

export async function createQuiz(quizData) {
  const currentUser = requireSignedInUser();

  validateQuizData(quizData);

  const { quiz, answerKey } = prepareQuizData(
    quizData,
    currentUser.uid
  );

  // Allocate the quiz ID before writing either document.
  const quizRef = doc(collection(db, 'quizzes'));
  const answerRef = doc(db, 'quizAnswers', quizRef.id);

  const batch = writeBatch(db);

  batch.set(quizRef, {
    ...quiz,
    createdAt: serverTimestamp()
  });

  batch.set(answerRef, {
    ...answerKey,
    quizId: quizRef.id
  });

  // Both documents succeed together or neither is committed.
  await batch.commit();

  return {
    id: quizRef.id,
    message: 'Quiz created successfully.'
  };
}

// ==========================================
// Update quiz
// ==========================================

export async function updateQuiz(quizId, quizData) {
  const currentUser = requireSignedInUser();

  if (!quizId || typeof quizId !== 'string') {
    throw new Error('Quiz ID is required.');
  }

  validateQuizData(quizData);

  const quizRef = doc(db, 'quizzes', quizId);
  const answerRef = doc(db, 'quizAnswers', quizId);

  const quizSnapshot = await getDoc(quizRef);

  if (!quizSnapshot.exists()) {
    throw new Error('Quiz not found.');
  }

  if (quizSnapshot.data().createdBy !== currentUser.uid) {
    throw new Error('You are not authorized to update this quiz.');
  }

  const { quiz, answerKey } = prepareQuizData(
    quizData,
    currentUser.uid
  );

  const batch = writeBatch(db);

  // Do not overwrite original creator or creation timestamp.
  batch.update(quizRef, quiz);

  batch.set(answerRef, {
    ...answerKey,
    quizId
  });

  await batch.commit();
}

// ==========================================
// Delete quiz
// ==========================================

export async function deleteQuiz(quizId) {
  const currentUser = requireSignedInUser();

  if (!quizId || typeof quizId !== 'string') {
    throw new Error('Quiz ID is required.');
  }

  const quizRef = doc(db, 'quizzes', quizId);
  const answerRef = doc(db, 'quizAnswers', quizId);

  const quizSnapshot = await getDoc(quizRef);

  if (!quizSnapshot.exists()) {
    throw new Error('Quiz not found.');
  }

  if (quizSnapshot.data().createdBy !== currentUser.uid) {
    throw new Error('You are not authorized to delete this quiz.');
  }

  // Preserve quiz documents needed by existing result history.
  const resultsQuery = query(
    collection(db, 'results'),
    where('quizId', '==', quizId),
    where('facultyId', '==', currentUser.uid)
  );

  const resultsSnapshot = await getDocs(resultsQuery);

  if (!resultsSnapshot.empty) {
    throw new Error(
      'This quiz has existing submissions and cannot be deleted.'
    );
  }

  const batch = writeBatch(db);
  batch.delete(quizRef);
  batch.delete(answerRef);

  await batch.commit();
}

// ==========================================
// Get published quizzes
// ==========================================

export async function getAvailableQuizzes() {
  const quizzesQuery = query(
    collection(db, 'quizzes'),
    where('isPublished', '==', true)
  );

  const snapshot = await getDocs(quizzesQuery);

  return snapshot.docs
    .map(document => ({
      id: document.id,
      ...document.data()
    }))
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
}

// ==========================================
// Get quiz by ID
// ==========================================

export async function getQuizById(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  const quizRef = doc(db, 'quizzes', quizId);
  const snapshot = await getDoc(quizRef);

  if (!snapshot.exists()) {
    return null;
  }

  const quizData = {
    id: snapshot.id,
    ...snapshot.data()
  };

  const currentUser = auth.currentUser;

  // Only the creator can retrieve the answer key through
  // Firestore rules. Rules remain the actual security boundary.
  if (currentUser && quizData.createdBy === currentUser.uid) {
    const answerRef = doc(db, 'quizAnswers', quizId);
    const answerSnapshot = await getDoc(answerRef);

    if (answerSnapshot.exists()) {
      const answers = answerSnapshot.data().answers || [];

      quizData.questions = quizData.questions.map((question, index) => {
        const answer = answers.find(
          item => item.questionIndex === index
        );

        return {
          ...question,
          correctAnswer: answer?.correctAnswer
        };
      });
    }
  }

  return quizData;
}

// ==========================================
// Get quizzes created by faculty
// ==========================================

export async function getFacultyQuizzes(facultyId) {
  const currentUser = requireSignedInUser();

  if (!facultyId || facultyId !== currentUser.uid) {
    throw new Error(
      'You can only retrieve quizzes associated with your own account.'
    );
  }

  const quizzesQuery = query(
    collection(db, 'quizzes'),
    where('createdBy', '==', currentUser.uid)
  );

  const snapshot = await getDocs(quizzesQuery);

  return snapshot.docs
    .map(document => ({
      id: document.id,
      ...document.data()
    }))
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
}
