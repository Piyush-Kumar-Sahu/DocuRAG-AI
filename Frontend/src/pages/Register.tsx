import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await apiService.register(cleanName, cleanEmail, password);
      navigate('/verify-otp', {
        state: {
          email: cleanEmail,
          message: 'Account created! Please check your email for the 6-digit verification code.',
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Registration failed. Email may already be in use.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create an Account</h1>
          <p>Sign up to start asking questions on your PDF documents</p>
        </div>
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              className="form-input"
              placeholder="e.g. Piyush Modi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-icon-right"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="icon-btn-right"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '10px' }}>
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
