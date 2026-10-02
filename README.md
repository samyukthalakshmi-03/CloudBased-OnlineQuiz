# Cloud-Based Online Quiz Platform

A cloud-native, serverless online quiz platform built for academia and certification testing as a **Cloud Computing Mini-Project**. The platform demonstrates how serverless cloud primitives—specifically **Firebase Authentication**, **Cloud Firestore NoSQL Database**, and **Firebase Hosting**—can be combined to deliver a secure, multi-tenant, role-based application with zero dedicated application server infrastructure.

---

## 1. Project Overview

The Cloud-Based Online Quiz Platform enables educational institutions to conduct timed multiple-choice assessments in the cloud. It features distinct interfaces and role-based capabilities for **Students** and **Faculty**:

* **Student Capabilities:**
  * Self-service registration and login.
  * Real-time listing of active, published quizzes.
  * Quiz attempt engine with synchronized countdown timer.
  * Automatic submission upon timer expiration.
  * Instant score computation and answer breakdown.
  * Past quiz attempt history with accuracy metrics.
  * Dynamic quiz leaderboards ranked by score and completion time.
  * Client-side protection against duplicate quiz attempts.

* **Faculty Capabilities:**
  * Dedicated faculty dashboard.
  * Interactive MCQ question builder (add/remove options, specify marks, set correct answer).
  * Quiz draft/publish toggle.
  * Live quiz editing and deletion.
  * Student submission inspection with aggregate analytics (average score, highest score, lowest score).

---

## 2. Technology Stack

| Layer | Technology | Role & Architecture Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React.js (v18) with Vite | Fast Single Page Application (SPA), component modularity |
| **Language** | JavaScript (ESModules) | Native browser execution with modular Firebase SDK |
| **Routing** | React Router DOM (v6) | Declarative client-side routing with role-based Route Guards |
| **Styling** | Modular Modern CSS | Lightweight, zero-runtime dependency UI design |
| **Identity & Access** | Firebase Authentication | Secure JWT-based cloud identity provider (Email/Password) |
| **Cloud Database** | Cloud Firestore | Managed NoSQL document database with ACID guarantees & real-time updates |
| **Cloud Security** | Firestore Security Rules | Server-side declarative access control and authorization |
| **Static Hosting** | Firebase Hosting | Global CDN hosting with SSL certificate and SPA rewrites |

---

## 3. Cloud Architecture & Mini-Project Report Summary

### Academic Overview: Serverless Backend-as-a-Service (BaaS)

Traditional web applications rely on a three-tier architecture (Client Tier, Application Server Tier, Database Tier) running on provisioned virtual machines or containers (IaaS/PaaS). 

This project implements a **Serverless Cloud Architecture (BaaS)**:

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|   React SPA (Vite) running in the End-User Browser                      |
|   - Modular Service Layer (authService, quizService, resultService)     |
|   - Auth Context & Route Protection                                     |
+--------------------+--------------------------------+-------------------+
                     |                                |
   Firebase Auth SDK |              Firestore SDK (v10)
   (JWT Handshake)   |              (Encrypted TLS)
                     v                                v
+--------------------+--------+     +-----------------+-------------------+
|     IDENTITY PROVIDER       |     |        CLOUD FIRESTORE              |
|  Firebase Authentication    |     |  NoSQL Document Database            |
|  - User Credentials         |     |  - /users (Profiles & Roles)        |
|  - Token Issuance (ID/JWT)  |     |  - /quizzes (Sanitized Questions)   |
|  - Session Persistence      |     |  - /quizAnswers (Restricted Keys)   |
+--------------------+--------+     |  - /results (Immutable Records)    |
                     |              +-----------------+-------------------+
                     |                                ^
                     +--------------------------------+
                          Enforced at Database Layer:
                          Firestore Security Rules Engine
