import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../firebase/config';

/**
 * Submit answers for a quiz using secure server-side Cloud Function.
 * 
 * Flow:
 * 1. Validates that current user is authenticated.
 * 2. Invokes callable Cloud Function 'submitQuiz' with quizId, studentAnswers, and timeTaken.
 * 3. Server-side Cloud Function authenticates caller, verifies student role, grades
 *    answers against restricted answer key, executes transactional duplicate prevention,
 *    and writes finalized result and leaderboard entries.
 * 4. Returns authoritative result summary without exposing answer key.
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

  try {
    const submitQuizFn = httpsCallable(functions, 'submitQuiz');
    const response = await submitQuizFn({
      quizId,
      answers: studentAnswers || {},
      timeTaken: Number(timeTaken) || 0
    });

    return response.data;
  } catch (error) {
    console.error('[resultService.submitQuiz] Cloud Function grading failed:', error);
    // Extract clean error message from Firebase HttpsError
    const message = error.message || 'Failed to submit quiz. Please try again.';
    throw new Error(message);
  }
}

/**
 * Retrieve authorized quiz review data (correct answers & question breakdown).
 * 
 * Secure Cloud Function ensures that:
 * - Only students with a completed submission or faculty creators can view the answer key.
 * - Answer key is never exposed via direct client Firestore queries.
 * 
 * @param {string} quizId 
 * @returns {Promise<{ quizId: string, answerKey: Array<{ questionIndex: number, correctAnswer: number, marks: number }> }>}
 */
export async function getResultReview(quizId) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be logged in to review quiz results.');
  }
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const getQuizReviewFn = httpsCallable(functions, 'getQuizReview');
    const response = await getQuizReviewFn({ quizId });
    return response.data;
  } catch (error) {
    console.error('[resultService.getResultReview] Error retrieving review breakdown:', error);
    throw new Error(error.message || 'Failed to retrieve quiz review breakdown.');
  }
}

/**
 * Fetch a single result document by ID.
 * Authorized for the student who submitted it or the faculty who created the quiz.
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
 * Compatible with Firestore security rules:
 * resource.data.studentId == request.auth.uid
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
 * Compatible with Firestore security rules:
 * isFaculty() && resource.data.facultyId == request.auth.uid
 * 
 * @param {string} quizId 
 * @returns {Promise<Array<object>>}
 */
export async function getQuizResults(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const currentUser = auth.currentUser;
    const facultyId = currentUser ? currentUser.uid : '';

    const resultsRef = collection(db, 'results');
    const q = query(
      resultsRef,
      where('quizId', '==', quizId),
      where('facultyId', '==', facultyId)
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
 * Queries sanitized public leaderboard collection to maintain student privacy
 * while adhering to Firestore security rules.
 * 
 * @param {string} quizId 
 * @returns {Promise<Array<object>>}
 */
export async function getLeaderboard(quizId) {
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  try {
    const leaderboardsRef = collection(db, 'leaderboards');
    const q = query(
      leaderboardsRef,
      where('quizId', '==', quizId)
    );
    const snapshot = await getDocs(q);

    let entries = [];
    if (!snapshot.empty) {
      entries = snapshot.docs.map(docSnap => {
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
    } else {
      // Fallback for faculty creator: query results collection with facultyId constraint
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const resultsRef = collection(db, 'results');
          const fallbackQ = query(
            resultsRef,
            where('quizId', '==', quizId),
            where('facultyId', '==', currentUser.uid)
          );
          const fallbackSnap = await getDocs(fallbackQ);
          entries = fallbackSnap.docs.map(docSnap => {
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
        } catch {
          // If fallback fails, return empty entries
        }
      }
    }

    // Rank by score descending, then timeTaken ascending
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeTaken - b.timeTaken;
    });

    return entries.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  } catch (error) {
    console.error('[resultService.getLeaderboard] Error fetching leaderboard:', error);
    throw error;
  }
}
