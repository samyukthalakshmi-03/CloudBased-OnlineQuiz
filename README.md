# Cloud-Based Online Quiz Platform

A cloud-native, serverless online quiz platform built for academia and certification testing as a **Cloud Computing Mini-Project**. The platform demonstrates how serverless cloud primitives—specifically **Firebase Authentication**, **Cloud Firestore NoSQL Database**, **Firebase Cloud Functions (Serverless Compute)**, and **Firebase Hosting**—can be combined to deliver a secure, multi-tenant, role-based application with zero dedicated application server infrastructure.

---

## 1. Project Overview

The Cloud-Based Online Quiz Platform enables educational institutions to conduct timed multiple-choice assessments in the cloud. It features distinct interfaces and role-based capabilities for **Students** and **Faculty**:

* **Student Capabilities:**
  * Self-service registration and login.
  * Real-time listing of active, published quizzes.
  * Quiz attempt engine with synchronized countdown timer.
  * Automatic submission upon timer expiration.
  * **Secure server-side score computation via Firebase Cloud Functions**.
  * Instant score summary and authorized post-submission question review.
  * Past quiz attempt history with accuracy metrics.
  * Dynamic quiz leaderboards ranked by score and completion time.
  * Multi-layer protection against duplicate attempts (deterministic result IDs & Firestore transactions).

* **Faculty Capabilities:**
  * Dedicated faculty dashboard.
  * Interactive MCQ question builder (add/remove options, specify marks, set correct answer).
  * Quiz draft/publish toggle.
  * Live quiz editing and deletion.
  * Student submission inspection with aggregate analytics (average score, highest score, lowest score).
  * Isolated answer keys stored in restricted collections.

---

## 2. Technology Stack

| Layer | Technology | Role & Architecture Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React.js (v18) with Vite | Fast Single Page Application (SPA), component modularity |
| **Language** | JavaScript (ESModules / Node.js) | Native browser execution with modular Firebase SDK (v10) & Node.js 20 backend |
| **Routing** | React Router DOM (v6) | Declarative client-side routing with role-based Route Guards |
| **Styling** | Modular Modern CSS | Lightweight, zero-runtime dependency UI design |
| **Identity & Access** | Firebase Authentication | Secure JWT-based cloud identity provider (Email/Password) |
| **Cloud Database** | Cloud Firestore | Managed NoSQL document database with ACID transactions & real-time capabilities |
| **Serverless Backend** | Firebase Cloud Functions (v2) | Trusted server-side grading, answer key isolation, and transaction management |
| **Cloud Security** | Firestore Security Rules | Server-side declarative access control and authorization |
| **Static Hosting** | Firebase Hosting | Global CDN hosting with SSL certificate and SPA rewrites |
| **Local Emulation** | Firebase Emulator Suite | Local test harness for Auth, Firestore, and Cloud Functions |

---

## 3. Why Server-Side Quiz Grading Is Needed

### The Security Vulnerabilities of Client-Side Grading
In client-side grading architectures, the browser application receives or fetches the answer key, computes the student's score in JavaScript, and writes the score directly to the database:

1. **Answer Key Exposure:** Storing correct answers in client-accessible Firestore collections allows students to inspect responses before submission using browser DevTools (Network tab, React state, or Firestore SDK queries).
2. **Score Manipulation:** A malicious actor can modify JavaScript variables, mock the grading function, or alter the outgoing Firestore document payload to record arbitrary scores (e.g. 100% on any quiz).
3. **Identity Spoofing:** A compromised client can transmit forged `studentId` or `facultyId` fields.
4. **Race Conditions & Multiple Attempts:** Client-side checks cannot atomically guarantee single-attempt enforcement under concurrent network requests.

### How Firebase Cloud Functions Solves This
By migrating quiz grading to a callable Firebase Cloud Function (`submitQuiz`):

