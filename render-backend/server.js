
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 10000;

const db = (() => {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return admin.firestore();
})();

const MAX_TIME_TAKEN_SECONDS = 24 * 60 * 60;
const MAX_QUESTIONS = 200;
const MAX_OPTIONS_PER_QUESTION = 20;

// ==========================================
// Middleware
// ==========================================

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "100kb" }));

// ==========================================
// Error handling
// ==========================================

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function handleError(res, error) {
  console.error("API error:", error.message);

  const status = error.status || 500;

  res.status(status).json({
    error:
      status === 500
        ? "Internal server error."
        : error.message,
  });
}

// ==========================================
// Authentication
// ==========================================

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required.");
    }

    const token = authorization.substring(7);

    req.user = await admin.auth().verifyIdToken(token);

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return handleError(res, error);
    }

    return res.status(401).json({
      error: "Invalid or expired authentication token.",
    });
  }
}

async function getUserProfile(uid) {
  const snapshot = await db.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw new ApiError(
      403,
      "A registered user profile is required."
    );
  }

  return snapshot.data() || {};
}

// ==========================================
// Validation helpers
// ==========================================

function validateQuizId(quizId) {
  if (
    typeof quizId !== "string" ||
    !quizId.trim() ||
    quizId.trim().length > 200
  ) {
    throw new ApiError(400, "A valid quizId is required.");
  }

  return quizId.trim();
}

async function getQuizAndAnswerKey(quizId) {
  const quizRef = db.collection("quizzes").doc(quizId);
  const answerRef = db.collection("quizAnswers").doc(quizId);

  const [quizSnap, answerSnap] = await Promise.all([
    quizRef.get(),
    answerRef.get(),
  ]);

  if (!quizSnap.exists) {
    throw new ApiError(404, "Quiz not found.");
  }

  if (!answerSnap.exists) {
    throw new ApiError(
      412,
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
    throw new ApiError(
      412,
      "Quiz ownership or answer-key ownership is invalid."
    );
  }

  if (
    answerKey.quizId !== undefined &&
    answerKey.quizId !== quizId
  ) {
    throw new ApiError(
      412,
      "The answer key does not belong to this quiz."
    );
  }

  const questions = quiz.questions;

  if (
    !Array.isArray(questions) ||
    questions.length === 0 ||
    questions.length > MAX_QUESTIONS
  ) {
    throw new ApiError(
      412,
      "The quiz has an invalid number of questions."
    );
  }

  const rawAnswers = answerKey.answers;

  if (
    !Array.isArray(rawAnswers) ||
    rawAnswers.length !== questions.length
  ) {
    throw new ApiError(
      412,
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
      throw new ApiError(
        412,
        `Question ${i + 1} has invalid options.`
      );
    }

    const marks =
      question.marks === undefined ? 1 : question.marks;

    if (
      typeof marks !== "number" ||
      !Number.isFinite(marks) ||
      marks <= 0
    ) {
      throw new ApiError(
        412,
        `Question ${i + 1} has invalid marks.`
      );
    }
  }

  for (const item of rawAnswers) {
    if (!item || typeof item !== "object") {
      throw new ApiError(
        412,
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
      throw new ApiError(
        412,
        "The answer key contains an invalid or duplicate question index."
      );
    }

    const question = questions[questionIndex];

    if (
      !Number.isInteger(correctAnswer) ||
      correctAnswer < 0 ||
      correctAnswer >= question.options.length
    ) {
      throw new ApiError(
        412,
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
      throw new ApiError(
        412,
        `The answer-key marks for Question ${questionIndex + 1} do not match the quiz.`
      );
    }

    answerMap.set(questionIndex, {
      correctAnswer,
      marks: questionMarks,
    });
  }

  if (answerMap.size !== questions.length) {
    throw new ApiError(
      412,
      "The answer key does not cover every question."
    );
  }

  const totalMarks = questions.reduce(
    (sum, question) =>
      sum + (question.marks === undefined ? 1 : question.marks),
    0
  );

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    throw new ApiError(
      412,
      "The quiz total marks are invalid."
    );
  }

  return {
    quiz,
    questions,
    answerMap,
    totalMarks,
  };
}

// ==========================================
// Health check
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "Quiz API",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Quiz Platform API",
  });
});

// ==========================================
// 1. Submit Quiz
// ==========================================

