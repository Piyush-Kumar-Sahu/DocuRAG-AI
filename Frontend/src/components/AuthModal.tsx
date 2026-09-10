import React, { useState } from 'react';
import { Lock, FileText, X, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  fileName,
  onAuthSuccess,
}) => {
  const { login } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiService.login(email.trim(), password);
      await login(res.access_token);
      setSuccessMsg('Signed in successfully! Exporting chat...');
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      }, 500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Invalid email or password.');
      } else {
        setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Please provide an email and a strong password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.register(name.trim(), email.trim(), password);
      setMode('verify');
      setSuccessMsg('Account created! Please enter the 6-digit verification code sent to your email.');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Registration failed. Email might already exist.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.verifyOTP(email.trim(), otpCode.trim(), 'EMAIL_VERIFICATION');
      // Login after successful verification
      const res = await apiService.login(email.trim(), password);
      await login(res.access_token);
      setSuccessMsg('Email verified! Exporting chat...');
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Invalid or expired OTP code.');
      } else {
        setError(err instanceof Error ? err.message : 'OTP verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          maxWidth: '460px',
          width: '100%',
          padding: '28px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            className="upload-icon-box"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
          >
            <Lock size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '6px', color: 'var(--color-navy)' }}>
            Login required to export
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
            Your chat is currently available temporarily. To save your document and chat history and export the conversation, please login or create an account.
          </p>
        </div>

        {fileName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <FileText size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--color-navy)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {fileName}
            </span>
          </div>
        )}

        <div
          style={{
            backgroundColor: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary-border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '0.8rem',
            color: 'var(--color-primary-dark)',
            lineHeight: 1.4,
          }}
        >
          Your current PDF and chat will be preserved during this authentication flow.
        </div>

        {/* Tab Selector */}
        {mode !== 'verify' && (
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              marginBottom: '18px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: mode === 'login' ? 'var(--color-bg-card)' : 'transparent',
                color: mode === 'login' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: mode === 'register' ? 'var(--color-bg-card)' : 'transparent',
                color: mode === 'register' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label" htmlFor="modal-email">
                Email Address
              </label>
              <input
                id="modal-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="modal-password">
                Password
              </label>
              <input
                id="modal-password"
                type="password"
                className="form-input"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <div className="spinner spinner-white" style={{ width: '16px', height: '16px' }} />
              ) : (
                <LogIn size={15} />
              )}
              <span>{loading ? 'Signing in...' : 'Sign In & Save & Export'}</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label" htmlFor="modal-reg-name">
                Full Name
              </label>
              <input
                id="modal-reg-name"
                type="text"
                className="form-input"
                placeholder="e.g. Piyush Modi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="modal-reg-email">
                Email Address
              </label>
              <input
                id="modal-reg-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="modal-reg-password">
                Password (min 8 characters)
              </label>
              <input
                id="modal-reg-password"
                type="password"
                className="form-input"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <div className="spinner spinner-white" style={{ width: '16px', height: '16px' }} />
              ) : (
                <UserPlus size={15} />
              )}
              <span>{loading ? 'Creating Account...' : 'Create Account & Continue'}</span>
            </button>
          </form>
        )}

        {/* Verify OTP Mode */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label" htmlFor="modal-otp">
                6-Digit Verification Code
              </label>
              <input
                id="modal-otp"
                type="text"
                className="form-input"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                disabled={loading}
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 600 }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <div className="spinner spinner-white" style={{ width: '16px', height: '16px' }} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              <span>{loading ? 'Verifying...' : 'Verify & Export Chat'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
