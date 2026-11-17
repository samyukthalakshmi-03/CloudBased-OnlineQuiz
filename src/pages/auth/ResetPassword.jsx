import { useState } from 'react';
import {
  Link,
  useNavigate,
  useSearchParams
} from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { completePasswordReset } from '../../services/authService';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Firebase appends the one-time reset code as a query parameter.
  const oobCode = searchParams.get('oobCode') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await completePasswordReset(oobCode, password);
      setDone(true);

      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err.message || 'Unable to reset your password. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const invalidLink = !oobCode;

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
            {invalidLink ? (
              <AlertCircle size={30} />
            ) : (
              <CheckCircle size={30} />
            )}
          </div>

          <h1>Reset Password</h1>
          <p>
            {invalidLink
              ? 'This reset link is missing or invalid.'
              : 'Create a new password for your account.'}
          </p>
        </div>

        {done ? (
          <div className="forgot-success">
            <p>Your password has been reset. Redirecting to sign in...</p>
          </div>
        ) : invalidLink ? (
          <div className="forgot-success">
            <p>
              Open the reset link from your email, or request a new one.
            </p>
            <Link to="/forgot-password" className="auth-submit">
              Request a New Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <label>New Password</label>

            <div className="auth-input">
              <Lock size={19} />
              <input
                type={showPassword ? 'text' : 'password'}
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
                type={showConfirm ? 'text' : 'password'}
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
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
