import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  UserRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const department = form.department;
    const password = form.password;

    // Required field validation
    if (!name || !email || !phone || !department || !password) {
      setError('Please fill in all fields.');
      return;
    }

    // Name validation
    if (name.length < 3) {
      setError('Name must contain at least 3 characters.');
      return;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Phone validation
    const phoneDigits = phone.replace(/\D/g, '');

    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError('Please enter a valid phone number.');
      return;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(
        'Password must contain at least one uppercase letter and one number.'
      );
      return;
    }

    setSubmitting(true);

    try {
      // Public registration always creates a student account.
      // The role is fixed server-side and cannot be chosen here.
      await register(name, email, password, { phone, department });

      navigate('/student', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.message ||
          'Registration could not be completed. Please try again.'
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

      <div className="auth-card register-card">
        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Join QuizCloud and start learning today.</p>
        </div>

        <form onSubmit={handleRegister}>
          <label>Full Name</label>
          <div className="auth-input">
            <UserRound size={19} />
            <input
              name="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <label>Email Address</label>
          <div className="auth-input">
            <Mail size={19} />
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <label>Phone Number</label>
          <div className="auth-input">
            <Phone size={19} />
            <input
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
            />
          </div>

          <label>Department</label>
          <select
            className="auth-select"
            name="department"
            value={form.department}
            onChange={handleChange}
            required
          >
            <option value="">Select Department</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Internet of Things">Internet of Things</option>
            <option value="Information Technology">
              Information Technology
            </option>
            <option value="Electronics">Electronics</option>
          </select>

          <label>Password</label>
          <div className="auth-input">
            <Lock size={19} />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <p className="auth-demo-note">
            Use at least 8 characters, including one uppercase letter and
            one number.
          </p>

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
            {submitting ? 'Creating Account...' : 'Create Student Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