```

### Key Cloud Characteristics Demonstrated:
1. **On-Demand Self-Service:** Resources, authentication tokens, and database reads/writes scale automatically without provisioning servers.
2. **Resource Pooling & Multi-Tenancy:** Handled transparently by Google Cloud's distributed infrastructure.
3. **High Availability & Durability:** Firestore provides multi-region replication and 99.999% availability.
4. **Zero Server Maintenance:** Eliminates patching, OS updates, and connection pool management.
5. **Declarative Security at the Data Layer:** Security is decoupled from application servers and enforced at the database gateway using Firestore Security Rules.

---

## 4. Database Schema (Cloud Firestore)

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
* **Note**: Contains sanitized question objects **omitting** `correctAnswer` to prevent client-side inspection by students during quiz attempts.
```json
{
  "title": "Cloud Computing Fundamentals",
  "description": "Mid-term MCQ assessment on cloud models",
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
* **Access Policy**: Faculty creator can always access; students can **only** read after an attempt record exists in `/results`.
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
  "timeTaken": 420, // seconds
  "answers": {
    "0": 2,
    "1": 0
  },
  "completed": true,
  "submittedAt": "Timestamp",
  "finalizedAt": "Timestamp"
}
```

---

## 5. Security Rules & Data Protection Strategy

The project's security rules are implemented in `firestore.rules`.

### Key Security Guarantees:
1. **Strict Role Separation**:
   * Only authenticated users with `getUserData().role == 'faculty'` can create, update, or delete quizzes.
   * Faculty can only modify or delete quizzes where `resource.data.createdBy == request.auth.uid`.
2. **Answers Key Isolation**:
   * Students cannot query or inspect correct answers during a quiz.
   * Rule for `/quizAnswers/{quizId}`:
     ```javascript
     allow read: if isAuthenticated() && (
       (isFaculty() && resource.data.createdBy == request.auth.uid) ||
       exists(/databases/$(database)/documents/results/$(request.auth.uid + '_' + quizId))
     );
     ```
3. **Role Immutability**:
   * Rules prevent users from updating their own `role` field after creation (`request.resource.data.role == resource.data.role`).
4. **Duplicate Submission Prevention**:
   * Result document ID is deterministic (`${request.auth.uid}_${quizId}`).
   * The rule strictly disallows creation if a document exists and allows update only once for score finalization (`completed: false -> completed: true`). Once `completed == true`, the record is locked permanently.
5. **Delete Protection**:
   * Result documents cannot be deleted (`allow delete: if false;`).

### Architectural Note on Client-Side Scoring:
> In this client-only academic prototype, scoring is calculated during submission and written to Firestore. While the isolated answer key and deterministic existence rules prevent students from viewing answers beforehand or modifying scores after submission, a production cloud deployment would utilize **Firebase Cloud Functions** (e.g. an `onCall` callable or `onDocumentCreated` trigger) to compute the score inside an isolated server-side environment. This limitation is intentional for the project scope and clearly documented.

---

## 6. Service Module Architecture

All Firebase interaction is decoupled into clean, modular service functions:

* `src/services/authService.js`:
  * `registerUser(name, email, password, role)`: Registers auth user & creates Firestore profile doc.
  * `loginUser(email, password)`: Firebase sign-in.
  * `logoutUser()`: Firebase sign-out.
  * `getCurrentUser()`: Returns active Firebase Auth user.
  * `getUserProfile(uid)`: Retrieves profile document from `/users`.
  * `onAuthChanged(callback)`: Persistent auth listener.

* `src/services/quizService.js`:
  * `createQuiz(quizData)`: Saves sanitized quiz to `/quizzes` and answer key to `/quizAnswers`.
  * `updateQuiz(quizId, quizData)`: Updates quiz metadata and questions.
  * `deleteQuiz(quizId)`: Deletes quiz and answer key.
  * `getAvailableQuizzes()`: Queries published quizzes for students.
  * `getQuizById(quizId)`: Returns sanitized quiz for students or complete quiz for faculty creator.
  * `getFacultyQuizzes(facultyId)`: Returns all quizzes created by a faculty member.

* `src/services/resultService.js`:
  * `submitQuiz(quizId, answers, timeTaken)`: Checks for duplicate attempts, records submission, grades against answer key, and finalizes score.
  * `getResultById(resultId)`: Returns single submission.
  * `getUserResults(userId)`: Returns all past attempts for a student.
  * `getQuizResults(quizId)`: Returns all student attempts for a faculty's quiz.
  * `getLeaderboard(quizId)`: Queries completed results, ranked by score descending and time taken ascending.

---

## 7. Firebase Setup Instructions

Follow these steps in the [Firebase Console](https://console.firebase.google.com/):

### Step 1: Create a Firebase Project
1. Go to the Firebase Console and click **Add project**.
2. Name your project (e.g., `cloud-quiz-platform`).
3. Google Analytics is optional; click **Create project**.

### Step 2: Register a Web App
1. On the Project Overview page, click the **Web** icon (`</>`).
2. Enter an app nickname (e.g., `cloud-quiz-web`).
3. (Optional) Check "Also set up Firebase Hosting".
4. Click **Register app**. Firebase will display your `firebaseConfig` keys.

### Step 3: Enable Authentication
1. In the left navigation, click **Build** -> **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, enable **Email/Password** and click **Save**.

### Step 4: Create Cloud Firestore Database
1. In the left navigation, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose your database location (e.g., `us-central1` or `asia-south1`).
4. Select **Start in production mode** (or test mode; our `firestore.rules` will be deployed).
5. Click **Create**.

### Step 5: Deploy Firestore Security Rules
1. In the Firestore console, click the **Rules** tab.
2. Copy the entire contents of `firestore.rules` from this repository and paste it into the editor.
3. Click **Publish**.

---

## 8. Environment Variable Configuration

1. In the project root directory, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the values from your Firebase Console (Project Settings -> General -> Your apps -> Web app):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=cloud-quiz-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cloud-quiz-xxxx
VITE_FIREBASE_STORAGE_BUCKET=cloud-quiz-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef...
```

