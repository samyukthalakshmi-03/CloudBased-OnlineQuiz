import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

import { requestPasswordReset } from '../../services/authService';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await requestPasswordReset(email);
      // Always show the same confirmation to avoid revealing whether
      // an account exists for the supplied email address.
      setSubmitted(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(
        err.message ||
          'Unable to send the reset email. Please try again.'
      );
    } finally {
      setSubmitting(false);
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
          <div className="forgot-icon">
            {submitted ? (
              <CheckCircle size={30} />
            ) : (
              <Mail size={30} />
            )}
          </div>

          <h1>
            {submitted ? 'Check Your Email' : 'Forgot Password?'}
          </h1>

          <p>
            {submitted
              ? 'If an account exists for that email, a password reset link has been sent.'
              : 'Enter your registered email address to receive a password reset link.'}
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

            {error && (
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '13px',
                  marginTop: '12px'
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="forgot-success">
            <p>
              Follow the link in the email to choose a new password. The
              link opens the secure reset page.
            </p>
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
