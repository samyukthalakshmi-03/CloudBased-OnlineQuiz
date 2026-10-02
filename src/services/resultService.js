import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Submit answers for a quiz.
 * 
 * Flow:
 * 1. Checks if student has already submitted (deterministic result ID: `${uid}_${quizId}`).
 * 2. Writes an initial submission record with completed: false.
 * 3. Fetches the answer key from `/quizAnswers/{quizId}` (authorized by Firestore rule existence check).
 * 4. Calculates score and finalizes document with completed: true.
 * 
 * @param {string} quizId 
 * @param {object} studentAnswers - Map of { [questionIndex]: selectedOptionIndex }
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Promise<object>}
 */
export async function submitQuiz(quizId, studentAnswers, timeTaken) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to submit a quiz.');
  }
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  const resultId = `${currentUser.uid}_${quizId}`;
  const resultDocRef = doc(db, 'results', resultId);

  // 1. Check for duplicate submission
  try {
    const existingSnap = await getDoc(resultDocRef);
    if (existingSnap.exists()) {
      throw new Error('You have already submitted this quiz. Multiple attempts are not permitted.');
    }
  } catch (err) {
    if (err.message.includes('Multiple attempts')) {
      throw err;
    }
    // Proceed if document does not exist
  }

  // 2. Fetch quiz details
  const quizDocRef = doc(db, 'quizzes', quizId);
  const quizSnap = await getDoc(quizDocRef);
  if (!quizSnap.exists()) {
    throw new Error('Quiz not found or no longer available.');
  }
  const quizData = quizSnap.data();

  // 3. Write initial result document (completed: false)
  const initialData = {
    studentId: currentUser.uid,
    studentName: currentUser.displayName || 'Anonymous Student',
    studentEmail: currentUser.email,
    quizId: quizId,
    quizTitle: quizData.title,
    facultyId: quizData.createdBy,
    totalMarks: quizData.totalMarks || 0,
    answers: studentAnswers,
    timeTaken: Number(timeTaken) || 0,
    completed: false,
    submittedAt: serverTimestamp()
  };

  await setDoc(resultDocRef, initialData);

  // 4. Fetch the answer key now that submission record exists
  let calculatedScore = 0;
  let answerKey = [];
  try {
    const answerDocRef = doc(db, 'quizAnswers', quizId);
    const answerSnap = await getDoc(answerDocRef);
    if (answerSnap.exists()) {
      answerKey = answerSnap.data().answers || [];
      answerKey.forEach((item) => {
        const studentChoice = studentAnswers[item.questionIndex];
        if (studentChoice !== undefined && Number(studentChoice) === Number(item.correctAnswer)) {
          calculatedScore += Number(item.marks) || 1;
        }
      });
    }
  } catch (err) {
    console.warn('[resultService.submitQuiz] Warning reading answer key:', err);
  }

  // 5. Finalize the result document (completed: true locks the document against edits)
  await updateDoc(resultDocRef, {
    score: calculatedScore,
    completed: true,
    finalizedAt: serverTimestamp()
  });

  return {
    resultId,
    quizId,
    quizTitle: quizData.title,
    score: calculatedScore,
    totalMarks: quizData.totalMarks || 0,
    timeTaken,
    answers: studentAnswers,
    answerKey
  };
}

/**
 * Fetch a single result document by ID.
 * 
 * @param {string} resultId 
 * @returns {Promise<object | null>}
 */
export async function getResultById(resultId) {
  if (!resultId) return null;

  try {
    const docRef = doc(db, 'results', resultId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  } catch (error) {
    console.error('[resultService.getResultById] Error:', error);
    throw error;
  }
}

/**
 * Get all past results for a specific student.
 * 
 * @param {string} userId 
 * @returns {Promise<Array<object>>}
 */
export async function getUserResults(userId) {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  try {
    const resultsRef = collection(db, 'results');
    const q = query(
      resultsRef,
      where('studentId', '==', userId)
    );
    const snapshot = await getDocs(q);

    const results = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    return results.sort((a, b) => {
      const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
      const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('[resultService.getUserResults] Error fetching user results:', error);
    throw error;
  }
}

/**
 * Get all student submissions for a specific quiz (Faculty view).
 * 
 * @param {string} quizId 
 * @returns {Promise<Array<object>>}
 */
export async function getQuizResults(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const resultsRef = collection(db, 'results');
    const q = query(
      resultsRef,
      where('quizId', '==', quizId)
    );
    const snapshot = await getDocs(q);

    const results = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    return results.sort((a, b) => {
      // Highest score first, then lowest time taken
      if (b.score !== a.score) {
        return (b.score || 0) - (a.score || 0);
      }
      return (a.timeTaken || 0) - (b.timeTaken || 0);
    });
  } catch (error) {
    console.error('[resultService.getQuizResults] Error fetching quiz results:', error);
    throw error;
  }
}

/**
 * Get public leaderboard rankings for a completed quiz.
 * 
 * @param {string} quizId 
 * @returns {Promise<Array<object>>}
 */
export async function getLeaderboard(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const resultsRef = collection(db, 'results');
    const q = query(
      resultsRef,
      where('quizId', '==', quizId),
      where('completed', '==', true)
    );
    const snapshot = await getDocs(q);

    const leaderboard = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        studentName: data.studentName || 'Student',
        score: data.score || 0,
        totalMarks: data.totalMarks || 0,
        timeTaken: data.timeTaken || 0,
        submittedAt: data.submittedAt
      };
    });

    // Rank by score descending, then timeTaken ascending
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeTaken - b.timeTaken;
    });

    return leaderboard.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  } catch (error) {
    console.error('[resultService.getLeaderboard] Error fetching leaderboard:', error);
    throw error;
  }
}