* **Zero Answer Key Exposure:** Answer keys are stored in a restricted Firestore collection (`/quizAnswers`) completely blocked from student client-side reads. The Cloud Function fetches the answer key using the **Firebase Admin SDK** in an isolated environment.
* **Authoritative Computation:** The server independently counts questions, calculates maximum marks from authoritative quiz data, validates selected choices, and computes earned scores. Client-supplied scores, marks, or user IDs are completely ignored.
* **Verified Identity & Role:** The student UID is extracted directly from the verified Firebase Authentication JWT (`request.auth.uid`), and role verification ensures only registered students can submit.
* **Atomic Deduplication:** A deterministic document ID (`${studentId}_${quizId}`) combined with a Firestore transaction (`runTransaction`) ensures that duplicate or concurrent submissions are rejected atomically.
* **Immutable Results:** Firestore Security Rules permanently forbid client-side write operations (`create`, `update`, `delete`) to the `/results` collection. Only the trusted Cloud Function running with Admin SDK privileges can create result records.

---

## 4. Cloud Architecture

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|   React SPA (Vite) running in the End-User Browser                      |
|   - Modular Service Layer (authService, quizService, resultService)     |
|   - Synchronized Timer & Question Selection                             |
+--------------------+---------------------+------------------------------+
                     |                     |
   Firebase Auth SDK |                     | Firebase Functions SDK (HTTPS Callable)
   (JWT Handshake)   |                     | { quizId, answers, timeTaken }
                     v                     v
+--------------------+--------+   +--------+------------------------------+
|     IDENTITY PROVIDER       |   |          FIREBASE CLOUD FUNCTIONS     |
|  Firebase Authentication    |   |  Node.js 20 Serverless Compute (v2)   |
|  - User Credentials         |   |                                       |
|  - Token Issuance (JWT)     |   |  submitQuiz:                          |
|  - Verified request.auth    |   |  1. Validate auth token & student role|
+-----------------------------+   |  2. Load authoritative quiz & key    |
                                  |  3. Validate option bounds & indices  |
                                  |  4. Server-side score computation     |
                                  |  5. Atomic transaction & deduplication|
                                  |                                       |
                                  |  getQuizReview:                       |
                                  |  - Authorized question-by-question    |
                                  |    review for completed attempts only |
                                  +--------+------------------------------+
                                           |
                                           | Firebase Admin SDK (Privileged)
                                           v
                                  +--------+------------------------------+
                                  |        CLOUD FIRESTORE                |
                                  |  NoSQL Managed Database               |
                                  |  - /users (Profiles & Roles)          |
                                  |  - /quizzes (Sanitized Questions)     |
                                  |  - /quizAnswers (Restricted Keys)     |
                                  |  - /results (Server-Written Results)  |
                                  |  - /leaderboards (Sanitized Rankings) |
                                  +---------------------------------------+
                                           ^
                                           | Enforced at Database Gateway:
                                           | Firestore Security Rules Engine
