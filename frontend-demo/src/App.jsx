
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import StudentDashboard from "./pages/student/StudentDashboard";
import AvailableQuizzes from "./pages/student/AvailableQuizzes";
import QuizTaking from "./pages/student/QuizTaking";
import Results from "./pages/student/Results";
import Leaderboard from "./pages/student/Leaderboard";
import Profile from "./pages/student/Profile";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import FacultyLayout from "./pages/faculty/FacultyLayout";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import ManageQuizzes from "./pages/faculty/ManageQuizzes";
import CreateQuiz from "./pages/faculty/CreateQuiz";
import Performance from "./pages/faculty/Performance";
import Students from "./pages/faculty/Students";
import FacultyProfile from "./pages/faculty/FacultyProfile";

import "./App.css";

const USER_KEY = "quizcloud_current_user";

// Read the current logged-in user
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

// Protect routes based on account role
function ProtectedRoute({ role }) {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== role) {
    return (
      <Navigate
        to={
          currentUser.role === "faculty"
            ? "/faculty"
            : "/student"
        }
        replace
      />
    );
  }

  return <Outlet />;
}

// Decide where the home page should redirect
function HomeRedirect() {
  const currentUser = getCurrentUser();

  if (currentUser?.role === "faculty") {
    return <Navigate to="/faculty" replace />;
  }

  if (currentUser?.role === "student") {
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Student Protected Routes */}
        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/quizzes" element={<AvailableQuizzes />} />
          <Route path="/student/quiz/:id" element={<QuizTaking />} />
          <Route path="/student/results" element={<Results />} />
          <Route path="/student/leaderboard" element={<Leaderboard />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>

        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Faculty Protected Routes */}
        <Route element={<ProtectedRoute role="faculty" />}>
          <Route path="/faculty" element={<FacultyLayout />}>
            <Route index element={<FacultyDashboard />} />
            <Route path="quizzes" element={<ManageQuizzes />} />
            <Route path="create-quiz" element={<CreateQuiz />} />
            <Route path="students" element={<Students />} />
            <Route path="performance" element={<Performance />} />
            <Route path="profile" element={<FacultyProfile />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