---

## 9. Local Development Instructions

### Prerequisites
* Node.js v18 or higher (tested on Node v24)
* npm v9 or higher

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Build for Production
```bash
npm run build
```
The optimized static bundle will be built in the `dist/` directory.

---

## 10. Firebase Deployment Instructions

To deploy your application to **Firebase Hosting**:

1. Install the Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to your Google/Firebase account:
   ```bash
   firebase login
   ```
3. Initialize Firebase in the repository (if not already linked):
   ```bash
   firebase use --add
   ```
   Select your Firebase Project ID.
4. Build the production React app:
   ```bash
   npm run build
   ```
5. Deploy Firestore Security Rules and Hosting:
   ```bash
   firebase deploy
   ```
6. Your platform will be live at:
   `https://<your-project-id>.web.app`

---

## 11. Testing & Demonstration Workflows

Execute the following testing sequence to demonstrate the platform for evaluation:

1. **Faculty Onboarding & Quiz Creation**:
   - Register an account with role **Faculty**.
   - Navigate to **+ Create Quiz**.
   - Create a quiz with 3 MCQ questions, assign options, select correct answers, and set duration (e.g. 5 minutes). Check "Publish immediately".
   - Confirm quiz appears under **Faculty Dashboard**.

2. **Student Attempt & Timer Flow**:
   - Log out or open an Incognito window.
   - Register a second account with role **Student**.
   - On the **Available Quizzes** dashboard, observe the newly created quiz.
   - Click **Start Quiz**. Note the countdown timer in the header.
   - Select answers and click **Submit Quiz Final Answers**.

3. **Result Breakdown & Review**:
   - Observe the score card showing total score, accuracy %, and time taken.
   - Review each question: correctly answered questions are highlighted green; mistakes show your choice vs the correct answer.

4. **Duplicate Attempt Prevention**:
   - Try navigating back to the quiz attempt URL.
   - Verify that the platform detects the past attempt and blocks re-taking the quiz.

5. **Leaderboard & Analytics Verification**:
   - View the **Quiz Leaderboard** from the student dashboard and verify student ranking.
   - Switch back to the faculty account, click **Submissions** for the quiz, and observe aggregate analytics (average score, highest score, submission log).
