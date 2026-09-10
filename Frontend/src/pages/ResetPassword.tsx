import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';

export const ResetPassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialEmail = (location.state as { email?: string })?.email || '';
  const initialMessage = (location.state as { message?: string })?.message || null;

  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(initialMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !otpCode.trim() || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (otpCode.trim().length !== 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.resetPassword(email.trim(), otpCode.trim(), newPassword);
      setSuccessMsg(response.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password reset successful. Please sign in with your new password.' },
        });
      }, 1500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to reset password. Check your verification code.');
      } else {
        setError(err instanceof Error ? err.message : 'Password reset failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="upload-icon-box" style={{ width: '44px', height: '44px', margin: '0 auto 12px' }}>
            <Lock size={22} />
          </div>
          <h1>Set New Password</h1>
          <p>Enter the code sent to your email and your new password</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="alert alert-success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-code">
              6-Digit Reset Code
            </label>
            <input
              id="reset-code"
              type="text"
              maxLength={6}
              className="form-input"
              placeholder="123456"
              style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 600 }}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-new-password">
              New Password
            </label>
            <div className="input-wrapper">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-icon-right"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
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
            <label className="form-label" htmlFor="reset-confirm-password">
              Confirm New Password
            </label>
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '10px' }}>
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={{ fontSize: '0.875rem' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
