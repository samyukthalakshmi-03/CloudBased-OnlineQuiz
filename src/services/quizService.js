import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Validates a quiz payload before creation or update.
 * 
 * @param {object} quizData 
 */
function validateQuizData(quizData) {
  if (!quizData.title || !quizData.title.trim()) {
    throw new Error('Quiz title is required.');
  }
  const duration = Number(quizData.duration);
  if (!duration || duration <= 0) {
    throw new Error('Quiz duration must be a positive number of minutes.');
  }
  if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    throw new Error('A quiz must contain at least one question.');
  }

  quizData.questions.forEach((q, index) => {
    if (!q.questionText || !q.questionText.trim()) {
      throw new Error(`Question ${index + 1} is missing the question text.`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`Question ${index + 1} must provide at least two answer options.`);
    }
    const hasEmptyOption = q.options.some((opt) => !opt || !opt.trim());
    if (hasEmptyOption) {
      throw new Error(`Question ${index + 1} contains empty options.`);
    }
    const correctAnswer = Number(q.correctAnswer);
    if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= q.options.length) {
      throw new Error(`Question ${index + 1} has an invalid correct answer selected.`);
    }
    const marks = Number(q.marks);
    if (isNaN(marks) || marks <= 0) {
      throw new Error(`Question ${index + 1} must have a positive marks value.`);
    }
  });
}

/**
 * Create a new quiz.
 * 
 * To ensure security without an external backend, the quiz questions are split:
 * - Public/Sanitized questions (without correctAnswer) are stored in `quizzes`
 * - The Answer Key is stored in the restricted `quizAnswers` collection
 * 
 * @param {object} quizData
 * @returns {Promise<{ id: string, message: string }>}
 */
