
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
            {submitted ? (
              <CheckCircle size={30} />
            ) : (
              <Mail size={30} />
            )}
          </div>

          <h1>
            {submitted ? "Request Submitted" : "Forgot Password?"}
          </h1>

          <p>
            {submitted
              ? "Your demo reset request has been submitted."
              : "Enter your registered email address to request a password reset."}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <label>Email Address</label>

            <div className="auth-input">
              <Mail size={19} />
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit">
              Send Reset Request
            </button>
          </form>
        ) : (
          <div className="forgot-success">
            <p>
              Demo only: no reset email has been sent.
            </p>

            <button
              className="auth-submit"
              onClick={() => navigate("/reset-password")}
            >
              Continue to Reset Password
            </button>
          </div>
        )}

        <p className="auth-switch">
          <Link to="/login">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
