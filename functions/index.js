const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

/**
 * Callable Cloud Function: submitQuiz
 * 
 * Secure server-side quiz grading and result creation.
 * 
 * Security guarantees:
 * 1. Enforces user authentication via Firebase Auth context.
 * 2. Uses authenticated UID (`request.auth.uid`), ignoring any client-provided student ID.
 * 3. Accepts only `quizId`, `answers`, and `timeTaken`.
 * 4. Strictly validates all payload data types, bounds, and structures.
 * 5. Verifies the quiz exists and is actively published.
 * 6. Verifies that the caller has the 'student' role.
 * 7. Reads the authoritative answer key from the restricted `/quizAnswers` collection via Admin SDK.
 * 8. Validates that every submitted question index and option choice is within valid bounds.
 * 9. Authoritatively computes score and total marks on the server.
 * 10. Uses a deterministic result ID (`${uid}_${quizId}`) and a Firestore transaction
 *     to prevent duplicate or concurrent submission attempts.
 * 11. Stores finalized result and sanitized leaderboard records atomically.
 * 12. Returns the result summary without exposing the full answer key.
 */
exports.submitQuiz = onCall(async (request) => {
  // 1. Authentication check
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required. You must be signed in to submit a quiz."
    );
  }

  const studentUid = request.auth.uid;
  const payload = request.data || {};

  // 2. Extract and validate only the permitted client fields: quizId, answers, timeTaken
  const { quizId, answers, timeTaken } = payload;

  if (!quizId || typeof quizId !== "string" || !quizId.trim()) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid or missing quizId. A non-empty string is required."
    );
  }
  const cleanQuizId = quizId.trim();

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid answers format. Answers must be an object mapping question indices to selected option indices."
    );
  }

  const parsedTimeTaken = Number(timeTaken);
  if (isNaN(parsedTimeTaken) || parsedTimeTaken < 0) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid timeTaken. Time taken must be a non-negative number of seconds."
    );
  }
  const cleanTimeTaken = Math.max(0, Math.round(parsedTimeTaken));

  // 3. Verify user profile and student role
  const userDocRef = db.collection("users").doc(studentUid);
  const userSnap = await userDocRef.get();

  if (!userSnap.exists) {
    throw new HttpsError(
      "not-found",
      "Student user profile not found in database."
    );
  }

  const userData = userSnap.data() || {};
  if (userData.role !== "student") {
    throw new HttpsError(
      "permission-denied",
      "Access denied. Only registered students are permitted to submit quizzes."
    );
  }

  // 4. Verify quiz exists and is published
  const quizDocRef = db.collection("quizzes").doc(cleanQuizId);
  const quizSnap = await quizDocRef.get();

  if (!quizSnap.exists) {
    throw new HttpsError(
      "not-found",
      "The specified quiz does not exist or has been removed."
    );
  }

  const quizData = quizSnap.data() || {};
  if (!quizData.isPublished) {
    throw new HttpsError(
      "failed-precondition",
      "This quiz is not currently accepting submissions."
    );
  }

  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  if (questions.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "The specified quiz has no questions available."
    );
  }

  // 5. Retrieve authoritative answer key using Firebase Admin SDK
  const answerKeyDocRef = db.collection("quizAnswers").doc(cleanQuizId);
  const answerKeySnap = await answerKeyDocRef.get();

  if (!answerKeySnap.exists) {
    throw new HttpsError(
      "internal",
      "Unable to grade quiz: Authoritative answer key could not be retrieved."
    );
  }

  const answerKeyData = answerKeySnap.data() || {};
  const rawKeyList = Array.isArray(answerKeyData.answers) ? answerKeyData.answers : [];

  // Build answer key lookup map: questionIndex -> { correctAnswer, marks }
  const answerKeyMap = new Map();
  rawKeyList.forEach((item) => {
    const qIndex = Number(item.questionIndex);
    answerKeyMap.set(qIndex, {
      correctAnswer: Number(item.correctAnswer),
      marks: Number(item.marks) || 1
    });
  });

  // Calculate authoritative total marks from quiz question definitions
  const authoritativeTotalMarks = questions.reduce(
    (sum, q) => sum + (Number(q.marks) || 1),
    0
  );

  // 6. Validate submitted question indices and choices
  const totalQuestions = questions.length;
  const sanitizedAnswers = {};

  for (const [key, value] of Object.entries(answers)) {
    const qIndex = Number(key);
    if (!Number.isInteger(qIndex) || qIndex < 0 || qIndex >= totalQuestions) {
      throw new HttpsError(
        "invalid-argument",
        `Submitted question index '${key}' is invalid. Quiz contains ${totalQuestions} questions.`
      );
    }

    const selectedChoice = Number(value);
    const questionObj = questions[qIndex];
    const optionCount = Array.isArray(questionObj.options) ? questionObj.options.length : 0;

    if (!Number.isInteger(selectedChoice) || selectedChoice < 0 || selectedChoice >= optionCount) {
      throw new HttpsError(
        "invalid-argument",
        `Selected choice '${value}' is out of bounds for Question ${qIndex + 1} (options range: 0 to ${optionCount - 1}).`
      );
    }

    sanitizedAnswers[qIndex] = selectedChoice;
  }

  // 7. Calculate server-side score against authoritative answer key
  let calculatedScore = 0;
  for (const [qIndexStr, selectedChoice] of Object.entries(sanitizedAnswers)) {
    const qIndex = Number(qIndexStr);
    const keyInfo = answerKeyMap.get(qIndex);
    if (keyInfo && selectedChoice === keyInfo.correctAnswer) {
      calculatedScore += keyInfo.marks;
    }
  }

  // 8. Enforce single submission with deterministic result ID & Firestore transaction
  const resultId = `${studentUid}_${cleanQuizId}`;
  const resultDocRef = db.collection("results").doc(resultId);
  const leaderboardDocRef = db.collection("leaderboards").doc(resultId);

  const studentName = userData.name || request.auth.token.name || "Student";
  const studentEmail = userData.email || request.auth.token.email || "";

  await db.runTransaction(async (transaction) => {
    const existingResultSnap = await transaction.get(resultDocRef);
    if (existingResultSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "You have already submitted this quiz. Multiple attempts are not permitted."
      );
    }

    // Authoritative result document
    const resultPayload = {
      studentId: studentUid,
      studentName: studentName,
      studentEmail: studentEmail,
      facultyId: quizData.createdBy || "",
      quizId: cleanQuizId,
      quizTitle: quizData.title || "Quiz",
      score: calculatedScore,
      totalMarks: authoritativeTotalMarks,
      timeTaken: cleanTimeTaken,
      answers: sanitizedAnswers,
      completed: true,
      submittedAt: FieldValue.serverTimestamp(),
      finalizedAt: FieldValue.serverTimestamp()
    };

    transaction.set(resultDocRef, resultPayload);

    // Sanitized leaderboard entry (omits student answers for student privacy)
    transaction.set(leaderboardDocRef, {
      studentId: studentUid,
      studentName: studentName,
      facultyId: quizData.createdBy || "",
      quizId: cleanQuizId,
      score: calculatedScore,
      totalMarks: authoritativeTotalMarks,
      timeTaken: cleanTimeTaken,
      submittedAt: FieldValue.serverTimestamp()
    });
  });

  // 9. Return summary without exposing full answer key
  return {
    resultId: resultId,
    quizId: cleanQuizId,
    quizTitle: quizData.title,
    score: calculatedScore,
    totalMarks: authoritativeTotalMarks,
    timeTaken: cleanTimeTaken,
    answers: sanitizedAnswers,
    completed: true
  };
});