```

---

## 5. Database Schema (Cloud Firestore)

### Collection: `users`
* **Document ID**: Firebase Authentication UID (`request.auth.uid`)
```json
{
  "name": "Jane Doe",
  "email": "jane@university.edu",
  "role": "student", // or "faculty"
  "createdAt": "Timestamp"
}
```

### Collection: `quizzes`
* **Document ID**: Auto-generated (`quizId`)
* **Note**: Contains sanitized question objects **omitting** `correctAnswer` to prevent client-side inspection during quiz attempts.
```json
{
  "title": "Cloud Computing Fundamentals",
  "description": "Assessment on cloud service and deployment models",
  "createdBy": "<faculty_uid>",
  "creatorEmail": "prof@university.edu",
  "duration": 20, // in minutes
  "questionCount": 10,
  "totalMarks": 10,
  "isPublished": true,
  "questions": [
    {
      "questionIndex": 0,
      "questionText": "Which service model offers virtual machines?",
      "options": ["SaaS", "PaaS", "IaaS", "FaaS"],
      "marks": 1
    }
  ],
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Collection: `quizAnswers`
* **Document ID**: Matches `quizId`
* **Access Policy**: **Faculty creator only**. Students are blocked from reading or writing this collection under all circumstances. Read access is mediated exclusively via the privileged `submitQuiz` and `getQuizReview` Cloud Functions.
```json
{
  "quizId": "<quizId>",
  "createdBy": "<faculty_uid>",
  "answers": [
    {
      "questionIndex": 0,
      "correctAnswer": 2, // Index corresponding to "IaaS"
      "marks": 1
    }
  ],
  "updatedAt": "Timestamp"
}
```

### Collection: `results`
* **Document ID**: Deterministic `${studentId}_${quizId}` (enforces single submission)
* **Access Policy**: **Read-only** for the student who submitted the attempt (`studentId == request.auth.uid`) or the faculty creator (`facultyId == request.auth.uid`). Client writes are permanently disabled (`allow write: if false;`).
```json
{
  "studentId": "<student_uid>",
  "studentName": "Jane Doe",
  "studentEmail": "jane@university.edu",
  "facultyId": "<faculty_uid>",
  "quizId": "<quizId>",
  "quizTitle": "Cloud Computing Fundamentals",
  "score": 9,
  "totalMarks": 10,
  "timeTaken": 420, // in seconds
  "answers": {
    "0": 2,
    "1": 0
  },
  "completed": true,
  "submittedAt": "Timestamp",
  "finalizedAt": "Timestamp"
}
```

### Collection: `leaderboards`
* **Document ID**: Deterministic `${studentId}_${quizId}`
* **Access Policy**: Public read for authenticated users. Writes are restricted to Firebase Admin SDK via the Cloud Function.
* **Privacy Guarantee**: Omits student answers and personal email to protect student privacy.
```json
{
  "studentId": "<student_uid>",
  "studentName": "Jane Doe",
  "facultyId": "<faculty_uid>",
  "quizId": "<quizId>",
  "score": 9,
  "totalMarks": 10,
  "timeTaken": 420,
  "submittedAt": "Timestamp"
}
```

---

## 6. Security Rules & Access Control (`firestore.rules`)

The platform's declarative security policies are enforced at the Firestore gateway:

1. **Client-Side Result Write Lockout:**
   Direct client creation, updates, and deletion of results are disabled:
   ```javascript
   match /results/{resultId} {
     allow read: if isAuthenticated() && (
       resource.data.studentId == request.auth.uid ||
       (isFaculty() && resource.data.facultyId == request.auth.uid)
     );
     allow create, update, delete: if false;
   }
   ```
2. **Answer Key Protection:**
   The `exists(...)` bypass has been eliminated. Students cannot query `/quizAnswers` even after completing an attempt:
   ```javascript
   match /quizAnswers/{quizId} {
     allow read: if isFaculty() && resource.data.createdBy == request.auth.uid;
     allow create: if isFaculty() && request.resource.data.createdBy == request.auth.uid;
     allow update, delete: if isFaculty() && resource.data.createdBy == request.auth.uid;
   }
   ```
3. **Role Immutability:**
   Users can only select their role at registration and cannot update it thereafter:
   ```javascript
   allow update: if isOwner(userId) && request.resource.data.role == resource.data.role;
   ```
4. **Faculty Content Isolation:**
   Faculty can only update or delete quizzes and answer keys matching their authenticated UID (`resource.data.createdBy == request.auth.uid`).
5. **Sanitized Leaderboard Access:**
   Authenticated users can read rankings from `/leaderboards` without accessing private submission documents:
   ```javascript
   match /leaderboards/{leaderboardId} {
     allow read: if isAuthenticated();
     allow write: if false;
   }
   ```

---

## 7. Service Module Architecture

All Firebase interaction is decoupled into modular client service functions:

* `src/services/authService.js`:
  * `registerUser(name, email, password, role)`: Registers auth user & creates Firestore profile doc.
  * `loginUser(email, password)`: Authenticates user credentials.
  * `logoutUser()`: Signs out active session.
  * `getCurrentUser()`: Returns active Firebase Auth user.
  * `getUserProfile(uid)`: Retrieves profile document from `/users`.
  * `onAuthChanged(callback)`: Subscribes to auth state changes.

* `src/services/quizService.js`:
  * `createQuiz(quizData)`: Saves sanitized quiz to `/quizzes` and answer key to `/quizAnswers`.
  * `updateQuiz(quizId, quizData)`: Updates quiz metadata and questions.
  * `deleteQuiz(quizId)`: Deletes quiz and answer key.
  * `getAvailableQuizzes()`: Queries published quizzes for students.
  * `getQuizById(quizId)`: Returns sanitized quiz for students, or complete quiz for faculty creator.
  * `getFacultyQuizzes(facultyId)`: Returns quizzes created by a faculty member.

* `src/services/resultService.js`:
  * `submitQuiz(quizId, studentAnswers, timeTaken)`: Calls the callable Cloud Function `submitQuiz` using Firebase Functions SDK.
  * `getResultReview(quizId)`: Calls callable Cloud Function `getQuizReview` for authorized post-submission question review.
  * `getResultById(resultId)`: Reads single result document by ID.
  * `getUserResults(userId)`: Reads student attempt history (`studentId == request.auth.uid`).
  * `getQuizResults(quizId)`: Reads submissions for a quiz (`facultyId == request.auth.uid`).
  * `getLeaderboard(quizId)`: Reads rankings from the sanitized `/leaderboards` collection.

---

## 8. Firebase Functions Setup & Deployment

### Prerequisites & Billing Requirements

> **Important on Firebase Billing Plan:**
> Google Cloud Functions (2nd generation) requires the Firebase **Blaze (Pay as you go)** plan to build container images using Google Cloud Build and Artifact Registry. 
> 
> * **Zero Cost for Academic / Mini-Project Use:** The Blaze plan includes generous **free tier allowances** every month:
>   * 2,000,000 Cloud Function invocations/month free.
>   * 400,000 GB-seconds of compute time free.
>   * 5 GB of egress networking free.
>   * Firestore provides 50,000 reads and 20,000 writes/day free.
> * For local development and testing, you can use the **Firebase Emulator Suite** completely offline on the **Spark (Free)** plan without entering billing information.

### 1. Install Dependencies

Install root frontend dependencies:
```bash
npm install
```

Install Cloud Functions backend dependencies:
```bash
cd functions
npm install
cd ..
```

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with credentials from your Firebase Console (**Project Settings -> General -> Your apps -> Web app**):
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef...
   VITE_USE_FIREBASE_EMULATOR=false
   ```

### 3. Local Development with Firebase Emulator Suite (Optional)

The Firebase Emulator Suite allows you to run Auth, Firestore, and Cloud Functions locally without deploying to Google Cloud:

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Start the emulators:
   ```bash
   firebase emulators:start
   ```
   The Emulator UI will be available at `http://localhost:4000`.
3. Set `VITE_USE_FIREBASE_EMULATOR=true` in your `.env` file to direct client SDK calls to local ports (Auth: 9099, Firestore: 8080, Functions: 5001).
4. Run the Vite development server:
   ```bash
   npm run dev
   ```

### 4. Deploying to Firebase

1. **Log in to Firebase:**
   ```bash
   firebase login
   ```
2. **Associate with your Firebase Project:**
   ```bash
   firebase use --add
   ```
   Select your project ID.
3. **Build the React Frontend:**
   ```bash
   npm run build
   ```
4. **Deploy Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```
5. **Deploy Firestore Security Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```
6. **Deploy Everything (Functions, Firestore, Hosting):**
   ```bash
   firebase deploy
   ```

---

## 9. Verification & Testing Workflows

### Test 1: Successful Server-Side Submission Flow
1. **Faculty Setup:**
   * Log in with a **Faculty** account.
   * Create a quiz titled `"Cloud Quiz 1"` with 3 questions, valid options, marked answers, and publish it.
2. **Student Submission:**
   * Log in with a **Student** account in another browser or incognito window.
   * Open `"Cloud Quiz 1"`, choose answers, and click **Submit Quiz Final Answers**.
   * Observe the network tab: A POST request is dispatched to `https://us-central1-<project-id>.cloudfunctions.net/submitQuiz`.
   * Result Summary: The score card displays the server-calculated score and accuracy percentage.
   * Detailed Breakdown: The question review breakdown displays correct answers retrieved through `getQuizReview`.
3. **Database Audit:**
   * In the Firebase Console, verify that `/results/<uid>_<quizId>` exists with `completed: true`.
   * Verify that `/leaderboards/<uid>_<quizId>` contains only public fields.

### Test 2: Duplicate Attempt Rejection (Idempotency Test)
1. Navigate back to `/quiz/<quizId>/attempt` in the browser.
2. The UI immediately displays:
   > *"Quiz Already Completed. You have already attempted and submitted this quiz."*
3. If an adversary attempts to bypass the client and directly triggers the `submitQuiz` callable via the console, the server-side Firestore transaction detects the existing document and rejects the request with an `already-exists` (`functions/already-exists`) HttpsError.

### Test 3: Direct Client Write Protection Test
1. Open the browser Developer Console while logged in as a student.
2. Execute a direct Firestore write attempting to forge or modify a score:
   ```javascript
   import { doc, setDoc } from 'firebase/firestore';
   import { db, auth } from './src/firebase/config';
   await setDoc(doc(db, 'results', `${auth.currentUser.uid}_fakeQuiz`), {
     score: 100,
     totalMarks: 100,
     studentId: auth.currentUser.uid,
     completed: true
   });
   ```
3. Observe the result: The request is **immediately rejected** with:
   `FirebaseError: Missing or insufficient permissions.`

### Test 4: Answer Key Protection Test
1. Log in as a student.
2. Attempt to query the answer key collection via the browser console:
   ```javascript
   import { doc, getDoc } from 'firebase/firestore';
   import { db } from './src/firebase/config';
   await getDoc(doc(db, 'quizAnswers', '<quizId>'));
   ```
3. Observe the result: The read is **denied** with:
   `FirebaseError: Missing or insufficient permissions.`
   The answer key remains strictly inaccessible to student client queries at all times.

### Test 5: Role & Validation Rejection Tests
1. **Faculty attempting student submission:** Calling `submitQuiz` from a faculty account triggers a `permission-denied` HttpsError: *"Only registered students are permitted to submit quizzes."*
2. **Unauthenticated request:** Calling `submitQuiz` without an active session triggers an `unauthenticated` HttpsError: *"Authentication required."*
3. **Malformed answers:** Submitting invalid option indices (e.g. option `99` on a 4-choice question) triggers an `invalid-argument` HttpsError.

---

## 10. Summary of Modified & Created Files

| File | Action | Purpose & Implementation Details |
| :--- | :--- | :--- |
| `functions/package.json` | **Created** | Configures Node.js 20 runtime, Firebase Functions v2 (`firebase-functions`), and Admin SDK (`firebase-admin`). |
| `functions/index.js` | **Created** | Implements `submitQuiz` (authoritative server-side grading, role check, bounds validation, transactional deduplication) and `getQuizReview` (authorized post-submission review). |
| `firebase.json` | **Modified** | Added `functions` source configuration and local `emulators` port mappings. |
| `src/firebase/config.js` | **Modified** | Initialized and exported Firebase Functions SDK (`getFunctions(app)`) with optional emulator support. |
| `src/services/resultService.js` | **Modified** | Replaced client grading and direct `results` writes with callable Cloud Function `submitQuiz`; added `getResultReview`; updated `getQuizResults` and `getLeaderboard` Firestore queries for rule compatibility. |
| `src/pages/student/QuizResult.jsx` | **Modified** | Updated question breakdown to fetch authorized review data through `getResultReview` instead of direct `quizAnswers` reads. |
| `firestore.rules` | **Modified** | Locked `/results` from client writes; locked `/quizAnswers` from student reads; restricted students to their own results; added `/leaderboards` rule. |
| `.env.example` | **Modified** | Added optional `VITE_USE_FIREBASE_EMULATOR` configuration variable. |
| `README.md` | **Modified** | Comprehensive documentation of server-side grading architecture, security rules, deployment, billing requirements, and test workflows. |
