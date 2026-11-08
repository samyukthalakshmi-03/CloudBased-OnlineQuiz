
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  Users,
} from "lucide-react";
import "./Auth.css";

const STUDENTS_KEY = "quizcloud_students";
const FACULTY_KEY = "quizcloud_faculty";
const CURRENT_USER_KEY = "quizcloud_current_user";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  const handleLogin = (e) => {
    e.preventDefault();

    try {
      const storageKey =
        role === "student" ? STUDENTS_KEY : FACULTY_KEY;

      const users = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      const account = users.find(
        (user) =>
          user.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!account) {
        alert(
          `No ${role} account found with this email. Please register first.`
        );
        return;
      }

      // Demo-only identity. Password verification requires a backend.
      const currentUser = {
        id: account.id,
        name: account.name,
        email: account.email,
        department: account.department,
        role,
      };

      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(currentUser)
      );

      alert(`Welcome, ${account.name}!`);

      navigate(role === "faculty" ? "/faculty" : "/student");
    } catch (error) {
      console.error("Login error:", error);
      alert("Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">
          <GraduationCap size={30} />
        </div>
        <h2>QuizCloud</h2>
        <p>Learning Platform</p>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <h1>Welcome Back!</h1>
          <p>Sign in to continue your learning journey.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label>Select Your Role</label>

          <div className="login-role-options">
            <button
              type="button"
              className={`login-role-btn ${
                role === "student" ? "selected" : ""
              }`}
              onClick={() => setRole("student")}
            >
              <UserRound size={19} />
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`login-role-btn ${
                role === "faculty" ? "selected" : ""
              }`}
              onClick={() => setRole("faculty")}
            >
              <Users size={19} />
              <span>Faculty</span>
            </button>
          </div>

          <label>Email Address</label>
          <div className="auth-input">
            <Mail size={19} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Password</label>
          <div className="auth-input">
            <Lock size={19} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className="auth-submit">
            Sign In as {role === "student" ? "Student" : "Faculty"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

        <p className="auth-demo-note">
          Demo login. Email is matched against registered accounts.
          Secure password authentication requires backend integration.
        </p>
      </div>
    </div>
  );
}