app.post("/api/submit-quiz", authenticate, async (req, res) => {
  try {
    const studentUid = req.user.uid;
    const payload = req.body;

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new ApiError(
        400,
        "A valid request payload is required."
      );
    }

    const allowedFields = ["quizId", "answers", "timeTaken"];

    if (
      Object.keys(payload).some(
        (key) => !allowedFields.includes(key)
      )
    ) {
      throw new ApiError(
        400,
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
      throw new ApiError(
        400,
        "Answers must be an object mapping question indices to selected option indices."
      );
    }

    if (
      typeof timeTaken !== "number" ||
      !Number.isFinite(timeTaken) ||
      timeTaken < 0 ||
      timeTaken > MAX_TIME_TAKEN_SECONDS
    ) {
      throw new ApiError(
        400,
        "timeTaken must be a number between 0 and 86400 seconds."
      );
    }

    const cleanTimeTaken = Math.round(timeTaken);

    const userData = await getUserProfile(studentUid);

    if (userData.role !== "student") {
      throw new ApiError(
        403,
        "Only registered students can submit quizzes."
      );
    }

    const { quiz, questions, answerMap, totalMarks } =
      await getQuizAndAnswerKey(quizId);

    if (quiz.isPublished !== true) {
      throw new ApiError(
        412,
        "This quiz is not currently accepting submissions."
      );
    }

    const sanitizedAnswers = {};
    const answerEntries = Object.entries(answers);

    if (answerEntries.length > questions.length) {
      throw new ApiError(
        400,
        "Too many answers were submitted."
      );
    }

    for (const [key, value] of answerEntries) {
      if (!/^(0|[1-9]\d*)$/.test(key)) {
        throw new ApiError(
          400,
          `Invalid question index: ${key}.`
        );
      }

      const questionIndex = Number(key);

      if (
        !Number.isSafeInteger(questionIndex) ||
        questionIndex < 0 ||
        questionIndex >= questions.length
      ) {
        throw new ApiError(
          400,
          `Question index ${key} is outside the valid range.`
        );
      }

      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value >= questions[questionIndex].options.length
      ) {
        throw new ApiError(
          400,
          `Invalid selected option for Question ${questionIndex + 1}.`
        );
      }

      sanitizedAnswers[questionIndex] = value;
    }

    // Server-side grading only.
    let calculatedScore = 0;

    for (const [key, selectedChoice] of Object.entries(
      sanitizedAnswers
    )) {
      const questionIndex = Number(key);
      const answerInfo = answerMap.get(questionIndex);

      if (selectedChoice === answerInfo.correctAnswer) {
        calculatedScore += answerInfo.marks;
      }
    }

    const resultId = `${studentUid}_${quizId}`;

    const resultRef = db.collection("results").doc(resultId);
    const leaderboardRef = db
      .collection("leaderboards")
      .doc(resultId);

    const studentName = userData.name || "Student";
    const studentEmail = userData.email || "";

    // Atomic transaction prevents duplicate submissions.
    await db.runTransaction(async (transaction) => {
      const existingResult = await transaction.get(resultRef);

      if (existingResult.exists) {
        throw new ApiError(
          409,
          "You have already submitted this quiz."
        );
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

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
        finalizedAt: now,
      });

      transaction.set(leaderboardRef, {
        studentId: studentUid,
        studentName,
        facultyId: quiz.createdBy,
        quizId,
        score: calculatedScore,
        totalMarks,
        timeTaken: cleanTimeTaken,
        submittedAt: now,
      });
    });

    res.status(200).json({
      resultId,
      quizId,
      quizTitle: quiz.title || "Quiz",
      score: calculatedScore,
      totalMarks,
      timeTaken: cleanTimeTaken,
      answers: sanitizedAnswers,
      completed: true,
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ==========================================
// 2. Get Quiz Review
// ==========================================

app.post("/api/quiz-review", authenticate, async (req, res) => {
  try {
    const uid = req.user.uid;
    const payload = req.body;

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.keys(payload).some((key) => key !== "quizId")
    ) {
      throw new ApiError(
        400,
        "Provide only a valid quizId."
      );
    }

    const quizId = validateQuizId(payload.quizId);
    const userData = await getUserProfile(uid);

    if (!["student", "faculty"].includes(userData.role)) {
      throw new ApiError(
        403,
        "Your account is not authorized to review quizzes."
      );
    }

    const { quiz, questions, answerMap } =
      await getQuizAndAnswerKey(quizId);

    const isFacultyCreator =
      userData.role === "faculty" && quiz.createdBy === uid;

    if (
      userData.role === "faculty" &&
      !isFacultyCreator
    ) {
      throw new ApiError(
        403,
        "Faculty can review only quizzes they created."
      );
    }

    if (userData.role === "student") {
      const resultId = `${uid}_${quizId}`;

      const resultSnap = await db
        .collection("results")
        .doc(resultId)
        .get();

      const result = resultSnap.data();

      if (
        !resultSnap.exists ||
        result?.studentId !== uid ||
        result?.quizId !== quizId ||
        result?.completed !== true
      ) {
        throw new ApiError(
          403,
          "You can review answers only after submitting this quiz."
        );
      }
    }

    // Return the answer key only after authorization.
    res.status(200).json({
      quizId,
      answerKey: questions.map((question, questionIndex) => {
        const answer = answerMap.get(questionIndex);

        return {
          questionIndex,
          correctAnswer: answer.correctAnswer,
          marks: answer.marks,
        };
      }),
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found.",
  });
});

// ==========================================
// Start server
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Quiz API running on port ${PORT}`);
});
