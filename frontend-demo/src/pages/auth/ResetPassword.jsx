
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    alert("Demo password reset completed!");
    navigate("/login");
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
          <div className="forgot-icon">
            <CheckCircle size={30} />
          </div>

          <h1>Reset Password</h1>
          <p>Create a new password for your account.</p>
        </div>

        <form onSubmit={handleReset}>
          <label>New Password</label>

          <div className="auth-input">
            <Lock size={19} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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

          <label>Confirm Password</label>

          <div className="auth-input">
            <Lock size={19} />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className="auth-submit">
            Reset Password
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </p>

        <p className="auth-demo-note">
          Demo only. Password changes are not saved.
        </p>
      </div>
    </div>
  );
}