export async function createQuiz(quizData) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in as faculty to create a quiz.');
  }

  validateQuizData(quizData);

  try {
    // 1. Sanitize questions (strip correctAnswer)
    const sanitizedQuestions = quizData.questions.map((q, index) => ({
      questionIndex: index,
      questionText: q.questionText.trim(),
      options: q.options.map(opt => opt.trim()),
      marks: Number(q.marks) || 1
    }));

    // 2. Extract answer key
    const answersData = quizData.questions.map((q, index) => ({
      questionIndex: index,
      correctAnswer: Number(q.correctAnswer),
      marks: Number(q.marks) || 1
    }));

    // 3. Save sanitized quiz to /quizzes
    const quizzesRef = collection(db, 'quizzes');
    const newQuizDoc = await addDoc(quizzesRef, {
      title: quizData.title.trim(),
      description: (quizData.description || '').trim(),
      createdBy: currentUser.uid,
      creatorEmail: currentUser.email,
      duration: Number(quizData.duration),
      questions: sanitizedQuestions,
      questionCount: sanitizedQuestions.length,
      totalMarks: sanitizedQuestions.reduce((sum, q) => sum + q.marks, 0),
      isPublished: Boolean(quizData.isPublished),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const quizId = newQuizDoc.id;

    // 4. Save answer key to /quizAnswers/{quizId}
    const answerDocRef = doc(db, 'quizAnswers', quizId);
    await setDoc(answerDocRef, {
      quizId: quizId,
      createdBy: currentUser.uid,
      answers: answersData,
      updatedAt: serverTimestamp()
    });

    return { id: quizId, message: 'Quiz created successfully.' };
  } catch (error) {
    console.error('[quizService.createQuiz] Error creating quiz:', error);
    throw error;
  }
}

/**
 * Update an existing quiz (Faculty only).
 * 
 * @param {string} quizId 
 * @param {object} quizData 
 * @returns {Promise<void>}
 */
export async function updateQuiz(quizId, quizData) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  validateQuizData(quizData);

  try {
    const sanitizedQuestions = quizData.questions.map((q, index) => ({
      questionIndex: index,
      questionText: q.questionText.trim(),
      options: q.options.map(opt => opt.trim()),
      marks: Number(q.marks) || 1
    }));

    const answersData = quizData.questions.map((q, index) => ({
      questionIndex: index,
      correctAnswer: Number(q.correctAnswer),
      marks: Number(q.marks) || 1
    }));

    const quizDocRef = doc(db, 'quizzes', quizId);
    await updateDoc(quizDocRef, {
      title: quizData.title.trim(),
      description: (quizData.description || '').trim(),
      duration: Number(quizData.duration),
      questions: sanitizedQuestions,
      questionCount: sanitizedQuestions.length,
      totalMarks: sanitizedQuestions.reduce((sum, q) => sum + q.marks, 0),
      isPublished: Boolean(quizData.isPublished),
      updatedAt: serverTimestamp()
    });

    const answerDocRef = doc(db, 'quizAnswers', quizId);
    await setDoc(answerDocRef, {
      quizId: quizId,
      createdBy: currentUser.uid,
      answers: answersData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('[quizService.updateQuiz] Error updating quiz:', error);
    throw error;
  }
}

/**
 * Delete a quiz and its corresponding answer key.
 * 
 * @param {string} quizId 
 * @returns {Promise<void>}
 */
export async function deleteQuiz(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const quizDocRef = doc(db, 'quizzes', quizId);
    const answerDocRef = doc(db, 'quizAnswers', quizId);

    await deleteDoc(quizDocRef);
    await deleteDoc(answerDocRef);
  } catch (error) {
    console.error('[quizService.deleteQuiz] Error deleting quiz:', error);
    throw error;
  }
}

/**
 * Get all published quizzes available for students.
 * 
 * @returns {Promise<Array<object>>}
 */
export async function getAvailableQuizzes() {
  try {
    const quizzesRef = collection(db, 'quizzes');
    const q = query(
      quizzesRef,
      where('isPublished', '==', true)
    );
    const snapshot = await getDocs(q);

    const quizzes = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    // Sort descending by createdAt in memory in case composite index is still building
    return quizzes.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('[quizService.getAvailableQuizzes] Error fetching quizzes:', error);
    throw error;
  }
}

/**
 * Get a single quiz by ID.
 * If requested by the faculty creator, merges the correct answers from `quizAnswers`.
 * If requested by a student, returns the sanitized quiz (correct answers omitted).
 * 
 * @param {string} quizId 
 * @returns {Promise<object | null>}
 */
export async function getQuizById(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const quizDocRef = doc(db, 'quizzes', quizId);
    const snapshot = await getDoc(quizDocRef);

    if (!snapshot.exists()) {
      return null;
    }

    const quizData = {
      id: snapshot.id,
      ...snapshot.data()
    };

    const currentUser = auth.currentUser;

    // If current user is the faculty author, attempt to merge correct answers for editing
    if (currentUser && quizData.createdBy === currentUser.uid) {
      try {
        const answerDocRef = doc(db, 'quizAnswers', quizId);
        const answerSnap = await getDoc(answerDocRef);
        if (answerSnap.exists()) {
          const answersList = answerSnap.data().answers || [];
          quizData.questions = quizData.questions.map((q, idx) => {
            const foundAns = answersList.find(a => a.questionIndex === idx);
            return {
              ...q,
              correctAnswer: foundAns ? foundAns.correctAnswer : 0
            };
          });
        }
      } catch (err) {
        console.warn('[quizService.getQuizById] Could not fetch answer key:', err);
      }
    }

    return quizData;
  } catch (error) {
    console.error('[quizService.getQuizById] Error retrieving quiz:', error);
    throw error;
  }
}

/**
 * Get all quizzes created by a specific faculty member.
 * 
 * @param {string} facultyId 
 * @returns {Promise<Array<object>>}
 */
export async function getFacultyQuizzes(facultyId) {
  if (!facultyId) {
    throw new Error('Faculty ID is required.');
  }

  try {
    const quizzesRef = collection(db, 'quizzes');
    const q = query(
      quizzesRef,
      where('createdBy', '==', facultyId)
    );
    const snapshot = await getDocs(q);

    const quizzes = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    return quizzes.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('[quizService.getFacultyQuizzes] Error fetching faculty quizzes:', error);
    throw error;
  }
}
