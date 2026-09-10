import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { apiService } from '../services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.requestOTP(email.trim(), 'PASSWORD_RESET');
      navigate('/reset-password', {
        state: {
          email: email.trim(),
          message: 'Password reset code has been sent to your email.',
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'No account found with this email address.');
      } else {
        setError(err instanceof Error ? err.message : 'Request failed. Please try again.');
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
            <KeyRound size={22} />
          </div>
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset code</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email Address
            </label>
            <input
              id="forgot-email"
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

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '10px' }}>
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <span>Send Reset Code</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