/**
 * Callable Cloud Function: getQuizReview
 * 
 * Secure result-review mechanism.
 * Returns correct answers only to:
 * - A student who has already completed and submitted this quiz.
 * - The faculty creator of the quiz.
 */
exports.getQuizReview = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required. You must be signed in to review quiz results."
    );
  }

  const uid = request.auth.uid;
  const { quizId } = request.data || {};

  if (!quizId || typeof quizId !== "string" || !quizId.trim()) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid or missing quizId. A non-empty string is required."
    );
  }
  const cleanQuizId = quizId.trim();

  // Fetch quiz to check faculty ownership
  const quizDocRef = db.collection("quizzes").doc(cleanQuizId);
  const quizSnap = await quizDocRef.get();

  if (!quizSnap.exists) {
    throw new HttpsError("not-found", "Quiz not found.");
  }

  const quizData = quizSnap.data() || {};
  const isCreatorFaculty = quizData.createdBy === uid;

  // If not the faculty creator, verify that the student has completed a submission
  if (!isCreatorFaculty) {
    const resultDocRef = db.collection("results").doc(`${uid}_${cleanQuizId}`);
    const resultSnap = await resultDocRef.get();

    if (!resultSnap.exists || !resultSnap.data()?.completed) {
      throw new HttpsError(
        "permission-denied",
        "Access denied. You may only review answers after completing and submitting the quiz."
      );
    }
  }

  // Retrieve answer key securely via Admin SDK
  const answerDocRef = db.collection("quizAnswers").doc(cleanQuizId);
  const answerSnap = await answerDocRef.get();

  if (!answerSnap.exists) {
    throw new HttpsError("not-found", "Answer key not found for this quiz.");
  }

  const rawAnswers = Array.isArray(answerSnap.data()?.answers) ? answerSnap.data().answers : [];

  return {
    quizId: cleanQuizId,
    answerKey: rawAnswers.map((item) => ({
      questionIndex: Number(item.questionIndex),
      correctAnswer: Number(item.correctAnswer),
      marks: Number(item.marks) || 1
    }))
  };
});
