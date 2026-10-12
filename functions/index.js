
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
initializeApp();

const db = getFirestore();

const MAX_TIME_TAKEN_SECONDS = 24 * 60 * 60;
const MAX_QUESTIONS = 200;
const MAX_OPTIONS_PER_QUESTION = 20;

// ==========================================
// Shared Validation Helpers
// ==========================================

function validateQuizId(quizId) {
  if (
    typeof quizId !== "string" ||
    !quizId.trim() ||
    quizId.trim().length > 200
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A valid quizId is required."
    );
  }

  return quizId.trim();
}

async function getUserProfile(uid) {
  const snapshot = await db.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw new HttpsError(
      "permission-denied",
      "A registered user profile is required."
    );
  }

  return snapshot.data() || {};
}

async function getQuizAndAnswerKey(quizId) {
  const quizRef = db.collection("quizzes").doc(quizId);
  const answerRef = db.collection("quizAnswers").doc(quizId);

  const [quizSnap, answerSnap] = await Promise.all([
    quizRef.get(),
    answerRef.get()
  ]);

  if (!quizSnap.exists) {
    throw new HttpsError("not-found", "Quiz not found.");
  }

  if (!answerSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "The quiz answer key is missing."
    );
  }

  const quiz = quizSnap.data() || {};
  const answerKey = answerSnap.data() || {};

  if (
    typeof quiz.createdBy !== "string" ||
    !quiz.createdBy ||
    answerKey.createdBy !== quiz.createdBy
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Quiz ownership or answer-key ownership is invalid."
    );
  }

  if (
    answerKey.quizId !== undefined &&
    answerKey.quizId !== quizId
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The answer key does not belong to this quiz."
    );
  }

  const questions = quiz.questions;

  if (
    !Array.isArray(questions) ||
    questions.length === 0 ||
    questions.length > MAX_QUESTIONS
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The quiz has an invalid number of questions."
    );
  }

  const rawAnswers = answerKey.answers;

  if (
    !Array.isArray(rawAnswers) ||
    rawAnswers.length !== questions.length
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The answer key is incomplete."
    );
  }

  const answerMap = new Map();

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    if (
      !question ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > MAX_OPTIONS_PER_QUESTION
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Question ${i + 1} has invalid options.`
      );
    }

    const marks = question.marks === undefined ? 1 : question.marks;

    if (
      typeof marks !== "number" ||
      !Number.isFinite(marks) ||
      marks <= 0
    ) {
      throw new HttpsError(
        "failed-precondition",
        `Question ${i + 1} has invalid marks.`
      );
    }
  }

  for (const item of rawAnswers) {
    if (!item || typeof item !== "object") {
      throw new HttpsError(
        "failed-precondition",
        "The answer key contains an invalid entry."
      );
    }

    const { questionIndex, correctAnswer } = item;

    if (
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= questions.length ||
      answerMap.has(questionIndex)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "The answer key contains an invalid or duplicate question index."
      );
    }

    const question = questions[questionIndex];

    if (
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer >= question.options.length
    ) {
      throw new HttpsError(
        "failed-precondition",
        `The answer key for Question ${questionIndex + 1} is invalid.`
      );
    }

    const questionMarks =
      question.marks === undefined ? 1 : question.marks;

    if (
      item.marks !== undefined &&
      (
        typeof item.marks !== "number" ||
        !Number.isFinite(item.marks) ||
        item.marks !== questionMarks
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        `The answer-key marks for Question ${questionIndex + 1} do not match the quiz.`
      );
    }

    answerMap.set(questionIndex, {
      correctAnswer,
      marks: questionMarks
    });
  }

  if (answerMap.size !== questions.length) {
    throw new HttpsError(
      "failed-precondition",
      "The answer key does not cover every question."
    );
  }

  const totalMarks = questions.reduce(
    (sum, question) =>
      sum + (question.marks === undefined ? 1 : question.marks),
    0
  );

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "The quiz total marks are invalid."
    );
  }

  return {
    quiz,
    questions,
    answerMap,
    totalMarks
  };
}

// ==========================================
// 1. submitQuiz
// Secure server-side grading and result creation
// ==========================================

exports.submitQuiz = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must sign in to submit a quiz."
    );
  }

  const studentUid = request.auth.uid;
  const payload = request.data;

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A valid request payload is required."
    );
  }

  // Reject all client fields except the three permitted fields.
  const allowedFields = ["quizId", "answers", "timeTaken"];

  if (Object.keys(payload).some((key) => !allowedFields.includes(key))) {
    throw new HttpsError(
      "invalid-argument",
      "The request contains unsupported fields."
    );
  }

  const quizId = validateQuizId(payload.quizId);
  const { answers, timeTaken } = payload;

  if (
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Answers must be an object mapping question indices to selected option indices."
    );
  }

  if (
    typeof timeTaken !== "number" ||
    !Number.isFinite(timeTaken) ||
    timeTaken < 0 ||
    timeTaken > MAX_TIME_TAKEN_SECONDS
  ) {
    throw new HttpsError(
      "invalid-argument",
      "timeTaken must be a number between 0 and 86400 seconds."
    );
  }

  const cleanTimeTaken = Math.round(timeTaken);

  // Verify the registered student role.
  const userData = await getUserProfile(studentUid);

  if (userData.role !== "student") {
    throw new HttpsError(
      "permission-denied",
      "Only registered students can submit quizzes."
    );
  }

  // Load the quiz and its authoritative answer key.
  const { quiz, questions, answerMap, totalMarks } =
    await getQuizAndAnswerKey(quizId);

  if (quiz.isPublished !== true) {
    throw new HttpsError(
      "failed-precondition",
      "This quiz is not currently accepting submissions."
    );
  }

  // Validate and sanitize each submitted answer.
  const sanitizedAnswers = {};
  const answerEntries = Object.entries(answers);

  if (answerEntries.length > questions.length) {
    throw new HttpsError(
      "invalid-argument",
      "Too many answers were submitted."
    );
  }

  for (const [key, value] of answerEntries) {
    // Only canonical non-negative integer indices are accepted.
    if (!/^(0|[1-9]\d*)$/.test(key)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid question index: ${key}.`
      );
    }

    const questionIndex = Number(key);

    if (
      !Number.isSafeInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= questions.length
    ) {
      throw new HttpsError(
        "invalid-argument",
        `Question index ${key} is outside the valid range.`
      );
    }

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value >= questions[questionIndex].options.length
    ) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid selected option for Question ${questionIndex + 1}.`
      );
    }

    sanitizedAnswers[questionIndex] = value;
  }

  // Calculate the score using only server-controlled quiz data.
  let calculatedScore = 0;

  for (const [key, selectedChoice] of Object.entries(sanitizedAnswers)) {
    const questionIndex = Number(key);
    const answerInfo = answerMap.get(questionIndex);

    if (selectedChoice === answerInfo.correctAnswer) {
      calculatedScore += answerInfo.marks;
    }
  }

  const resultId = `${studentUid}_${quizId}`;
  const resultRef = db.collection("results").doc(resultId);
  const leaderboardRef = db.collection("leaderboards").doc(resultId);

  const studentName =
    userData.name || request.auth.token.name || "Student";

  const studentEmail =
    userData.email || request.auth.token.email || "";

  // Transaction prevents duplicate submissions and partial writes.
  await db.runTransaction(async (transaction) => {
    const existingResult = await transaction.get(resultRef);

    if (existingResult.exists) {
      throw new HttpsError(
        "already-exists",
        "You have already submitted this quiz."
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.create(resultRef, {
      studentId: studentUid,
      studentName,
      studentEmail,
      facultyId: quiz.createdBy,
      quizId,
      quizTitle: quiz.title || "Quiz",
      score: calculatedScore,
      totalMarks,
      timeTaken: cleanTimeTaken,
      answers: sanitizedAnswers,
      completed: true,
      submittedAt: now,
      finalizedAt: now
    });

    transaction.set(leaderboardRef, {
      studentId: studentUid,
      studentName,
      facultyId: quiz.createdBy,
      quizId,
      score: calculatedScore,
      totalMarks,
      timeTaken: cleanTimeTaken,
      submittedAt: now
    });
  });

  // Return the score summary, not the correct-answer key.
  return {
    resultId,
    quizId,
    quizTitle: quiz.title || "Quiz",
    score: calculatedScore,
    totalMarks,
    timeTaken: cleanTimeTaken,
    answers: sanitizedAnswers,
    completed: true
  };
});

// ==========================================
// 2. getQuizReview
// Return answers only to the quiz's faculty creator
// or a student who has already submitted it.
// ==========================================

exports.getQuizReview = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must sign in to review a quiz."
    );
  }

  const uid = request.auth.uid;
  const payload = request.data;

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).some((key) => key !== "quizId")
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Provide only a valid quizId."
    );
  }

  const quizId = validateQuizId(payload.quizId);

  // Verify the caller's registered role.
  const userData = await getUserProfile(uid);

  if (!["student", "faculty"].includes(userData.role)) {
    throw new HttpsError(
      "permission-denied",
      "Your account is not authorized to review quizzes."
    );
  }

  const { quiz, questions, answerMap } =
    await getQuizAndAnswerKey(quizId);

  const isFacultyCreator =
    userData.role === "faculty" &&
    quiz.createdBy === uid;

  if (userData.role === "faculty" && !isFacultyCreator) {
    throw new HttpsError(
      "permission-denied",
      "Faculty can review only quizzes they created."
    );
  }

  if (userData.role === "student") {
    const resultId = `${uid}_${quizId}`;
    const resultSnap = await db.collection("results").doc(resultId).get();

    if (
      !resultSnap.exists ||
      resultSnap.data()?.studentId !== uid ||
      resultSnap.data()?.quizId !== quizId ||
      resultSnap.data()?.completed !== true
    ) {
      throw new HttpsError(
        "permission-denied",
        "You can review answers only after submitting this quiz."
      );
    }
  }

  // Return the answer key only after the authorization checks above.
  return {
    quizId,
    answerKey: questions.map((question, questionIndex) => {
      const answer = answerMap.get(questionIndex);

      return {
        questionIndex,
        correctAnswer: answer.correctAnswer,
        marks: answer.marks
      };
    })
  };
});
