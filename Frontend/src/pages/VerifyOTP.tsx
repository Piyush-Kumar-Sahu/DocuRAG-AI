import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

export const VerifyOTP: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = (location.state as { email?: string })?.email || '';
  const initialMessage = (location.state as { message?: string })?.message || null;
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(initialMessage);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim();
    if (!email.trim() || !cleanOtp) {
      setError('Please provide both email and the 6-digit verification code.');
      return;
    }

    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setError('The verification code must be exactly 6 numeric digits.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyOTP(email.trim(), cleanOtp, 'EMAIL_VERIFICATION');
      setSuccessMsg(response.message || 'Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Your account is verified. Please log in.' },
        });
      }, 1500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Invalid or expired OTP code.');
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0 || isResending) return;
    if (!email.trim()) {
      setError('Please enter your email address to resend code.');
      return;
    }

    setError(null);
    setIsResending(true);
    try {
      const response = await apiService.requestOTP(email.trim(), 'EMAIL_VERIFICATION');
      setSuccessMsg(response.message || 'A new verification code has been dispatched.');
      setCooldown(60); // 60-second cooldown
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to resend code.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend code.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="upload-icon-box" style={{ width: '44px', height: '44px', margin: '0 auto 12px' }}>
            <KeyRound size={22} />
          </div>
          <h1>Verify Your Email</h1>
          <p>Enter the 6-digit verification code sent to your email</p>
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

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" htmlFor="otp-email">
              Email Address
            </label>
            <input
              id="otp-email"
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
            <label className="form-label" htmlFor="otp-code">
              6-Digit Code
            </label>
            <input
              id="otp-code"
              type="text"
              maxLength={6}
              className="form-input"
              placeholder="123456"
              style={{ letterSpacing: '6px', fontSize: '1.25rem', textAlign: 'center', fontWeight: 600 }}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '10px' }}>
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <span>Verify Code</span>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.825rem', padding: '6px 12px' }}
            onClick={handleResendOTP}
            disabled={cooldown > 0 || isResending}
          >
            {isResending ? (
              <div className="spinner spinner-blue" style={{ width: '12px', height: '12px' }} />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
          </button>

          <Link to="/login" style={{ fontSize: '0.85rem' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
